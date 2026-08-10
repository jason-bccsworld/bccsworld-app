/**
 * Solicitation attachment fetch — security-critical download behavior on real
 * SQL (PGlite) with a mocked network layer.
 *
 *  - POST /opportunities/:id/attachments/fetch:
 *      * untrusted (non-sam.gov / non-HTTPS) hosts are never fetched and the
 *        SAM API key is never sent anywhere but https sam.gov hosts
 *      * the 15 MB cap aborts mid-stream even when Content-Length is absent
 *      * failed rows stay retryable on the next click while extracted rows
 *        are skipped (no re-download)
 *      * viewers are refused (403); another org's opportunity is 404
 *  - POST /checklist/:id/guidance returns a retryable 502 on model failure
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
  state: {
    orgId: "org-1",
    role: "admin",
    resourceLinks: [] as string[],
    // Per-URL responder for the mocked outbound fetch (non-local hosts only).
    samResponder: (async (_url: string) => new Response("nope", { status: 500 })) as (url: string, init?: any) => Promise<Response>,
    samCalls: [] as string[],
    aiMode: "ok" as "ok" | "fail",
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

vi.mock("../services/email-alerts", () => ({
  getEmailAlertSettings: async () => ({ criticalFindingsEnabled: true, extraRecipients: [] }),
}));

// SAM.gov notice lookup is mocked — its network behavior is covered elsewhere.
vi.mock("../services/fedcon-data", () => ({
  getSamNoticeResources: async () => ({ resourceLinks: h.state.resourceLinks, descriptionUrl: null }),
}));

// Text extraction is not under test (and pdf-parse needs DOM polyfills).
vi.mock("../routes/checklist-report", () => ({
  extractText: async (filename: string, buffer: Buffer) => `extracted:${filename}:${buffer.length}`,
}));

vi.mock("openai", () => ({
  default: class {
    chat = {
      completions: {
        create: vi.fn(async () => {
          if (h.state.aiMode === "fail") {
            const err: any = new Error("model exploded");
            err.status = 500;
            throw err;
          }
          return { choices: [{ message: { content: JSON.stringify({ expectation: "e", tips: [], example: "x" }) } }] };
        }),
      },
    };
  },
}));

const ORG1 = "org-1";
const ORG2 = "org-2";
const SAM_KEY = "test-sam-key";

let pg: import("@electric-sql/pglite").PGlite;
let server: import("http").Server;
let base: string;
const realFetch = globalThis.fetch;

beforeAll(async () => {
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "test-key";
  process.env.SAM_GOV_API_KEY = SAM_KEY;
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
      UNIQUE (org_id, subject_type, subject_id, item_key)
    );
    CREATE TABLE bccs_ops_manuals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id VARCHAR(200) NOT NULL,
      filename VARCHAR(400),
      extracted_text TEXT
    );
  `);

  // Outbound network is intercepted: local test-server traffic passes through,
  // everything else is recorded and answered by the per-test responder.
  vi.stubGlobal("fetch", async (input: any, init?: any) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.startsWith("http://127.0.0.1")) return realFetch(input, init);
    h.state.samCalls.push(url);
    return h.state.samResponder(url, init);
  });

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
  vi.unstubAllGlobals();
  server?.close();
  await pg?.close();
});

beforeEach(() => {
  h.state.samCalls = [];
  h.state.orgId = ORG1;
  h.state.role = "admin";
  h.state.aiMode = "ok";
});

async function insertOpp(orgId: string, noticeId: string): Promise<string> {
  const { rows } = await pg.query<any>(
    `INSERT INTO bccs_fedcon_opportunities (org_id, notice_id, title, url)
     VALUES ($1,$2,'Test Opportunity','https://sam.gov/opp/x') RETURNING id`,
    [orgId, noticeId],
  );
  return rows[0].id;
}

async function fetchAttachments(oppId: string) {
  const res = await fetch(`${base}/api/federal-contracts/opportunities/${oppId}/attachments/fetch`, { method: "POST" });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

const attachmentRows = async (noticeId: string) =>
  (await pg.query<any>(`SELECT url, filename, status, error, extracted_text FROM bccs_fedcon_attachments WHERE notice_id = $1 ORDER BY url`, [noticeId])).rows;

const okPdf = (body = "PDF bytes") =>
  new Response(body, { status: 200, headers: { "content-type": "application/pdf" } });

describe("POST /opportunities/:id/attachments/fetch (real SQL, mocked network)", () => {
  it("never fetches untrusted hosts and never sends the SAM key off sam.gov", async () => {
    const oppId = await insertOpp(ORG1, "N-TRUST");
    h.state.resourceLinks = [
      "https://evil.example.com/steal.pdf",          // untrusted host
      "http://sam.gov/downloads/plain.pdf",          // not HTTPS
      "https://notsam.gov.attacker.io/x.pdf",        // suffix trick
      "https://api.sam.gov/prod/opps/v3/files/fileA.pdf", // the only trusted one
    ];
    h.state.samResponder = async () => okPdf();

    const res = await fetchAttachments(oppId);
    expect(res.status).toBe(200);
    expect(res.body.fetched).toBe(1);
    expect(res.body.failed).toBe(3);

    // Exactly one outbound request — to the sam.gov URL, carrying the key.
    expect(h.state.samCalls).toHaveLength(1);
    const sent = new URL(h.state.samCalls[0]);
    expect(sent.hostname.endsWith("sam.gov")).toBe(true);
    expect(sent.searchParams.get("api_key")).toBe(SAM_KEY);
    // The key never appears in any request to a non-sam.gov host (there were none).
    expect(h.state.samCalls.filter((u) => !new URL(u).hostname.endsWith("sam.gov"))).toEqual([]);

    const rows = await attachmentRows("N-TRUST");
    expect(rows.filter((r) => r.status === "failed")).toHaveLength(3);
    for (const r of rows.filter((x) => x.status === "failed")) {
      expect(r.error).toMatch(/untrusted attachment host/i);
      // Stored URLs are the raw external ones — the key is never persisted.
      expect(r.url).not.toContain(SAM_KEY);
    }
    expect(rows.find((r) => r.status === "extracted")?.extracted_text).toMatch(/^extracted:fileA\.pdf:/);
  });

  it("rejects a redirect to an untrusted host and stores none of its content", async () => {
    const oppId = await insertOpp(ORG1, "N-REDIRECT");
    h.state.resourceLinks = ["https://sam.gov/downloads/redirect-me.pdf"];
    h.state.samResponder = async (url) => {
      if (url.includes("redirect-me")) {
        return new Response(null, { status: 302, headers: { location: "https://evil.example.com/payload.pdf" } });
      }
      return okPdf("EVIL CONTENT");
    };

    const res = await fetchAttachments(oppId);
    expect(res.status).toBe(200);
    expect(res.body.fetched).toBe(0);
    expect(res.body.failed).toBe(1);

    // Only the sam.gov URL was ever requested — the evil host was never contacted.
    expect(h.state.samCalls).toHaveLength(1);
    expect(new URL(h.state.samCalls[0]).hostname.endsWith("sam.gov")).toBe(true);

    const [row] = await attachmentRows("N-REDIRECT");
    expect(row.status).toBe("failed");
    expect(row.error).toMatch(/redirected to an untrusted host/i);
    expect(row.extracted_text).toBeNull();
  });

  it("follows a redirect that stays on sam.gov and extracts the file", async () => {
    const oppId = await insertOpp(ORG1, "N-REDIRECT-OK");
    h.state.resourceLinks = ["https://sam.gov/downloads/moved.pdf"];
    h.state.samResponder = async (url) => {
      if (url.includes("moved")) {
        return new Response(null, { status: 301, headers: { location: "https://api.sam.gov/prod/files/final.pdf" } });
      }
      return okPdf("real bytes");
    };

    const res = await fetchAttachments(oppId);
    expect(res.status).toBe(200);
    expect(res.body.fetched).toBe(1);
    expect(res.body.failed).toBe(0);
    expect(h.state.samCalls).toHaveLength(2);
    for (const u of h.state.samCalls) expect(new URL(u).hostname.endsWith("sam.gov")).toBe(true);
    const [row] = await attachmentRows("N-REDIRECT-OK");
    expect(row.status).toBe("extracted");
    expect(row.extracted_text).toMatch(/^extracted:moved\.pdf:/);
  });

  it("aborts a download mid-stream once it exceeds 15 MB (no Content-Length)", async () => {
    const oppId = await insertOpp(ORG1, "N-SIZECAP");
    h.state.resourceLinks = ["https://sam.gov/downloads/huge.pdf"];
    let chunksServed = 0;
    h.state.samResponder = async () =>
      new Response(
        new ReadableStream({
          pull(controller) {
            chunksServed++;
            controller.enqueue(new Uint8Array(1024 * 1024)); // 1 MB forever
          },
        }),
        { status: 200 },
      );

    const res = await fetchAttachments(oppId);
    expect(res.status).toBe(200);
    expect(res.body.failed).toBe(1);
    const [row] = await attachmentRows("N-SIZECAP");
    expect(row.status).toBe("failed");
    expect(row.error).toMatch(/file too large.*15 MB/i);
    // The stream was cut off just past the cap, not drained to completion.
    expect(chunksServed).toBeLessThanOrEqual(20);
    // A rejected oversize file stores no text.
    expect(row.extracted_text).toBeNull();
  });

  it("rejects a forged small download whose Content-Length header admits it's oversized", async () => {
    const oppId = await insertOpp(ORG1, "N-CLHEADER");
    h.state.resourceLinks = ["https://sam.gov/downloads/declared-huge.pdf"];
    h.state.samResponder = async () =>
      new Response("tiny", { status: 200, headers: { "content-length": String(64 * 1024 * 1024) } });
    const res = await fetchAttachments(oppId);
    expect(res.body.failed).toBe(1);
    expect((await attachmentRows("N-CLHEADER"))[0].error).toMatch(/file too large/i);
  });

  it("retries failed rows on the next click and skips already-extracted ones", async () => {
    const oppId = await insertOpp(ORG1, "N-RETRY");
    const good = "https://sam.gov/downloads/good.pdf";
    const flaky = "https://sam.gov/downloads/flaky.pdf";
    h.state.resourceLinks = [good, flaky];
    h.state.samResponder = async (url) => {
      if (url.includes("flaky")) throw new TypeError("socket hang up");
      return okPdf();
    };

    const first = await fetchAttachments(oppId);
    expect(first.status).toBe(200);
    expect(first.body.fetched).toBe(1);
    expect(first.body.failed).toBe(1);
    let rows = await attachmentRows("N-RETRY");
    expect(rows.find((r) => r.url === good)?.status).toBe("extracted");
    expect(rows.find((r) => r.url === flaky)?.status).toBe("failed");

    // Second click: the network recovered. Only the failed URL is re-fetched.
    h.state.samCalls = [];
    h.state.samResponder = async () => okPdf("recovered");
    const second = await fetchAttachments(oppId);
    expect(second.status).toBe(200);
    expect(second.body.fetched).toBe(1);
    expect(second.body.failed).toBe(0);
    expect(h.state.samCalls).toHaveLength(1);
    expect(h.state.samCalls[0]).toContain("flaky.pdf");

    rows = await attachmentRows("N-RETRY");
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.status === "extracted")).toBe(true);
    expect(rows.find((r) => r.url === flaky)?.error).toBeNull(); // error cleared on success
  });

  it("viewers are refused before any network or DB activity", async () => {
    const oppId = await insertOpp(ORG1, "N-VIEWER");
    h.state.resourceLinks = ["https://sam.gov/downloads/fileB.pdf"];
    h.state.role = "viewer";
    const res = await fetchAttachments(oppId);
    expect(res.status).toBe(403);
    expect(h.state.samCalls).toEqual([]);
    expect(await attachmentRows("N-VIEWER")).toEqual([]);
  });

  it("another org's opportunity is not reachable (404, no downloads)", async () => {
    const otherOpp = await insertOpp(ORG2, "N-ORG2");
    h.state.resourceLinks = ["https://sam.gov/downloads/fileC.pdf"];
    h.state.orgId = ORG1;
    const res = await fetchAttachments(otherOpp);
    expect(res.status).toBe(404);
    expect(h.state.samCalls).toEqual([]);
    expect(await attachmentRows("N-ORG2")).toEqual([]);
  });
});

describe("POST /checklist/:id/guidance — AI failure handling", () => {
  it("returns a retryable 502 when the model call fails, leaving the item unchanged", async () => {
    await insertOpp(ORG1, "N-GUIDE");
    const { rows } = await pg.query<any>(
      `INSERT INTO bccs_fedcon_checklist (org_id, subject_type, subject_id, item_key, label)
       VALUES ($1, 'opportunity', 'N-GUIDE', 'compliance_matrix', 'Build the compliance matrix') RETURNING id`,
      [ORG1],
    );
    const itemId = rows[0].id;
    h.state.aiMode = "fail";
    const res = await fetch(`${base}/api/federal-contracts/checklist/${itemId}/guidance`, { method: "POST" });
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.retryable).toBe(true);
    expect(body.message).toMatch(/failed or timed out/i);
    const after = await pg.query<any>(`SELECT ai_guidance FROM bccs_fedcon_checklist WHERE id = $1`, [itemId]);
    expect(after.rows[0].ai_guidance).toBeNull();
  });
});
