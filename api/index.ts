// Static import so @vercel/node compiles and bundles server/**
import { createApp } from "../server/app";
import type { Express, Request, Response } from "express";

const VERSION = "v8";

type AppState =
  | { ready: true; app: Express }
  | { ready: false; error: string; stack: string[] };

let _state: AppState | null = null;
let _warmup: Promise<AppState> | null = null;

function warmup(): Promise<AppState> {
  if (_warmup) return _warmup;
  _warmup = createApp()
    .then((app): AppState => {
      console.log(`[api ${VERSION}] createApp OK`);
      _state = { ready: true, app };
      return _state;
    })
    .catch((err: any): AppState => {
      const error: string = err?.message ?? String(err);
      const stack: string[] = (err?.stack ?? "").split("\n").slice(0, 8);
      console.error(`[api ${VERSION}] createApp FAILED:`, error);
      _state = { ready: false, error, stack };
      return _state;
    });
  return _warmup;
}

// Kick off warm-up immediately (module eval)
warmup();

export default async function handler(req: Request, res: Response): Promise<void> {
  // ── /api/healthz ─ always responds, no app needed ────────────────────────
  if (req.url?.startsWith("/api/healthz")) {
    const state = _state ?? (await warmup());
    const missing = (["DATABASE_URL", "SESSION_SECRET"] as const).filter(
      (k) => !process.env[k]
    );
    const ok = state.ready && missing.length === 0;
    res.status(ok ? 200 : 503).json({
      version: VERSION,
      status: ok ? "ok" : state.ready ? "missing-env" : "init-failed",
      initError: state.ready ? null : state.error,
      initStack: state.ready ? null : state.stack,
      env: {
        DATABASE_URL: !!process.env.DATABASE_URL,
        SESSION_SECRET: !!process.env.SESSION_SECRET,
        NODE_ENV: process.env.NODE_ENV ?? "(not set)",
        ADMIN_EMAIL: !!process.env.ADMIN_EMAIL,
        OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
        ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
      },
    });
    return;
  }

  // ── Ensure app is ready ──────────────────────────────────────────────────
  const state = _state ?? (await warmup());

  if (!state.ready) {
    res.status(503).json({
      error: "Service starting up",
      message: state.error,
      hint: `Visit /api/healthz for details. (${VERSION})`,
    });
    return;
  }

  // ── Delegate to Express ──────────────────────────────────────────────────
  const { app } = state;
  try {
    await new Promise<void>((resolve, reject) => {
      // Resolve on response finish; reject on any unhandled Express error
      const onDone = () => resolve();
      res.once("finish", onDone);
      res.once("close", onDone);
      try {
        app(req as any, res as any, (err?: any) => {
          if (err) reject(err);
          else resolve();
        });
      } catch (syncErr) {
        reject(syncErr);
      }
    });
  } catch (err: any) {
    const msg: string = err?.message ?? String(err);
    console.error(`[api ${VERSION}] request error:`, msg);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error", message: msg });
    }
  }
}

export const config = { maxDuration: 30 };
