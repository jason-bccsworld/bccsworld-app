import { createApp } from "../server/app";
import type { Express } from "express";

const VERSION = "v6";

let appPromise: Promise<Express> | null = null;
let appError: string | null = null;

function getApp(): Promise<Express> {
  if (!appPromise) {
    appPromise = createApp().catch((err) => {
      appError = err instanceof Error ? err.message : String(err);
      console.error("[vercel] createApp failed:", appError);
      throw err;
    });
  }
  return appPromise;
}

export default async function handler(req: any, res: any) {
  if (req.url === "/api/healthz" || req.url?.startsWith("/api/healthz?")) {
    const missing = ["DATABASE_URL", "SESSION_SECRET"].filter(k => !process.env[k]);
    res.status(missing.length ? 503 : 200).json({
      version: VERSION,
      status: missing.length ? "missing-env" : "ok",
      appError: appError ?? null,
      env: {
        DATABASE_URL: !!process.env.DATABASE_URL,
        SESSION_SECRET: !!process.env.SESSION_SECRET,
        NODE_ENV: process.env.NODE_ENV ?? "not set",
        ADMIN_EMAIL: !!process.env.ADMIN_EMAIL,
        OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      },
    });
    return;
  }

  let app: Express;
  try {
    app = await getApp();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      error: "Server failed to start",
      message: msg,
      hint: "Check /api/healthz for diagnostics.",
    });
    return;
  }

  return new Promise<void>((resolve) => {
    app(req, res, () => resolve());
  });
}

export const config = { maxDuration: 30 };
