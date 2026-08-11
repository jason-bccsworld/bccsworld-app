/**
 * Watchlist kind/value contract — the same validation rules apply to every
 * caller of POST /api/federal-contracts/watchlist (UI or direct API):
 *
 *  - mismatched values (generic topic word as vendor, UEI as keyword/vendor,
 *    malformed UEI/NAICS/PIID) are rejected with 422 unless explicitly
 *    confirmed (`confirmed: true`)
 *  - valid pairings are inserted without confirmation
 *  - the shared heuristic itself warns on the mix-ups the task calls out
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import express from "express";
import { watchValueWarning } from "@shared/watchlist-validation";

const h = vi.hoisted(() => ({
  dbPromise: (async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const client = new PGlite();
    return { client, db: drizzle(client) };
  })(),
  state: { orgId: "org-1", role: "admin" },
}));

vi.mock("../db", async () => {
  const { db } = await h.dbPromise;
  return { db, pool: {} };
});

vi.mock("../localAuth", () => ({
  isAuthenticated: (req: any, res: any, next: any) =>
    req.user ? next() : res.status(401).json({ message: "Unauthorized" }),
}));

vi.mock("../middleware/tenant", () => ({
  requireOrg: () => h.state.orgId,
  isPlatformStaff: (email?: string) => !!email && email.toLowerCase().endsWith("@bccsworld.com"),
}));

vi.mock("../services/email-alerts", () => ({
  getEmailAlertSettings: async () => ({ criticalFindingsEnabled: true, extraRecipients: [] }),
}));

let pg: import("@electric-sql/pglite").PGlite;
let server: import("http").Server;
let base: string;

beforeAll(async () => {
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "test-key";
  pg = (await h.dbPromise).client;
  await pg.exec(`
    CREATE TABLE bccs_fedcon_watchlist (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id VARCHAR(200) NOT NULL,
      kind VARCHAR(30) NOT NULL,
      value VARCHAR(300) NOT NULL,
      label VARCHAR(300),
      created_by VARCHAR(200),
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (org_id, kind, value)
    );
  `);
  const routes = await import("../routes/federal-contracts");
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.user = { id: "u1", email: "user@acme.com", role: h.state.role };
    next();
  });
  app.use("/api/federal-contracts", routes.default);
  await new Promise<void>((resolve) => { server = app.listen(0, () => resolve()); });
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});

afterAll(async () => {
  server?.close();
  await pg?.close();
});

beforeEach(async () => {
  h.state.orgId = "org-1";
  h.state.role = "admin";
  await pg.exec("DELETE FROM bccs_fedcon_watchlist");
});

async function post(body: unknown): Promise<{ status: number; json: any }> {
  const res = await fetch(`${base}/api/federal-contracts/watchlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

async function count(): Promise<number> {
  const { rows } = await pg.query<any>("SELECT COUNT(*)::int AS c FROM bccs_fedcon_watchlist");
  return rows[0].c;
}

describe("watchValueWarning heuristics", () => {
  it("flags generic topic words as vendor watches", () => {
    expect(watchValueWarning("vendor", "software")).toMatch(/topic, not a company name/i);
    expect(watchValueWarning("vendor", "training")).toMatch(/NOT search SAM.gov opportunity notices/i);
  });
  it("does not flag real-looking company names as vendor watches", () => {
    expect(watchValueWarning("vendor", "Acme Flight Systems LLC")).toBeNull();
    expect(watchValueWarning("vendor", "Boeing")).toBeNull();
  });
  it("flags a 12-character UEI entered as keyword, agency, or vendor", () => {
    expect(watchValueWarning("keyword", "ABC123DEF456")).toMatch(/UEI/);
    expect(watchValueWarning("agency", "ABC123DEF456")).toMatch(/UEI/);
    expect(watchValueWarning("vendor", "ABC123DEF456")).toMatch(/Vendor UEI/);
  });
  it("flags a company-suffixed name entered as a keyword", () => {
    expect(watchValueWarning("keyword", "Acme Aviation Inc")).toMatch(/company name/i);
  });
  it("flags malformed UEI / NAICS / PIID values", () => {
    expect(watchValueWarning("vendor_uei", "not-a-uei")).toMatch(/12 letters\/digits/);
    expect(watchValueWarning("naics", "flight training")).toMatch(/2–6 digits/);
    expect(watchValueWarning("contract", "no digits here")).toMatch(/contain digits/i);
  });
  it("accepts well-formed values without warnings", () => {
    expect(watchValueWarning("keyword", "flight training")).toBeNull();
    expect(watchValueWarning("naics", "611512")).toBeNull();
    expect(watchValueWarning("vendor_uei", "ABC123DEF456")).toBeNull();
    expect(watchValueWarning("contract", "FA8620-21-C-1234")).toBeNull();
    expect(watchValueWarning("agency", "Department of the Air Force")).toBeNull();
  });
});

describe("POST /watchlist enforcement", () => {
  it("rejects a generic word as a vendor watch with 422 and does not save it", async () => {
    const { status, json } = await post({ kind: "vendor", value: "software" });
    expect(status).toBe(422);
    expect(json.requiresConfirmation).toBe(true);
    expect(json.message).toMatch(/topic, not a company name/i);
    expect(await count()).toBe(0);
  });

  it("rejects a UEI entered as a keyword and a malformed UEI/NAICS", async () => {
    for (const body of [
      { kind: "keyword", value: "ABC123DEF456" },
      { kind: "vendor_uei", value: "short" },
      { kind: "naics", value: "not-digits" },
    ]) {
      const { status, json } = await post(body);
      expect(status).toBe(422);
      expect(json.requiresConfirmation).toBe(true);
    }
    expect(await count()).toBe(0);
  });

  it("saves a warned value only with explicit confirmation", async () => {
    const { status, json } = await post({ kind: "vendor", value: "software", confirmed: true });
    expect(status).toBe(201);
    expect(json.kind).toBe("vendor");
    expect(json.value).toBe("software");
    expect(await count()).toBe(1);
  });

  it("saves well-formed values without confirmation", async () => {
    for (const body of [
      { kind: "keyword", value: "flight training" },
      { kind: "naics", value: "611512" },
      { kind: "vendor", value: "Acme Flight Systems LLC" },
      { kind: "vendor_uei", value: "ABC123DEF456" },
      { kind: "contract", value: "FA8620-21-C-1234" },
    ]) {
      const { status } = await post(body);
      expect(status).toBe(201);
    }
    expect(await count()).toBe(5);
  });

  it("still rejects unknown kinds and empty values", async () => {
    expect((await post({ kind: "bogus", value: "x" })).status).toBe(400);
    expect((await post({ kind: "keyword", value: "   " })).status).toBe(400);
  });
});
