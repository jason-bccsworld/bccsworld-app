/**
 * Opportunity work-package generation — deterministic risk flags + real-SQL
 * route behavior (PGlite, production table shapes from db-init).
 *
 *  - opportunityRiskFlags: tier/veto rules are pure code (deadline passed is
 *    a veto → critical tier; imminent/near deadlines, set-aside, missing
 *    NAICS, sparse dossier, early-stage notice each add points)
 *  - POST /opportunities/:id/workpackage on real SQL:
 *      * viewer is refused (403)
 *      * org scoping enforced (another org's opportunity → 404)
 *      * regeneration adds no duplicate checklist or evidence rows, and
 *        AI items are deduped by label even when their keys vary run-to-run
 *      * AI failure still returns a package with the full base checklist
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
  state: {
    orgId: "org-1",
    role: "admin",
    // Controls the mocked OpenAI call: "ok" returns aiItems, "fail" throws.
    aiMode: "ok" as "ok" | "fail",
    aiItems: [] as { key: string; label: string }[],
    aiCalls: 0,
  },
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

// The route only needs getEmailAlertSettings from this module (unused by the
// workpackage endpoint); stub it to avoid pulling nodemailer into the test.
vi.mock("../services/email-alerts", () => ({
  getEmailAlertSettings: async () => ({ criticalFindingsEnabled: true, extraRecipients: [] }),
}));

vi.mock("openai", () => ({
  default: class {
    chat = {
      completions: {
        create: vi.fn(async () => {
          h.state.aiCalls++;
          if (h.state.aiMode === "fail") {
            const err: any = new Error("boom");
            err.status = 500;
            throw err;
          }
          return {
            choices: [{ message: { content: JSON.stringify({ items: h.state.aiItems }) } }],
          };
        }),
      },
    };
  },
}));

const ORG1 = "org-1";
const ORG2 = "org-2";

let pg: import("@electric-sql/pglite").PGlite;
let server: import("http").Server;
let base: string;
let riskFlags: typeof import("../routes/federal-contracts").opportunityRiskFlags;
let tierFor: typeof import("../services/federal-contracts-monitor").tierFor;

const daysFromNow = (days: number) => {
  const d = new Date(Date.now() + days * 86_400_000);
  return d.toISOString().slice(0, 10);
};

beforeAll(async () => {
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "test-key";
  pg = (await h.dbPromise).client;
  await pg.exec(`
    CREATE TABLE bccs_fedcon_opportunities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id VARCHAR(200) NOT NULL,
      notice_id VARCHAR(200) NOT NULL,
      title TEXT,
      agency VARCHAR(300),
      naics VARCHAR(50),
      psc VARCHAR(50),
      set_aside VARCHAR(100),
      notice_type VARCHAR(100),
      posted_date DATE,
      response_deadline DATE,
      url TEXT,
      dossier JSONB DEFAULT '{}',
      status VARCHAR(30) NOT NULL DEFAULT 'tracking',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (org_id, notice_id)
    );
    CREATE TABLE bccs_fedcon_checklist (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id VARCHAR(200) NOT NULL,
      subject_type VARCHAR(30) NOT NULL,
      subject_id VARCHAR(300) NOT NULL,
      item_key VARCHAR(100) NOT NULL,
      label TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'not_started',
      note TEXT,
      updated_by VARCHAR(200),
      updated_at TIMESTAMP DEFAULT NOW(),
      ai_audit JSONB,
      answer TEXT,
      ai_guidance JSONB,
      requirement_context TEXT,
      UNIQUE (org_id, subject_type, subject_id, item_key)
    );
    CREATE UNIQUE INDEX "UQ_fedcon_checklist_label"
    ON bccs_fedcon_checklist (org_id, subject_type, subject_id, LOWER(label));
    CREATE TABLE bccs_fedcon_evidence (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id VARCHAR(200) NOT NULL,
      subject_type VARCHAR(30) NOT NULL,
      subject_id VARCHAR(300) NOT NULL,
      entry_type VARCHAR(20) NOT NULL DEFAULT 'fact',
      content TEXT NOT NULL,
      source_ref TEXT,
      created_by VARCHAR(200),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  const routes = await import("../routes/federal-contracts");
  riskFlags = routes.opportunityRiskFlags;
  tierFor = (await import("../services/federal-contracts-monitor")).tierFor;

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

async function insertOpp(orgId: string, noticeId: string, cols: Record<string, any> = {}): Promise<string> {
  const opp = {
    title: "Test Opportunity",
    agency: "GSA",
    naics: "541511",
    set_aside: null,
    notice_type: "Solicitation",
    response_deadline: daysFromNow(60),
    url: "https://sam.gov/opp/x",
    dossier: JSON.stringify({ summary: "A summary", scope: "A scope" }),
    ...cols,
  };
  const { rows } = await pg.query<any>(
    `INSERT INTO bccs_fedcon_opportunities (org_id, notice_id, title, agency, naics, set_aside, notice_type, response_deadline, url, dossier)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb) RETURNING id`,
    [orgId, noticeId, opp.title, opp.agency, opp.naics, opp.set_aside, opp.notice_type, opp.response_deadline, opp.url, opp.dossier],
  );
  return rows[0].id;
}

async function generate(oppId: string) {
  const res = await fetch(`${base}/api/federal-contracts/opportunities/${oppId}/workpackage`, { method: "POST" });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

const counts = async (subjectId: string) => ({
  checklist: Number((await pg.query<any>(`SELECT COUNT(*) c FROM bccs_fedcon_checklist WHERE subject_id = $1`, [subjectId])).rows[0].c),
  evidence: Number((await pg.query<any>(`SELECT COUNT(*) c FROM bccs_fedcon_evidence WHERE subject_id = $1`, [subjectId])).rows[0].c),
});

describe("opportunityRiskFlags (deterministic rules)", () => {
  const rich = { response_deadline: daysFromNow(60), naics: "541511", dossier: { summary: "s" }, notice_type: "Solicitation" };

  it("a passed deadline is a veto flag that forces the critical tier", () => {
    const flags = riskFlags({ ...rich, response_deadline: "2020-01-01" });
    const f = flags.find((x) => x.key === "deadline_passed");
    expect(f).toMatchObject({ points: 10, veto: true });
    expect(tierFor(flags.reduce((s, x) => s + x.points, 0), flags.some((x) => x.veto))).toBe("critical");
  });

  it("missing deadline flags no_deadline without a veto", () => {
    const flags = riskFlags({ ...rich, response_deadline: null });
    expect(flags.find((x) => x.key === "no_deadline")).toMatchObject({ points: 4, veto: false });
    expect(flags.some((x) => x.veto)).toBe(false);
  });

  it("tiers imminent (≤7d) above near (≤14d) deadlines; far deadlines add nothing", () => {
    expect(riskFlags({ ...rich, response_deadline: daysFromNow(3) }).find((x) => x.key === "deadline_imminent")?.points).toBe(7);
    expect(riskFlags({ ...rich, response_deadline: daysFromNow(10) }).find((x) => x.key === "deadline_near")?.points).toBe(4);
    const far = riskFlags(rich);
    expect(far.filter((x) => x.key.startsWith("deadline") || x.key === "no_deadline")).toHaveLength(0);
  });

  it("flags set-aside, missing NAICS, sparse dossier, and early-stage notices", () => {
    const flags = riskFlags({
      response_deadline: daysFromNow(60),
      set_aside: "8(a)",
      naics: null,
      dossier: {},
      notice_type: "Sources Sought",
    });
    const keys = flags.map((f) => f.key);
    expect(keys).toEqual(expect.arrayContaining(["set_aside_eligibility", "no_naics", "sparse_dossier", "early_stage"]));
    expect(flags.every((f) => !f.veto)).toBe(true);
    // 5 + 3 + 3 + 2 = 13 → still below the moderate threshold on its own
    expect(tierFor(flags.reduce((s, f) => s + f.points, 0), false)).toBe("low");
  });

  it("a clean, well-documented opportunity produces no flags", () => {
    expect(riskFlags(rich)).toHaveLength(0);
  });
});

describe("POST /opportunities/:id/workpackage (real SQL)", () => {
  it("viewers are refused", async () => {
    const oppId = await insertOpp(ORG1, "N-VIEWER");
    h.state.role = "viewer";
    const res = await generate(oppId);
    expect(res.status).toBe(403);
    h.state.role = "admin";
    expect((await counts("N-VIEWER")).checklist).toBe(0);
  });

  it("another org's opportunity is not reachable (404, no writes)", async () => {
    const otherOpp = await insertOpp(ORG2, "N-ORG2");
    h.state.orgId = ORG1;
    const res = await generate(otherOpp);
    expect(res.status).toBe(404);
    expect(await counts("N-ORG2")).toEqual({ checklist: 0, evidence: 0 });
  });

  it("regeneration adds no duplicate checklist/evidence rows; AI items dedupe by label", async () => {
    const oppId = await insertOpp(ORG1, "N-REGEN");
    h.state.aiMode = "ok";
    h.state.aiItems = [{ key: "cmmc_check", label: "Confirm CMMC Level 2 certification status" }];

    const first = await generate(oppId);
    expect(first.status).toBe(200);
    expect(first.body.aiUsed).toBe(true);
    expect(first.body.checklistAdded).toBe(9); // 8 base + 1 AI
    expect(first.body.evidenceSeeded).toBe(true);
    const after1 = await counts("N-REGEN");
    expect(after1.checklist).toBe(9);
    expect(after1.evidence).toBeGreaterThan(0);

    // Second run: same AI label under a NEW key — must not create a new row.
    h.state.aiItems = [{ key: "cmmc_check_v2", label: "Confirm CMMC Level 2 certification status" }];
    const second = await generate(oppId);
    expect(second.status).toBe(200);
    expect(second.body.checklistAdded).toBe(0);
    expect(second.body.evidenceSeeded).toBe(false);
    expect(await counts("N-REGEN")).toEqual(after1);

    // Risk scoreboard persisted on the dossier both times.
    const { rows } = await pg.query<any>(`SELECT dossier FROM bccs_fedcon_opportunities WHERE id = $1`, [oppId]);
    expect(rows[0].dossier.workPackage.risk.tier).toBeDefined();
    expect(rows[0].dossier.summary).toBe("A summary"); // existing dossier preserved
  });

  it("two concurrent generations never duplicate AI labels (keys vary run-to-run)", async () => {
    const oppId = await insertOpp(ORG1, "N-RACE");
    h.state.aiMode = "ok";
    // Each AI run hands back the same label under a different key — the
    // read-then-filter dedupe can't see the other in-flight request, so only
    // the unique label index prevents a duplicate row.
    let call = 0;
    h.state.aiItems = [] as any;
    Object.defineProperty(h.state, "aiItems", {
      get: () => [{ key: `itar_review_v${++call}`, label: "Review ITAR export-control requirements" }],
      configurable: true,
    });
    const [a, b] = await Promise.all([generate(oppId), generate(oppId)]);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    // Restore plain property for later tests.
    Object.defineProperty(h.state, "aiItems", { value: [], writable: true, configurable: true });

    const rows = await pg.query<any>(
      `SELECT LOWER(label) l, COUNT(*) c FROM bccs_fedcon_checklist WHERE subject_id = $1 GROUP BY LOWER(label) HAVING COUNT(*) > 1`,
      ["N-RACE"],
    );
    expect(rows.rows).toEqual([]);
    expect((await counts("N-RACE")).checklist).toBe(9); // 8 base + exactly 1 AI row
    expect(a.body.checklistAdded + b.body.checklistAdded).toBe(9);
  });

  it("duplicate labels within a single AI batch are collapsed before insert", async () => {
    const oppId = await insertOpp(ORG1, "N-BATCHDUP");
    h.state.aiMode = "ok";
    h.state.aiItems = [
      { key: "dup_a", label: "Verify facility clearance level" },
      { key: "dup_b", label: "verify facility clearance level" },
    ];
    const res = await generate(oppId);
    expect(res.status).toBe(200);
    expect(res.body.checklistAdded).toBe(9); // 8 base + 1 (batch dupe collapsed)
    expect((await counts("N-BATCHDUP")).checklist).toBe(9);
  });

  it("AI failure still returns a package with the full base checklist", async () => {
    const oppId = await insertOpp(ORG1, "N-AIFAIL", { response_deadline: "2020-01-01" });
    h.state.aiMode = "fail";
    const res = await generate(oppId);
    expect(res.status).toBe(200);
    expect(res.body.aiUsed).toBe(false);
    expect(res.body.aiSkipReason).toMatch(/AI tailoring skipped/);
    expect(res.body.checklistAdded).toBe(8); // all base items, no AI rows
    expect(res.body.risk.tier).toBe("critical"); // deadline passed → veto
    const after = await counts("N-AIFAIL");
    expect(after.checklist).toBe(8);
    // Veto flag is seeded into evidence alongside the base seed rows.
    const flagRows = await pg.query<any>(
      `SELECT content FROM bccs_fedcon_evidence WHERE subject_id = $1 AND entry_type = 'flag' AND created_by = 'agent:federal-contracts-monitor'`,
      ["N-AIFAIL"],
    );
    expect(flagRows.rows.some((r) => /deadline passed/i.test(r.content))).toBe(true);
    h.state.aiMode = "ok";
  });
});

describe("PATCH /checklist/:id — application responses (real SQL)", () => {
  let itemId: string;

  beforeAll(async () => {
    const oppId = await insertOpp(ORG1, "N-ANSWER");
    h.state.aiMode = "ok";
    h.state.aiItems = [];
    await generate(oppId);
    const { rows } = await pg.query<any>(
      `SELECT id FROM bccs_fedcon_checklist WHERE org_id = $1 AND subject_id = 'N-ANSWER' ORDER BY item_key LIMIT 1`,
      [ORG1],
    );
    itemId = rows[0].id;
  });

  it("answer-only update persists the answer without requiring a status", async () => {
    const res = await fetch(`${base}/api/federal-contracts/checklist/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer: "Our AC-500 program covers this." }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.answer).toBe("Our AC-500 program covers this.");
    expect(body.status).toBe("not_started"); // untouched
  });

  it("status update without an answer preserves the saved answer", async () => {
    const res = await fetch(`${base}/api/federal-contracts/checklist/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "in_progress", note: "working" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("in_progress");
    expect(body.answer).toBe("Our AC-500 program covers this.");
  });

  it("status and answer can be updated together", async () => {
    const res = await fetch(`${base}/api/federal-contracts/checklist/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cleared", answer: "Final response." }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("cleared");
    expect(body.answer).toBe("Final response.");
  });

  it("a body with neither a valid status nor an answer is rejected", async () => {
    const res = await fetch(`${base}/api/federal-contracts/checklist/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: "just a note" }),
    });
    expect(res.status).toBe(400);
  });

  it("viewers cannot save answers", async () => {
    h.state.role = "viewer";
    const res = await fetch(`${base}/api/federal-contracts/checklist/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer: "viewer write" }),
    });
    expect(res.status).toBe(403);
    h.state.role = "admin";
  });

  it("another org's checklist item is not reachable", async () => {
    h.state.orgId = ORG2;
    const res = await fetch(`${base}/api/federal-contracts/checklist/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer: "cross-org write" }),
    });
    expect(res.status).toBe(404);
    h.state.orgId = ORG1;
    const { rows } = await pg.query<any>(`SELECT answer FROM bccs_fedcon_checklist WHERE id = $1`, [itemId]);
    expect(rows[0].answer).toBe("Final response.");
  });
});
