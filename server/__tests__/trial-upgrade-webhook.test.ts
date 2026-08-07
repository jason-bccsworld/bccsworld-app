/**
 * End-to-end: expired-trial org self-serve upgrade through the REAL app.
 *
 * Boots the actual `createApp()` (production entrypoint: raw-body Stripe
 * webhook registered before express.json() and before trial-lifecycle
 * enforcement), then:
 *   1. asserts an expired-trial org admin is locked out of the API (402)
 *   2. posts a genuinely SIGNED customer.subscription.created webhook
 *      carrying the org's organizationId metadata
 *   3. asserts the org's OWN license row was upgraded (plan/status/period)
 *   4. asserts the same admin regains API access (no more 402)
 *
 * Harness style matches tenant-isolation.test.ts: mocked db + real middleware
 * and real route registration over a live HTTP server.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import Stripe from "stripe";

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
    if (Array.isArray(c?.value)) continue;
    if (Array.isArray(c?.queryChunks)) out.push(...sqlParams(c));
    else if (typeof c === "object" && "value" in c) out.push(c.value);
    else if (typeof c !== "object") out.push(c);
  }
  return out;
}

/* ── Shared hoisted state ────────────────────────────────────────────────── */
const h = vi.hoisted(() => {
  const ORG1 = "11111111-1111-4111-8111-111111111111";
  const DAY = 24 * 60 * 60 * 1000;
  return {
    ORG1,
    DAY,
    testUsers: {
      admin1: { id: "admin1", email: "admin@acme.com", role: "admin" },
    } as Record<string, any>,
    memberships: { admin1: [ORG1] } as Record<string, string[]>,
    // Expired-trial license, 30 days past the end → 'locked' state
    license: {
      id: "lic-org1",
      organization_id: ORG1,
      plan: "trial",
      status: "expired",
      stripe_customer_id: null as string | null,
      stripe_subscription_id: null as string | null,
      stripe_price_id: null as string | null,
      seats_limit: 5,
      current_period_start: null as string | null,
      current_period_end: new Date(Date.now() - 30 * DAY).toISOString(),
      assigned_by: "self-serve signup",
      notes: null as string | null,
      created_at: new Date(Date.now() - 60 * DAY).toISOString(),
      updated_at: new Date(Date.now() - 30 * DAY).toISOString(),
    },
    executed: [] as { text: string; params: any[] }[],
  };
});

/* ── DB mock (stateful license row) ──────────────────────────────────────── */
vi.mock("../db", () => {
  const db: any = {
    execute: vi.fn(async (q: any) => {
      const text = sqlText(q);
      const params = sqlParams(q);
      h.executed.push({ text, params });

      // tenant middleware: memberships
      if (text.includes("uo.org_role") && text.includes("FROM user_organizations")) {
        const userId = String(params[0] ?? "");
        return {
          rows: (h.memberships[userId] ?? []).map((orgId) => ({
            organization_id: orgId,
            org_role: "admin",
            organization_name: "Acme Flight",
          })),
        };
      }
      // license resolution for the org (getLicenseForOrg) and webhook target lookup
      if (text.includes("FROM bccs_licenses") && text.includes("WHERE organization_id = ")) {
        if (String(params[0]) !== h.ORG1) return { rows: [] };
        return { rows: [{ ...h.license }] };
      }
      // platform-wide fallback lookups
      if (text.includes("FROM bccs_licenses") && text.includes("organization_id IS NULL")) {
        return { rows: [] };
      }
      // webhook license update — apply to the stateful row
      if (text.includes("UPDATE bccs_licenses SET") && text.includes("stripe_subscription_id")) {
        const [plan, status, customerId, subId, priceId, periodEnd, id] = params;
        if (id === h.license.id) {
          h.license.plan = plan ?? h.license.plan;
          h.license.status = status;
          h.license.stripe_customer_id = customerId;
          h.license.stripe_subscription_id = subId;
          h.license.stripe_price_id = priceId;
          h.license.current_period_end = periodEnd;
          h.license.updated_at = new Date().toISOString();
        }
        return { rows: [] };
      }
      return { rows: [] };
    }),
    select: () => {
      const obj: any = {};
      for (const m of ["from", "orderBy", "limit", "leftJoin", "innerJoin", "groupBy", "where"]) obj[m] = () => obj;
      obj.then = (res: any, rej: any) => Promise.resolve([]).then(res, rej);
      return obj;
    },
    insert: () => ({
      values: (vals: any) => ({
        returning: async () => [{ id: "new", ...vals }],
        then: (res: any) => Promise.resolve([]).then(res),
      }),
    }),
    update: () => ({ set: () => ({ where: async () => {} }) }),
    delete: () => ({ where: async () => {} }),
  };
  return { db, pool: {} };
});

vi.mock("../db-init", () => ({ ensureTables: vi.fn(async () => {}) }));

vi.mock("../storage", () => ({
  storage: {
    createAuditLog: vi.fn(async (e: any) => e),
    getTrainingOrganization: vi.fn(async () => null),
    getOrganizationMembers: vi.fn(async () => []),
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

/* ── Stripe mock: REAL signature verification, mocked API calls ─────────── */
const WEBHOOK_SECRET = "whsec_test_e2e_secret";
const realStripe = new Stripe("sk_test_dummy", { apiVersion: "2025-04-30.basil" as any });

vi.mock("../stripeClient", () => ({
  getStripeSync: vi.fn(async () => null), // external-host path: manual verification
  getStripeWebhookSecret: vi.fn(() => WEBHOOK_SECRET),
  getUncachableStripeClient: vi.fn(async () => ({
    webhooks: realStripe.webhooks, // real constructEvent → real signature check
    prices: {
      retrieve: vi.fn(async () => ({ metadata: { planKey: "professional" }, product: {} })),
    },
    products: { list: vi.fn(async () => ({ data: [] })) },
  })),
}));

/* ── No-op every unrelated sub-router / heavy service routes.ts pulls in ── */
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
vi.mock("../routes/advanced-key-recovery", () => ({ registerAdvancedKeyRecoveryRoutes: () => {} }));
vi.mock("../routes/crypto-subscriptions", () => ({ registerCryptoSubscriptionRoutes: () => {} }));
vi.mock("../services/blockchain-key-management", () => ({ blockchainKeyService: {} }));
vi.mock("../services/regulatory-spine", () => ({
  regulatorySpineService: { getComplianceFrameworkHierarchy: vi.fn(async () => ({})) },
}));
vi.mock("../services/checklist-harmonization", () => ({ checklistHarmonizationEngine: {} }));
vi.mock("../services/inspector-preference", () => ({ inspectorPreferenceEngine: {} }));
vi.mock("../services/evidence-indexing", () => ({ evidenceIndexingService: {} }));
vi.mock("../services/audit-packet-generator", () => ({ auditPacketGenerator: {} }));
vi.mock("../services/crypto-signing", () => ({ signTrainingRecord: vi.fn(), getOrgActiveKey: vi.fn() }));
vi.mock("../services/gate-engine", () => ({
  evaluateAction: vi.fn(),
  authorityRank: vi.fn(),
  isValidAuthority: vi.fn(),
}));
vi.mock("../services/audit-compliance-ai", () => ({ auditComplianceAI: {} }));
vi.mock("../generate-tutorial-doc", () => ({ generateAdaptiveComplianceTutorial: vi.fn() }));
vi.mock("../generate-document-import-tutorial", () => ({ generateDocumentImportTutorial: vi.fn() }));

/* ── Test server through the REAL createApp() ────────────────────────────── */
let server: import("http").Server;
let base: string;

beforeAll(async () => {
  process.env.MULTI_TENANT = "true";
  const { createApp } = await import("../app");
  const app = await createApp();
  const { createServer } = await import("http");
  server = createServer(app);
  await new Promise<void>((r) => server.listen(0, r));
  const addr = server.address() as any;
  base = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
  await new Promise<void>((r) => server?.close(() => r()));
});

async function api(userId: string | null, method: string, path: string, body?: any) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json", ...(userId ? { "x-test-user": userId } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, body: json };
}

describe("expired-trial org upgrades itself via a signed Stripe webhook", () => {
  it("locks the expired org, unlocks after the signed webhook upgrades ITS license", async () => {
    // 1) Expired 30 days ago → past grace → locked out of the API entirely
    const locked = await api("admin1", "GET", "/api/vendors-anything");
    expect(locked.status).toBe(402);
    expect(locked.body.licenseState).toBe("locked");
    expect(locked.body.upgradeRequired).toBe(true);

    // Billing route stays reachable while locked (upgrade path)
    const licenseWhileLocked = await api("admin1", "GET", "/api/license");
    expect(licenseWhileLocked.status).toBe(200);
    expect(licenseWhileLocked.body.licenseState).toBe("locked");

    // 2) Genuinely signed subscription webhook carrying the org id
    const event = {
      id: "evt_e2e_1",
      object: "event",
      type: "customer.subscription.created",
      data: {
        object: {
          id: "sub_e2e_1",
          object: "subscription",
          customer: "cus_e2e_1",
          status: "active",
          metadata: { organizationId: h.ORG1 },
          items: { data: [{ price: { id: "price_pro" } }] },
          current_period_end: Math.floor((Date.now() + 365 * h.DAY) / 1000),
        },
      },
    };
    const payload = JSON.stringify(event);
    const signature = realStripe.webhooks.generateTestHeaderString({
      payload,
      secret: WEBHOOK_SECRET,
    });
    const res = await fetch(`${base}/api/stripe/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json", "stripe-signature": signature },
      body: payload,
    });
    expect(res.status).toBe(200);

    // 3) The ORG's own license row was upgraded
    expect(h.license.plan).toBe("professional");
    expect(h.license.status).toBe("active");
    expect(h.license.stripe_subscription_id).toBe("sub_e2e_1");
    expect(new Date(h.license.current_period_end!).getTime()).toBeGreaterThan(Date.now());

    // 4) The admin regains normal API access (license cache was invalidated)
    const unlocked = await api("admin1", "GET", "/api/vendors-anything");
    expect(unlocked.status).not.toBe(402);
  });

  it("rejects a webhook with a bad signature without touching the license", async () => {
    const before = JSON.stringify(h.license);
    const res = await fetch(`${base}/api/stripe/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json", "stripe-signature": "t=1,v1=deadbeef" },
      body: JSON.stringify({ type: "customer.subscription.created", data: { object: {} } }),
    });
    expect(res.status).toBe(400);
    expect(JSON.stringify(h.license)).toBe(before);
  });
});
