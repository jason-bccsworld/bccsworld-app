/**
 * Access-control regression tests for the User Management admin routes.
 *
 * Locks in the access matrix:
 *  - Org admins: org-scoped user list + all five mutation routes work.
 *  - Managers: read-only — 200 org-scoped list, 403 on every mutation route
 *    and on GET /api/admin/roles.
 *  - Viewers: 403 on the list.
 *  - Platform staff (@bccsworld.com SuperAdmin): cross-org list with
 *    organization names, and may mutate any user.
 *
 * The database and auth are mocked; the real route handlers and the real
 * tenant middleware (resolveTenant / requireOrg / isPlatformStaff) run in
 * multi-tenant mode against an in-memory query router. Requests go through a
 * real HTTP server so express middleware ordering is exercised end-to-end.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";

/* ── Shared hoisted state ─────────────────────────────────────────────────── */

const h = vi.hoisted(() => {
  const ORG1 = "11111111-1111-4111-8111-111111111111";
  const ORG2 = "22222222-2222-4222-8222-222222222222";

  const testUsers: Record<string, any> = {
    admin1: { id: "admin1", email: "admin@acme.com", role: "admin" },
    manager1: { id: "manager1", email: "manager@acme.com", role: "manager" },
    viewer1: { id: "viewer1", email: "viewer@acme.com", role: "viewer" },
    member1: { id: "member1", email: "member@acme.com", role: "viewer" },
    outsider1: { id: "outsider1", email: "out@other.com", role: "viewer" },
    root1: { id: "root1", email: "root@bccsworld.com", role: "admin" },
  };

  // org memberships: userId -> orgId
  const memberships: Record<string, string> = {
    admin1: ORG1,
    manager1: ORG1,
    viewer1: ORG1,
    member1: ORG1,
    outsider1: ORG2,
  };

  return {
    ORG1,
    ORG2,
    testUsers,
    memberships,
    executed: [] as { text: string; params: any[] }[],
    updates: [] as any[],
    deletes: [] as any[],
    inserts: [] as any[],
    auditLogs: [] as any[],
  };
});

/* ── SQL helpers: render drizzle sql`` templates to text + params ─────────── */

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
    if (Array.isArray(c?.value)) continue; // StringChunk
    if (Array.isArray(c?.queryChunks)) out.push(...sqlParams(c));
    else {
      // Param wrapper, raw interpolated value, or boxed String
      const v = typeof c?.value !== "undefined" && !(c instanceof String) ? c.value : c;
      out.push(v instanceof String ? String(v) : v);
    }
  }
  return out;
}

/* ── Query router: answers db.execute() by SQL text ───────────────────────── */

function routeQuery(text: string, params: any[]): { rows: any[] } {
  // resolveTenant → getUserMemberships
  if (text.includes("uo.org_role") && text.includes("FROM user_organizations")) {
    const userId = params[0];
    const orgId = h.memberships[userId];
    if (!orgId) return { rows: [] };
    return {
      rows: [
        {
          organization_id: orgId,
          org_role: h.testUsers[userId]?.role ?? "viewer",
          organization_name: orgId === h.ORG1 ? "Acme Aviation" : "Other Org",
        },
      ],
    };
  }
  // getDefaultOrgId (used for staff with no memberships)
  if (text.includes("FROM training_organizations") && text.includes("ORDER BY created_at")) {
    return { rows: [{ id: h.ORG1 }] };
  }
  // Staff cross-org user list
  if (text.includes("string_agg")) {
    return {
      rows: Object.values(h.testUsers).map((u: any) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        organizations:
          h.memberships[u.id] === h.ORG1
            ? "Acme Aviation"
            : h.memberships[u.id] === h.ORG2
              ? "Other Org"
              : "",
      })),
    };
  }
  // Org-scoped user list
  if (text.includes("WHERE uo.organization_id =") && text.includes("u.created_at")) {
    const orgId = params[0];
    return {
      rows: Object.values(h.testUsers)
        .filter((u: any) => h.memberships[u.id] === orgId)
        .map((u: any) => ({ id: u.id, email: u.email, role: u.role })),
    };
  }
  // canManageTargetUser membership check
  if (text.includes("SELECT u.email") && text.includes("JOIN user_organizations")) {
    const [targetId, orgId] = params;
    const target = h.testUsers[targetId];
    if (target && h.memberships[targetId] === orgId) return { rows: [{ email: target.email }] };
    return { rows: [] };
  }
  // Valid roles lookup (role mutation)
  if (text.includes("bccs_role_permissions") && !text.includes("display_name")) {
    return { rows: [{ role_name: "admin" }, { role_name: "manager" }, { role_name: "viewer" }] };
  }
  // GET /api/admin/roles
  if (text.includes("bccs_role_permissions") && text.includes("display_name")) {
    return { rows: [{ id: 1, role_name: "admin", display_name: "Admin" }] };
  }
  // Invite: membership insert
  if (text.includes("INSERT INTO user_organizations")) return { rows: [] };
  return { rows: [] };
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
      const params = sqlParams(q);
      h.executed.push({ text, params });
      return routeQuery(text, params);
    }),
    select: () => thenable(() => []),
    insert: () => ({
      values: (v: any) => {
        h.inserts.push(v);
        return {
          returning: async () => [{ id: "new-user-1", ...v, passwordHash: undefined }],
          then: (res: any) => Promise.resolve([{ id: "new-user-1", ...v }]).then(res),
        };
      },
    }),
    update: () => ({
      set: (v: any) => ({
        where: async () => {
          h.updates.push(v);
        },
      }),
    }),
    delete: () => ({
      where: async () => {
        h.deletes.push(true);
      },
    }),
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

// No-op every unrelated sub-router / service that routes.ts pulls in, so the
// test doesn't drag in OpenAI clients, schedulers, and file processors.
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
  h.updates.length = 0;
  h.deletes.length = 0;
  h.inserts.length = 0;
  h.auditLogs.length = 0;
});

/* ── The five mutation routes, parametrised ───────────────────────────────── */

const MUTATIONS: { name: string; method: string; path: string; body?: any }[] = [
  { name: "invite", method: "POST", path: "/api/admin/users/invite", body: { email: "n@acme.com", firstName: "N", lastName: "U", role: "viewer", temporaryPassword: "longenough1" } },
  { name: "role", method: "PUT", path: "/api/admin/users/member1/role", body: { role: "manager" } },
  { name: "status", method: "PUT", path: "/api/admin/users/member1/status", body: { isActive: false } },
  { name: "reset-password", method: "PUT", path: "/api/admin/users/member1/reset-password", body: { newPassword: "longenough1" } },
  { name: "delete", method: "DELETE", path: "/api/admin/users/member1" },
];

/* ── Manager: read-only ───────────────────────────────────────────────────── */

describe("manager access", () => {
  it("gets 200 and an org-scoped list on GET /api/admin/users", async () => {
    const res = await api("manager1", "GET", "/api/admin/users");
    expect(res.status).toBe(200);
    const ids = res.body.map((u: any) => u.id).sort();
    expect(ids).toEqual(["admin1", "manager1", "member1", "viewer1"]);
    expect(ids).not.toContain("outsider1"); // other org never leaks
    // The list query was bound to the manager's own org
    const listQuery = h.executed.find((q) => q.text.includes("WHERE uo.organization_id ="));
    expect(listQuery?.params).toContain(h.ORG1);
  });

  for (const m of MUTATIONS) {
    it(`gets 403 on ${m.method} ${m.name}`, async () => {
      const res = await api("manager1", m.method, m.path, m.body);
      expect(res.status).toBe(403);
      // and nothing was written
      expect(h.updates).toHaveLength(0);
      expect(h.deletes).toHaveLength(0);
      expect(h.inserts).toHaveLength(0);
    });
  }

  it("gets 403 on GET /api/admin/roles", async () => {
    const res = await api("manager1", "GET", "/api/admin/roles");
    expect(res.status).toBe(403);
  });
});

/* ── Viewer: no access to the list ────────────────────────────────────────── */

describe("viewer access", () => {
  it("gets 403 on GET /api/admin/users", async () => {
    const res = await api("viewer1", "GET", "/api/admin/users");
    expect(res.status).toBe(403);
  });
});

/* ── Unauthenticated ──────────────────────────────────────────────────────── */

describe("unauthenticated access", () => {
  it("gets 401 on GET /api/admin/users", async () => {
    const res = await api(null, "GET", "/api/admin/users");
    expect(res.status).toBe(401);
  });
});

/* ── Admin: org-scoped list + working mutations ───────────────────────────── */

describe("org admin access", () => {
  it("gets an org-scoped list without cross-org users", async () => {
    const res = await api("admin1", "GET", "/api/admin/users");
    expect(res.status).toBe(200);
    const ids = res.body.map((u: any) => u.id);
    expect(ids).toContain("member1");
    expect(ids).not.toContain("outsider1");
    // Org admins never hit the cross-org staff query
    expect(h.executed.some((q) => q.text.includes("string_agg"))).toBe(false);
  });

  it("can invite a user (201) into their org", async () => {
    const res = await api("admin1", "POST", "/api/admin/users/invite", MUTATIONS[0].body);
    expect(res.status).toBe(201);
    expect(h.inserts).toHaveLength(1);
    expect(h.inserts[0].email).toBe("n@acme.com");
    // membership linked to the admin's active org
    const link = h.executed.find((q) => q.text.includes("INSERT INTO user_organizations"));
    expect(link?.params).toContain(h.ORG1);
  });

  it("can change a role of an org member (200)", async () => {
    const res = await api("admin1", "PUT", "/api/admin/users/member1/role", { role: "manager" });
    expect(res.status).toBe(200);
    expect(h.updates).toHaveLength(1);
    expect(h.updates[0].role).toBe("manager");
  });

  it("can change status, reset password, and delete an org member", async () => {
    expect((await api("admin1", "PUT", "/api/admin/users/member1/status", { isActive: false })).status).toBe(200);
    expect((await api("admin1", "PUT", "/api/admin/users/member1/reset-password", { newPassword: "longenough1" })).status).toBe(200);
    expect((await api("admin1", "DELETE", "/api/admin/users/member1")).status).toBe(200);
    expect(h.updates.length).toBe(2);
    expect(h.deletes.length).toBe(1);
  });

  it("cannot mutate a user from another organization (404, no write)", async () => {
    const res = await api("admin1", "PUT", "/api/admin/users/outsider1/role", { role: "manager" });
    expect(res.status).toBe(404);
    expect(h.updates).toHaveLength(0);
  });
});

/* ── SuperAdmin (@bccsworld.com): cross-org visibility + mutations ────────── */

describe("SuperAdmin (platform staff) access", () => {
  it("gets a cross-org list including organization names", async () => {
    const res = await api("root1", "GET", "/api/admin/users");
    expect(res.status).toBe(200);
    const ids = res.body.map((u: any) => u.id);
    expect(ids).toContain("member1");
    expect(ids).toContain("outsider1"); // sees users across orgs
    const outsider = res.body.find((u: any) => u.id === "outsider1");
    expect(outsider.organizations).toBe("Other Org");
  });

  it("can mutate users in any organization", async () => {
    const res = await api("root1", "PUT", "/api/admin/users/outsider1/role", { role: "manager" });
    expect(res.status).toBe(200);
    expect(h.updates).toHaveLength(1);
  });

  it("can access GET /api/admin/roles", async () => {
    const res = await api("root1", "GET", "/api/admin/roles");
    expect(res.status).toBe(200);
  });
});
