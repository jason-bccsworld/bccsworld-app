/**
 * End-to-end staleness tests for AI findings in the Part 142 Checklist Report.
 *
 * The REAL route SQL (DISTINCT ON latest-finding selection, manual-set
 * queries) runs against an in-process Postgres (PGlite) with the production
 * table shapes created by the router's own ensureTables(). Manual documents
 * are added/removed through the real POST /manual and DELETE /manual/:id
 * endpoints, and staleness is asserted across every surface that renders it:
 *   - GET /checklist        → aiFinding.stale per item
 *   - GET /manual           → reviewStale
 *   - GET /export.xlsx path → aiStale per item (captured at the workbook
 *                             builder boundary, real workbook still built)
 *
 * Covered scenarios:
 *   - fresh finding (hash matches current set) is NOT stale
 *   - legacy finding (NULL manual_set_hash) is fresh only when the set is
 *     exactly its single manual_id
 *   - ADD a document   → all findings flip stale everywhere
 *   - REMOVE it again  → set hash restored → findings fresh again
 *   - REMOVE a set member → stale (legacy finding included)
 *   - re-adding the same file content does NOT restore freshness (new id)
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import express from "express";
import crypto from "crypto";

/* ── Real Postgres (PGlite) behind the drizzle db mock ────────────────────── */

const h = vi.hoisted(() => ({
  dbPromise: (async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const client = new PGlite();
    return { client, db: drizzle(client) };
  })(),
  workbookArgs: [] as any[],
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
  requireOrg: () => ORG1,
  isPlatformStaff: (email?: string) => !!email && email.toLowerCase().endsWith("@bccsworld.com"),
}));

vi.mock("openai", () => ({
  default: class {
    chat = { completions: { create: vi.fn(async () => { throw new Error("AI not used in this test"); }) } };
  },
}));

// Capture what the export route hands to the workbook builder (aiStale per
// item) while still producing a real workbook.
vi.mock("../services/checklist-excel", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    buildChecklistWorkbook: async (args: any) => {
      h.workbookArgs.push(args);
      return actual.buildChecklistWorkbook(args);
    },
  };
});

const ORG1 = "11111111-1111-4111-8111-111111111111";

/* ── App / helpers ────────────────────────────────────────────────────────── */

let pg: import("@electric-sql/pglite").PGlite;
let server: import("http").Server;
let base: string;

beforeAll(async () => {
  pg = (await h.dbPromise).client;
  // Org identity table used by the checklist + export headers.
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

  // Importing the router runs the real ensureTables() DDL against PGlite.
  const { default: router } = await import("../routes/checklist-report");
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.user = { id: "admin1", email: "admin@acme.com", role: "admin" };
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
  try { json = await res.json(); } catch { /* binary or empty */ }
  return { status: res.status, body: json };
}

/** Upload a text document through the real POST /manual route; returns its id. */
async function addManual(filename: string, content?: string): Promise<string> {
  const text = content ?? `Operations manual ${filename}. `.repeat(20); // > 200 chars
  const fd = new FormData();
  fd.append("files", new Blob([text], { type: "text/plain" }), filename);
  const res = await fetch(`${base}/api/checklist-report/manual`, { method: "POST", body: fd });
  expect(res.status).toBe(201);
  const body = await res.json();
  return body.manuals[0].id as string;
}

async function removeManual(id: string) {
  expect((await api("DELETE", `/manual/${id}`)).status).toBe(200);
}

/** Same fingerprint formula as the route: md5 of the sorted id list. */
const setHash = (ids: string[]) =>
  crypto.createHash("md5").update([...ids].sort().join(",")).digest("hex");

async function insertFinding(itemId: string, manualId: string, hash: string | null) {
  await pg.query(
    `INSERT INTO bccs_checklist_ai_findings (organization_id, item_id, manual_id, manual_set_hash, verdict, excerpt, remediation)
     VALUES ($1, $2, $3, $4, 'covered', 'quote', '')
     ON CONFLICT (organization_id, item_id) DO UPDATE SET
       manual_id = EXCLUDED.manual_id, manual_set_hash = EXCLUDED.manual_set_hash, reviewed_at = NOW()`,
    [ORG1, itemId, manualId, hash],
  );
}

/** Staleness as seen by each surface, keyed by checklist item id/number. */
async function checklistStale(): Promise<Record<string, boolean | null>> {
  const r = await api("GET", "/checklist");
  expect(r.status).toBe(200);
  const out: Record<string, boolean | null> = {};
  for (const area of r.body.areas) {
    for (const item of area.items) out[item.id] = item.aiFinding ? item.aiFinding.stale : null;
  }
  return out;
}

async function manualReviewStale(): Promise<boolean> {
  const r = await api("GET", "/manual");
  expect(r.status).toBe(200);
  return r.body.reviewStale;
}

async function exportStale(): Promise<Record<string, boolean>> {
  h.workbookArgs.length = 0;
  const res = await fetch(`${base}/api/checklist-report/export.xlsx`);
  expect(res.status).toBe(200);
  const buf = Buffer.from(await res.arrayBuffer());
  expect(buf.subarray(0, 2).toString()).toBe("PK"); // real workbook produced
  expect(h.workbookArgs).toHaveLength(1);
  const out: Record<string, boolean> = {};
  for (const area of h.workbookArgs[0].areas) {
    for (const item of area.items) out[item.number] = item.aiStale;
  }
  return out;
}

/* ── Tests (sequential story: one org, real add/remove mutations) ─────────── */

let item1: string; // finding WITH manual_set_hash
let item2: string; // legacy finding, NULL hash
let num1: string;
let num2: string;
let manualA: string;
let manualB: string;

describe("finding staleness follows the manual set across every surface", () => {
  it("seeds a small checklist and uploads the first manual", async () => {
    const imp = await api("POST", "/import", {
      text: "1-01 | Instructor records | 142.13 | Management\n1-02 | Facility checks | 142.15 | Management",
      confirm: true,
    });
    expect(imp.status).toBe(200);

    manualA = await addManual("vol-a.txt");

    const list = await api("GET", "/checklist");
    const items = list.body.areas[0].items;
    expect(items).toHaveLength(2);
    [item1, item2] = [items[0].id, items[1].id];
    [num1, num2] = [items[0].number, items[1].number];

    // Simulate a completed review against the current set {A}:
    // item1 gets a hashed finding, item2 a legacy (NULL-hash) finding.
    await insertFinding(item1, manualA, setHash([manualA]));
    await insertFinding(item2, manualA, null);
  });

  it("findings matching the current set are fresh on all surfaces (incl. legacy single-manual)", async () => {
    expect(await checklistStale()).toEqual({ [item1]: false, [item2]: false });
    expect(await manualReviewStale()).toBe(false);
    expect(await exportStale()).toEqual({ [num1]: false, [num2]: false });
  });

  it("ADDING a document flips every finding stale everywhere", async () => {
    manualB = await addManual("vol-b.txt");
    expect(await checklistStale()).toEqual({ [item1]: true, [item2]: true });
    expect(await manualReviewStale()).toBe(true);
    expect(await exportStale()).toEqual({ [num1]: true, [num2]: true });
  });

  it("REMOVING the added document restores the original set → fresh again", async () => {
    await removeManual(manualB);
    expect(await checklistStale()).toEqual({ [item1]: false, [item2]: false });
    expect(await manualReviewStale()).toBe(false);
    expect(await exportStale()).toEqual({ [num1]: false, [num2]: false });
  });

  it("a review of the two-document set is fresh, then REMOVING a member flips it stale", async () => {
    manualB = await addManual("vol-b.txt");
    // Re-review against the new set {A, B} (legacy item2 now hashed too).
    await insertFinding(item1, manualA, setHash([manualA, manualB]));
    await insertFinding(item2, manualA, setHash([manualA, manualB]));
    expect(await checklistStale()).toEqual({ [item1]: false, [item2]: false });
    expect(await exportStale()).toEqual({ [num1]: false, [num2]: false });

    await removeManual(manualA);
    expect(await checklistStale()).toEqual({ [item1]: true, [item2]: true });
    expect(await manualReviewStale()).toBe(true);
    expect(await exportStale()).toEqual({ [num1]: true, [num2]: true });
  });

  it("re-uploading identical content does NOT fake freshness (new document id, new hash)", async () => {
    // Set is currently {B}; findings hashed against old {A, B}.
    const manualA2 = await addManual("vol-a.txt"); // same name/content, new row
    expect(manualA2).not.toBe(manualA);
    expect(await checklistStale()).toEqual({ [item1]: true, [item2]: true });
    expect(await manualReviewStale()).toBe(true);
    expect(await exportStale()).toEqual({ [num1]: true, [num2]: true });
  });

  it("a legacy (NULL-hash) finding is stale whenever more than its one manual is on file", async () => {
    // Current set is {B, A2} — two documents.
    await insertFinding(item2, manualB, null); // legacy, reviewed against B alone
    expect((await checklistStale())[item2]).toBe(true);

    // Shrink the set to exactly {B}: legacy finding becomes fresh again.
    const manuals = (await api("GET", "/manual")).body.manuals as any[];
    for (const m of manuals) if (m.id !== manualB) await removeManual(m.id);
    expect((await checklistStale())[item2]).toBe(false);
  });

  it("with NO manuals on file, every finding is stale", async () => {
    await removeManual(manualB);
    expect(await checklistStale()).toEqual({ [item1]: true, [item2]: true });
    // /manual reports no set at all (reviewStale false by contract when empty)
    const r = await api("GET", "/manual");
    expect(r.body.manuals).toEqual([]);
    expect(await exportStale()).toEqual({ [num1]: true, [num2]: true });
  });
});
