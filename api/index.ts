import type { Express } from "express";

const VERSION = "v5-" + new Date().toISOString().slice(0, 16);

let appPromise: Promise<Express> | null = null;
let appError: string | null = null;

async function buildApp(): Promise<Express> {
  // Step-by-step init so we can see exactly where it fails
  console.log("[vercel] Starting buildApp...");

  const envMissing = ["DATABASE_URL", "SESSION_SECRET"].filter(k => !process.env[k]);
  if (envMissing.length) {
    throw new Error(`Missing env vars: ${envMissing.join(", ")}`);
  }
  console.log("[vercel] Env vars OK");

  const { createApp } = await import("../server/app");
  console.log("[vercel] server/app imported");

  const app = await createApp();
  console.log("[vercel] createApp() done");

  return app;
}

function getApp(): Promise<Express> {
  if (!appPromise) {
    appPromise = buildApp().catch((err) => {
      appError = err instanceof Error ? err.message : String(err);
      console.error("[vercel] FATAL:", appError);
      throw err;
    });
  }
  return appPromise;
}

export default async function handler(req: any, res: any) {
  // Isolated health check — never touches the app
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
      hint: "Check /api/healthz for details",
    });
    return;
  }

  return new Promise<void>((resolve) => {
    app(req, res, () => resolve());
  });
}

export const config = { maxDuration: 30 };
