import type { NextFunction, Request, Response } from "express";

/**
 * Shared "database-recovery guard" for routers that lazily create their own
 * tables.
 *
 * All routes must wait for schema initialization — a request that races the
 * CREATE TABLE statements would otherwise hit a missing table and 500.
 * A failed attempt must NOT poison the instance forever (serverless cold
 * starts can fail transiently mid-init), so on failure the next request
 * retries initialization from scratch.
 *
 * @param ensureTables  idempotent function that creates the router's tables
 * @param friendlyMessage  user-facing 503 message (e.g. "Digital forms
 *   storage is initializing or unavailable. Please try again shortly.")
 * @param label  short log prefix (e.g. "digital-forms")
 */
export function makeSchemaGate(
  ensureTables: () => Promise<void>,
  friendlyMessage: string,
  label: string,
): { middleware: (req: Request, res: Response, next: NextFunction) => Promise<void>; ensureReady: () => Promise<void> } {
  let schemaReadyPromise: Promise<void> | null = null;

  function ensureReady(): Promise<void> {
    if (!schemaReadyPromise) {
      schemaReadyPromise = ensureTables().catch((err) => {
        schemaReadyPromise = null; // allow the next request to retry
        throw err;
      });
    }
    return schemaReadyPromise;
  }

  // Kick off init eagerly (non-fatal — requests will retry on failure).
  ensureReady().catch((err) => console.error(`${label} schema init failed:`, err));

  async function middleware(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await ensureReady();
      next();
    } catch (err) {
      console.error(`${label} schema unavailable:`, err);
      res.status(503).json({
        message: friendlyMessage,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { middleware, ensureReady };
}
