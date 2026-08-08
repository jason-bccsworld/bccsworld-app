/**
 * Coverage-note persistence tests for the Part 142 Checklist Report.
 *
 * The coverage note ("how much of the manual set the AI review consulted")
 * must survive page reloads: the review route persists a per-area
 * bccs_checklist_area_coverage row, GET /checklist joins it back onto each
 * area, and reset/import clear it alongside findings. A regression in any of
 * those would silently bring back the disappearing-note bug, so each seam is
 * exercised against the REAL route SQL on in-process Postgres (PGlite) with
 * the production table shapes created by the router's own ensureTables().
 *
 * Covered:
 *   - a stored coverage row is returned as area.coverage by GET /checklist
 *     (numeric fields, not raw strings); areas without a row get null
 *   - POST /review/:areaId UPSERTS the coverage row — an older row for the
 *     same (org, area) is replaced, not duplicated, and GET /checklist then
 *     reflects the new measurement
 *   - POST /reset deletes coverage rows alongside findings
 *   - POST /import (confirm) deletes coverage rows alongside findings
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import express from "express";

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

// The AI answers every batch with a valid "covered" verdict per item, parsed
// from the real prompt the route builds — so the review route runs end to end
// (findings upsert + coverage upsert) without external calls.
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

async function addManual(filename: string, content?: string): Promise<string> {
  const text = content ?? `Operations manual ${filename}. Instructor records are retained. `.repeat(10);
  const fd = new FormData();
  fd.append("files", new Blob([text], { type: "text/plain" }), filename);
  const res = await fetch(`${base}/api/checklist-report/manual`, { method: "POST", body: fd });
  expect(res.status).toBe(201);
  return (await res.json()).manuals[0].id as string;
}

async function insertCoverage(areaId: string, total: number, excerpt: number, ratio: number) {
  await pg.query(
    `INSERT INTO bccs_checklist_area_coverage (organization_id, area_id, total_manual_chars, excerpt_chars, ratio)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (organization_id, area_id) DO UPDATE SET
       total_manual_chars = EXCLUDED.total_manual_chars,
       excerpt_chars = EXCLUDED.excerpt_chars,
       ratio = EXCLUDED.ratio,
       reviewed_at = NOW()`,
    [ORG1, areaId, total, excerpt, ratio],
  );
}

async function coverageRows(): Promise<any[]> {
  const r = await pg.query(
    `SELECT area_id, total_manual_chars, excerpt_chars, ratio
     FROM bccs_checklist_area_coverage WHERE organization_id = $1 ORDER BY area_id`,
    [ORG1],
  );
  return r.rows as any[];
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

/* ── Tests ────────────────────────────────────────────────────────────────── */

describe("coverage note persistence (survives reloads, cleared on reset/import)", () => {
  let areaIds: string[];

  it("a stored coverage row comes back as area.coverage from GET /checklist; areas without one get null", async () => {
    expect((await api("POST", "/import", { text: IMPORT_TEXT, confirm: true })).status).toBe(200);
    const list = await api("GET", "/checklist");
    areaIds = list.body.areas.map((a: any) => a.id);
    expect(areaIds).toHaveLength(2);

    await insertCoverage(areaIds[0], 10_000, 4_200, 0.42);

    const cov = await checklistCoverage();
    expect(cov[areaIds[0]]).toMatchObject({
      totalManualChars: 10_000,
      excerptChars: 4_200,
      ratio: 0.42,
    });
    expect(cov[areaIds[0]].reviewedAt).toBeTruthy();
    // Values are numbers (not raw driver strings) so the client math works.
    expect(typeof cov[areaIds[0]].ratio).toBe("number");
    expect(typeof cov[areaIds[0]].totalManualChars).toBe("number");
    // The un-reviewed area carries no coverage note.
    expect(cov[areaIds[1]]).toBeNull();
  });

  it("POST /review/:areaId upserts the coverage row, replacing the older measurement", async () => {
    await addManual("ops-manual.txt");

    const before = await coverageRows();
    expect(before).toEqual([
      expect.objectContaining({ area_id: areaIds[0], ratio: 0.42 }),
    ]);

    const rev = await api("POST", `/review/${areaIds[0]}`);
    expect(rev.status).toBe(200);
    expect(rev.body.success).toBe(true);
    expect(rev.body.coverage.ratio).toBeGreaterThan(0);
    expect(rev.body.coverage.ratio).toBeLessThanOrEqual(1);

    // Still exactly ONE row for this (org, area) — replaced, not duplicated —
    // and the stale 0.42 measurement is gone.
    const after = await coverageRows();
    expect(after).toHaveLength(1);
    expect(after[0].area_id).toBe(areaIds[0]);
    expect(Number(after[0].ratio)).toBe(rev.body.coverage.ratio);
    expect(Number(after[0].ratio)).not.toBe(0.42);
    expect(Number(after[0].total_manual_chars)).toBe(rev.body.coverage.totalManualChars);
    expect(Number(after[0].excerpt_chars)).toBe(rev.body.coverage.excerptChars);

    // The reload surface reflects the new measurement.
    const cov = await checklistCoverage();
    expect(cov[areaIds[0]]).toMatchObject({
      totalManualChars: rev.body.coverage.totalManualChars,
      excerptChars: rev.body.coverage.excerptChars,
      ratio: rev.body.coverage.ratio,
    });
  });

  it("POST /reset clears coverage rows alongside findings", async () => {
    // Both a coverage row and findings exist from the review above.
    expect(await coverageRows()).toHaveLength(1);

    expect((await api("POST", "/reset")).status).toBe(200);

    expect(await coverageRows()).toEqual([]);
    const findings = await pg.query(
      `SELECT 1 FROM bccs_checklist_ai_findings WHERE organization_id = $1`, [ORG1],
    );
    expect(findings.rows).toEqual([]);
    // Reset re-seeds the built-in checklist; every area starts without a note.
    const cov = await checklistCoverage();
    expect(Object.values(cov).every((c) => c === null)).toBe(true);
  });

  it("POST /import (confirm) clears coverage rows alongside findings", async () => {
    // Seed a leftover coverage row for a built-in area, then import a
    // replacement checklist.
    const list = await api("GET", "/checklist");
    const builtInArea = list.body.areas[0].id;
    await insertCoverage(builtInArea, 5_000, 5_000, 1);
    expect(await coverageRows()).toHaveLength(1);

    expect((await api("POST", "/import", { text: IMPORT_TEXT, confirm: true })).status).toBe(200);

    expect(await coverageRows()).toEqual([]);
    const cov = await checklistCoverage();
    expect(Object.values(cov).every((c) => c === null)).toBe(true);
  });
});
