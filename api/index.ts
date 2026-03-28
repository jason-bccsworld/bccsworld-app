import { createApp } from "../server/app";
import type { Express } from "express";

let appPromise: Promise<Express> | null = null;

function getApp(): Promise<Express> {
  if (!appPromise) {
    appPromise = createApp();
  }
  return appPromise;
}

export default async function handler(req: any, res: any) {
  if (req.url === "/api/healthz" || req.url?.startsWith("/api/healthz?")) {
    const missing: string[] = [];
    if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
    if (!process.env.SESSION_SECRET) missing.push("SESSION_SECRET");
    res.status(missing.length ? 503 : 200).json({
      status: missing.length ? "error" : "ok",
      env: {
        DATABASE_URL: !!process.env.DATABASE_URL,
        SESSION_SECRET: !!process.env.SESSION_SECRET,
        NODE_ENV: process.env.NODE_ENV ?? "not set",
        ADMIN_EMAIL: !!process.env.ADMIN_EMAIL,
      },
      error: missing.length ? `Missing: ${missing.join(", ")}` : null,
    });
    return;
  }

  let app: Express;
  try {
    app = await getApp();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[vercel] Init error:", message);
    res.status(500).json({
      error: "Server initialization failed",
      message,
      hint: "Check DATABASE_URL, SESSION_SECRET, NODE_ENV in Vercel → Settings → Environment Variables, then redeploy.",
    });
    return;
  }

  return new Promise<void>((resolve, reject) => {
    app(req, res, (err: any) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export const config = {
  maxDuration: 30,
};
