/**
 * Full-coverage (map-reduce) AI review — run-state integrity on REAL SQL.
 *
 * The map/reduce endpoints keep all run state (evidence, progress, manual-set
 * hash) in bccs_checklist_review_runs. These tests exercise the real route
 * SQL on in-process Postgres (PGlite) with the production table shapes from
 * the router's own ensureTables():
 *   - map stores evidence server-side (jsonb round-trip), advances
 *     segments_done, and finishes with segments_done == total_segments
 *   - reduce compiles verdicts one batch per request, persists findings and
 *     a ratio-1 coverage row, and deletes the run
 *   - reduce without a completed run is refused (409)
 *   - a manual-set change mid-run invalidates the run (409)
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

// Map prompts get evidence for every item mentioned; reduce prompts get a
// "covered" finding per item — both parsed from the real prompt text.
vi.mock("openai", () => ({
  default: class {
    chat = {
      completions: {
        create: vi.fn(async ({ messages }: any) => {
          const prompt: string = messages[0].content;
          const ids = [...prompt.matchAll(/^\[([^\]]+)\]/gm)].map((m) => m[1]);
          const content = prompt.includes("compiling the final report")
            ? JSON.stringify({ findings: ids.map((id) => ({ itemId: id, verdict: "covered", excerpt: "records are retained", remediation: "" })) })
            : JSON.stringify({ evidence: ids.map((id) => ({ itemId: id, quote: "Instructor records are retained." })) });
          return { choices: [{ message: { content } }] };
        }),
      },
    };
  },
}));

const ORG1 = "11111111-1111-4111-8111-111111111111";

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

async function addManual(filename: string, text: string): Promise<string> {
  const fd = new FormData();
  fd.append("files", new Blob([text], { type: "text/plain" }), filename);
  const res = await fetch(`${base}/api/checklist-report/manual`, { method: "POST", body: fd });
  expect(res.status).toBe(201);
  const manuals = (await res.json()).manuals;
  return manuals[manuals.length - 1].id as string;
}

describe("map-reduce review run integrity (real SQL)", () => {
  let areaId: string;

  it("map scans all segments, storing evidence server-side", async () => {
    // Checklist with one area, two items.
    const imp = await api("POST", "/import", {
      text: "1-01 | Instructor records retained | 142.13 | Records\n1-02 | Records audited annually | 142.13 | Records",
      confirm: true,
    });
    expect(imp.status).toBe(200);
    const checklist = await api("GET", "/checklist");
    areaId = checklist.body.areas[0].id;

    // ~90k chars → several 16k segments (more than one MAP_PARALLEL window).
    await addManual("manual.txt", "Instructor records are retained per policy. ".repeat(2000));

    let segment: number | null = 0;
    let total = 0;
    while (segment !== null) {
      const map = await api("POST", `/review/${areaId}/map`, { segment });
      expect(map.status).toBe(200);
      expect(map.body.evidence).toBeUndefined(); // never round-tripped
      total = map.body.totalSegments;
      segment = map.body.nextSegment;
    }
    expect(total).toBeGreaterThan(1);

    const { rows } = await pg.query<any>(`SELECT * FROM bccs_checklist_review_runs WHERE organization_id = $1`, [ORG1]);
    expect(rows.length).toBe(1);
    expect(rows[0].segments_done).toBe(total);
    expect(Array.isArray(rows[0].evidence)).toBe(true);
    expect(rows[0].evidence.length).toBeGreaterThan(0);
  });

  it("reduce persists findings + full coverage and deletes the run", async () => {
    // One AI batch per request, then a DB-only finalize request.
    let reduce: any = { body: { done: false } };
    let guard = 0;
    while (!reduce.body.done) {
      reduce = await api("POST", `/review/${areaId}/reduce`);
      expect(reduce.status).toBe(200);
      expect(++guard).toBeLessThan(10);
    }
    expect(reduce.body.coverage.ratio).toBe(1);

    const findings = await pg.query<any>(`SELECT * FROM bccs_checklist_ai_findings WHERE organization_id = $1`, [ORG1]);
    expect(findings.rows.length).toBe(2);
    const coverage = await pg.query<any>(`SELECT * FROM bccs_checklist_area_coverage WHERE organization_id = $1 AND area_id = $2`, [ORG1, areaId]);
    expect(coverage.rows.length).toBe(1);
    expect(Number(coverage.rows[0].ratio)).toBe(1);
    expect(coverage.rows[0].excerpt_chars).toBe(coverage.rows[0].total_manual_chars);
    const runs = await pg.query<any>(`SELECT * FROM bccs_checklist_review_runs WHERE organization_id = $1`, [ORG1]);
    expect(runs.rows.length).toBe(0);
  });

  it("reduce without a run is refused", async () => {
    const reduce = await api("POST", `/review/${areaId}/reduce`);
    expect(reduce.status).toBe(409);
  });

  it("a manual-set change mid-run invalidates the run", async () => {
    const first = await api("POST", `/review/${areaId}/map`, { segment: 0 });
    expect(first.status).toBe(200);
    expect(first.body.nextSegment).not.toBeNull();

    await addManual("addendum.txt", "New addendum content about simulator maintenance schedules. ".repeat(10));

    const next = await api("POST", `/review/${areaId}/map`, { segment: first.body.nextSegment });
    expect(next.status).toBe(409);
    expect(next.body.message).toMatch(/changed/i);
    const reduce = await api("POST", `/review/${areaId}/reduce`);
    expect(reduce.status).toBe(409);
  });

  it("a checklist import mid-run invalidates the run (item ids change)", async () => {
    const first = await api("POST", `/review/${areaId}/map`, { segment: 0 });
    expect(first.status).toBe(200);
    expect(first.body.nextSegment).not.toBeNull();

    // Replace the checklist: same shape, but new item UUIDs — and the import
    // itself deletes any active runs.
    const imp = await api("POST", "/import", {
      text: "1-01 | Instructor records retained | 142.13 | Records\n1-02 | Records audited annually | 142.13 | Records",
      confirm: true,
    });
    expect(imp.status).toBe(200);
    const runs = await pg.query<any>(`SELECT * FROM bccs_checklist_review_runs WHERE organization_id = $1`, [ORG1]);
    expect(runs.rows.length).toBe(0);

    const checklist = await api("GET", "/checklist");
    const newAreaId = checklist.body.areas[0].id;
    const next = await api("POST", `/review/${newAreaId}/map`, { segment: first.body.nextSegment });
    expect(next.status).toBe(409);
    const reduce = await api("POST", `/review/${newAreaId}/reduce`);
    expect(reduce.status).toBe(409);
  });
});
