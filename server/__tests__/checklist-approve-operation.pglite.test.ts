/**
 * Approve-operation-into-manual tests — real route SQL on in-process Postgres
 * (PGlite) with the production tables created by the router's ensureTables().
 *
 * Covered:
 *   - approving appends a labeled section, bumps the manual revision, and
 *     records approval provenance (item, manual, revision, approver, text)
 *   - GET /checklist returns the approval and flips the finding stale
 *   - viewers get 403; cross-org item/manual get 404
 *   - multi-manual orgs must pick a manual (400 without manualId)
 *   - empty / oversized operation text rejected
 *   - legacy findings without suggested_operation still serve (null field)
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import express from "express";

const h = vi.hoisted(() => ({
  dbPromise: (async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const client = new PGlite();
    return { client, db: drizzle(client) };
  })(),
  state: { orgId: "", role: "admin", email: "admin@acme.com" },
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

vi.mock("openai", () => ({
  default: class {
    chat = { completions: { create: vi.fn(async () => { throw new Error("AI not used in this test"); }) } };
  },
}));

const ORG1 = "11111111-1111-4111-8111-111111111111";
const ORG2 = "22222222-2222-4222-8222-222222222222";

let pg: import("@electric-sql/pglite").PGlite;
let server: import("http").Server;
let base: string;

beforeAll(async () => {
  h.state.orgId = ORG1;
  pg = (await h.dbPromise).client;
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
  const { default: router } = await import("../routes/checklist-report");
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.user = { id: "u1", email: h.state.email, role: h.state.role };
    next();
  });
  app.use("/api/checklist-report", router);
  await new Promise<void>((resolve) => { server = app.listen(0, () => resolve()); });
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});

afterAll(async () => {
  server?.close();
  await pg?.close();
});

async function api(method: string, path: string, body?: any) {
  const res = await fetch(`${base}/api/checklist-report${path}`, {
    method,
    headers: { "content-type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* not json */ }
  return { status: res.status, body: json };
}

async function addManual(filename: string) {
  const text = `Operations manual ${filename}. `.repeat(20);
  const fd = new FormData();
  fd.append("files", new Blob([text], { type: "text/plain" }), filename);
  const res = await fetch(`${base}/api/checklist-report/manual`, { method: "POST", body: fd });
  expect(res.status).toBe(201);
  return (await res.json()).manuals[0] as { id: string };
}

let itemId: string;
let manualA: string;

describe("approve operation into manual", () => {
  it("seeds checklist, manual, and a legacy finding without suggested_operation", async () => {
    const imp = await api("POST", "/import", {
      text: "1-01 | Instructor records | 142.13 | Management\n1-02 | Facility checks | 142.15 | Management",
      confirm: true,
    });
    expect(imp.status).toBe(200);
    manualA = (await addManual("vol-a.txt")).id;
    const items = (await api("GET", "/checklist")).body.areas[0].items;
    itemId = items[0].id;

    // Legacy-shape finding (no suggested_operation) hashed against current set.
    const crypto = await import("crypto");
    const hash = crypto.createHash("md5").update([manualA].sort().join(",")).digest("hex");
    await pg.query(
      `INSERT INTO bccs_checklist_ai_findings (organization_id, item_id, manual_id, manual_set_hash, verdict, excerpt, remediation)
       VALUES ($1, $2, $3, $4, 'not_addressed', '', 'Add an instructor records procedure.')`,
      [ORG1, itemId, manualA, hash],
    );
    const item = (await api("GET", "/checklist")).body.areas[0].items[0];
    expect(item.aiFinding.remediation).toBe("Add an instructor records procedure.");
    expect(item.aiFinding.suggested_operation ?? null).toBeNull(); // legacy shape still served
    expect(item.approval).toBeNull();
  });

  it("rejects viewers (403) and bad payloads (400)", async () => {
    h.state.role = "viewer";
    expect((await api("POST", `/items/${itemId}/approve-operation`, { operationText: "x".repeat(300) })).status).toBe(403);
    h.state.role = "admin";
    expect((await api("POST", `/items/${itemId}/approve-operation`, { operationText: "   " })).status).toBe(400);
    expect((await api("POST", `/items/${itemId}/approve-operation`, { operationText: "x".repeat(8001) })).status).toBe(400);
  });

  it("approves edited text into the single manual: appended section, revision bump, provenance", async () => {
    const opText = "The Training Manager maintains instructor qualification records for each instructor. Records are reviewed quarterly and retained for 24 months.";
    const r = await api("POST", `/items/${itemId}/approve-operation`, { operationText: opText });
    expect(r.status).toBe(201);
    expect(r.body.revision).toBe(2);
    expect(r.body.manualId).toBe(manualA);

    const { rows } = await pg.query<any>(`SELECT extracted_text, revision FROM bccs_ops_manuals WHERE id = $1`, [manualA]);
    expect(rows[0].revision).toBe(2);
    expect(rows[0].extracted_text).toContain("APPROVED OPERATION — Checklist item 1-01");
    expect(rows[0].extracted_text).toContain(opText);
    expect(rows[0].extracted_text.startsWith("Operations manual vol-a.txt.")).toBe(true); // original preserved

    const { rows: appr } = await pg.query<any>(
      `SELECT * FROM bccs_checklist_operation_approvals WHERE organization_id = $1 AND item_id = $2`, [ORG1, itemId]);
    expect(appr).toHaveLength(1);
    expect(appr[0]).toMatchObject({ manual_id: manualA, revision: 2, operation_text: opText, approved_by: "admin@acme.com" });

    // History recorded the revision with the item-linked summary.
    const hist = await api("GET", `/manual/${manualA}/revisions`);
    expect(hist.body.revisions[0]).toMatchObject({ revision: 2, change_summary: "Approved operation for checklist item 1-01" });

    // Checklist now reports the approval and the finding is stale (content changed).
    const item = (await api("GET", "/checklist")).body.areas[0].items[0];
    expect(item.approval).toMatchObject({ manualId: manualA, revision: 2, approvedBy: "admin@acme.com" });
    expect(item.aiFinding.stale).toBe(true);
    expect((await api("GET", "/manual")).body.reviewStale).toBe(true);
  });

  it("requires a manual choice when several are on file, and 404s an alien manual id", async () => {
    const manualB = (await addManual("vol-b.txt")).id;
    const noChoice = await api("POST", `/items/${itemId}/approve-operation`, { operationText: "Some operation text." });
    expect(noChoice.status).toBe(400);
    expect(noChoice.body.message).toMatch(/choose which manual/i);
    const alien = await api("POST", `/items/${itemId}/approve-operation`, { operationText: "Some operation text.", manualId: ORG2 });
    expect(alien.status).toBe(404);
    // Explicit choice works.
    const ok = await api("POST", `/items/${itemId}/approve-operation`, { operationText: "Another operation.", manualId: manualB });
    expect(ok.status).toBe(201);
    expect(ok.body.revision).toBe(2);
  });

  it("concurrent approvals to the same manual both survive (no lost sections)", async () => {
    const items = (await api("GET", "/checklist")).body.areas[0].items;
    const otherItem = items[1].id;
    const [r1, r2] = await Promise.all([
      api("POST", `/items/${itemId}/approve-operation`, { operationText: "Concurrent operation ALPHA.", manualId: manualA }),
      api("POST", `/items/${otherItem}/approve-operation`, { operationText: "Concurrent operation BRAVO.", manualId: manualA }),
    ]);
    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
    expect(new Set([r1.body.revision, r2.body.revision]).size).toBe(2); // distinct revisions
    const { rows } = await pg.query<any>(`SELECT extracted_text FROM bccs_ops_manuals WHERE id = $1`, [manualA]);
    expect(rows[0].extracted_text).toContain("Concurrent operation ALPHA.");
    expect(rows[0].extracted_text).toContain("Concurrent operation BRAVO.");
  });

  it("denies cross-org access to the item (404), leaving no writes behind", async () => {
    h.state.orgId = ORG2;
    try {
      const r = await api("POST", `/items/${itemId}/approve-operation`, { operationText: "Hijack attempt." });
      expect(r.status).toBe(404);
    } finally {
      h.state.orgId = ORG1;
    }
    const { rows } = await pg.query<any>(
      `SELECT COUNT(*)::int AS n FROM bccs_checklist_operation_approvals WHERE organization_id = $1`, [ORG2]);
    expect(rows[0].n).toBe(0);
  });
});
