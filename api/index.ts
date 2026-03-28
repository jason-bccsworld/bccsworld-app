import type { Express } from "express";

let appInstance: Express | null = null;
let initError: string | null = null;
let initPromise: Promise<void> | null = null;

function checkEnv(): string | null {
  const missing: string[] = [];
  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!process.env.SESSION_SECRET) missing.push("SESSION_SECRET");
  if (missing.length > 0) {
    return `Missing required environment variables: ${missing.join(", ")}. Add them in Vercel → Settings → Environment Variables, then redeploy.`;
  }
  return null;
}

async function init(): Promise<void> {
  const envError = checkEnv();
  if (envError) {
    initError = envError;
    console.error("[vercel] Env check failed:", envError);
    return;
  }
  try {
    const { createApp } = await import("../server/app");
    appInstance = await createApp();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    initError = msg;
    console.error("[vercel] App init failed:", msg);
  }
}

function getInitPromise(): Promise<void> {
  if (!initPromise) {
    initPromise = init();
  }
  return initPromise;
}

export default async function handler(req: any, res: any) {
  if (req.url === "/api/healthz" || req.url?.startsWith("/api/healthz?")) {
    const envError = checkEnv();
    res.status(envError ? 503 : 200).json({
      status: envError ? "error" : "ok",
      env: {
        DATABASE_URL: !!process.env.DATABASE_URL,
        SESSION_SECRET: !!process.env.SESSION_SECRET,
        NODE_ENV: process.env.NODE_ENV ?? "not set",
        ADMIN_EMAIL: !!process.env.ADMIN_EMAIL,
      },
      error: envError ?? null,
    });
    return;
  }

  await getInitPromise();

  if (initError || !appInstance) {
    res.status(500).json({
      error: "Server initialization failed",
      message: initError ?? "Unknown startup error",
      hint: "Visit /api/healthz for environment diagnostics.",
    });
    return;
  }

  return new Promise<void>((resolve, reject) => {
    appInstance!(req, res, (err: any) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export const config = {
  maxDuration: 30,
};
