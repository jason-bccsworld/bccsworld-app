/**
 * AI coverage score snapshot tests for the Part 142 Checklist Report.
 *
 * A user-initiated review run (the all-area map/reduce sweep the checklist
 * page drives) must record exactly ONE org-scoped score snapshot when it
 * completes — via POST /score-snapshot, called by the client at the end of
 * the sweep. Snapshots power the score-over-time trend, so consecutive runs
 * with the SAME score must each keep their own timestamped entry (a flat
 * trend is evidence of stability). Exercised against the REAL route SQL on
 * in-process Postgres (PGlite) with the production tables from the router's
 * own ensureTables().
 *
 * Covered:
 *   - a full multi-area map/reduce run + one POST /score-snapshot records
 *     exactly one snapshot with the org-wide score and reviewed counts
 *   - a second identical run records a second snapshot with the same score
 *     (equal-score runs are preserved, never deduped away)
 *   - an improved run raises the score and GET /checklist returns
 *     scoreHistory oldest → newest
 *   - POST /score-snapshot with no current verdicts is refused (409)
 *   - POST /reset clears snapshots alongside findings
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
  // Mutable verdict the mocked AI answers with — lets tests move the score.
  ai: { verdict: "partial" as string },
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
// finding with the (mutable) test verdict per item — parsed from the real
// prompt text, so the routes run end to end without external calls.
vi.mock("openai", () => ({
  default: class {
    chat = {
      completions: {
        create: vi.fn(async ({ messages }: any) => {
          const prompt: string = messages[0].content;
          const ids = [...prompt.matchAll(/^\[([^\]]+)\]/gm)].map((m) => m[1]);
          const content = prompt.includes("compiling the final report")
            ? JSON.stringify({ findings: ids.map((id) => ({ itemId: id, verdict: h.ai.verdict, excerpt: "records are retained", remediation: "" })) })
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

async function addManual(filename: string): Promise<void> {
  const text = `Operations manual ${filename}. Instructor records are retained. `.repeat(10);
  const fd = new FormData();
  fd.append("files", new Blob([text], { type: "text/plain" }), filename);
  const res = await fetch(`${base}/api/checklist-report/manual`, { method: "POST", body: fd });
  expect(res.status).toBe(201);
}

/** Drive one full user review run exactly like the checklist page does:
 * map every segment then reduce every batch for EVERY area, then record the
 * run's single score snapshot. */
async function runFullReview(areaIds: string[]): Promise<any> {
  for (const areaId of areaIds) {
    let segment: number | null = 0;
    while (segment !== null) {
      const map = await api("POST", `/review/${areaId}/map`, { segment });
      expect(map.status).toBe(200);
      segment = map.body.nextSegment ?? null;
    }
    let done = false;
    let guard = 0;
    while (!done) {
      const reduce = await api("POST", `/review/${areaId}/reduce`);
      expect(reduce.status).toBe(200);
      done = !!reduce.body.done;
      expect(++guard).toBeLessThan(10);
    }
  }
  const snap = await api("POST", "/score-snapshot");
  expect(snap.status).toBe(200);
  return snap.body;
}

async function snapshotRows(): Promise<any[]> {
  const r = await pg.query(
    `SELECT score, reviewed_items, covered_count, partial_count, not_addressed_count, created_at
     FROM bccs_checklist_score_snapshots WHERE organization_id = $1
     ORDER BY created_at ASC, id ASC`,
    [ORG1],
  );
  return r.rows as any[];
}

const IMPORT_TEXT =
  "1-01 | Instructor records | 142.13 | Management\n" +
  "1-02 | Facility checks | 142.15 | Management\n" +
  "2-01 | Curriculum approval | 142.37 | Training";

/* ── Tests ────────────────────────────────────────────────────────────────── */

describe("AI coverage score snapshots (one per completed review run)", () => {
  let areaIds: string[];

  it("snapshotting before any review is refused (no current verdicts)", async () => {
    expect((await api("POST", "/import", { text: IMPORT_TEXT, confirm: true })).status).toBe(200);
    const list = await api("GET", "/checklist");
    areaIds = list.body.areas.map((a: any) => a.id);
    expect(areaIds).toHaveLength(2);
    await addManual("ops-manual.txt");

    expect((await api("POST", "/score-snapshot")).status).toBe(409);
    expect(await snapshotRows()).toEqual([]);
  });

  it("a full multi-area run records exactly ONE snapshot with the org-wide score", async () => {
    h.ai.verdict = "partial";
    const res = await runFullReview(areaIds);
    expect(res.recorded).toBe(true);
    expect(res.snapshot).toMatchObject({ score: 50, reviewedItems: 3, partial: 3, covered: 0 });

    const snaps = await snapshotRows();
    expect(snaps).toHaveLength(1); // one per run — no per-area intermediate points
    expect(Number(snaps[0].score)).toBe(50);
    expect(Number(snaps[0].reviewed_items)).toBe(3);
    expect(snaps[0].created_at).toBeTruthy();
  });

  it("a second identical run keeps its own snapshot — equal scores are never deduped", async () => {
    await runFullReview(areaIds);
    const snaps = await snapshotRows();
    expect(snaps).toHaveLength(2);
    expect(snaps.map((s) => Number(s.score))).toEqual([50, 50]);
  });

  it("an improved run raises the score; GET /checklist returns the trend oldest → newest", async () => {
    h.ai.verdict = "covered";
    await runFullReview(areaIds);

    const snaps = await snapshotRows();
    expect(snaps.map((s) => Number(s.score))).toEqual([50, 50, 100]);

    const list = await api("GET", "/checklist");
    expect(list.status).toBe(200);
    expect(list.body.scoreHistory.map((s: any) => s.score)).toEqual([50, 50, 100]);
    const last = list.body.scoreHistory[2];
    expect(last).toMatchObject({ reviewedItems: 3, covered: 3, partial: 0, notAddressed: 0 });
    expect(typeof last.score).toBe("number");
    expect(last.createdAt).toBeTruthy();
  });

  it("POST /reset clears snapshots alongside findings", async () => {
    expect((await api("POST", "/reset")).status).toBe(200);
    expect(await snapshotRows()).toEqual([]);
    const list = await api("GET", "/checklist");
    expect(list.body.scoreHistory).toEqual([]);
  });

  it("long engagements: all stored snapshots are returned, not just the latest 20", async () => {
    // Seed 25 dated snapshots directly — a long engagement's history.
    for (let i = 0; i < 25; i++) {
      await pg.query(
        `INSERT INTO bccs_checklist_score_snapshots
           (organization_id, score, reviewed_items, covered_count, partial_count, not_addressed_count, created_at)
         VALUES ($1, $2, 3, 0, 3, 0, NOW() - ($3 || ' days')::interval)`,
        [ORG1, 40 + i, String(25 - i)],
      );
    }
    const list = await api("GET", "/checklist");
    expect(list.status).toBe(200);
    expect(list.body.scoreHistory).toHaveLength(25);
    // Oldest → newest, including the earliest points that a LIMIT 20 would drop.
    expect(list.body.scoreHistory.map((s: any) => s.score)).toEqual(
      Array.from({ length: 25 }, (_, i) => 40 + i),
    );
  });
});
