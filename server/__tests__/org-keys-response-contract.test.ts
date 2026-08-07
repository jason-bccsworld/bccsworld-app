/**
 * JSON response-contract regression tests for two org-keys routes in
 * server/routes/crypto-signing.ts.
 *
 * These lock in the exact JSON shape the client consumes so a regression like
 * "a raw Response was consumed instead of parsed JSON" is caught server-side:
 *
 *  - GET  /api/org-keys/verify/:eventId → JSON body with the fields the client's
 *    VerifyResult interface (client/src/pages/compliance-records.tsx) reads:
 *    valid, eventId, keyFingerprint, signedAt, details.
 *  - POST /api/org-keys/sign-all → JSON body with numeric "signed" and "failed".
 *
 * Same harness style as admin-roles-access.test.ts: mocked ../db + real tenant
 * middleware, real route handlers, over a live HTTP server. The crypto/key
 * storage service is mocked so the routes execute their success paths without
 * touching the real database.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";

/* ── Shared hoisted state ─────────────────────────────────────────────────── */

const h = vi.hoisted(() => {
  const ORG1 = "11111111-1111-4111-8111-111111111111";

  const testUsers: Record<string, any> = {
    admin1: { id: "admin1", email: "admin@acme.com", role: "admin" },
  };

  return {
    ORG1,
    testUsers,
    executed: [] as { text: string }[],
    // Values the mocked crypto service returns, tweakable per test.
    verifyResult: {
      valid: true,
      eventId: "evt-1",
      keyFingerprint: "aa:bb:cc:dd:ee:ff:00:11",
      signedAt: "2024-01-01T00:00:00.000Z",
      details: "Signature valid — record is authentic and unaltered",
    } as any,
    signAllResult: { signed: 3, failed: 1 } as any,
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
      // resolveTenant → getUserMemberships: grant the test user membership in ORG1
      // so requireOrg resolves and the success paths execute.
      if (text.includes("uo.org_role") && text.includes("FROM user_organizations")) {
        return {
          rows: [
            {
              organization_id: h.ORG1,
              org_role: "admin",
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
// NOTE: crypto-signing route is intentionally NOT mocked — we exercise the real
// handlers. Only its underlying service (crypto/key storage) is mocked.
function noopMw() {
  return { default: (_req: any, _res: any, next: any) => next() };
}
vi.mock("../routes/legacy-data-transfer", noopMw);
vi.mock("../routes/adaptive-compliance", noopMw);
vi.mock("../routes/multi-platform-integration", noopMw);
vi.mock("../routes/audit-generation", noopMw);
vi.mock("../routes/compliance-alerts", noopMw);
vi.mock("../routes/document-generation", noopMw);
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

// Mock the crypto/key storage service so routes take their success paths.
vi.mock("../services/crypto-signing", () => ({
  generateAndStoreOrgKeyPair: vi.fn(),
  getOrgActiveKey: vi.fn(),
  signTrainingRecord: vi.fn(),
  verifyTrainingRecord: vi.fn(async () => h.verifyResult),
  signAllUnsignedRecords: vi.fn(async () => h.signAllResult),
  exportPublicKeyPem: vi.fn(),
  computeFingerprint: vi.fn(),
}));

// Keep the audit-readiness refresh a no-op so it never touches the db.
vi.mock("../services/audit-readiness", () => ({
  queueAuditReadinessRefresh: vi.fn(),
}));

vi.mock("../services/gate-engine", () => ({
  evaluateAction: vi.fn(),
  authorityRank: vi.fn(),
  isValidAuthority: vi.fn(),
}));
vi.mock("../generate-document-import-tutorial", () => ({
  generateDocumentImportTutorial: vi.fn(),
}));
vi.mock("../services/audit-compliance-ai", () => ({
  auditComplianceAI: {},
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
  // Reset service return values to the happy defaults.
  h.verifyResult = {
    valid: true,
    eventId: "evt-1",
    keyFingerprint: "aa:bb:cc:dd:ee:ff:00:11",
    signedAt: "2024-01-01T00:00:00.000Z",
    details: "Signature valid — record is authentic and unaltered",
  };
  h.signAllResult = { signed: 3, failed: 1 };
});

/* ── GET /api/org-keys/verify/:eventId ────────────────────────────────────── */

describe("GET /api/org-keys/verify/:eventId — JSON response contract", () => {
  // The exact fields the client's VerifyResult interface consumes.
  const CLIENT_FIELDS = ["valid", "eventId", "keyFingerprint", "signedAt", "details"] as const;

  it("responds 200 with a parsed JSON body (application/json)", async () => {
    const res = await api(null, "GET", "/api/org-keys/verify/evt-1");
    expect(res.status).toBe(200);
    expect(res.contentType).toMatch(/application\/json/i);
    // A raw/unparsed Response regression would leave body null here.
    expect(res.body).not.toBeNull();
    expect(typeof res.body).toBe("object");
  });

  it("returns every field the client VerifyResult interface reads", async () => {
    const res = await api(null, "GET", "/api/org-keys/verify/evt-1");
    for (const field of CLIENT_FIELDS) {
      expect(res.body).toHaveProperty(field);
    }
    expect(res.body.valid).toBe(true);
    expect(res.body.eventId).toBe("evt-1");
    expect(typeof res.body.valid).toBe("boolean");
    expect(typeof res.body.details).toBe("string");
    expect(res.body.keyFingerprint).toBe("aa:bb:cc:dd:ee:ff:00:11");
    expect(res.body.signedAt).toBe("2024-01-01T00:00:00.000Z");
  });

  it("preserves nullable keyFingerprint/signedAt on an unsigned record", async () => {
    h.verifyResult = {
      valid: false,
      eventId: "evt-unsigned",
      keyFingerprint: null,
      signedAt: null,
      details: "Record has not been signed",
    };
    const res = await api(null, "GET", "/api/org-keys/verify/evt-unsigned");
    expect(res.status).toBe(200);
    for (const field of CLIENT_FIELDS) {
      expect(res.body).toHaveProperty(field);
    }
    expect(res.body.valid).toBe(false);
    expect(res.body.keyFingerprint).toBeNull();
    expect(res.body.signedAt).toBeNull();
  });
});

/* ── POST /api/org-keys/sign-all ──────────────────────────────────────────── */

describe("POST /api/org-keys/sign-all — JSON response contract", () => {
  it("responds 200 with a parsed JSON body (application/json)", async () => {
    const res = await api("admin1", "POST", "/api/org-keys/sign-all");
    expect(res.status).toBe(200);
    expect(res.contentType).toMatch(/application\/json/i);
    expect(res.body).not.toBeNull();
    expect(typeof res.body).toBe("object");
  });

  it("returns numeric signed and failed fields", async () => {
    const res = await api("admin1", "POST", "/api/org-keys/sign-all");
    expect(res.body).toHaveProperty("signed");
    expect(res.body).toHaveProperty("failed");
    expect(typeof res.body.signed).toBe("number");
    expect(typeof res.body.failed).toBe("number");
    expect(res.body.signed).toBe(3);
    expect(res.body.failed).toBe(1);
  });

  it("requires authentication (401 for anonymous)", async () => {
    const res = await api(null, "POST", "/api/org-keys/sign-all");
    expect(res.status).toBe(401);
  });
});
