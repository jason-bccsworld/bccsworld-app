/**
 * GET /opportunities computed warning fields on real SQL (PGlite):
 *
 *  - `attachments_given_up` is true only when attachment_attempts has reached
 *    MAX_ATTACHMENT_ATTEMPTS AND there is still pending/failed attachment work
 *    (attachments_pending flag or a failed attachment row)
 *  - `last_attachment_error` surfaces the latest failed row's error and goes
 *    null when no failed rows remain
 *  - a manual-fetch counter reset (attempts back to 0) clears the warning even
 *    if stale failed rows still exist... and a successful run that clears the
 *    failed rows clears it too
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import express from "express";

const h = vi.hoisted(() => ({
  dbPromise: (async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const client = new PGlite();
    return { client, db: drizzle(client) };
  })(),
  state: { orgId: "org-1", role: "admin" },
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

vi.mock("../services/email-alerts", () => ({
  getEmailAlertSettings: async () => ({ criticalFindingsEnabled: true, extraRecipients: [] }),
}));

vi.mock("../services/fedcon-data", () => ({
  getSamNoticeResources: async () => ({ resourceLinks: [], descriptionUrl: null }),
}));

vi.mock("../routes/checklist-report", () => ({
  extractText: async () => "",
}));

vi.mock("openai", () => ({
  default: class {
    chat = { completions: { create: vi.fn(async () => ({ choices: [{ message: { content: "{}" } }] })) } };
  },
}));

import { MAX_ATTACHMENT_ATTEMPTS } from "../services/federal-contracts-monitor";

const ORG1 = "org-1";
const ORG2 = "org-2";

let pg: import("@electric-sql/pglite").PGlite;
let server: import("http").Server;
let base: string;

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
    CREATE TABLE bccs_ops_manuals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id VARCHAR(200) NOT NULL,
      filename VARCHAR(400),
      extracted_text TEXT
    );
  `);

  const routes = await import("../routes/federal-contracts");
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

beforeEach(async () => {
  h.state.orgId = ORG1;
  h.state.role = "admin";
  await pg.exec(`DELETE FROM bccs_fedcon_attachments; DELETE FROM bccs_fedcon_opportunities;`);
});

async function insertOpp(opts: {
  orgId?: string;
  noticeId: string;
  attempts?: number;
  pending?: boolean | null;
}): Promise<string> {
  const { rows } = await pg.query<any>(
    `INSERT INTO bccs_fedcon_opportunities (org_id, notice_id, title, attachment_attempts, attachments_pending)
     VALUES ($1,$2,'Opp',$3,$4) RETURNING id`,
    [opts.orgId ?? ORG1, opts.noticeId, opts.attempts ?? 0, opts.pending ?? null],
  );
  return rows[0].id;
}

async function insertAttachment(opts: {
  orgId?: string;
  noticeId: string;
  status: "failed" | "extracted";
  error?: string | null;
  fetchedAt?: string | null; // SQL literal timestamp or null
  url?: string;
}) {
  await pg.query(
    `INSERT INTO bccs_fedcon_attachments (org_id, notice_id, filename, url, status, error, fetched_at)
     VALUES ($1,$2,'f.pdf',$3,$4,$5,$6)`,
    [
      opts.orgId ?? ORG1,
      opts.noticeId,
      opts.url ?? `https://sam.gov/files/${Math.random().toString(36).slice(2)}.pdf`,
      opts.status,
      opts.error ?? null,
      opts.fetchedAt ?? null,
    ],
  );
}

async function listOpportunities(): Promise<any[]> {
  const res = await fetch(`${base}/api/federal-contracts/opportunities`);
  expect(res.status).toBe(200);
  return res.json();
}

const byNotice = (rows: any[], noticeId: string) => rows.find((r) => r.notice_id === noticeId);

describe("GET /opportunities — attachments_given_up / last_attachment_error", () => {
  it("stays false below the attempt threshold even with failed rows", async () => {
    await insertOpp({ noticeId: "N-BELOW", attempts: MAX_ATTACHMENT_ATTEMPTS - 1, pending: true });
    await insertAttachment({ noticeId: "N-BELOW", status: "failed", error: "timeout downloading file" });

    const row = byNotice(await listOpportunities(), "N-BELOW");
    expect(row.attachments_given_up).toBe(false);
    // Failed rows still surface the error and the resume flag, just not give-up.
    expect(row.attachments_pending).toBe(true);
    expect(row.last_attachment_error).toBe("timeout downloading file");
  });

  it("is true at the threshold with a failed row, and false at threshold with no remaining work", async () => {
    await insertOpp({ noticeId: "N-GAVEUP", attempts: MAX_ATTACHMENT_ATTEMPTS, pending: false });
    await insertAttachment({ noticeId: "N-GAVEUP", status: "failed", error: "403 from sam.gov" });

    // Same attempt count but every attachment succeeded → no warning.
    await insertOpp({ noticeId: "N-CLEAN", attempts: MAX_ATTACHMENT_ATTEMPTS, pending: false });
    await insertAttachment({ noticeId: "N-CLEAN", status: "extracted" });

    const rows = await listOpportunities();
    const gaveUp = byNotice(rows, "N-GAVEUP");
    expect(gaveUp.attachments_given_up).toBe(true);
    expect(gaveUp.last_attachment_error).toBe("403 from sam.gov");

    const clean = byNotice(rows, "N-CLEAN");
    expect(clean.attachments_given_up).toBe(false);
    expect(clean.attachments_pending).toBe(false);
    expect(clean.last_attachment_error).toBeNull();
  });

  it("is true at the threshold when the pending flag is set even with no failed rows", async () => {
    await insertOpp({ noticeId: "N-PENDING", attempts: MAX_ATTACHMENT_ATTEMPTS, pending: true });

    const row = byNotice(await listOpportunities(), "N-PENDING");
    expect(row.attachments_given_up).toBe(true);
    expect(row.last_attachment_error).toBeNull();
  });

  it("clears after a counter reset (manual fetch) even if a stale failed row remains", async () => {
    const id = await insertOpp({ noticeId: "N-RESET", attempts: MAX_ATTACHMENT_ATTEMPTS, pending: true });
    await insertAttachment({ noticeId: "N-RESET", status: "failed", error: "old failure" });

    let row = byNotice(await listOpportunities(), "N-RESET");
    expect(row.attachments_given_up).toBe(true);

    // Manual fetch resets the counter on a failure-free run.
    await pg.query(`UPDATE bccs_fedcon_opportunities SET attachment_attempts = 0 WHERE id = $1`, [id]);
    row = byNotice(await listOpportunities(), "N-RESET");
    expect(row.attachments_given_up).toBe(false);
    // The failed row keeps the resume indicator and error visible for retry.
    expect(row.attachments_pending).toBe(true);
    expect(row.last_attachment_error).toBe("old failure");

    // A successful retry replaces the failed row and clears everything.
    await pg.query(`UPDATE bccs_fedcon_attachments SET status = 'extracted', error = NULL WHERE notice_id = 'N-RESET'`);
    await pg.query(`UPDATE bccs_fedcon_opportunities SET attachments_pending = false WHERE id = $1`, [id]);
    row = byNotice(await listOpportunities(), "N-RESET");
    expect(row.attachments_given_up).toBe(false);
    expect(row.attachments_pending).toBe(false);
    expect(row.last_attachment_error).toBeNull();
  });

  it("returns the most recent failed row's error and ignores other orgs' rows", async () => {
    await insertOpp({ noticeId: "N-LATEST", attempts: 1, pending: null });
    await insertAttachment({ noticeId: "N-LATEST", status: "failed", error: "older error", fetchedAt: "2026-01-01T00:00:00Z" });
    await insertAttachment({ noticeId: "N-LATEST", status: "failed", error: "newest error", fetchedAt: "2026-02-01T00:00:00Z" });
    // NULL fetched_at sorts last (NULLS LAST) and must not win.
    await insertAttachment({ noticeId: "N-LATEST", status: "failed", error: "null-time error", fetchedAt: null });
    // Another org's failed row for the same notice_id must not leak in.
    await insertOpp({ orgId: ORG2, noticeId: "N-LATEST", attempts: MAX_ATTACHMENT_ATTEMPTS, pending: true });
    await insertAttachment({ orgId: ORG2, noticeId: "N-LATEST", status: "failed", error: "other-org error", fetchedAt: "2026-03-01T00:00:00Z" });

    const row = byNotice(await listOpportunities(), "N-LATEST");
    expect(row.last_attachment_error).toBe("newest error");
    // Give-up stays false: attempts below threshold despite failed rows.
    expect(row.attachments_given_up).toBe(false);
  });
});
