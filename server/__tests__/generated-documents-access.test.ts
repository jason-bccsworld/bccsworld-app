/**
 * Access-control / tenant-isolation regression tests for
 * GET /api/generated-documents (server/routes/document-generation.ts).
 *
 * Proves:
 *  (a) anonymous → 401 (isAuthenticated gate)
 *  (b) an authenticated org member listing /api/generated-documents receives
 *      only rows for their OWN org — storage.getGeneratedDocuments is called
 *      with the member's resolved orgId (req.orgId), never unscoped.
 *  (c) passing ?organizationId=<other-org> does NOT change the org queried —
 *      the handler ignores client-supplied org and still uses req.orgId.
 *
 * Same harness style as org-keys-response-contract.test.ts: mocked ../db +
 * real tenant middleware, real route handlers, over a live HTTP server. The
 * storage layer is mocked so the route executes its success path without
 * touching the real database, and we assert exactly what org it queries.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";

/* ── Shared hoisted state ─────────────────────────────────────────────────── */

const h = vi.hoisted(() => {
  const ORG1 = "11111111-1111-4111-8111-111111111111";
  const ORG2 = "22222222-2222-4222-8222-222222222222";

  const testUsers: Record<string, any> = {
    member1: { id: "member1", email: "member@acme.com", role: "viewer" },
  };

  return {
    ORG1,
    ORG2,
    testUsers,
    executed: [] as { text: string }[],
    // The rows the mocked storage returns for a getGeneratedDocuments call.
    generatedDocsResult: [] as any[],
    // Captures every org id the route asks storage to query.
    getGeneratedDocumentsCalls: [] as (string | undefined)[],
  };
});

/* ── SQL text renderer (handles both sql`` templates and sql.raw) ─────────── */

function sqlText(q: any): string {
  const chunks = q?.queryChunks ?? [];
  return chunks
    .map((c: any) => {
      if (Array.isArray(c?.value)) return c.value.join("");
      if (Array.isArray(c?.queryChunks)) return sqlText(c);
      return "?";
    })
    .join("");
}

/* ── Mocks ────────────────────────────────────────────────────────────────── */

vi.mock("../db", () => {
  function thenable(getResult: () => any) {
    const obj: any = {};
    for (const m of ["from", "where", "orderBy", "limit", "leftJoin", "innerJoin", "groupBy"]) {
      obj[m] = () => obj;
    }
    obj.then = (res: any, rej: any) => Promise.resolve(getResult()).then(res, rej);
    return obj;
  }
  const db = {
    execute: vi.fn(async (q: any) => {
      const text = sqlText(q);
      h.executed.push({ text });
      // resolveTenant → getUserMemberships: grant the test user membership in
      // ORG1 so requireOrg resolves req.orgId = ORG1 and the success path runs.
      if (text.includes("uo.org_role") && text.includes("FROM user_organizations")) {
        return {
          rows: [
            {
              organization_id: h.ORG1,
              org_role: "viewer",
              organization_name: "Acme",
            },
          ],
        };
      }
      if (text.includes("FROM training_organizations")) {
        return { rows: [{ id: h.ORG1 }] };
      }
      return { rows: [] };
    }),
    select: () => thenable(() => []),
    insert: () => ({
      values: () => ({
        returning: async () => [],
        then: (res: any) => Promise.resolve([]).then(res),
      }),
    }),
    update: () => ({ set: () => ({ where: async () => {} }) }),
    delete: () => ({ where: async () => {} }),
  };
  return { db, pool: {} };
});

vi.mock("../storage", () => ({
  storage: {
    createAuditLog: vi.fn(async (entry: any) => entry),
    // Org-scoped list. Record the org it was called with so the tests can
    // assert isolation, and only ever return this org's rows.
    getGeneratedDocuments: vi.fn(async (organizationId?: string) => {
      h.getGeneratedDocumentsCalls.push(organizationId);
      return h.generatedDocsResult;
    }),
    createGeneratedDocument: vi.fn(async (row: any) => row),
  },
}));

vi.mock("../localAuth", () => ({
  setupAuth: async (app: any) => {
    app.use((req: any, _res: any, next: any) => {
      const id = String(req.headers["x-test-user"] ?? "");
      const user = h.testUsers[id];
      if (user) {
        req.user = user;
        req.isAuthenticated = () => true;
      } else {
        req.isAuthenticated = () => false;
      }
      req.session = req.session ?? {};
      next();
    });
  },
  isAuthenticated: (req: any, res: any, next: any) =>
    req.user ? next() : res.status(401).json({ message: "Unauthorized" }),
}));

// No-op every unrelated sub-router / service that routes.ts pulls in.
// NOTE: document-generation route is intentionally NOT mocked — we exercise
// the real handlers. Only its underlying storage/services are mocked.
function noopMw() {
  return { default: (_req: any, _res: any, next: any) => next() };
}
vi.mock("../routes/legacy-data-transfer", noopMw);
vi.mock("../routes/adaptive-compliance", noopMw);
vi.mock("../routes/multi-platform-integration", noopMw);
vi.mock("../routes/audit-generation", noopMw);
vi.mock("../routes/compliance-alerts", noopMw);
vi.mock("../routes/crypto-signing", noopMw);
vi.mock("../routes/maintenance", noopMw);
vi.mock("../routes/digital-forms", noopMw);
vi.mock("../routes/ml-training", noopMw);
vi.mock("../routes/documents", noopMw);
vi.mock("../routes/reviewer", noopMw);
vi.mock("../routes/governance", noopMw);
vi.mock("../routes/agents", noopMw);
vi.mock("../routes/federal-contracts", noopMw);
vi.mock("../routes/blockchain-key-management", () => ({
  registerBlockchainKeyManagementRoutes: () => {},
}));
vi.mock("../routes/advanced-key-recovery", () => ({
  registerAdvancedKeyRecoveryRoutes: () => {},
}));
vi.mock("../routes/crypto-subscriptions", () => ({
  registerCryptoSubscriptionRoutes: () => {},
}));

// Mock the document-generation service dependencies so the route module loads
// without side effects; only the GET list route is exercised here.
vi.mock("../services/document-generator", () => ({
  documentGenerator: {
    analyzeDocumentGaps: vi.fn(),
    autoGenerateComplianceDocuments: vi.fn(),
  },
}));
vi.mock("../services/audit-compliance-ai", () => ({
  auditComplianceAI: {
    performComprehensiveAuditWithDocumentGeneration: vi.fn(),
  },
}));

vi.mock("../services/gate-engine", () => ({
  evaluateAction: vi.fn(),
  authorityRank: vi.fn(),
  isValidAuthority: vi.fn(),
}));
vi.mock("../generate-document-import-tutorial", () => ({
  generateDocumentImportTutorial: vi.fn(),
}));

/* ── Test server ──────────────────────────────────────────────────────────── */

let server: import("http").Server;
let base: string;

async function api(
  userId: string | null,
  method: string,
  path: string,
  body?: any,
): Promise<{ status: number; contentType: string | null; body: any }> {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(userId ? { "x-test-user": userId } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const contentType = res.headers.get("content-type");
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON */
  }
  return { status: res.status, contentType, body: json };
}

beforeAll(async () => {
  process.env.MULTI_TENANT = "true";
  const express = (await import("express")).default;
  const { registerRoutes } = await import("../routes");
  const app = express();
  app.use(express.json());
  server = await registerRoutes(app);
  await new Promise<void>((r) => server.listen(0, r));
  const addr = server.address() as any;
  base = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
  await new Promise<void>((r) => server?.close(() => r()));
});

beforeEach(() => {
  h.executed.length = 0;
  h.getGeneratedDocumentsCalls.length = 0;
  h.generatedDocsResult = [
    { id: "doc-1", filename: "Doc1.txt", organizationId: h.ORG1 },
    { id: "doc-2", filename: "Doc2.txt", organizationId: h.ORG1 },
  ];
});

/* ── GET /api/generated-documents — auth + tenant isolation ───────────────── */

describe("GET /api/generated-documents — access control", () => {
  it("(a) anonymous request is rejected with 401", async () => {
    const res = await api(null, "GET", "/api/generated-documents");
    expect(res.status).toBe(401);
    // Storage must never be touched for an unauthenticated caller.
    expect(h.getGeneratedDocumentsCalls.length).toBe(0);
  });

  it("(b) an authenticated member gets only their own org's rows (queried by their orgId)", async () => {
    const res = await api("member1", "GET", "/api/generated-documents");
    expect(res.status).toBe(200);
    expect(res.contentType).toMatch(/application\/json/i);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.documents)).toBe(true);

    // storage was called exactly once, scoped to the member's resolved org.
    expect(h.getGeneratedDocumentsCalls.length).toBe(1);
    expect(h.getGeneratedDocumentsCalls[0]).toBe(h.ORG1);
    // Never called unscoped.
    expect(h.getGeneratedDocumentsCalls[0]).not.toBeUndefined();

    // Only this org's rows are returned.
    for (const doc of res.body.documents) {
      expect(doc.organizationId).toBe(h.ORG1);
    }
  });

  it("(c) ?organizationId=<other-org> is ignored — still queries the member's own org", async () => {
    const res = await api(
      "member1",
      "GET",
      `/api/generated-documents?organizationId=${h.ORG2}`,
    );
    expect(res.status).toBe(200);
    expect(h.getGeneratedDocumentsCalls.length).toBe(1);
    // The forged org param must NOT influence the query.
    expect(h.getGeneratedDocumentsCalls[0]).toBe(h.ORG1);
    expect(h.getGeneratedDocumentsCalls[0]).not.toBe(h.ORG2);
  });
});
