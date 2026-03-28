import { createApp } from "../server/app";
import type { Express } from "express";

let appInstance: Express | null = null;
let initPromise: Promise<Express> | null = null;

async function getApp(): Promise<Express> {
  if (appInstance) return appInstance;
  if (!initPromise) {
    initPromise = createApp().then((app) => {
      appInstance = app;
      return app;
    });
  }
  return initPromise;
}

export default async function handler(req: any, res: any) {
  const app = await getApp();
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
