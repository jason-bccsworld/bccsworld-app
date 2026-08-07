/**
 * Access-control regression tests for the role-permission matrix routes.
 *
 * The permission matrix (bccs_role_permissions) is platform-wide state.
 * In multi-tenant mode:
 *  - Org admins get 403 on all three mutation routes
 *    (PUT /api/admin/roles/:roleName, POST /api/admin/roles,
 *     DELETE /api/admin/roles/:roleName) and nothing is written.
 *  - Platform staff (@bccsworld.com) may mutate, but system roles
 *    cannot be deleted.
 *
 * Same harness style as admin-users-access.test.ts: mocked db + real tenant
 * middleware, real route handlers, over a live HTTP server.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";

/* ── Shared hoisted state ─────────────────────────────────────────────────── */

const h = vi.hoisted(() => {
  const ORG1 = "11111111-1111-4111-8111-111111111111";

  const testUsers: Record<string, any> = {
    admin1: { id: "admin1", email: "admin@acme.com", role: "admin" },
    manager1: { id: "manager1", email: "manager@acme.com", role: "manager" },
    root1: { id: "root1", email: "root@bccsworld.com", role: "admin" },
  };

  const memberships: Record<string, string> = {
    admin1: ORG1,
    manager1: ORG1,
  };

  return {
    ORG1,
    testUsers,
    memberships,
    executed: [] as { text: string }[],
    auditLogs: [] as any[],
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
      // resolveTenant → getUserMemberships
      if (text.includes("uo.org_role") && text.includes("FROM user_organizations")) {
        // params live inside chunks; route by the presence of the sole user id
        // We can't easily read params for raw SQL, so answer per test user via
        // the last requested user header — instead, return memberships for any
        // known user id found in the query params.
        return { rows: [] };
      }
      if (text.includes("FROM training_organizations") && text.includes("ORDER BY created_at")) {
        return { rows: [{ id: h.ORG1 }] };
      }
      if (text.includes("INSERT INTO bccs_role_permissions")) {
        return { rows: [{ id: 2, role_name: "customrole", display_name: "Custom Role" }] };
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
    createAuditLog: vi.fn(async (entry: any) => {
      h.auditLogs.push(entry);
      return entry;
    }),
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
vi.mock("../routes/crypto-signing", noopMw);
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
  h.auditLogs.length = 0;
});

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function wroteToRoleTable(): boolean {
  return h.executed.some(
    (q) =>
      /UPDATE bccs_role_permissions/i.test(q.text) ||
      /INSERT INTO bccs_role_permissions/i.test(q.text) ||
      /DELETE FROM bccs_role_permissions/i.test(q.text),
  );
}

const ROLE_MUTATIONS: { name: string; method: string; path: string; body?: any }[] = [
  {
    name: "PUT /api/admin/roles/:roleName",
    method: "PUT",
    path: "/api/admin/roles/manager",
    body: { permissions: ["admin:roles"] },
  },
  {
    name: "POST /api/admin/roles",
    method: "POST",
    path: "/api/admin/roles",
    body: { roleName: "customrole", displayName: "Custom Role", permissions: [] },
  },
  {
    name: "DELETE /api/admin/roles/:roleName",
    method: "DELETE",
    path: "/api/admin/roles/customrole",
  },
];

/* ── Org admin: rejected on every role mutation in multi-tenant mode ─────── */

describe("org admin (multi-tenant) role-matrix access", () => {
  for (const m of ROLE_MUTATIONS) {
    it(`gets 403 on ${m.name} and nothing is written`, async () => {
      const res = await api("admin1", m.method, m.path, m.body);
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/platform staff/i);
      expect(wroteToRoleTable()).toBe(false);
    });
  }
});

/* ── Non-admin roles: rejected before the staff check ─────────────────────── */

describe("manager role-matrix access", () => {
  for (const m of ROLE_MUTATIONS) {
    it(`gets 403 on ${m.name}`, async () => {
      const res = await api("manager1", m.method, m.path, m.body);
      expect(res.status).toBe(403);
      expect(wroteToRoleTable()).toBe(false);
    });
  }
});

describe("unauthenticated role-matrix access", () => {
  for (const m of ROLE_MUTATIONS) {
    it(`gets 401 on ${m.name}`, async () => {
      const res = await api(null, m.method, m.path, m.body);
      expect(res.status).toBe(401);
      expect(wroteToRoleTable()).toBe(false);
    });
  }
});

/* ── Platform staff: allowed ──────────────────────────────────────────────── */

describe("platform staff (@bccsworld.com) role-matrix access", () => {
  it("can update a role's permissions (200) and it is audited", async () => {
    const res = await api("root1", "PUT", "/api/admin/roles/manager", {
      permissions: ["admin:roles"],
    });
    expect(res.status).toBe(200);
    expect(h.executed.some((q) => /UPDATE bccs_role_permissions/i.test(q.text))).toBe(true);
    expect(h.auditLogs).toHaveLength(1);
    expect(h.auditLogs[0].eventType).toBe("role_permissions_updated");
  });

  it("rejects unknown permissions with 400 and no write", async () => {
    const res = await api("root1", "PUT", "/api/admin/roles/manager", {
      permissions: ["not:a-real-permission"],
    });
    expect(res.status).toBe(400);
    expect(wroteToRoleTable()).toBe(false);
  });

  it("cannot strip admin:roles from the admin role (400)", async () => {
    const res = await api("root1", "PUT", "/api/admin/roles/admin", { permissions: [] });
    expect(res.status).toBe(400);
    expect(wroteToRoleTable()).toBe(false);
  });

  it("can create a custom role (201)", async () => {
    const res = await api("root1", "POST", "/api/admin/roles", {
      roleName: "customrole",
      displayName: "Custom Role",
      permissions: [],
    });
    expect(res.status).toBe(201);
    expect(h.executed.some((q) => /INSERT INTO bccs_role_permissions/i.test(q.text))).toBe(true);
  });

  it("can delete a non-system role (200)", async () => {
    const res = await api("root1", "DELETE", "/api/admin/roles/customrole");
    expect(res.status).toBe(200);
    expect(h.executed.some((q) => /DELETE FROM bccs_role_permissions/i.test(q.text))).toBe(true);
  });

  // The system roles defined in shared/permissions.ts
  for (const systemRole of ["admin", "auditor", "instructor", "viewer"]) {
    it(`cannot delete the system role "${systemRole}" (400, no write)`, async () => {
      const res = await api("root1", "DELETE", `/api/admin/roles/${systemRole}`);
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/system roles/i);
      expect(wroteToRoleTable()).toBe(false);
    });
  }
});
