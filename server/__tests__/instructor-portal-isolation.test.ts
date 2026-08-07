/**
 * Instructor portal isolation regression tests.
 *
 * The instructor portal is key-authenticated (no account): a key maps to
 * exactly one instructor in exactly one organization. These tests keep the
 * isolation guarantees closed against future changes:
 *  - missing / invalid / revoked keys are rejected with 401
 *  - /students and /forms are scoped to the key's org (never another org's)
 *  - templates with "enabled for instructors" = No are invisible AND
 *    unsubmittable, as are other orgs' templates
 *  - Training Event submissions are attributed to the key's instructor even
 *    when the submitted form data claims a different instructor
 *  - key management (assign/revoke/list) requires an authenticated admin
 *    (401 unauthenticated, 403 non-admin) and is scoped to the active org
 *
 * Harness style matches tenant-isolation.test.ts: mocked db + real route
 * handlers over a live HTTP server, header-based auth mock (x-test-user).
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import crypto from "crypto";

/* ── Shared hoisted state ─────────────────────────────────────────────────── */

const h = vi.hoisted(() => {
  const ORG1 = "11111111-1111-4111-8111-111111111111";
  const ORG2 = "22222222-2222-4222-8222-222222222222";
  const INST1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"; // org1 instructor
  const INST2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"; // org2 instructor

  const TPL_ORG1_ENABLED = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  const TPL_ORG1_DISABLED = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
  const TPL_ORG2_ENABLED = "ffffffff-ffff-4fff-8fff-ffffffffffff";
  const TPL_ORG1_TRAINING_EVENT = "99999999-9999-4999-8999-999999999999";

  const instructors = [
    {
      id: INST1,
      organization_id: ORG1,
      first_name: "Ina",
      last_name: "Instructor",
      email: "ina@acme.com",
      certificate_type: "CFI",
      certificate_number: "C-111",
      issue_date: null,
      expiration_date: null,
      currency_date: null,
      ratings: null,
      training_authorizations: null,
      status: "active",
    },
    {
      id: INST2,
      organization_id: ORG2,
      first_name: "Otto",
      last_name: "Other",
      email: "otto@rival.com",
      certificate_type: "CFI",
      certificate_number: "C-222",
      issue_date: null,
      expiration_date: null,
      currency_date: null,
      ratings: null,
      training_authorizations: null,
      status: "active",
    },
  ];

  // key rows: hash filled in beforeAll (crypto not available at hoist time)
  const keys: any[] = [];

  const templates = [
    {
      id: TPL_ORG1_ENABLED,
      organization_id: ORG1,
      title: "Org1 Enabled Form",
      description: null,
      organization_name: "Acme Flight",
      fields: [],
      status: "active",
      instructor_enabled: true,
      generated_from_section: null,
    },
    {
      id: TPL_ORG1_DISABLED,
      organization_id: ORG1,
      title: "Org1 Disabled Form",
      description: null,
      organization_name: "Acme Flight",
      fields: [],
      status: "active",
      instructor_enabled: false,
      generated_from_section: null,
    },
    {
      id: TPL_ORG2_ENABLED,
      organization_id: ORG2,
      title: "Org2 Enabled Form",
      description: null,
      organization_name: "Rival Aviation",
      fields: [],
      status: "active",
      instructor_enabled: true,
      generated_from_section: null,
    },
    {
      id: TPL_ORG1_TRAINING_EVENT,
      organization_id: ORG1,
      title: "Training Event",
      description: null,
      organization_name: "Acme Flight",
      fields: [],
      status: "active",
      instructor_enabled: true,
      generated_from_section: "system:training-event",
    },
  ];

  // students + training events per org (for /students scoping)
  const students = [
    { id: "s1", organization_id: ORG1, first_name: "Sam", last_name: "Student", email: "sam@acme.com", status: "active", enrollment_date: null },
    { id: "s2", organization_id: ORG2, first_name: "Rita", last_name: "Rival", email: "rita@rival.com", status: "active", enrollment_date: null },
  ];
  const trainingEvents = [
    { id: "e1", organization_id: ORG1, instructor_id: INST1, student_id: "s1", event_date: "2026-01-01" },
    { id: "e2", organization_id: ORG2, instructor_id: INST2, student_id: "s2", event_date: "2026-01-02" },
  ];

  const testUsers: Record<string, any> = {
    admin1: { id: "admin1", email: "admin@acme.com", role: "admin", orgId: ORG1 },
    manager1: { id: "manager1", email: "manager@acme.com", role: "manager", orgId: ORG1 },
  };

  return {
    ORG1, ORG2, INST1, INST2,
    TPL_ORG1_ENABLED, TPL_ORG1_DISABLED, TPL_ORG2_ENABLED, TPL_ORG1_TRAINING_EVENT,
    instructors, keys, templates, students, trainingEvents, testUsers,
    insertedSubmissions: [] as any[],
    insertedTrainingEvents: [] as any[],
    keyWrites: [] as { text: string; params: any[] }[],
  };
});

/* ── SQL helpers: render text + extract params from drizzle sql`` chunks ──── */

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
    else if (c && typeof c === "object" && "value" in c) out.push(c.value);
    else out.push(c); // raw bound param (string/number/Date/null)
  }
  return out;
}

/* ── Mock db ──────────────────────────────────────────────────────────────── */

function routeQuery(text: string, params: any[]): { rows: any[] } {
  // requireInstructorKey lookup
  if (text.includes("FROM bccs_instructor_keys k")) {
    const hash = params[0];
    const key = h.keys.find((k) => k.key_hash === hash && k.is_active);
    if (!key) return { rows: [] };
    const i = h.instructors.find((x) => x.id === key.instructor_id)!;
    return {
      rows: [{
        key_id: key.id,
        instructor_id: key.instructor_id,
        organization_id: key.organization_id,
        ...i,
      }],
    };
  }
  if (text.includes("SET last_used_at")) return { rows: [] };

  // Admin: list keys for org
  if (text.includes("SELECT instructor_id, key_preview")) {
    const org = params[0];
    return { rows: h.keys.filter((k) => k.organization_id === org && k.is_active) };
  }
  // Admin: instructor lookup before assigning a key (org-scoped)
  if (text.includes("FROM bccs_instructor_records") && text.includes("first_name, last_name")) {
    const [id, org] = params;
    const i = h.instructors.find((x) => x.id === id && x.organization_id === org);
    return { rows: i ? [i] : [] };
  }
  // Admin: revoke / regenerate-revoke
  if (text.includes("UPDATE bccs_instructor_keys SET is_active = FALSE")) {
    h.keyWrites.push({ text, params });
    const [instructorId, org] = params;
    const revoked = h.keys.filter(
      (k) => k.instructor_id === instructorId && k.organization_id === org && k.is_active,
    );
    revoked.forEach((k) => (k.is_active = false));
    return { rows: revoked.map((k) => ({ id: k.id })) };
  }
  // Admin: insert new key
  if (text.includes("INSERT INTO bccs_instructor_keys")) {
    h.keyWrites.push({ text, params });
    const [instructorId, org, keyHash, keyPreview] = params;
    h.keys.push({
      id: `key-${h.keys.length + 1}`,
      instructor_id: instructorId,
      organization_id: org,
      key_hash: keyHash,
      key_preview: keyPreview,
      is_active: true,
    });
    return { rows: [] };
  }

  // Portal /students
  if (text.includes("FROM bccs_training_events e")) {
    const [orgJoin, org, instructorId] = params;
    const events = h.trainingEvents.filter(
      (e) => e.organization_id === org && e.instructor_id === instructorId,
    );
    const rows = events
      .map((e) => h.students.find((s) => s.id === e.student_id && s.organization_id === orgJoin))
      .filter(Boolean)
      .map((s: any) => ({ ...s, event_count: 1, last_event_date: "2026-01-01" }));
    return { rows };
  }

  // Portal /forms list
  if (text.includes("FROM digital_form_templates") && text.includes("instructor_enabled = TRUE") && text.startsWith("\n      SELECT id, title")) {
    const org = params[0];
    return {
      rows: h.templates.filter(
        (t) => t.organization_id === org && t.status === "active" && t.instructor_enabled,
      ),
    };
  }
  // Portal submit: template lookup
  if (text.includes("SELECT * FROM digital_form_templates")) {
    const [id, org] = params;
    const t = h.templates.find(
      (x) => x.id === id && x.organization_id === org && x.status === "active" && x.instructor_enabled,
    );
    return { rows: t ? [t] : [] };
  }

  // Inside submit transaction
  if (text.includes("INSERT INTO digital_form_submissions")) {
    const sub = { id: "sub-1", template_id: params[0], submitted_by: params[4], form_data: params[5] };
    h.insertedSubmissions.push({ params });
    return { rows: [sub] };
  }
  if (text.includes("SELECT id FROM students")) {
    const [org, name] = params;
    const match = h.students.filter(
      (s) => s.organization_id === org &&
        `${s.first_name} ${s.last_name}`.toLowerCase() === String(name).toLowerCase(),
    );
    return { rows: match.length === 1 ? [{ id: match[0].id }] : [] };
  }
  if (text.includes("SELECT id FROM bccs_instructor_records")) {
    const [org, name] = params;
    const match = h.instructors.filter(
      (i) => i.organization_id === org &&
        `${i.first_name} ${i.last_name}`.toLowerCase() === String(name).toLowerCase(),
    );
    return { rows: match.length === 1 ? [{ id: match[0].id }] : [] };
  }
  if (text.includes("INSERT INTO bccs_training_events")) {
    // param order: student_name, student_id, instructor_name, instructor_id, ...
    h.insertedTrainingEvents.push({
      student_name: params[0],
      student_id: params[1],
      instructor_name: params[2],
      instructor_id: params[3],
      organization_id: params[params.length - 1],
    });
    return { rows: [{ id: "event-1" }] };
  }
  if (text.includes("SET training_event_id")) return { rows: [] };

  return { rows: [] };
}

vi.mock("../db", () => {
  const execute = vi.fn(async (q: any) => routeQuery(sqlText(q).trim().length ? sqlText(q) : "", sqlParams(q)));
  const db: any = {
    execute: async (q: any) => routeQuery(sqlText(q), sqlParams(q)),
    transaction: async (cb: any) => cb({ execute: async (q: any) => routeQuery(sqlText(q), sqlParams(q)) }),
    select: () => {
      const obj: any = {};
      for (const m of ["from", "where", "orderBy", "limit"]) obj[m] = () => obj;
      obj.then = (res: any, rej: any) => Promise.resolve([]).then(res, rej);
      return obj;
    },
  };
  void execute;
  return { db, pool: {} };
});

vi.mock("../localAuth", () => ({
  setupAuth: async () => {},
  isAuthenticated: (req: any, res: any, next: any) => {
    const id = String(req.headers["x-test-user"] ?? "");
    const user = h.testUsers[id];
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    req.user = user;
    req.orgId = user.orgId ?? null;
    next();
  },
}));

vi.mock("../services/audit-readiness", () => ({
  queueAuditReadinessRefresh: vi.fn(),
}));
vi.mock("../services/crypto-signing", () => ({
  getOrgActiveKey: vi.fn(async () => null),
  signTrainingRecord: vi.fn(),
}));

/* ── Test server: mount ONLY the instructor-portal router ─────────────────── */

let server: import("http").Server;
let base: string;

const RAW_KEY_ORG1 = "bccs_inst_valid-org1-key";
const RAW_KEY_REVOKED = "bccs_inst_revoked-key";
const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

async function api(
  method: string,
  path: string,
  opts: { key?: string; user?: string; body?: any } = {},
): Promise<{ status: number; body: any }> {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(opts.key ? { "x-instructor-key": opts.key } : {}),
      ...(opts.user ? { "x-test-user": opts.user } : {}),
    },
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch { /* non-JSON */ }
  return { status: res.status, body: json };
}

beforeAll(async () => {
  process.env.MULTI_TENANT = "true";
  h.keys.push(
    { id: "key-1", instructor_id: h.INST1, organization_id: h.ORG1, key_hash: sha256(RAW_KEY_ORG1), key_preview: "bccs_inst_valid...", is_active: true },
    { id: "key-revoked", instructor_id: h.INST1, organization_id: h.ORG1, key_hash: sha256(RAW_KEY_REVOKED), key_preview: "bccs_inst_revok...", is_active: false },
  );
  const express = (await import("express")).default;
  const instructorPortal = (await import("../routes/instructor-portal")).default;
  const app = express();
  app.use(express.json());
  app.use("/api/instructor-portal", instructorPortal);
  server = app.listen(0);
  await new Promise<void>((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});

afterAll(async () => {
  await new Promise<void>((r) => server?.close(() => r()));
});

beforeEach(() => {
  h.insertedSubmissions.length = 0;
  h.insertedTrainingEvents.length = 0;
  h.keyWrites.length = 0;
});

/* ── Tests ────────────────────────────────────────────────────────────────── */

describe("instructor key authentication", () => {
  it("rejects requests without a key (401)", async () => {
    for (const path of ["/me", "/students", "/forms"]) {
      const r = await api("GET", `/api/instructor-portal${path}`);
      expect(r.status).toBe(401);
    }
  });

  it("rejects an invalid key (401)", async () => {
    const r = await api("GET", "/api/instructor-portal/me", { key: "bccs_inst_not-a-real-key" });
    expect(r.status).toBe(401);
  });

  it("rejects a revoked key (401)", async () => {
    const r = await api("GET", "/api/instructor-portal/students", { key: RAW_KEY_REVOKED });
    expect(r.status).toBe(401);
  });

  it("accepts a valid key and returns ONLY that instructor's identity", async () => {
    const r = await api("GET", "/api/instructor-portal/me", { key: RAW_KEY_ORG1 });
    expect(r.status).toBe(200);
    expect(r.body.instructorId).toBe(h.INST1);
    expect(r.body.email).toBe("ina@acme.com");
  });
});

describe("portal data is scoped to the key's org", () => {
  it("/students returns only the key org's students — never another org's", async () => {
    const r = await api("GET", "/api/instructor-portal/students", { key: RAW_KEY_ORG1 });
    expect(r.status).toBe(200);
    const ids = r.body.map((s: any) => s.id);
    expect(ids).toContain("s1");
    expect(ids).not.toContain("s2"); // org2's student must never appear
  });

  it("/forms returns only the key org's instructor-enabled templates", async () => {
    const r = await api("GET", "/api/instructor-portal/forms", { key: RAW_KEY_ORG1 });
    expect(r.status).toBe(200);
    const ids = r.body.map((t: any) => t.id);
    expect(ids).toContain(h.TPL_ORG1_ENABLED);
    expect(ids).not.toContain(h.TPL_ORG1_DISABLED); // instructor_enabled = false
    expect(ids).not.toContain(h.TPL_ORG2_ENABLED); // other org
  });
});

describe("form submission isolation", () => {
  it("a template with instructor access disabled is unsubmittable (404)", async () => {
    const r = await api("POST", `/api/instructor-portal/forms/${h.TPL_ORG1_DISABLED}/submit`, {
      key: RAW_KEY_ORG1,
      body: { formData: { any: "thing" } },
    });
    expect(r.status).toBe(404);
    expect(h.insertedSubmissions).toHaveLength(0);
  });

  it("another org's template is unsubmittable even if enabled there (404)", async () => {
    const r = await api("POST", `/api/instructor-portal/forms/${h.TPL_ORG2_ENABLED}/submit`, {
      key: RAW_KEY_ORG1,
      body: { formData: { any: "thing" } },
    });
    expect(r.status).toBe(404);
    expect(h.insertedSubmissions).toHaveLength(0);
  });

  it("Training Event submissions are attributed to the key's instructor even when form data claims someone else", async () => {
    const r = await api("POST", `/api/instructor-portal/forms/${h.TPL_ORG1_TRAINING_EVENT}/submit`, {
      key: RAW_KEY_ORG1,
      body: {
        formData: {
          student_name: "Sam Student",
          instructor_name: "Otto Other", // spoof attempt: org2's instructor
          event_type: "flight",
          event_date: "2026-02-01",
        },
      },
    });
    expect(r.status).toBe(201);
    expect(h.insertedTrainingEvents).toHaveLength(1);
    const ev = h.insertedTrainingEvents[0];
    // Identity comes from the key, never from the submitted form data
    expect(ev.instructor_id).toBe(h.INST1);
    expect(ev.instructor_name).toBe("Ina Instructor");
    expect(ev.organization_id).toBe(h.ORG1);
  });
});

describe("key management authorization", () => {
  it("unauthenticated requests get 401 on all key routes", async () => {
    expect((await api("GET", "/api/instructor-portal/keys")).status).toBe(401);
    expect((await api("POST", `/api/instructor-portal/keys/${h.INST1}`)).status).toBe(401);
    expect((await api("DELETE", `/api/instructor-portal/keys/${h.INST1}`)).status).toBe(401);
  });

  it("non-admin users get 403 and no key is written", async () => {
    expect((await api("GET", "/api/instructor-portal/keys", { user: "manager1" })).status).toBe(403);
    expect((await api("POST", `/api/instructor-portal/keys/${h.INST1}`, { user: "manager1" })).status).toBe(403);
    expect((await api("DELETE", `/api/instructor-portal/keys/${h.INST1}`, { user: "manager1" })).status).toBe(403);
    expect(h.keyWrites).toHaveLength(0);
  });

  it("admins cannot assign a key to another org's instructor (404, nothing written)", async () => {
    const r = await api("POST", `/api/instructor-portal/keys/${h.INST2}`, { user: "admin1" });
    expect(r.status).toBe(404);
    expect(h.keyWrites).toHaveLength(0);
  });

  it("admins can assign a key for their own org's instructor (raw key returned once)", async () => {
    const r = await api("POST", `/api/instructor-portal/keys/${h.INST1}`, { user: "admin1" });
    expect(r.status).toBe(201);
    expect(r.body.key).toMatch(/^bccs_inst_/);
    expect(r.body.instructorId).toBe(h.INST1);
    // insert was scoped to the admin's org
    const insert = h.keyWrites.find((w) => w.text.includes("INSERT INTO bccs_instructor_keys"))!;
    expect(insert.params[1]).toBe(h.ORG1);
  });
});
