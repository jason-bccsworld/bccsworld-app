/**
 * Attachment-resume behavior on real SQL (PGlite) with a mocked network layer.
 *
 *  - The patrol's section-1b resume query (attachments_pending flag OR failed
 *    attachment rows, oldest first, within the leftover notice slots) runs
 *    against real PGlite — a regression in column names, the EXISTS subquery,
 *    ORDER BY, or LIMIT fails here, not just in production.
 *  - fetchNoticeAttachments sets attachments_pending TRUE while retryable work
 *    remains (failures or deferred targets) and clears it once a notice is
 *    fully fetched — asserted on real rows, not mocks.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  dbPromise: (async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const client = new PGlite();
    return { client, db: drizzle(client) };
  })(),
  state: {
    // Notices returned by the mocked SAM opportunity search ("new" this run).
    newOpps: [] as any[],
    // resourceLinks served per notice by the mocked SAM notice lookup.
    resourcesByNotice: {} as Record<string, string[]>,
    // Notices whose SAM resource lookup itself fails (deleted notice).
    lookupFailsFor: new Set<string>(),
    // Order in which the patrol asked SAM for a notice's resources — this is
    // the observable "which notices did attachment fetch touch, in what order".
    resourceLookups: [] as string[],
    // Per-URL responder for the mocked outbound download fetch.
    responder: (async (_url: string) => new Response("PDF bytes", { status: 200 })) as (url: string) => Promise<Response>,
  },
}));

vi.mock("../db", async () => {
  const { db } = await h.dbPromise;
  return { db, pool: {} };
});

vi.mock("../services/fedcon-data", () => ({
  samKeyAvailable: () => true,
  searchSamOpportunities: async () => h.state.newOpps,
  getSamNoticeResources: async (noticeId: string) => {
    h.state.resourceLookups.push(noticeId);
    if (h.state.lookupFailsFor.has(noticeId)) throw new Error("notice deleted");
    return { resourceLinks: h.state.resourcesByNotice[noticeId] ?? [], descriptionUrl: null };
  },
  checkSamExclusions: async () => ({ excluded: false, records: [] }),
  searchAwardsByRecipient: async () => [],
  searchAwardByPiid: async () => [],
  getAwardModifications: async () => ({ modificationCount: 0, recentModsWithin90Days: 0 }),
}));

// Text extraction is not under test (pdf-parse needs DOM polyfills).
vi.mock("../routes/checklist-report", () => ({
  extractText: async (filename: string, buffer: Buffer) => `extracted:${filename}:${buffer.length}`,
}));

vi.mock("../services/email-alerts", () => ({
  notifyCriticalFindings: async () => null,
  getEmailAlertSettings: async () => ({ criticalFindingsEnabled: false, extraRecipients: [] }),
}));

vi.mock("../services/agent-registry", () => ({
  startRun: async () => "run-1",
  finishRun: async () => {},
  emitAgentEvent: async () => {},
}));

vi.mock("openai", () => ({
  default: class {
    chat = { completions: { create: async () => ({ choices: [{ message: { content: "{}" } }] }) } };
  },
}));

const ORG = "org-1";
const OTHER_ORG = "org-2";

let pg: import("@electric-sql/pglite").PGlite;
const realFetch = globalThis.fetch;

beforeAll(async () => {
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "test-key";
  process.env.SAM_GOV_API_KEY = "test-sam-key";
  pg = (await h.dbPromise).client;
  // Schema mirrors server/db-init.ts for the tables the code under test touches.
  await pg.exec(`
    CREATE TABLE bccs_fedcon_watchlist (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id VARCHAR(200) NOT NULL,
      kind VARCHAR(30) NOT NULL,
      value VARCHAR(300) NOT NULL,
      label VARCHAR(300),
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (org_id, kind, value)
    );
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
      attachments_pending BOOLEAN,
      attachment_attempts INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (org_id, notice_id)
    );
    CREATE TABLE bccs_fedcon_attachments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id VARCHAR(200) NOT NULL,
      notice_id VARCHAR(300) NOT NULL,
      filename VARCHAR(400) NOT NULL,
      url TEXT NOT NULL,
      extracted_text TEXT,
      text_chars INTEGER NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'extracted',
      error TEXT,
      fetched_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (org_id, notice_id, url)
    );
    CREATE TABLE bccs_agent_findings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id VARCHAR(50) NOT NULL,
      org_id VARCHAR(200) NOT NULL,
      finding_type VARCHAR(50) NOT NULL,
      severity VARCHAR(20) NOT NULL DEFAULT 'medium',
      title TEXT NOT NULL,
      detail JSONB,
      status VARCHAR(20) NOT NULL DEFAULT 'open',
      related_record_id VARCHAR(200),
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE bccs_fedcon_checklist (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id VARCHAR(200) NOT NULL,
      subject_type VARCHAR(30) NOT NULL,
      subject_id VARCHAR(300) NOT NULL,
      item_key VARCHAR(100) NOT NULL,
      label TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'not_started',
      UNIQUE (org_id, subject_type, subject_id, item_key)
    );
  `);

  // All outbound network goes through the per-test responder.
  vi.stubGlobal("fetch", async (input: any) => h.state.responder(String(input instanceof Request ? input.url : input)));
});

afterAll(async () => {
  vi.unstubAllGlobals();
  globalThis.fetch = realFetch;
  await pg?.close();
});

beforeEach(async () => {
  h.state.newOpps = [];
  h.state.resourcesByNotice = {};
  h.state.resourceLookups = [];
  h.state.lookupFailsFor = new Set();
  h.state.responder = async () => new Response("PDF bytes", { status: 200 });
  await pg.exec(`
    DELETE FROM bccs_fedcon_attachments;
    DELETE FROM bccs_fedcon_opportunities;
    DELETE FROM bccs_fedcon_watchlist;
    DELETE FROM bccs_agent_findings;
    DELETE FROM bccs_fedcon_checklist;
  `);
  await pg.query(
    `INSERT INTO bccs_fedcon_watchlist (org_id, kind, value) VALUES ($1, 'keyword', 'cybersecurity')`,
    [ORG],
  );
});

/** Seed an opportunity with a controlled age and resume state. */
async function seedOpp(opts: {
  org?: string;
  noticeId: string;
  ageDays: number;
  pending?: boolean | null;
  attempts?: number;
  attachmentRows?: { url: string; status: string }[];
}): Promise<void> {
  const org = opts.org ?? ORG;
  await pg.query(
    `INSERT INTO bccs_fedcon_opportunities (org_id, notice_id, title, attachments_pending, attachment_attempts, created_at)
     VALUES ($1, $2, 'Seeded', $3, $4, NOW() - ($5 || ' days')::interval)`,
    [org, opts.noticeId, opts.pending ?? null, opts.attempts ?? 0, String(opts.ageDays)],
  );
  for (const row of opts.attachmentRows ?? []) {
    await pg.query(
      `INSERT INTO bccs_fedcon_attachments (org_id, notice_id, filename, url, status, error)
       VALUES ($1, $2, 'f.pdf', $3, $4, $5)`,
      [org, opts.noticeId, row.url, row.status, row.status === "failed" ? "boom" : null],
    );
  }
}

const attempts = async (noticeId: string, org = ORG) =>
  (await pg.query<any>(
    `SELECT attachment_attempts FROM bccs_fedcon_opportunities WHERE org_id = $1 AND notice_id = $2`,
    [org, noticeId],
  )).rows[0]?.attachment_attempts;

const pendingFlag = async (noticeId: string, org = ORG) =>
  (await pg.query<any>(
    `SELECT attachments_pending FROM bccs_fedcon_opportunities WHERE org_id = $1 AND notice_id = $2`,
    [org, noticeId],
  )).rows[0]?.attachments_pending;

describe("patrol section 1b — resume selection query (real SQL)", () => {
  it("resumes flagged and failed-row notices oldest first, skips fetched notices and other orgs", async () => {
    // Mixed states, deliberately inserted out of age order:
    await seedOpp({ noticeId: "N-FRESH", ageDays: 1, pending: true });                    // pending flag, newest
    await seedOpp({ noticeId: "N-DONE", ageDays: 9, pending: false, attachmentRows: [{ url: "https://sam.gov/f/done.pdf", status: "extracted" }] }); // fully fetched
    await seedOpp({ noticeId: "N-FAILED-ROWS", ageDays: 5, pending: null, attachmentRows: [{ url: "https://sam.gov/f/bad.pdf", status: "failed" }] }); // failed rows only, no flag
    await seedOpp({ noticeId: "N-OLD-PENDING", ageDays: 10, pending: true });             // pending flag, oldest
    await seedOpp({ org: OTHER_ORG, noticeId: "N-OTHER-ORG", ageDays: 20, pending: true }); // other tenant — never selected

    // Every resumed notice fully fetches this time.
    h.state.resourcesByNotice = {
      "N-OLD-PENDING": ["https://sam.gov/f/a.pdf"],
      "N-FAILED-ROWS": ["https://sam.gov/f/bad.pdf"],
      "N-FRESH": ["https://sam.gov/f/c.pdf"],
    };

    const { patrolOrg } = await import("../services/federal-contracts-monitor");
    await patrolOrg(ORG);

    // Exactly the right notices, oldest first; N-DONE and the other org untouched.
    expect(h.state.resourceLookups).toEqual(["N-OLD-PENDING", "N-FAILED-ROWS", "N-FRESH"]);

    // Successful resume cleared the flags on real rows.
    expect(await pendingFlag("N-OLD-PENDING")).toBe(false);
    expect(await pendingFlag("N-FAILED-ROWS")).toBe(false);
    expect(await pendingFlag("N-FRESH")).toBe(false);
    expect(await pendingFlag("N-OTHER-ORG", OTHER_ORG)).toBe(true);
    // The previously failed row was retried and extracted.
    const { rows } = await pg.query<any>(
      `SELECT status, error FROM bccs_fedcon_attachments WHERE notice_id = 'N-FAILED-ROWS'`,
    );
    expect(rows).toEqual([{ status: "extracted", error: null }]);
  });

  it("stays within the 5-notice slot limit, oldest first", async () => {
    for (let i = 1; i <= 7; i++) {
      await seedOpp({ noticeId: `N-P${i}`, ageDays: 30 - i, pending: true }); // N-P1 oldest … N-P7 newest
      h.state.resourcesByNotice[`N-P${i}`] = [`https://sam.gov/f/p${i}.pdf`];
    }

    const { patrolOrg } = await import("../services/federal-contracts-monitor");
    await patrolOrg(ORG);

    expect(h.state.resourceLookups).toEqual(["N-P1", "N-P2", "N-P3", "N-P4", "N-P5"]);
    expect(await pendingFlag("N-P6")).toBe(true); // untouched — resumes next run
    expect(await pendingFlag("N-P7")).toBe(true);
  });

  it("new notices consume slots first; leftovers go to the oldest deferred notices", async () => {
    await seedOpp({ noticeId: "N-OLD-A", ageDays: 8, pending: true });
    await seedOpp({ noticeId: "N-OLD-B", ageDays: 6, pending: true });
    await seedOpp({ noticeId: "N-OLD-C", ageDays: 4, pending: true });
    for (const id of ["N-OLD-A", "N-OLD-B", "N-OLD-C"]) {
      h.state.resourcesByNotice[id] = [`https://sam.gov/f/${id}.pdf`];
    }
    // The SAM search discovers 3 new notices this run → only 2 resume slots left.
    h.state.newOpps = ["N-NEW-1", "N-NEW-2", "N-NEW-3"].map((noticeId) => ({
      noticeId, title: `New ${noticeId}`, agency: null, naics: null, psc: null,
      setAside: null, noticeType: null, postedDate: null, responseDeadline: null,
      url: `https://sam.gov/opp/${noticeId}`, description: null,
    }));
    for (const id of ["N-NEW-1", "N-NEW-2", "N-NEW-3"]) {
      h.state.resourcesByNotice[id] = [`https://sam.gov/f/${id}.pdf`];
    }

    const { patrolOrg } = await import("../services/federal-contracts-monitor");
    await patrolOrg(ORG);

    expect(h.state.resourceLookups).toEqual(["N-NEW-1", "N-NEW-2", "N-NEW-3", "N-OLD-A", "N-OLD-B"]);
    expect(await pendingFlag("N-OLD-C")).toBe(true); // deferred to a later run
  });

  it("skips exhausted notices so newer pending ones get the slot, surfacing the give-up", async () => {
    const { MAX_ATTACHMENT_ATTEMPTS, patrolOrg } = await import("../services/federal-contracts-monitor");
    // Oldest notice has burned through its retries — it must NOT hog a slot.
    await seedOpp({ noticeId: "N-BROKEN", ageDays: 20, pending: true, attempts: MAX_ATTACHMENT_ATTEMPTS });
    await seedOpp({ noticeId: "N-NEWER", ageDays: 2, pending: true, attempts: 1 });
    h.state.resourcesByNotice["N-NEWER"] = ["https://sam.gov/f/newer.pdf"];

    const result = await patrolOrg(ORG);

    // The exhausted notice was never touched; the newer one got the slot.
    expect(h.state.resourceLookups).toEqual(["N-NEWER"]);
    expect(await pendingFlag("N-NEWER")).toBe(false);
    expect(await attempts("N-NEWER")).toBe(0); // failure-free fetch resets the counter
    expect(await pendingFlag("N-BROKEN")).toBe(true);
    // The give-up is surfaced as a skipped check, not silently dropped.
    const giveUp = result.skippedChecks.find((s) => s.reason.includes("Gave up") && s.reason.includes("N-BROKEN"));
    expect(giveUp).toBeTruthy();
  });

  it("increments attempts on repeated failures until the notice is exhausted", async () => {
    const { MAX_ATTACHMENT_ATTEMPTS, patrolOrg } = await import("../services/federal-contracts-monitor");
    await seedOpp({ noticeId: "N-FLAKY", ageDays: 5, pending: true, attempts: MAX_ATTACHMENT_ATTEMPTS - 1 });
    h.state.resourcesByNotice["N-FLAKY"] = ["https://sam.gov/f/flaky.pdf"];
    h.state.responder = async () => { throw new TypeError("socket hang up"); };

    // One more failing run pushes it over the cap.
    await patrolOrg(ORG);
    expect(h.state.resourceLookups).toEqual(["N-FLAKY"]);
    expect(await attempts("N-FLAKY")).toBe(MAX_ATTACHMENT_ATTEMPTS);
    expect(await pendingFlag("N-FLAKY")).toBe(true);

    // Next run: exhausted — no lookup, surfaced as a skipped check.
    h.state.resourceLookups = [];
    const result = await patrolOrg(ORG);
    expect(h.state.resourceLookups).toEqual([]);
    expect(result.skippedChecks.some((s) => s.reason.includes("Gave up") && s.reason.includes("N-FLAKY"))).toBe(true);
  });

  it("counts a failed SAM notice lookup toward the retry cap", async () => {
    const { patrolOrg } = await import("../services/federal-contracts-monitor");
    await seedOpp({ noticeId: "N-GONE", ageDays: 5, pending: true, attempts: 0 });
    h.state.lookupFailsFor.add("N-GONE");

    await patrolOrg(ORG);
    expect(await attempts("N-GONE")).toBe(1);
    expect(await pendingFlag("N-GONE")).toBe(true);
  });
});

describe("fetchNoticeAttachments — attachments_pending lifecycle (real SQL)", () => {
  it("sets the flag on failure, clears it once the retry fully fetches", async () => {
    await seedOpp({ noticeId: "N-LIFE", ageDays: 2, pending: null });
    h.state.resourcesByNotice["N-LIFE"] = ["https://sam.gov/f/good.pdf", "https://sam.gov/f/flaky.pdf"];
    h.state.responder = async (url) => {
      if (url.includes("flaky")) throw new TypeError("socket hang up");
      return new Response("PDF bytes", { status: 200 });
    };

    const { fetchNoticeAttachments } = await import("../services/solicitation-attachments");
    const first = await fetchNoticeAttachments(ORG, "N-LIFE", { deadline: Date.now() + 30_000 });
    expect(first).toMatchObject({ fetched: 1, failed: 1 });
    expect(await pendingFlag("N-LIFE")).toBe(true); // retryable failure → still pending

    h.state.responder = async () => new Response("recovered", { status: 200 });
    const second = await fetchNoticeAttachments(ORG, "N-LIFE", { deadline: Date.now() + 30_000 });
    expect(second).toMatchObject({ fetched: 1, failed: 0, remaining: 0 });
    expect(await pendingFlag("N-LIFE")).toBe(false); // fully fetched → cleared
  });

  it("keeps the flag set while targets are deferred by the per-call cap", async () => {
    await seedOpp({ noticeId: "N-CAP", ageDays: 2, pending: null });
    h.state.resourcesByNotice["N-CAP"] = [
      "https://sam.gov/f/one.pdf",
      "https://sam.gov/f/two.pdf",
      "https://sam.gov/f/three.pdf",
    ];

    const { fetchNoticeAttachments } = await import("../services/solicitation-attachments");
    const res = await fetchNoticeAttachments(ORG, "N-CAP", { deadline: Date.now() + 30_000, maxFiles: 2 });
    expect(res).toMatchObject({ fetched: 2, failed: 0, remaining: 1 });
    expect(await pendingFlag("N-CAP")).toBe(true); // deferred work remains

    const rest = await fetchNoticeAttachments(ORG, "N-CAP", { deadline: Date.now() + 30_000, maxFiles: 2 });
    expect(rest).toMatchObject({ fetched: 1, remaining: 0 });
    expect(await pendingFlag("N-CAP")).toBe(false);
  });
});
