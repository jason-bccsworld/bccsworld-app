/**
 * Unit tests for the federal contracts risk rubric and findings plumbing.
 *
 * Everything external is mocked: the database, the SAM.gov/USAspending data
 * layer, the agent registry, and OpenAI. The tests exercise the pure logic:
 * tier thresholds, veto override, per-award vs vendor composite scoring,
 * in-run finding dedupe, and coverage-gated auto-resolve.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

/* ── Mocks ────────────────────────────────────────────────────────────────── */

// Render sql`` templates to a plain { text, values } object so the db mock
// can route queries by text and inspect bound parameters.
vi.mock("drizzle-orm", () => ({
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    text: strings.join("?"),
    values,
  }),
}));

const executedQueries: { text: string; values: unknown[] }[] = [];
let queryRouter: (q: { text: string; values: unknown[] }) => { rows: any[] };

vi.mock("../../db", () => ({
  db: {
    execute: vi.fn(async (q: any) => {
      executedQueries.push(q);
      return queryRouter(q);
    }),
  },
}));

vi.mock("../agent-registry", () => ({
  startRun: vi.fn(async () => "run-1"),
  finishRun: vi.fn(async () => {}),
  emitAgentEvent: vi.fn(async () => {}),
}));

vi.mock("openai", () => ({
  default: class OpenAI {
    chat = { completions: { create: vi.fn() } };
  },
}));

const fedconMocks = vi.hoisted(() => ({
  samKeyAvailable: vi.fn(() => false),
  searchSamOpportunities: vi.fn(),
  checkSamExclusions: vi.fn(),
  searchAwardsByRecipient: vi.fn(),
  searchAwardByPiid: vi.fn(),
  getAwardModifications: vi.fn(),
}));
vi.mock("../fedcon-data", () => fedconMocks);

// Attachment fetching is exercised by its own tests; here it is external
// machinery (network + file extraction) and is mocked like the data layer.
const attachmentMocks = vi.hoisted(() => ({
  fetchNoticeAttachments: vi.fn(async () => ({
    total: 0, alreadyFetched: 0, fetched: 0, failed: 0, unsupported: 0, remaining: 0, results: [],
  })),
}));
vi.mock("../solicitation-attachments", () => attachmentMocks);

import {
  tierFor,
  RUBRIC,
  coverageKeyFor,
  reconcileFindings,
  patrolOrg,
  type Candidate,
} from "../federal-contracts-monitor";

/* ── Query-router helpers ─────────────────────────────────────────────────── */

interface DbState {
  watchlist: { id: string; kind: string; value: string; label: string | null }[];
  openFindings: { id: string; finding_type: string; related_record_id: string; severity: string; title: string }[];
}

function routeQueries(state: DbState) {
  queryRouter = (q) => {
    if (q.text.includes("FROM bccs_fedcon_watchlist")) return { rows: state.watchlist };
    if (q.text.includes("FROM bccs_agent_findings")) return { rows: state.openFindings };
    if (q.text.includes("FROM bccs_fedcon_opportunities")) return { rows: [] };
    return { rows: [] }; // INSERT / UPDATE
  };
}

function findingInserts() {
  return executedQueries.filter((q) => q.text.includes("INSERT INTO bccs_agent_findings"));
}

function findingResolves() {
  return executedQueries.filter((q) => q.text.includes("SET status = 'resolved'"));
}

/** Award upserts: values order matches upsertAward's VALUES list. */
function awardUpserts() {
  return executedQueries
    .filter((q) => q.text.includes("INSERT INTO bccs_fedcon_awards"))
    .map((q) => ({
      awardKey: q.values[1] as string,
      flags: JSON.parse(q.values[13] as string) as { key: string; points: number; veto: boolean }[],
      score: q.values[14] as number,
      tier: q.values[15] as string,
    }));
}

function makeAward(over: Partial<Record<string, any>> = {}) {
  return {
    awardId: "PIID-1",
    generatedId: "GEN-1",
    recipientName: "Acme Federal LLC",
    recipientUei: "UEI123",
    agency: "GSA",
    naics: "541511",
    awardAmount: 1_000_000,
    startDate: "2024-01-01",
    endDate: "2028-01-01",
    awardType: "D",
    description: "IT services",
    ...over,
  };
}

beforeEach(() => {
  executedQueries.length = 0;
  vi.clearAllMocks();
  fedconMocks.samKeyAvailable.mockReturnValue(false);
  fedconMocks.checkSamExclusions.mockResolvedValue({ excluded: false, records: [] });
  fedconMocks.getAwardModifications.mockResolvedValue({ modificationCount: 0, recentModsWithin90Days: 0 });
  routeQueries({ watchlist: [], openFindings: [] });
});

/* ── tierFor: tier boundaries & veto override ─────────────────────────────── */

describe("tierFor", () => {
  it("maps scores to tiers at exact boundaries (0-15 / 16-35 / 36-60 / 61+)", () => {
    expect(tierFor(0, false)).toBe("low");
    expect(tierFor(15, false)).toBe("low");
    expect(tierFor(16, false)).toBe("moderate");
    expect(tierFor(35, false)).toBe("moderate");
    expect(tierFor(36, false)).toBe("high");
    expect(tierFor(60, false)).toBe("high");
    expect(tierFor(61, false)).toBe("critical");
    expect(tierFor(999, false)).toBe("critical");
  });

  it("veto forces critical regardless of score", () => {
    expect(tierFor(0, true)).toBe("critical");
    expect(tierFor(15, true)).toBe("critical");
    expect(tierFor(40, true)).toBe("critical");
  });
});

describe("RUBRIC", () => {
  it("keeps the checklist point weights and only activeExclusion as a veto", () => {
    expect(RUBRIC.activeExclusion).toEqual({ points: 10, veto: true });
    expect(RUBRIC.heavyEarlyModifications).toEqual({ points: 5, veto: false });
    expect(RUBRIC.manyModifications).toEqual({ points: 4, veto: false });
    expect(RUBRIC.recompeteWindow).toEqual({ points: 5, veto: false });
    expect(RUBRIC.vendorConcentration).toEqual({ points: 6, veto: false });
    expect(RUBRIC.setAsideAffiliationRisk).toEqual({ points: 7, veto: false });
    const vetoKeys = Object.entries(RUBRIC).filter(([, v]) => v.veto).map(([k]) => k);
    expect(vetoKeys).toEqual(["activeExclusion"]);
  });
});

/* ── reconcileFindings: dedupe, create, update, coverage-gated resolve ────── */

describe("reconcileFindings", () => {
  const cand = (over: Partial<Candidate> = {}): Candidate => ({
    findingType: "recompete_window",
    severity: "medium",
    title: "Recompete window",
    detail: {},
    relatedRecordId: "award:PIID-1",
    ...over,
  });

  it("dedupes candidates sharing findingType|relatedRecordId, keeping the first", async () => {
    const { created } = await reconcileFindings(
      "org-1",
      [cand({ title: "first" }), cand({ title: "second (duplicate key)" })],
      new Set(),
    );
    expect(created).toBe(1);
    const inserts = findingInserts();
    expect(inserts).toHaveLength(1);
    expect(inserts[0].values).toContain("first");
  });

  it("creates findings for new candidates and updates changed existing ones without re-creating", async () => {
    routeQueries({
      watchlist: [],
      openFindings: [
        { id: "f1", finding_type: "recompete_window", related_record_id: "award:PIID-1", severity: "medium", title: "old title" },
      ],
    });
    const { created } = await reconcileFindings(
      "org-1",
      [cand({ severity: "high", title: "new title" }), cand({ findingType: "vendor_risk_tier", relatedRecordId: "vendor:acme" })],
      new Set(),
    );
    expect(created).toBe(1); // only the vendor_risk_tier is new
    const updates = executedQueries.filter((q) => q.text.includes("SET severity ="));
    expect(updates).toHaveLength(1);
  });

  it("auto-resolves a stale finding only when its check was covered this run", async () => {
    routeQueries({
      watchlist: [],
      openFindings: [
        { id: "f1", finding_type: "recompete_window", related_record_id: "award:GONE", severity: "medium", title: "stale, covered" },
        { id: "f2", finding_type: "heavy_modifications", related_record_id: "award:UNCHECKED", severity: "high", title: "stale, NOT covered" },
      ],
    });
    const { resolved } = await reconcileFindings("org-1", [], new Set(["recompete|award:GONE"]));
    expect(resolved).toBe(1);
    const resolves = findingResolves();
    expect(resolves).toHaveLength(1);
    expect(resolves[0].values).toContain("f1");
  });

  it("keeps a stale finding open when its candidate is still present", async () => {
    routeQueries({
      watchlist: [],
      openFindings: [
        { id: "f1", finding_type: "recompete_window", related_record_id: "award:PIID-1", severity: "medium", title: "Recompete window" },
      ],
    });
    const { created, resolved } = await reconcileFindings("org-1", [cand()], new Set(["recompete|award:PIID-1"]));
    expect(created).toBe(0);
    expect(resolved).toBe(0);
  });

  it("treats new_opportunity as one-shot: resolvable without coverage", async () => {
    routeQueries({
      watchlist: [],
      openFindings: [
        { id: "f1", finding_type: "new_opportunity", related_record_id: "opportunity:N1", severity: "low", title: "opp" },
      ],
    });
    const { resolved } = await reconcileFindings("org-1", [], new Set());
    expect(resolved).toBe(1);
  });

  it("never auto-resolves unknown finding types (coverageKeyFor is never covered)", () => {
    expect(coverageKeyFor("new_opportunity", "x")).toBeNull();
    expect(coverageKeyFor("something_else", "x")).toBe("unknown|something_else|x");
    expect(coverageKeyFor("vendor_excluded", "vendor:v")).toBe("excl|vendor:v");
  });
});

/* ── patrolOrg: per-award vs vendor composite scoring ─────────────────────── */

describe("patrolOrg scoring", () => {
  const in100Days = new Date(Date.now() + 100 * 86400000).toISOString().slice(0, 10);
  const in50Days = new Date(Date.now() + 50 * 86400000).toISOString().slice(0, 10);

  it("scores each award from its own flags only (plus vendor-level flags), and the vendor composite from all", async () => {
    routeQueries({
      watchlist: [{ id: "w1", kind: "vendor", value: "Acme Federal LLC", label: null }],
      openFindings: [],
    });
    const a1 = makeAward({ awardId: "A1", generatedId: "G1", endDate: "2030-01-01" }); // heavy mods flag only
    const a2 = makeAward({ awardId: "A2", generatedId: "G2", endDate: in100Days }); // recompete flag only
    fedconMocks.searchAwardsByRecipient.mockResolvedValue([a1, a2]);
    fedconMocks.getAwardModifications.mockImplementation(async (genId: string) =>
      genId === "G1"
        ? { modificationCount: 4, recentModsWithin90Days: 3 }
        : { modificationCount: 0, recentModsWithin90Days: 0 },
    );

    await patrolOrg("org-1");

    const upserts = awardUpserts();
    const u1 = upserts.find((u) => u.awardKey.startsWith("A1|"))!;
    const u2 = upserts.find((u) => u.awardKey.startsWith("A2|"))!;
    // A1: only its own heavyEarlyModifications flag — never A2's recompete flag.
    expect(u1.flags.map((f) => f.key)).toEqual(["heavyEarlyModifications"]);
    expect(u1.score).toBe(RUBRIC.heavyEarlyModifications.points);
    expect(u1.tier).toBe("low");
    // A2: only its own recompeteWindow flag — never A1's mods flag.
    expect(u2.flags.map((f) => f.key)).toEqual(["recompeteWindow"]);
    expect(u2.score).toBe(RUBRIC.recompeteWindow.points);
    expect(u2.tier).toBe("low");
  });

  it("applies vendor-level veto flags to every award and forces the Critical tier", async () => {
    routeQueries({
      watchlist: [{ id: "w1", kind: "vendor", value: "Acme Federal LLC", label: null }],
      openFindings: [],
    });
    fedconMocks.searchAwardsByRecipient.mockResolvedValue([
      makeAward({ awardId: "A1", generatedId: "G1", endDate: "2030-01-01" }),
      makeAward({ awardId: "A2", generatedId: "G2", endDate: "2030-01-01" }),
    ]);
    fedconMocks.checkSamExclusions.mockResolvedValue({ excluded: true, records: [{ name: "Acme" }] });

    await patrolOrg("org-1");

    const upserts = awardUpserts();
    expect(upserts).toHaveLength(2);
    for (const u of upserts) {
      expect(u.flags.map((f) => f.key)).toEqual(["activeExclusion"]);
      expect(u.score).toBe(RUBRIC.activeExclusion.points); // 10 — far below 61
      expect(u.tier).toBe("critical"); // veto overrides the score
    }
    // Vendor-level candidate becomes a critical vendor_excluded finding.
    const inserts = findingInserts().filter((q) => q.values.includes("vendor_excluded"));
    expect(inserts).toHaveLength(1);
  });

  it("creates one finding per key when a vendor watch and a contract watch surface the same award", async () => {
    routeQueries({
      watchlist: [
        { id: "w1", kind: "vendor", value: "Acme Federal LLC", label: null },
        { id: "w2", kind: "contract", value: "A1", label: null },
      ],
      openFindings: [],
    });
    const shared = makeAward({ awardId: "A1", generatedId: "G1", endDate: in50Days });
    fedconMocks.searchAwardsByRecipient.mockResolvedValue([shared]);
    fedconMocks.searchAwardByPiid.mockResolvedValue([shared]);

    await patrolOrg("org-1");

    // Both paths produced a recompete_window candidate for award:A1 —
    // reconcile dedupes to a single inserted finding.
    const recompeteInserts = findingInserts().filter((q) => q.values.includes("recompete_window"));
    expect(recompeteInserts).toHaveLength(1);
    expect(recompeteInserts[0].values).toContain("award:A1");
  });
});

/* ── patrolOrg: automatic attachment fetch for new opportunities ──────────── */

describe("patrolOrg automatic attachment fetch", () => {
  const opp = {
    noticeId: "N-100",
    title: "Widget Maintenance",
    agency: "GSA",
    naics: "541511",
    psc: null,
    setAside: null,
    noticeType: "Solicitation",
    postedDate: "2026-08-01",
    responseDeadline: null,
    url: "https://sam.gov/opp/N-100",
    description: null,
  };

  it("fetches attachments for newly inserted opportunities and counts extracted files", async () => {
    routeQueries({
      watchlist: [{ id: "w1", kind: "keyword", value: "widgets", label: null }],
      openFindings: [],
    });
    fedconMocks.samKeyAvailable.mockReturnValue(true);
    fedconMocks.searchSamOpportunities.mockResolvedValue([opp]);
    attachmentMocks.fetchNoticeAttachments.mockResolvedValue({
      total: 2, alreadyFetched: 0, fetched: 2, failed: 0, unsupported: 0, remaining: 0,
      results: [{ filename: "sow.pdf", status: "extracted" }, { filename: "qa.docx", status: "extracted" }],
    });

    const result = await patrolOrg("org-1");

    expect(attachmentMocks.fetchNoticeAttachments).toHaveBeenCalledTimes(1);
    const [orgId, noticeId, opts] = attachmentMocks.fetchNoticeAttachments.mock.calls[0] as any[];
    expect(orgId).toBe("org-1");
    expect(noticeId).toBe("N-100");
    expect(opts.maxFiles).toBe(3); // bounded per notice
    expect(result.skippedChecks).toEqual([]); // full success → nothing to report
    expect(result.itemsScanned).toBe(1 + 2); // the notice + its two extracted files
  });

  it("does not fetch attachments for opportunities that already exist (and have no pending work)", async () => {
    queryRouter = (q) => {
      if (q.text.includes("FROM bccs_fedcon_watchlist")) return { rows: [{ id: "w1", kind: "keyword", value: "widgets", label: null }] };
      if (q.text.includes("attachments_pending")) return { rows: [] }; // resume query — nothing pending
      if (q.text.includes("FROM bccs_fedcon_opportunities")) return { rows: [{ id: "existing-opp" }] };
      return { rows: [] };
    };
    fedconMocks.samKeyAvailable.mockReturnValue(true);
    fedconMocks.searchSamOpportunities.mockResolvedValue([opp]);

    await patrolOrg("org-1");

    expect(attachmentMocks.fetchNoticeAttachments).not.toHaveBeenCalled();
  });

  it("resumes notices with pending/failed attachments using leftover budget, oldest first", async () => {
    queryRouter = (q) => {
      if (q.text.includes("FROM bccs_fedcon_watchlist")) return { rows: [{ id: "w1", kind: "keyword", value: "widgets", label: null }] };
      if (q.text.includes("attachments_pending")) {
        return { rows: [{ notice_id: "N-OLD-1" }, { notice_id: "N-OLD-2" }] }; // resume candidates, oldest first
      }
      return { rows: [] };
    };
    fedconMocks.samKeyAvailable.mockReturnValue(true);
    fedconMocks.searchSamOpportunities.mockResolvedValue([]); // no new notices this run
    attachmentMocks.fetchNoticeAttachments
      .mockResolvedValueOnce({
        total: 3, alreadyFetched: 1, fetched: 2, failed: 0, unsupported: 0, remaining: 0,
        results: [{ filename: "a.pdf", status: "extracted" }, { filename: "b.pdf", status: "extracted" }],
      })
      .mockResolvedValueOnce({
        total: 4, alreadyFetched: 2, fetched: 1, failed: 0, unsupported: 0, remaining: 1,
        results: [{ filename: "c.pdf", status: "extracted" }],
      });

    const result = await patrolOrg("org-1");

    expect(attachmentMocks.fetchNoticeAttachments).toHaveBeenCalledTimes(2);
    expect(attachmentMocks.fetchNoticeAttachments.mock.calls.map((c: any[]) => c[1])).toEqual(["N-OLD-1", "N-OLD-2"]);
    for (const call of attachmentMocks.fetchNoticeAttachments.mock.calls as any[]) {
      expect(call[2].maxFiles).toBe(3); // same per-notice cap on resume
    }
    // Remaining work on the second notice keeps surfacing in the run summary.
    const reasons = result.skippedChecks.filter((s) => s.check === "sam_attachments").map((s) => s.reason);
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toContain("N-OLD-2");
    expect(reasons[0]).toContain("(resumed)");
    expect(reasons[0]).toContain("1 deferred");
    expect(result.itemsScanned).toBe(3); // three newly extracted files
  });

  it("does not resume when new notices already used all notice slots, and skips resumed notices already fetched this run", async () => {
    const newOpps = Array.from({ length: 5 }, (_, i) => ({ ...opp, noticeId: `N-${i}`, title: `Opp ${i}` }));
    queryRouter = (q) => {
      if (q.text.includes("FROM bccs_fedcon_watchlist")) return { rows: [{ id: "w1", kind: "keyword", value: "widgets", label: null }] };
      if (q.text.includes("attachments_pending")) return { rows: [{ notice_id: "N-OLD" }] };
      if (q.text.includes("FROM bccs_fedcon_opportunities")) return { rows: [] }; // all new
      return { rows: [] };
    };
    fedconMocks.samKeyAvailable.mockReturnValue(true);
    fedconMocks.searchSamOpportunities.mockResolvedValue(newOpps);

    await patrolOrg("org-1");

    // 5 new notices consume the full per-run notice cap — no resume calls.
    expect(attachmentMocks.fetchNoticeAttachments).toHaveBeenCalledTimes(5);
    const fetchedIds = attachmentMocks.fetchNoticeAttachments.mock.calls.map((c: any[]) => c[1]);
    expect(fetchedIds).not.toContain("N-OLD");
  });

  it("marks new notices beyond the per-run cap as pending so later runs resume them", async () => {
    const newOpps = Array.from({ length: 6 }, (_, i) => ({ ...opp, noticeId: `N-${i}`, title: `Opp ${i}` }));
    routeQueries({
      watchlist: [{ id: "w1", kind: "keyword", value: "widgets", label: null }],
      openFindings: [],
    });
    fedconMocks.samKeyAvailable.mockReturnValue(true);
    fedconMocks.searchSamOpportunities.mockResolvedValue([newOpps[5]].concat(newOpps.slice(0, 5)) as any);
    fedconMocks.searchSamOpportunities.mockResolvedValue(newOpps);

    await patrolOrg("org-1");

    expect(attachmentMocks.fetchNoticeAttachments).toHaveBeenCalledTimes(5);
    const pendingUpdates = executedQueries.filter(
      (q) => q.text.includes("SET attachments_pending = TRUE") && q.values.includes("N-5"),
    );
    expect(pendingUpdates).toHaveLength(1);
  });

  it("surfaces attachment skips and per-file failures as skipped checks, never silently", async () => {
    routeQueries({
      watchlist: [{ id: "w1", kind: "keyword", value: "widgets", label: null }],
      openFindings: [],
    });
    fedconMocks.samKeyAvailable.mockReturnValue(true);
    fedconMocks.searchSamOpportunities.mockResolvedValue([
      opp,
      { ...opp, noticeId: "N-200", title: "Other" },
    ]);
    attachmentMocks.fetchNoticeAttachments
      .mockResolvedValueOnce({ check: "sam_attachments", reason: "SAM.gov lookup failed: boom" } as any)
      .mockResolvedValueOnce({
        total: 1, alreadyFetched: 0, fetched: 0, failed: 1, unsupported: 0, remaining: 0,
        results: [{ filename: "sow.pdf", status: "failed", error: "download timed out" }],
      });

    const result = await patrolOrg("org-1");

    expect(attachmentMocks.fetchNoticeAttachments).toHaveBeenCalledTimes(2);
    const reasons = result.skippedChecks.filter((s) => s.check === "sam_attachments").map((s) => s.reason);
    expect(reasons).toHaveLength(2);
    expect(reasons[0]).toContain("SAM.gov lookup failed");
    expect(reasons[1]).toContain("N-200");
    expect(reasons[1]).toContain("1 failed");
    expect(reasons[1]).toContain("download timed out");
  });
});
