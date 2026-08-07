/**
 * Regression tests for the signup welcome flow:
 *
 *  - SMTP unconfigured: POST /api/signup flags the new admin with
 *    welcome_pending=true (in-app welcome fallback) and GET /api/auth/user
 *    exposes the flag.
 *  - POST /api/auth/welcome-ack clears the flag.
 *  - SMTP configured: a welcome email send is attempted (nodemailer mocked)
 *    and the fallback flag is NOT set.
 *
 * The database, auth, and nodemailer are mocked; the real signup route and
 * the real welcome-email service run end-to-end over HTTP.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";

/* ── Shared hoisted state ─────────────────────────────────────────────────── */

const h = vi.hoisted(() => ({
  // users by id, kept up to date by the mocked db so /api/auth/user works
  usersById: {} as Record<string, any>,
  userIdSeq: 0,
  updates: [] as { set: any; }[],
  sendMailCalls: [] as any[],
  sendMailImpl: null as null | ((opts: any) => Promise<any>),
}));

/* ── Mocks ────────────────────────────────────────────────────────────────── */

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn(async (opts: any) => {
        h.sendMailCalls.push(opts);
        if (h.sendMailImpl) return h.sendMailImpl(opts);
        return { messageId: "test" };
      }),
    })),
  },
}));

vi.mock("../db", () => {
  function thenable(getResult: () => any) {
    const obj: any = {};
    for (const m of ["from", "where", "orderBy", "limit", "leftJoin", "innerJoin", "groupBy"]) {
      obj[m] = () => obj;
    }
    obj.then = (res: any, rej: any) => Promise.resolve(getResult()).then(res, rej);
    return obj;
  }

  function makeInsert() {
    return {
      values: (v: any) => ({
        returning: async () => {
          if (v.email !== undefined) {
            // users insert
            const id = `user-${++h.userIdSeq}`;
            const user = { id, welcomePending: false, ...v };
            h.usersById[id] = user;
            return [user];
          }
          // training_organizations insert
          return [{ id: "33333333-3333-4333-8333-333333333333", ...v }];
        },
      }),
    };
  }

  const db = {
    execute: vi.fn(async () => ({ rows: [] })),
    select: () => thenable(() => []), // "existing email" check → none
    insert: () => makeInsert(),
    update: () => ({
      set: (setVals: any) => {
        h.updates.push({ set: setVals });
        // Apply to every known user in this test (only one signs up per test)
        const apply = () => {
          const users = Object.values(h.usersById);
          const u: any = users[users.length - 1];
          if (u) Object.assign(u, setVals);
          return u ? [u] : [];
        };
        const whereObj: any = {
          returning: async () => apply(),
          then: (res: any, rej: any) => Promise.resolve(apply()).then(res, rej),
        };
        return { where: () => whereObj };
      },
    }),
    delete: () => ({ where: async () => {} }),
    transaction: async (fn: (tx: any) => any) =>
      fn({ insert: () => makeInsert(), execute: async () => ({ rows: [] }) }),
  };
  return { db, pool: {} };
});

vi.mock("../storage", () => ({
  storage: {
    createAuditLog: vi.fn(async (e: any) => e),
    getUser: vi.fn(async (id: string) => h.usersById[id]),
  },
}));

vi.mock("../localAuth", () => ({
  setupAuth: async (app: any) => {
    app.use((req: any, _res: any, next: any) => {
      const id = String(req.headers["x-test-user"] ?? "");
      const user = h.usersById[id];
      if (user) {
        req.user = user;
        req.isAuthenticated = () => true;
      } else {
        req.isAuthenticated = () => false;
      }
      req.session = { regenerate: (cb: any) => cb(null) };
      req.logIn = (u: any, cb: any) => {
        req.user = u;
        cb(null);
      };
      next();
    });
  },
  isAuthenticated: (req: any, res: any, next: any) =>
    req.user ? next() : res.status(401).json({ message: "Unauthorized" }),
}));

// No-op unrelated sub-routers/services routes.ts pulls in.
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
  generateAndStoreOrgKeyPair: vi.fn(async () => ({})),
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

let signupCounter = 0;
function signupPayload() {
  signupCounter += 1;
  return {
    organizationName: "Acme Flight Academy",
    organizationType: "part_141",
    regulatoryAuthority: "faa",
    firstName: "Ada",
    lastName: "Lovelace",
    email: `ada${signupCounter}@acmeflight.com`,
    password: "supersecure1",
  };
}

beforeAll(async () => {
  process.env.MULTI_TENANT = "true";
  delete process.env.SMTP_HOST;
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
  delete process.env.SMTP_HOST;
});

beforeEach(() => {
  for (const k of Object.keys(h.usersById)) delete h.usersById[k];
  h.updates.length = 0;
  h.sendMailCalls.length = 0;
  h.sendMailImpl = null;
  delete process.env.SMTP_HOST;
});

/* ── SMTP unconfigured → in-app welcome fallback ──────────────────────────── */

describe("signup with SMTP unconfigured", () => {
  it("flags the new admin with welcomePending=true and exposes it on /api/auth/user", async () => {
    const res = await api(null, "POST", "/api/signup", signupPayload());
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    // no email was attempted
    expect(h.sendMailCalls).toHaveLength(0);
    // the fallback flag was written and returned to the client
    const flagUpdate = h.updates.find((u) => u.set.welcomePending === true);
    expect(flagUpdate).toBeTruthy();
    expect(res.body.user.welcomePending).toBe(true);
    expect(res.body.user.passwordHash).toBeUndefined();

    // /api/auth/user exposes the flag for the logged-in user
    const userId = res.body.user.id;
    const me = await api(userId, "GET", "/api/auth/user");
    expect(me.status).toBe(200);
    expect(me.body.welcomePending).toBe(true);
    expect(me.body.passwordHash).toBeUndefined();
  });

  it("POST /api/auth/welcome-ack clears the flag", async () => {
    const res = await api(null, "POST", "/api/signup", signupPayload());
    expect(res.status).toBe(201);
    const userId = res.body.user.id;
    expect(h.usersById[userId].welcomePending).toBe(true);

    const ack = await api(userId, "POST", "/api/auth/welcome-ack");
    expect(ack.status).toBe(200);
    expect(ack.body.success).toBe(true);
    const clearUpdate = h.updates.find((u) => u.set.welcomePending === false);
    expect(clearUpdate).toBeTruthy();

    // The flag is gone on subsequent /api/auth/user calls
    const me = await api(userId, "GET", "/api/auth/user");
    expect(me.status).toBe(200);
    expect(me.body.welcomePending).toBe(false);
  });

  it("rejects welcome-ack when unauthenticated", async () => {
    const res = await api(null, "POST", "/api/auth/welcome-ack");
    expect(res.status).toBe(401);
  });
});

/* ── SMTP configured → email send attempted, no fallback flag ─────────────── */

describe("signup with SMTP configured", () => {
  it("attempts the welcome email and does not set welcomePending", async () => {
    process.env.SMTP_HOST = "smtp.test.local";
    const payload = signupPayload();
    const res = await api(null, "POST", "/api/signup", payload);
    expect(res.status).toBe(201);

    expect(h.sendMailCalls).toHaveLength(1);
    const mail = h.sendMailCalls[0];
    expect(mail.to).toBe(payload.email);
    expect(mail.subject).toContain(payload.organizationName);
    expect(mail.text).toContain("/login");

    // no fallback flag written
    expect(h.updates.find((u) => u.set.welcomePending === true)).toBeUndefined();
    expect(res.body.user.welcomePending).toBe(false);
  });

  it("falls back to welcomePending=true when SMTP delivery fails", async () => {
    process.env.SMTP_HOST = "smtp.test.local";
    h.sendMailImpl = async () => {
      throw new Error("connection refused");
    };
    const res = await api(null, "POST", "/api/signup", signupPayload());
    expect(res.status).toBe(201);
    expect(h.sendMailCalls).toHaveLength(1);
    expect(h.updates.find((u) => u.set.welcomePending === true)).toBeTruthy();
    expect(res.body.user.welcomePending).toBe(true);
  });
});
