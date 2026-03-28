import type { Express } from "express";

let appInstance: Express | null = null;
let initError: Error | null = null;
let initPromise: Promise<void> | null = null;

async function init(): Promise<void> {
  try {
    const { createApp } = await import("../server/app");
    appInstance = await createApp();
  } catch (err) {
    initError = err instanceof Error ? err : new Error(String(err));
    console.error("[vercel] App initialization failed:", initError.message);
  }
}

function getInitPromise(): Promise<void> {
  if (!initPromise) {
    initPromise = init();
  }
  return initPromise;
}

export default async function handler(req: any, res: any) {
  await getInitPromise();

  if (initError || !appInstance) {
    res.status(500).json({
      error: "Server initialization failed",
      message: initError?.message ?? "Unknown startup error",
      hint: "Check that DATABASE_URL, SESSION_SECRET and NODE_ENV are set in Vercel environment variables.",
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
