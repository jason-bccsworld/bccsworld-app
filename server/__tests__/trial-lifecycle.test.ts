/**
 * Trial expiry lifecycle regression tests.
 *
 * Covers:
 *  - getTrialLifecycle boundary dates (7-day warning window, expiry, grace end)
 *  - enforceTrialLifecycle middleware: grace = read-only, locked = allowlist
 *    only, paid plans / platform license / staff never gated
 *  - trial-expiry sweep: 7-day & 1-day warning kinds, expired status flip,
 *    dedupe row written only after a successful send (skips stay retryable)
 *  - Stripe webhook: subscription events upgrade the correlated ORG's license
 *    (via metadata or customer lookup), clearing the expired-trial lock;
 *    without correlation only the platform-wide (NULL org) row is touched
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTrialLifecycle, TRIAL_GRACE_PERIOD_DAYS } from "../../shared/license";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-08-07T12:00:00Z");

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

/* ── Shared mock DB ──────────────────────────────────────────────────────── */
const h = vi.hoisted(() => ({
  executed: [] as { text: string; params: any[] }[],
  handler: null as null | ((text: string, params: any[]) => { rows: any[] } | undefined),
}));

vi.mock("../db", () => ({
  db: {
    execute: vi.fn(async (q: any) => {
      const text = sqlText(q);
      const params = sqlParams(q);
      h.executed.push({ text, params });
      return h.handler?.(text, params) ?? { rows: [] };
    }),
  },
}));

vi.mock("../services/email-alerts", () => ({
  sendEmailToOrgAdmins: vi.fn(async () => null),
  emailAlertsConfigured: vi.fn(() => true),
}));

vi.mock("../stripeClient", () => ({
  getUncachableStripeClient: vi.fn(async () => ({
    prices: {
      retrieve: vi.fn(async () => ({ metadata: { planKey: "professional" }, product: {} })),
    },
  })),
  getStripeSync: vi.fn(async () => null),
  getStripeWebhookSecret: vi.fn(() => null),
}));

beforeEach(() => {
  h.executed.length = 0;
  h.handler = null;
  vi.clearAllMocks();
});

/* ── getTrialLifecycle boundaries ────────────────────────────────────────── */
describe("getTrialLifecycle", () => {
  const end = (days: number) => new Date(NOW.getTime() + days * DAY);

  it("is active with more than 7 days remaining", () => {
    const lc = getTrialLifecycle("trial", end(8), NOW);
    expect(lc.state).toBe("active");
    expect(lc.daysRemaining).toBe(8);
  });

  it("enters expiring_soon at exactly 7 days", () => {
    expect(getTrialLifecycle("trial", end(7), NOW).state).toBe("expiring_soon");
    expect(getTrialLifecycle("trial", end(1), NOW).state).toBe("expiring_soon");
  });

  it("enters grace immediately after expiry, locked after the grace window", () => {
    const grace = getTrialLifecycle("trial", end(-1), NOW);
    expect(grace.state).toBe("grace");
    expect(grace.isExpired).toBe(true);
    expect(grace.graceEndsAt).toBe(new Date(end(-1).getTime() + TRIAL_GRACE_PERIOD_DAYS * DAY).toISOString());

    expect(getTrialLifecycle("trial", end(-(TRIAL_GRACE_PERIOD_DAYS - 1)), NOW).state).toBe("grace");
    expect(getTrialLifecycle("trial", end(-(TRIAL_GRACE_PERIOD_DAYS + 1)), NOW).state).toBe("locked");
  });

  it("never gates paid plans or open-ended licenses", () => {
    expect(getTrialLifecycle("professional", end(-30), NOW).state).toBe("active");
    expect(getTrialLifecycle("trial", null, NOW).state).toBe("active");
  });
});

/* ── enforceTrialLifecycle middleware ────────────────────────────────────── */
describe("enforceTrialLifecycle", () => {
  const ORG = "11111111-1111-4111-8111-111111111111";

  function run(licenseOverrides: any, reqOverrides: any = {}) {
    return import("../middleware/license").then(async ({ enforceTrialLifecycle }) => {
      const req: any = {
        method: "GET",
        path: "/api/vendors",
        user: { email: "admin@acme.com" },
        license: {
          id: "lic1",
          organization_id: ORG,
          plan: "trial",
          status: "trial",
          current_period_end: new Date(Date.now() - 2 * DAY).toISOString(), // grace
          ...licenseOverrides,
        },
        ...reqOverrides,
      };
      let status: number | null = null;
      let body: any = null;
      const res: any = {
        status(s: number) { status = s; return this; },
        json(b: any) { body = b; return this; },
      };
      const next = vi.fn();
      await enforceTrialLifecycle(req, res, next);
      return { status, body, nextCalled: next.mock.calls.length > 0 };
    });
  }

  it("grace period: reads pass, writes get 402 with upgrade prompt", async () => {
    expect((await run({})).nextCalled).toBe(true);
    const write = await run({}, { method: "POST" });
    expect(write.status).toBe(402);
    expect(write.body.upgradeRequired).toBe(true);
    expect(write.body.licenseState).toBe("grace");
  });

  it("locked: even reads get 402, but allowlisted billing/auth paths pass", async () => {
    const lockedEnd = new Date(Date.now() - (TRIAL_GRACE_PERIOD_DAYS + 2) * DAY).toISOString();
    const read = await run({ current_period_end: lockedEnd });
    expect(read.status).toBe(402);
    expect(read.body.licenseState).toBe("locked");

    for (const path of ["/api/license", "/api/stripe/checkout", "/api/logout", "/api/auth/user"]) {
      const r = await run({ current_period_end: lockedEnd }, { method: "POST", path });
      expect(r.nextCalled, path).toBe(true);
    }
  });

  it("never gates paid plans, platform-wide licenses, active trials, or staff", async () => {
    expect((await run({ plan: "enterprise" }, { method: "POST" })).nextCalled).toBe(true);
    expect((await run({ organization_id: null }, { method: "POST" })).nextCalled).toBe(true);
    expect((await run({ current_period_end: new Date(Date.now() + 20 * DAY).toISOString() }, { method: "POST" })).nextCalled).toBe(true);
    expect((await run({}, { method: "POST", user: { email: "root@bccsworld.com" } })).nextCalled).toBe(true);
  });
});

/* ── Trial expiry sweep ──────────────────────────────────────────────────── */
describe("runTrialExpirySweep", () => {
  const ORG = "22222222-2222-4222-8222-222222222222";

  function licenseRow(daysFromNow: number, status = "trial") {
    return {
      id: "lic-sweep",
      organization_id: ORG,
      status,
      current_period_end: new Date(Date.now() + daysFromNow * DAY).toISOString(),
      organization_name: "Acme Flight",
    };
  }

  function setupHandler(row: any, alreadySentKinds: string[] = []) {
    h.handler = (text, params) => {
      if (text.includes("FROM bccs_licenses l")) return { rows: [row] };
      if (text.includes("SELECT 1 FROM bccs_license_notifications")) {
        return { rows: alreadySentKinds.includes(String(params[1])) ? [{ "?column?": 1 }] : [] };
      }
      return { rows: [] };
    };
  }

  it("sends the 7-day and 1-day warnings with distinct dedupe kinds", async () => {
    const { runTrialExpirySweep } = await import("../services/trial-expiry-monitor");
    const { sendEmailToOrgAdmins } = await import("../services/email-alerts");

    setupHandler(licenseRow(5));
    await runTrialExpirySweep();
    expect(h.executed.some((q) => q.text.includes("INSERT INTO bccs_license_notifications") && q.params.includes("trial_warning_7d"))).toBe(true);

    h.executed.length = 0;
    setupHandler(licenseRow(0.5));
    await runTrialExpirySweep();
    expect(h.executed.some((q) => q.text.includes("INSERT INTO bccs_license_notifications") && q.params.includes("trial_warning_1d"))).toBe(true);
    expect(vi.mocked(sendEmailToOrgAdmins)).toHaveBeenCalledTimes(2);
  });

  it("flips expired trials to status='expired' and notifies once", async () => {
    const { runTrialExpirySweep } = await import("../services/trial-expiry-monitor");
    setupHandler(licenseRow(-2));
    await runTrialExpirySweep();
    expect(h.executed.some((q) => q.text.includes("SET status = 'expired'"))).toBe(true);
    expect(h.executed.some((q) => q.text.includes("INSERT INTO bccs_license_notifications") && q.params.includes("trial_expired"))).toBe(true);

    // Second sweep: already expired + already sent → no new update, no re-send
    h.executed.length = 0;
    setupHandler(licenseRow(-2, "expired"), ["trial_expired"]);
    await runTrialExpirySweep();
    expect(h.executed.some((q) => q.text.includes("SET status = 'expired'"))).toBe(false);
    expect(h.executed.some((q) => q.text.includes("INSERT INTO bccs_license_notifications"))).toBe(false);
  });

  it("does NOT record the dedupe row when the email is skipped (stays retryable)", async () => {
    const { runTrialExpirySweep } = await import("../services/trial-expiry-monitor");
    const { sendEmailToOrgAdmins } = await import("../services/email-alerts");
    vi.mocked(sendEmailToOrgAdmins).mockResolvedValueOnce("Email skipped: SMTP is not configured");

    setupHandler(licenseRow(5));
    await runTrialExpirySweep();
    expect(h.executed.some((q) => q.text.includes("INSERT INTO bccs_license_notifications"))).toBe(false);
  });
});

/* ── Stripe webhook → org license upgrade ────────────────────────────────── */
describe("webhook subscription events", () => {
  const ORG = "33333333-3333-4333-8333-333333333333";

  function subscriptionEvent(metadata: Record<string, string>) {
    return {
      type: "customer.subscription.created",
      data: {
        object: {
          id: "sub_123",
          customer: "cus_123",
          status: "active",
          metadata,
          items: { data: [{ price: { id: "price_pro" } }] },
          current_period_end: Math.floor((Date.now() + 365 * DAY) / 1000),
        },
      },
    };
  }

  it("upgrades the org-assigned license when organizationId metadata is present, lifting the trial lock", async () => {
    const { WebhookHandlers } = await import("../webhookHandlers");
    const orgLicense: any = {
      id: "lic-org",
      plan: "trial",
      status: "expired",
      current_period_end: new Date(Date.now() - 10 * DAY).toISOString(),
    };
    h.handler = (text, params) => {
      if (text.includes("WHERE organization_id = ") && text.includes("::uuid")) {
        expect(params[0]).toBe(ORG);
        return { rows: [{ id: orgLicense.id }] };
      }
      if (text.includes("UPDATE bccs_licenses SET")) {
        // plan, status, customer, sub, price, periodEnd, id
        orgLicense.plan = params[0] ?? orgLicense.plan;
        orgLicense.status = params[1];
        orgLicense.current_period_end = params[5];
        expect(params[6]).toBe(orgLicense.id);
        return { rows: [] };
      }
      return { rows: [] };
    };

    // No webhook secret + no sync → processWebhook returns early, so call the
    // event path via the exported test seam: simulate the post-verification
    // handler by invoking processWebhook with sync present.
    const { getStripeSync } = await import("../stripeClient");
    vi.mocked(getStripeSync).mockResolvedValueOnce({ processWebhook: vi.fn(async () => {}) } as any);

    const payload = Buffer.from(JSON.stringify(subscriptionEvent({ organizationId: ORG })));
    await WebhookHandlers.processWebhook(payload, "sig");

    expect(orgLicense.plan).toBe("professional");
    expect(orgLicense.status).toBe("active");
    // The upgraded license no longer trips the trial lifecycle
    expect(getTrialLifecycle(orgLicense.plan, orgLicense.current_period_end).state).toBe("active");
  });

  it("falls back to the platform-wide (NULL org) row when no org can be correlated", async () => {
    const { WebhookHandlers } = await import("../webhookHandlers");
    const { getStripeSync } = await import("../stripeClient");
    vi.mocked(getStripeSync).mockResolvedValueOnce({ processWebhook: vi.fn(async () => {}) } as any);

    h.handler = (text) => {
      if (text.includes("FROM users") && text.includes("stripe_customer_id")) return { rows: [] };
      if (text.includes("organization_id IS NULL")) return { rows: [{ id: "lic-platform" }] };
      return { rows: [] };
    };

    const payload = Buffer.from(JSON.stringify(subscriptionEvent({})));
    await WebhookHandlers.processWebhook(payload, "sig");

    const update = h.executed.find((q) => q.text.includes("UPDATE bccs_licenses SET"));
    expect(update).toBeTruthy();
    expect(update!.params[update!.params.length - 1]).toBe("lic-platform");
    // Ensured it selected the platform row, not an arbitrary latest license
    expect(h.executed.some((q) => q.text.includes("organization_id IS NULL"))).toBe(true);
  });
});
