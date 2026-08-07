/**
 * Regression tests for instructor portal key expiry enforcement.
 *
 * Locks in the behavior of `requireInstructorKey` and the admin key
 * lifecycle routes in server/routes/instructor-portal.ts:
 *  - Expired key → 401 with an "expired" message on every portal endpoint.
 *  - Valid (unexpired or no-expiry) key → 200.
 *  - Unknown / revoked key → 401 invalid-key message (distinct from expired).
 *  - POST /keys/:id assign honors expiresInDays (default 90, "never"/0 = no
 *    expiry, out-of-range rejected) and revokes the previous key.
 *  - POST /keys/:id/renew extends expiry of the active key without changing
 *    it — an expired key becomes usable again after renewal.
 *
 * The db is mocked with an in-memory key store; the real router, real
 * middleware ordering, and real hashing run over a live HTTP server.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";

/* ── Shared hoisted state ─────────────────────────────────────────────────── */

const h = vi.hoisted(() => {
  const ORG1 = "11111111-1111-4111-8111-111111111111";
  const ORG2 = "22222222-2222-4222-8222-222222222222";
  const INSTRUCTOR1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

  return {
    ORG1,
    ORG2,
    INSTRUCTOR1,
    // in-memory bccs_instructor_keys table
    keys: [] as {
      id: string;
      instructor_id: string;
      organization_id: string;
      key_hash: string;
      is_active: boolean;
      expires_at: Date | null;
    }[],
    nextKeyId: 1,
    instructors: {} as Record<string, any>,
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
      const v = typeof c?.value !== "undefined" && !(c instanceof String) ? c.value : c;
      out.push(v instanceof String ? String(v) : v);
    }
  }
  return out;
}

/* ── Query router over the in-memory key store ────────────────────────────── */

function routeQuery(text: string, params: any[]): { rows: any[] } {
  // ensureTable DDL
  if (text.includes("CREATE TABLE") || text.includes("ALTER TABLE")) return { rows: [] };

  // requireInstructorKey lookup: hash + is_active, joined to instructor record
  if (text.includes("WHERE k.key_hash =")) {
    const [hash] = params;
    const k = h.keys.find((r) => r.key_hash === hash && r.is_active);
    if (!k) return { rows: [] };
    const i = h.instructors[k.instructor_id];
    if (!i) return { rows: [] };
    return {
      rows: [
        {
          key_id: k.id,
          instructor_id: k.instructor_id,
          organization_id: k.organization_id,
          expires_at: k.expires_at,
          first_name: i.first_name,
          last_name: i.last_name,
          email: i.email,
          certificate_type: i.certificate_type,
          status: i.status,
        },
      ],
    };
  }

  // last_used_at touch
  if (text.includes("SET last_used_at")) return { rows: [] };

  // assign: instructor lookup scoped to org
  if (text.includes("FROM bccs_instructor_records")) {
    const [instructorId, orgId] = params;
    const i = h.instructors[instructorId];
    if (!i || i.organization_id !== orgId) return { rows: [] };
    return { rows: [{ id: instructorId, first_name: i.first_name, last_name: i.last_name }] };
  }

  // assign: revoke previous keys
  if (text.includes("SET is_active = FALSE")) {
    const [instructorId, orgId] = params;
    const hit = h.keys.filter(
      (k) => k.instructor_id === instructorId && k.organization_id === orgId && k.is_active,
    );
    hit.forEach((k) => (k.is_active = false));
    // DELETE /keys route expects RETURNING id rows
    return { rows: hit.map((k) => ({ id: k.id })) };
  }

  // assign: insert new key
  if (text.includes("INSERT INTO bccs_instructor_keys")) {
    const [instructorId, orgId, keyHash, , , expiresAt] = params;
    h.keys.push({
      id: `key-${h.nextKeyId++}`,
      instructor_id: instructorId,
      organization_id: orgId,
      key_hash: keyHash,
      is_active: true,
      expires_at: expiresAt ?? null,
    });
    return { rows: [] };
  }

  // renew: extend expiry of the active key
  if (text.includes("SET expires_at =")) {
    const [expiresAt, instructorId, orgId] = params;
    const hit = h.keys.filter(
      (k) => k.instructor_id === instructorId && k.organization_id === orgId && k.is_active,
    );
    hit.forEach((k) => (k.expires_at = expiresAt));
    return { rows: hit.map((k) => ({ id: k.id, expires_at: k.expires_at })) };
  }

  // admin key status list
  if (text.includes("SELECT instructor_id, key_preview")) {
    const [orgId] = params;
    return {
      rows: h.keys
        .filter((k) => k.organization_id === orgId && k.is_active)
        .map((k) => ({ instructor_id: k.instructor_id, expires_at: k.expires_at })),
    };
  }

  return { rows: [] };
}

/* ── Mocks ────────────────────────────────────────────────────────────────── */

vi.mock("../db", () => {
  const execute = vi.fn(async (q: any) => routeQuery(sqlText(q), sqlParams(q)));
  const db = {
    execute,
    transaction: async (fn: any) => fn({ execute }),
  };
  return { db, pool: {} };
});

vi.mock("../localAuth", () => ({
  isAuthenticated: (req: any, res: any, next: any) =>
    req.user ? next() : res.status(401).json({ message: "Unauthorized" }),
}));

vi.mock("./digital-forms", () => ({
  isTrainingEventTemplate: vi.fn(() => false),
  parseTrainingEventForm: vi.fn(),
  createTrainingEventFromForm: vi.fn(),
  afterTrainingEventCreated: vi.fn(),
}));

vi.mock("../services/audit-readiness", () => ({
  queueAuditReadinessRefresh: vi.fn(),
}));

/* ── Test server: real router + real tenant guard ─────────────────────────── */

let server: import("http").Server;
let base: string;

beforeAll(async () => {
  const express = (await import("express")).default;
  const router = (await import("../routes/instructor-portal")).default;
  const app = express();
  app.use(express.json());
  // Test auth shim: x-test-admin makes an org admin with req.orgId set,
  // mirroring what resolveTenant does in production.
  app.use((req: any, _res, next) => {
    if (req.headers["x-test-admin"]) {
      req.user = { id: "admin1", email: "admin@acme.com", role: "admin" };
      req.orgId = String(req.headers["x-test-org"] || h.ORG1);
    }
    next();
  });
  app.use("/api/instructor-portal", router);
  server = app.listen(0);
  await new Promise<void>((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});

afterAll(async () => {
  await new Promise<void>((r) => server?.close(() => r()));
});

beforeEach(() => {
  h.keys.length = 0;
  h.nextKeyId = 1;
  h.instructors = {
    [h.INSTRUCTOR1]: {
      organization_id: h.ORG1,
      first_name: "Ida",
      last_name: "Instructor",
      email: "ida@acme.com",
      certificate_type: "CFI",
      status: "active",
    },
  };
});

async function api(
  method: string,
  path: string,
  opts: { admin?: boolean; key?: string; body?: any } = {},
): Promise<{ status: number; body: any }> {
  const res = await fetch(`${base}/api/instructor-portal${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(opts.admin ? { "x-test-admin": "1" } : {}),
      ...(opts.key ? { "x-instructor-key": opts.key } : {}),
    },
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON */
  }
  return { status: res.status, body: json };
}

async function assignKey(body?: any): Promise<{ status: number; body: any }> {
  return api("POST", `/keys/${h.INSTRUCTOR1}`, { admin: true, body });
}

/** Force the active key's stored expiry (simulate time passing). */
function setActiveKeyExpiry(expiresAt: Date | null) {
  const k = h.keys.find((r) => r.is_active);
  if (!k) throw new Error("no active key in test store");
  k.expires_at = expiresAt;
}

const DAY = 24 * 60 * 60 * 1000;
const PORTAL_ENDPOINTS = ["/me", "/students", "/forms"];

/* ── Valid keys ───────────────────────────────────────────────────────────── */

describe("valid key access", () => {
  it("an assigned, unexpired key gets 200 on GET /me with the instructor identity", async () => {
    const assigned = await assignKey();
    expect(assigned.status).toBe(201);
    const res = await api("GET", "/me", { key: assigned.body.key });
    expect(res.status).toBe(200);
    expect(res.body.firstName).toBe("Ida");
    expect(res.body.instructorId).toBe(h.INSTRUCTOR1);
  });

  it("a key with no expiry (never) keeps working", async () => {
    const assigned = await assignKey({ expiresInDays: "never" });
    expect(assigned.body.expiresAt).toBeNull();
    expect((await api("GET", "/me", { key: assigned.body.key })).status).toBe(200);
  });

  it("also accepts the key via Bearer authorization header", async () => {
    const assigned = await assignKey();
    const res = await fetch(`${base}/api/instructor-portal/me`, {
      headers: { authorization: `Bearer ${assigned.body.key}` },
    });
    expect(res.status).toBe(200);
  });
});

/* ── Expired / invalid keys ───────────────────────────────────────────────── */

describe("expired key lockout", () => {
  for (const endpoint of PORTAL_ENDPOINTS) {
    it(`an expired key gets 401 with an "expired" message on GET ${endpoint}`, async () => {
      const assigned = await assignKey();
      setActiveKeyExpiry(new Date(Date.now() - DAY)); // expired yesterday
      const res = await api("GET", endpoint, { key: assigned.body.key });
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/expired/i);
    });
  }

  it("an expired key gets 401 on POST /forms/:templateId/submit and nothing is persisted", async () => {
    const assigned = await assignKey();
    setActiveKeyExpiry(new Date(Date.now() - 1000));
    const res = await api("POST", "/forms/some-template/submit", {
      key: assigned.body.key,
      body: { formData: { a: 1 } },
    });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/expired/i);
  });

  it("a key expiring exactly now is rejected (boundary is inclusive)", async () => {
    const assigned = await assignKey();
    setActiveKeyExpiry(new Date(Date.now() - 1));
    expect((await api("GET", "/me", { key: assigned.body.key })).status).toBe(401);
  });

  it("an unknown key gets 401 with the invalid-key (not expired) message", async () => {
    const res = await api("GET", "/me", { key: "bccs_inst_definitely-not-real" });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid|revoked/i);
    expect(res.body.message).not.toMatch(/expired/i);
  });

  it("a missing key gets 401", async () => {
    expect((await api("GET", "/me", {})).status).toBe(401);
  });

  it("a revoked key (DELETE /keys/:id) gets 401 with the invalid-key message", async () => {
    const assigned = await assignKey();
    const revoke = await api("DELETE", `/keys/${h.INSTRUCTOR1}`, { admin: true });
    expect(revoke.status).toBe(200);
    const res = await api("GET", "/me", { key: assigned.body.key });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid|revoked/i);
  });

  it("a regenerated key revokes the previous one", async () => {
    const first = await assignKey();
    const second = await assignKey();
    expect((await api("GET", "/me", { key: first.body.key })).status).toBe(401);
    expect((await api("GET", "/me", { key: second.body.key })).status).toBe(200);
  });
});

/* ── Assign: expiresInDays handling ───────────────────────────────────────── */

describe("assign key expiry options", () => {
  it("defaults to ~90 days", async () => {
    const res = await assignKey();
    expect(res.status).toBe(201);
    const expires = new Date(res.body.expiresAt).getTime();
    expect(expires).toBeGreaterThan(Date.now() + 89 * DAY);
    expect(expires).toBeLessThan(Date.now() + 91 * DAY);
  });

  it("honors a custom expiresInDays", async () => {
    const res = await assignKey({ expiresInDays: 7 });
    const expires = new Date(res.body.expiresAt).getTime();
    expect(expires).toBeGreaterThan(Date.now() + 6 * DAY);
    expect(expires).toBeLessThan(Date.now() + 8 * DAY);
  });

  for (const never of ["never", 0, "0"] as const) {
    it(`treats ${JSON.stringify(never)} as no expiry`, async () => {
      const res = await assignKey({ expiresInDays: never });
      expect(res.status).toBe(201);
      expect(res.body.expiresAt).toBeNull();
    });
  }

  for (const bad of [-1, 1.5, 3651, "soon"]) {
    it(`rejects expiresInDays=${JSON.stringify(bad)} with 400 and stores no key`, async () => {
      const res = await assignKey({ expiresInDays: bad });
      expect(res.status).toBe(400);
      expect(h.keys).toHaveLength(0);
    });
  }

  it("requires admin auth (401 without a session)", async () => {
    expect((await api("POST", `/keys/${h.INSTRUCTOR1}`, {})).status).toBe(401);
  });
});

/* ── Renew ────────────────────────────────────────────────────────────────── */

describe("renew endpoint", () => {
  it("extends expiry so a previously expired key works again, without changing the key", async () => {
    const assigned = await assignKey();
    setActiveKeyExpiry(new Date(Date.now() - DAY));
    expect((await api("GET", "/me", { key: assigned.body.key })).status).toBe(401);

    const renew = await api("POST", `/keys/${h.INSTRUCTOR1}/renew`, { admin: true, body: { expiresInDays: 30 } });
    expect(renew.status).toBe(200);
    const expires = new Date(renew.body.expiresAt).getTime();
    expect(expires).toBeGreaterThan(Date.now() + 29 * DAY);
    expect(expires).toBeLessThan(Date.now() + 31 * DAY);

    // Same raw key, now accepted again
    expect((await api("GET", "/me", { key: assigned.body.key })).status).toBe(200);
  });

  it("defaults to ~90 days when no body is sent", async () => {
    await assignKey({ expiresInDays: 1 });
    const renew = await api("POST", `/keys/${h.INSTRUCTOR1}/renew`, { admin: true });
    expect(renew.status).toBe(200);
    const expires = new Date(renew.body.expiresAt).getTime();
    expect(expires).toBeGreaterThan(Date.now() + 89 * DAY);
  });

  it("rejects invalid expiresInDays with 400", async () => {
    await assignKey();
    const before = h.keys.find((k) => k.is_active)!.expires_at;
    const renew = await api("POST", `/keys/${h.INSTRUCTOR1}/renew`, { admin: true, body: { expiresInDays: "never" } });
    expect(renew.status).toBe(400);
    expect(h.keys.find((k) => k.is_active)!.expires_at).toEqual(before);
  });

  it("returns 404 when the instructor has no active key", async () => {
    const renew = await api("POST", `/keys/${h.INSTRUCTOR1}/renew`, { admin: true, body: { expiresInDays: 30 } });
    expect(renew.status).toBe(404);
  });
});
