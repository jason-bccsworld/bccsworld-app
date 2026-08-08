/**
 * Coverage-note STALENESS tests for the Part 142 Checklist Report.
 *
 * bccs_checklist_area_coverage rows carry manual_set_hash (the fingerprint of
 * the manual set they were measured against), and GET /checklist marks
 * area.coverage.stale when the org's current manual set differs. A regression
 * here would silently show a fresh-looking coverage note against an outdated
 * manual set. The REAL route SQL runs on in-process Postgres (PGlite) with
 * the production table shapes created by the router's own ensureTables();
 * manuals are added/removed through the real POST /manual and
 * DELETE /manual/:id endpoints.
 *
 * Covered:
 *   - coverage whose hash matches the current manual set → stale: false
 *   - ADDING a manual → stale: true; removing it again (set restored) → false
 *   - REMOVING a set member → stale: true
 *   - legacy rows (NULL manual_set_hash) → always stale: true
 *   - empty manual set → stale: true even when the hash "matches" (empty)
 *   - POST /review/:areaId persists the current set hash, so the fresh
 *     measurement reports stale: false
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

// The AI answers every batch with a valid "covered" verdict per item so the
// review route runs end to end (coverage upsert incl. manual_set_hash)
// without external calls.
vi.mock("openai", () => ({
  default: class {
    chat = {
      completions: {
        create: vi.fn(async ({ messages }: any) => {
          const prompt: string = messages[0].content;
          const section = prompt.split("CHECKLIST ITEMS:")[1] || "";
          const ids = [...section.matchAll(/^\[([^\]]+)\]/gm)].map((m) => m[1]);
          return {
            choices: [{
              message: {
                content: JSON.stringify({
                  findings: ids.map((id) => ({
                    itemId: id, verdict: "covered", excerpt: "quote", remediation: "",
                  })),
                }),
              },
            }],
          };
        }),
      },
    };
  },
}));

const ORG1 = "11111111-1111-4111-8111-111111111111";

/* ── App / helpers ────────────────────────────────────────────────────────── */

let pg: import("@electric-sql/pglite").PGlite;
let server: import("http").Server;
let base: string;

beforeAll(async () => {
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
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

/** Upload a text document through the real POST /manual route; returns its id. */
async function addManual(filename: string, content?: string): Promise<string> {
  const text = content ?? `Operations manual ${filename}. Instructor records are retained. `.repeat(10);
  const fd = new FormData();
  fd.append("files", new Blob([text], { type: "text/plain" }), filename);
  const res = await fetch(`${base}/api/checklist-report/manual`, { method: "POST", body: fd });
  expect(res.status).toBe(201);
  return (await res.json()).manuals[0].id as string;
}

async function removeManual(id: string) {
  expect((await api("DELETE", `/manual/${id}`)).status).toBe(200);
}

/** Same fingerprint formula as the route: md5 of the sorted id list. */
const setHash = (ids: string[]) =>
  crypto.createHash("md5").update([...ids].sort().join(",")).digest("hex");

/** Upsert a coverage row with an explicit (possibly NULL) manual_set_hash. */
async function insertCoverage(areaId: string, hash: string | null) {
  await pg.query(
    `INSERT INTO bccs_checklist_area_coverage
       (organization_id, area_id, total_manual_chars, excerpt_chars, ratio, manual_set_hash)
     VALUES ($1, $2, 10000, 4200, 0.42, $3)
     ON CONFLICT (organization_id, area_id) DO UPDATE SET
       manual_set_hash = EXCLUDED.manual_set_hash, reviewed_at = NOW()`,
    [ORG1, areaId, hash],
  );
}

/** area.coverage per area id, as GET /checklist renders it. */
async function checklistCoverage(): Promise<Record<string, any>> {
  const r = await api("GET", "/checklist");
  expect(r.status).toBe(200);
  const out: Record<string, any> = {};
  for (const area of r.body.areas) out[area.id] = area.coverage;
  return out;
}

const IMPORT_TEXT =
  "1-01 | Instructor records | 142.13 | Management\n" +
  "1-02 | Facility checks | 142.15 | Management\n" +
  "2-01 | Curriculum approval | 142.37 | Training";

/* ── Tests (sequential story: one org, real add/remove mutations) ─────────── */

let areaIds: string[];
let manualA: string;
let manualB: string;

describe("coverage note staleness follows the manual set", () => {
  it("coverage measured against the current manual set is NOT stale", async () => {
    expect((await api("POST", "/import", { text: IMPORT_TEXT, confirm: true })).status).toBe(200);
    const list = await api("GET", "/checklist");
    areaIds = list.body.areas.map((a: any) => a.id);
    expect(areaIds).toHaveLength(2);

    manualA = await addManual("vol-a.txt");
    await insertCoverage(areaIds[0], setHash([manualA]));

    const cov = await checklistCoverage();
    expect(cov[areaIds[0]].stale).toBe(false);
    expect(cov[areaIds[1]]).toBeNull(); // un-reviewed area: no note at all
  });

  it("ADDING a manual flips the coverage note stale", async () => {
    manualB = await addManual("vol-b.txt");
    expect((await checklistCoverage())[areaIds[0]].stale).toBe(true);
  });

  it("REMOVING the added manual restores the original set → fresh again", async () => {
    await removeManual(manualB);
    expect((await checklistCoverage())[areaIds[0]].stale).toBe(false);
  });

  it("coverage of a two-manual set goes stale when a member is REMOVED", async () => {
    manualB = await addManual("vol-b.txt");
    await insertCoverage(areaIds[0], setHash([manualA, manualB]));
    expect((await checklistCoverage())[areaIds[0]].stale).toBe(false);

    await removeManual(manualA);
    expect((await checklistCoverage())[areaIds[0]].stale).toBe(true);
  });

  it("legacy rows with NULL manual_set_hash are always stale", async () => {
    // Current set is {B}; even though a fresh measurement would match, a
    // legacy row of unknown provenance must be flagged stale.
    await insertCoverage(areaIds[0], null);
    expect((await checklistCoverage())[areaIds[0]].stale).toBe(true);
  });

  it("with NO manuals on file, any coverage note is stale — even a hash 'match'", async () => {
    // Hash of the empty set: without the manualIds.length === 0 guard this
    // would wrongly compare equal and render fresh.
    await insertCoverage(areaIds[0], setHash([]));
    await removeManual(manualB);
    expect((await checklistCoverage())[areaIds[0]].stale).toBe(true);
  });

  it("POST /review/:areaId persists the current set hash → fresh coverage note", async () => {
    manualA = await addManual("vol-a.txt");
    const rev = await api("POST", `/review/${areaIds[0]}`);
    expect(rev.status).toBe(200);
    expect(rev.body.success).toBe(true);

    const row = await pg.query(
      `SELECT manual_set_hash FROM bccs_checklist_area_coverage
       WHERE organization_id = $1 AND area_id = $2`,
      [ORG1, areaIds[0]],
    );
    expect((row.rows[0] as any).manual_set_hash).toBe(setHash([manualA]));
    expect((await checklistCoverage())[areaIds[0]].stale).toBe(false);
  });
});
