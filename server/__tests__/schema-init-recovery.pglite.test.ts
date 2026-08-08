/**
 * Schema-init failure recovery for the routers that gate every request on a
 * cached ensureTables() promise:
 *   - server/routes/digital-forms.ts
 *   - server/routes/checklist-report.ts
 *
 * The failure mode under test once permanently poisoned a serverless
 * instance: init fails once (transient DB hiccup at cold start) and the
 * rejected promise is cached forever, so every later request 503s even
 * though the database recovered.
 *
 * Coverage:
 *   1. While the DB is down, requests get a friendly 503 ("initializing or
 *      unavailable") — not a 500 or a hang.
 *   2. Repeated requests while still down keep getting 503 (no crash).
 *   3. Once the DB recovers, the NEXT request re-runs init from scratch,
 *      the real DDL executes against in-process Postgres (PGlite), and the
 *      route serves normally — no restart required.
 *
 * The real routers and their real ensureTables() DDL run; only db.execute is
 * gated by a fail switch that simulates the outage.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import express from "express";

const h = vi.hoisted(() => ({
  failMode: { on: true, calls: 0 },
  dbPromise: (async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const client = new PGlite();
    return { client, db: drizzle(client) };
  })(),
}));

vi.mock("../db", async () => {
  const { db } = await h.dbPromise;
  // Pass everything through to the real PGlite-backed drizzle db, but make
  // execute() fail while the simulated outage is on. ensureTables() in both
  // routers issues all DDL through db.execute, so this fails init exactly
  // the way a dead connection would.
  const gated = new Proxy(db as any, {
    get(target, prop, receiver) {
      if (prop === "execute" && h.failMode.on) {
        return async () => {
          h.failMode.calls++;
          throw new Error("connection refused (simulated outage)");
        };
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  return { db: gated, pool: {} };
});

vi.mock("../localAuth", () => ({
  isAuthenticated: (req: any, res: any, next: any) =>
    req.user ? next() : res.status(401).json({ message: "Unauthorized" }),
}));

const ORG1 = "11111111-1111-4111-8111-111111111111";

vi.mock("../middleware/tenant", () => ({
  requireOrg: () => ORG1,
  isPlatformStaff: (email?: string) => !!email && email.toLowerCase().endsWith("@bccsworld.com"),
}));

vi.mock("openai", () => ({
  default: class {
    chat = { completions: { create: vi.fn(async () => { throw new Error("AI not used in this test"); }) } };
  },
}));

vi.mock("../services/audit-readiness", () => ({
  queueAuditReadinessRefresh: vi.fn(),
}));

let pg: import("@electric-sql/pglite").PGlite;
let server: import("http").Server;
let base: string;

beforeAll(async () => {
  pg = (await h.dbPromise).client;
  // Org identity table referenced by checklist-report helpers.
  await pg.exec(`
    CREATE TABLE training_organizations (
      id UUID PRIMARY KEY,
      organization_name TEXT NOT NULL,
      certificate_number TEXT,
      regulatory_authority TEXT
    );
    INSERT INTO training_organizations (id, organization_name, certificate_number, regulatory_authority)
    VALUES ('${ORG1}', 'Acme Flight', 'CERT-1', 'FAA');
  `);

  // Import the routers while the outage is active: the eager module-load
  // ensureSchemaReady() must fail WITHOUT poisoning later requests.
  expect(h.failMode.on).toBe(true);
  const { default: digitalForms } = await import("../routes/digital-forms");
  const { default: checklistReport } = await import("../routes/checklist-report");

  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.user = { id: "admin1", email: "admin@acme.com", role: "admin" };
    next();
  });
  app.use("/api/digital-forms", digitalForms);
  app.use("/api/checklist-report", checklistReport);
  await new Promise<void>((resolve) => { server = app.listen(0, () => resolve()); });
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});

afterAll(async () => {
  server?.close();
  await pg?.close();
});

async function api(path: string) {
  const res = await fetch(`${base}${path}`);
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

describe("schema init failure → 503, next request retries and recovers", () => {
  it("digital-forms returns a friendly 503 while init keeps failing", async () => {
    const r1 = await api("/api/digital-forms/templates");
    expect(r1.status).toBe(503);
    expect(r1.body.message).toMatch(/initializing or unavailable/i);

    // A second request during the outage must retry init (not serve a
    // permanently cached rejection blindly) and still 503 cleanly.
    const callsBefore = h.failMode.calls;
    const r2 = await api("/api/digital-forms/templates");
    expect(r2.status).toBe(503);
    expect(h.failMode.calls).toBeGreaterThan(callsBefore);
  });

  it("checklist-report returns the same friendly 503 during the outage", async () => {
    const r = await api("/api/checklist-report/checklist");
    expect(r.status).toBe(503);
    expect(r.body.message).toMatch(/initializing or unavailable/i);
  });

  it("digital-forms recovers on the next request after the DB is back", async () => {
    h.failMode.on = false;

    const r = await api("/api/digital-forms/templates");
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);

    // The real DDL actually ran against the database.
    const tables = await pg.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_name IN ('digital_form_templates', 'digital_form_submissions')`
    );
    expect(tables.rows.map((t) => t.table_name).sort()).toEqual([
      "digital_form_submissions",
      "digital_form_templates",
    ]);
  });

  it("checklist-report recovers on the next request too", async () => {
    expect(h.failMode.on).toBe(false);

    const r = await api("/api/checklist-report/checklist");
    expect(r.status).toBe(200);
    expect(r.body.areas ?? r.body).toBeTruthy();

    const tables = await pg.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_name = 'bccs_checklist_report_items'`
    );
    expect(tables.rows).toHaveLength(1);
  });

  it("stays healthy on subsequent requests (init success is cached)", async () => {
    const callsAfterRecovery = h.failMode.calls;
    const r = await api("/api/digital-forms/templates");
    expect(r.status).toBe(200);
    // No further simulated-outage calls — and no re-init churn.
    expect(h.failMode.calls).toBe(callsAfterRecovery);
  });
});
