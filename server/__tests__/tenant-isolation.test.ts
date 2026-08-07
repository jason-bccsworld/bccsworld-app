/**
 * Cross-tenant isolation regression tests.
 *
 * This session closed several cross-org leaks; these tests keep them closed:
 *  - GET  /api/organizations            → non-staff only see their own orgs
 *  - PUT  /api/organizations/:id/status → platform staff only
 *  - POST /api/organizations/setup      → platform staff only
 *  - GET  /api/auth/organization        → no default-org fallback for non-staff
 *  - POST /api/session/active-org       → non-members cannot switch into an org
 *  - /api/adaptive-compliance org-parameterized routes → 403 on foreign org
 *  - /api/reviewer-keys                 → keys forcibly scoped to active org
 *  - /api/blockchain/organizations/*    → org lookups scoped, register staff-only
 *
 * Harness style matches admin-roles-access.test.ts: mocked db + real tenant
 * middleware and real route handlers over a live HTTP server, with a
 * header-based auth mock (x-test-user). MULTI_TENANT=true.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";

/* ── Shared hoisted state ─────────────────────────────────────────────────── */

const h = vi.hoisted(() => {
  const ORG1 = "11111111-1111-4111-8111-111111111111";
  const ORG2 = "22222222-2222-4222-8222-222222222222";

  const testUsers: Record<string, any> = {
    admin1: { id: "admin1", email: "admin@acme.com", role: "admin" },
    orphan1: { id: "orphan1", email: "admin@nowhere.com", role: "admin" },
    root1: { id: "root1", email: "root@bccsworld.com", role: "admin" },
  };

  // userId → list of org ids the user is an active member of
  const memberships: Record<string, string[]> = {
    admin1: [ORG1],
    orphan1: [],
    root1: [],
  };

  const orgs = [
    { id: ORG1, organizationName: "Acme Flight", isActive: true },
    { id: ORG2, organizationName: "Rival Aviation", isActive: true },
  ];

  const reviewerKeys = [
    { id: "key-org1", org_ids: [ORG1], key_preview: "bccs_rev_aaa...", label: "Org1 key" },
    { id: "key-org2", org_ids: [ORG2], key_preview: "bccs_rev_bbb...", label: "Org2 key" },
  ];

  return {
    ORG1,
    ORG2,
    testUsers,
    memberships,
    orgs,
    reviewerKeys,
    executed: [] as { text: string; params: any[] }[],
  };
});

/* ── SQL helpers (drizzle sql`` objects) ─────────────────────────────────── */

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

function sqlParams(q: any): any[] {
  const out: any[] = [];
  for (const c of q?.queryChunks ?? []) {
    if (c == null) continue;
    if (Array.isArray(c?.value)) continue; // string chunk
    if (Array.isArray(c?.queryChunks)) out.push(...sqlParams(c));
    else if (typeof c === "object" && "value" in c) out.push(c.value);
    else if (typeof c !== "object") out.push(c);
  }
  return out;
}

/* ── Mocks ────────────────────────────────────────────────────────────────── */

vi.mock("../db", () => {
  const db = {
    execute: vi.fn(async (q: any) => {
      const text = sqlText(q);
      const params = sqlParams(q);
      h.executed.push({ text, params });

      // resolveTenant → getUserMemberships
      if (text.includes("uo.org_role") && text.includes("FROM user_organizations")) {
        const userId = String(params[0] ?? "");
        const rows = (h.memberships[userId] ?? []).map((orgId) => ({
          organization_id: orgId,
          org_role: "admin",
          organization_name: h.orgs.find((o) => o.id === orgId)?.organizationName ?? "?",
        }));
        return { rows };
      }
      // getDefaultOrgId (earliest active org)
      if (text.includes("FROM training_organizations") && text.includes("ORDER BY created_at")) {
        return { rows: [{ id: h.ORG1 }] };
      }
      // /api/organizations member counts
      if (text.includes("GROUP BY organization_id")) {
        return { rows: [] };
      }
      // reviewer keys: list
      if (text.includes("FROM bccs_reviewer_keys") && text.includes("ORDER BY created_at DESC")) {
        return { rows: h.reviewerKeys.map((k) => ({ ...k })) };
      }
      // reviewer keys: delete pre-check
      if (text.includes("SELECT org_ids FROM bccs_reviewer_keys")) {
        const id = String(params[0] ?? "");
        const key = h.reviewerKeys.find((k) => k.id === id);
        return { rows: key ? [{ org_ids: key.org_ids }] : [] };
      }
      return { rows: [] };
    }),
    select: () => {
      const state: { whereParams: any[] | null } = { whereParams: null };
      const obj: any = {};
      for (const m of ["from", "orderBy", "limit", "leftJoin", "innerJoin", "groupBy"]) {
        obj[m] = () => obj;
      }
      obj.where = (cond: any) => {
        state.whereParams = sqlParams(cond);
        return obj;
      };
      obj.then = (res: any, rej: any) => {
        let rows = h.orgs.map((o) => ({ ...o }));
        if (state.whereParams) {
          const wanted = state.whereParams.map(String);
          rows = rows.filter((o) => wanted.includes(o.id));
        }
        return Promise.resolve(rows).then(res, rej);
      };
      return obj;
    },
    insert: () => ({
      values: (vals: any) => ({
        returning: async () => {
          h.executed.push({ text: "INSERT (builder)", params: [vals] });
          return [{ id: "new-org", ...vals }];
        },
        then: (res: any) => {
          h.executed.push({ text: "INSERT (builder)", params: [vals] });
          return Promise.resolve([]).then(res);
        },
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
    getTrainingOrganization: vi.fn(async (id: string) => h.orgs.find((o) => o.id === id)),
    getOrganizationMembers: vi.fn(async (_id: string) => [{ userId: "someone" }]),
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

// Real routers under test: reviewer, adaptive-compliance, blockchain-key-management.
// Mock their heavy service dependencies instead.
vi.mock("../services/blockchain-key-management", () => ({
  blockchainKeyService: {},
}));
vi.mock("../services/regulatory-spine", () => ({
  regulatorySpineService: {
    getComplianceFrameworkHierarchy: vi.fn(async (orgId: string) => ({ orgId, frameworks: [] })),
  },
}));
vi.mock("../services/checklist-harmonization", () => ({ checklistHarmonizationEngine: {} }));
vi.mock("../services/inspector-preference", () => ({ inspectorPreferenceEngine: {} }));
vi.mock("../services/evidence-indexing", () => ({ evidenceIndexingService: {} }));
vi.mock("../services/audit-packet-generator", () => ({ auditPacketGenerator: {} }));
vi.mock("../generate-tutorial-doc", () => ({
  generateAdaptiveComplianceTutorial: vi.fn(),
}));

// No-op every unrelated sub-router / service that routes.ts pulls in.
function noopMw() {
  return { default: (_req: any, _res: any, next: any) => next() };
}
vi.mock("../routes/legacy-data-transfer", noopMw);
vi.mock("../routes/multi-platform-integration", noopMw);
vi.mock("../routes/audit-generation", noopMw);
vi.mock("../routes/compliance-alerts", noopMw);
vi.mock("../routes/document-generation", noopMw);
vi.mock("../routes/maintenance", noopMw);
vi.mock("../routes/digital-forms", noopMw);
vi.mock("../routes/ml-training", noopMw);
vi.mock("../routes/documents", noopMw);
vi.mock("../routes/crypto-signing", noopMw);
vi.mock("../routes/governance", noopMw);
vi.mock("../routes/agents", noopMw);
vi.mock("../routes/federal-contracts", noopMw);
vi.mock("../routes/advanced-key-recovery", () => ({
  registerAdvancedKeyRecoveryRoutes: () => {},
}));
vi.mock("../routes/crypto-subscriptions", () => ({
  registerCryptoSubscriptionRoutes: () => {},
}));
vi.mock("../services/crypto-signing", () => ({
  signTrainingRecord: vi.fn(),
  getOrgActiveKey: vi.fn(),
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
): Promise<{ status: number; body: any }> {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(userId ? { "x-test-user": userId } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON */
  }
  return { status: res.status, body: json };
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
});

function wrote(patterns: RegExp[]): boolean {
  return h.executed.some((q) => patterns.some((p) => p.test(q.text)));
}

/* ── Organization list & management ──────────────────────────────────────── */

describe("organization list & tenant management", () => {
  it("GET /api/organizations: non-staff admin sees only their own org", async () => {
    const res = await api("admin1", "GET", "/api/organizations");
    expect(res.status).toBe(200);
    const ids = res.body.map((o: any) => o.id);
    expect(ids).toContain(h.ORG1);
    expect(ids).not.toContain(h.ORG2);
  });

  it("GET /api/organizations: platform staff sees all orgs", async () => {
    const res = await api("root1", "GET", "/api/organizations");
    expect(res.status).toBe(200);
    const ids = res.body.map((o: any) => o.id);
    expect(ids).toContain(h.ORG1);
    expect(ids).toContain(h.ORG2);
  });

  it("PUT /api/organizations/:id/status: non-staff admin gets 403", async () => {
    const res = await api("admin1", "PUT", `/api/organizations/${h.ORG2}/status`, {
      isActive: false,
    });
    expect(res.status).toBe(403);
  });

  it("POST /api/organizations/setup: non-staff admin gets 403 and nothing is created", async () => {
    const res = await api("admin1", "POST", "/api/organizations/setup", {
      organizationName: "Sneaky Org",
      organizationType: "part_141",
      regulatoryAuthority: "faa",
    });
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/SuperAdmin/i);
    expect(wrote([/INSERT/i])).toBe(false);
  });

  it("POST /api/organizations/setup: platform staff may create (201)", async () => {
    const res = await api("root1", "POST", "/api/organizations/setup", {
      organizationName: "New Org",
      organizationType: "part_141",
      regulatoryAuthority: "faa",
    });
    expect(res.status).toBe(201);
  });
});

/* ── /api/auth/organization fallback ─────────────────────────────────────── */

describe("GET /api/auth/organization", () => {
  it("non-staff admin gets their own org, not a fallback", async () => {
    const res = await api("admin1", "GET", "/api/auth/organization");
    expect(res.status).toBe(200);
    expect(res.body?.id).toBe(h.ORG1);
  });

  it("non-staff user with no membership gets null — never another org", async () => {
    const res = await api("orphan1", "GET", "/api/auth/organization");
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });
});

/* ── Active-org switching ─────────────────────────────────────────────────── */

describe("POST /api/session/active-org", () => {
  it("non-member cannot switch into a foreign org (403)", async () => {
    const res = await api("admin1", "POST", "/api/session/active-org", {
      organizationId: h.ORG2,
    });
    expect(res.status).toBe(403);
  });

  it("member can select their own org (200)", async () => {
    const res = await api("admin1", "POST", "/api/session/active-org", {
      organizationId: h.ORG1,
    });
    expect(res.status).toBe(200);
  });
});

/* ── Adaptive compliance org-parameterized routes ────────────────────────── */

describe("adaptive-compliance org scoping", () => {
  it("foreign organizationId in path is rejected (403)", async () => {
    const res = await api(
      "admin1",
      "GET",
      `/api/adaptive-compliance/frameworks/hierarchy/${h.ORG2}`,
    );
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/not permitted/i);
  });

  it("own organizationId is served (200)", async () => {
    const res = await api(
      "admin1",
      "GET",
      `/api/adaptive-compliance/frameworks/hierarchy/${h.ORG1}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.orgId).toBe(h.ORG1);
  });

  it("user with no active org is rejected (403)", async () => {
    const res = await api(
      "orphan1",
      "GET",
      `/api/adaptive-compliance/frameworks/hierarchy/${h.ORG1}`,
    );
    expect(res.status).toBe(403);
  });
});

/* ── Reviewer key scoping ─────────────────────────────────────────────────── */

describe("reviewer key tenant scoping", () => {
  it("POST: non-staff admin cannot issue a key for another org (403, no insert)", async () => {
    const res = await api("admin1", "POST", "/api/reviewer-keys", {
      label: "spy key",
      reviewerName: "Mallory",
      orgIds: [h.ORG2],
    });
    expect(res.status).toBe(403);
    expect(wrote([/INSERT INTO bccs_reviewer_keys/i])).toBe(false);
  });

  it("POST: non-staff admin's key is forcibly scoped to their active org", async () => {
    const res = await api("admin1", "POST", "/api/reviewer-keys", {
      label: "our key",
      reviewerName: "Alice",
    });
    expect(res.status).toBe(201);
    expect(res.body.orgIds).toEqual([h.ORG1]);
    const insert = h.executed.find((q) => /INSERT INTO bccs_reviewer_keys/i.test(q.text));
    expect(insert).toBeDefined();
    expect(insert!.params.join(" ")).toContain(h.ORG1);
    expect(insert!.params.join(" ")).not.toContain(h.ORG2);
  });

  it("POST: admin with no active org is rejected (403)", async () => {
    const res = await api("orphan1", "POST", "/api/reviewer-keys", {
      label: "nokey",
      reviewerName: "Nobody",
    });
    expect(res.status).toBe(403);
  });

  it("GET: non-staff admin only sees keys scoped to their org", async () => {
    const res = await api("admin1", "GET", "/api/reviewer-keys");
    expect(res.status).toBe(200);
    const ids = res.body.map((k: any) => k.id);
    expect(ids).toContain("key-org1");
    expect(ids).not.toContain("key-org2");
  });

  it("GET: platform staff sees all keys", async () => {
    const res = await api("root1", "GET", "/api/reviewer-keys");
    expect(res.status).toBe(200);
    const ids = res.body.map((k: any) => k.id);
    expect(ids).toContain("key-org1");
    expect(ids).toContain("key-org2");
  });

  it("DELETE: non-staff admin cannot revoke another org's key (403, no write)", async () => {
    const res = await api("admin1", "DELETE", "/api/reviewer-keys/key-org2");
    expect(res.status).toBe(403);
    expect(wrote([/UPDATE bccs_reviewer_keys SET is_active/i])).toBe(false);
  });

  it("DELETE: non-staff admin can revoke their own org's key (200)", async () => {
    const res = await api("admin1", "DELETE", "/api/reviewer-keys/key-org1");
    expect(res.status).toBe(200);
    expect(wrote([/UPDATE bccs_reviewer_keys SET is_active/i])).toBe(true);
  });
});

/* ── Blockchain organization lookups ─────────────────────────────────────── */

describe("blockchain organization scoping", () => {
  it("GET /api/blockchain/organizations/:id: foreign org is rejected (403)", async () => {
    const res = await api("admin1", "GET", `/api/blockchain/organizations/${h.ORG2}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/not permitted/i);
  });

  it("GET /api/blockchain/organizations/:id: own org is served (200)", async () => {
    const res = await api("admin1", "GET", `/api/blockchain/organizations/${h.ORG1}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(h.ORG1);
  });

  it("GET /api/blockchain/organizations/:id/members: foreign org is rejected (403)", async () => {
    const res = await api("admin1", "GET", `/api/blockchain/organizations/${h.ORG2}/members`);
    expect(res.status).toBe(403);
  });

  it("GET /api/blockchain/organizations/:id/members: platform staff may inspect any org (200)", async () => {
    const res = await api("root1", "GET", `/api/blockchain/organizations/${h.ORG2}/members`);
    expect(res.status).toBe(200);
  });

  it("POST /api/blockchain/organizations/register: non-staff admin gets 403", async () => {
    const res = await api("admin1", "POST", "/api/blockchain/organizations/register", {
      organizationName: "Evil Org",
      organizationType: "part_141",
      certificateNumber: "X1",
      regulatoryAuthority: "faa",
      contactInfo: {},
    });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/SuperAdmin/i);
  });
});

/* ── Unauthenticated access ──────────────────────────────────────────────── */

describe("unauthenticated access", () => {
  const CASES: [string, string][] = [
    ["GET", "/api/organizations"],
    ["POST", "/api/organizations/setup"],
    ["GET", "/api/auth/organization"],
    ["GET", `/api/adaptive-compliance/frameworks/hierarchy/x`],
    ["GET", "/api/reviewer-keys"],
    ["GET", `/api/blockchain/organizations/x`],
  ];
  for (const [method, path] of CASES) {
    it(`${method} ${path} → 401`, async () => {
      const res = await api(null, method, path, method === "POST" ? {} : undefined);
      expect(res.status).toBe(401);
    });
  }
});
