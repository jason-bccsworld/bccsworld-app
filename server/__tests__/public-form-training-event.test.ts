/**
 * Public form / Training Event policy regression tests.
 *
 * DECISION (see server/routes/digital-forms.ts): anonymous public form links
 * must NOT create official training records. Training Event submissions ingest
 * into bccs_training_events, get auto-signed, and are counted by audit agents,
 * so they may only arrive through authenticated paths where identity is
 * enforced (the instructor portal forces the instructor identity from the key).
 *
 * These tests keep that decision closed against future changes:
 *  - GET  /public/:token for the system Training Event template → 404 (dead link)
 *  - POST /public/:token/submit for it → 403, and NOTHING is persisted
 *    (no submission row, no bccs_training_events row, no auto-sign)
 *  - ordinary public templates still work (201, submission recorded,
 *    no training event created)
 *
 * Harness style matches instructor-portal-isolation.test.ts: mocked db +
 * real route handlers over a live HTTP server.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";

/* ── Shared hoisted state ─────────────────────────────────────────────────── */

const h = vi.hoisted(() => {
  const ORG1 = "11111111-1111-4111-8111-111111111111";
  const TOKEN_TRAINING_EVENT = "tok-training-event";
  const TOKEN_NORMAL = "tok-normal-form";

  const templates = [
    {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      title: "Training Event",
      description: null,
      organizationName: "Acme Flight",
      organizationId: ORG1,
      faaSourceId: null,
      faaDocumentTitle: null,
      faaDocumentType: null,
      fields: [],
      status: "active",
      publicToken: TOKEN_TRAINING_EVENT,
      isPublic: true,
      generatedFromSection: "system:training-event",
    },
    {
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      title: "Safety Survey",
      description: null,
      organizationName: "Acme Flight",
      organizationId: ORG1,
      faaSourceId: null,
      faaDocumentTitle: null,
      faaDocumentType: null,
      fields: [],
      status: "active",
      publicToken: TOKEN_NORMAL,
      isPublic: true,
      generatedFromSection: null,
    },
  ];

  return {
    ORG1,
    TOKEN_TRAINING_EVENT,
    TOKEN_NORMAL,
    templates,
    insertedSubmissions: [] as any[],
    insertedTrainingEvents: [] as any[],
  };
});

/* ── SQL helpers (same pattern as instructor-portal-isolation.test.ts) ────── */

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
    if (Array.isArray(c?.value)) continue;
    if (Array.isArray(c?.queryChunks)) out.push(...sqlParams(c));
    else if (c && typeof c === "object" && "value" in c) out.push(c.value);
    else out.push(c);
  }
  return out;
}

/* ── Mock db ──────────────────────────────────────────────────────────────── */

function routeQuery(text: string, _params: any[]): { rows: any[] } {
  if (text.includes("INSERT INTO bccs_training_events")) {
    h.insertedTrainingEvents.push({ text });
    return { rows: [{ id: "event-1" }] };
  }
  // ensureTables DDL / back-fill / everything else: no-op
  return { rows: [] };
}

vi.mock("../db", () => {
  // Drizzle select().from().where() — resolve by extracting the token param
  // from the eq() condition and matching against the mock templates.
  const makeSelect = () => {
    let cond: any = null;
    const obj: any = {
      from: () => obj,
      where: (c: any) => {
        cond = c;
        return obj;
      },
      orderBy: () => obj,
      limit: () => obj,
      then: (res: any, rej: any) => {
        const params = cond ? sqlParams(cond) : [];
        const rows = h.templates.filter((t) => params.includes(t.publicToken) || params.includes(t.id));
        return Promise.resolve(rows).then(res, rej);
      },
    };
    return obj;
  };

  const makeTx = () => ({
    execute: async (q: any) => routeQuery(sqlText(q), sqlParams(q)),
    insert: () => ({
      values: (v: any) => ({
        returning: async () => {
          const row = { id: `sub-${h.insertedSubmissions.length + 1}`, ...v };
          h.insertedSubmissions.push(row);
          return [row];
        },
      }),
    }),
  });

  const db: any = {
    execute: async (q: any) => routeQuery(sqlText(q), sqlParams(q)),
    transaction: async (cb: any) => cb(makeTx()),
    select: () => makeSelect(),
  };
  return { db, pool: {} };
});

vi.mock("../localAuth", () => ({
  setupAuth: async () => {},
  isAuthenticated: (_req: any, res: any) => res.status(401).json({ message: "Unauthorized" }),
}));

vi.mock("../services/audit-readiness", () => ({
  queueAuditReadinessRefresh: vi.fn(),
}));

const signing = vi.hoisted(() => ({
  getOrgActiveKey: vi.fn(async () => ({ id: "org-key" })),
  signTrainingRecord: vi.fn(),
}));
vi.mock("../services/crypto-signing", () => signing);

/* ── Test server: mount ONLY the digital-forms router ─────────────────────── */

let server: import("http").Server;
let base: string;

async function api(
  method: string,
  path: string,
  body?: any,
): Promise<{ status: number; body: any }> {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json" },
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
  const express = (await import("express")).default;
  const digitalForms = (await import("../routes/digital-forms")).default;
  const app = express();
  app.use(express.json());
  app.use("/api/digital-forms", digitalForms);
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
  signing.signTrainingRecord.mockClear();
});

/* ── Tests ────────────────────────────────────────────────────────────────── */

const VALID_TRAINING_FORM = {
  formData: {
    student_name: "Sam Student",
    instructor_name: "Ina Instructor",
    event_type: "flight",
    event_date: "2026-02-01",
  },
  submitterEmail: "anyone@example.com",
};

describe("public links cannot create official training records", () => {
  it("GET the Training Event template via public token → 404 (dead link)", async () => {
    const r = await api("GET", `/api/digital-forms/public/${h.TOKEN_TRAINING_EVENT}`);
    expect(r.status).toBe(404);
  });

  it("POST a Training Event submission via public token → 403, nothing persisted", async () => {
    const r = await api(
      "POST",
      `/api/digital-forms/public/${h.TOKEN_TRAINING_EVENT}/submit`,
      VALID_TRAINING_FORM,
    );
    expect(r.status).toBe(403);
    expect(r.body.message).toMatch(/instructor portal/i);
    expect(h.insertedSubmissions).toHaveLength(0);
    expect(h.insertedTrainingEvents).toHaveLength(0);
    expect(signing.signTrainingRecord).not.toHaveBeenCalled();
  });

  it("even a fully valid Training Event payload never reaches the record path", async () => {
    // Sanity: same payload shape the instructor portal accepts — the public
    // route must reject it before any validation/persistence happens.
    const r = await api(
      "POST",
      `/api/digital-forms/public/${h.TOKEN_TRAINING_EVENT}/submit`,
      { ...VALID_TRAINING_FORM, submitterName: "Spoofy McSpoofface" },
    );
    expect(r.status).toBe(403);
    expect(h.insertedTrainingEvents).toHaveLength(0);
  });
});

describe("ordinary public forms still work", () => {
  it("GET a normal public template → 200 with safe fields", async () => {
    const r = await api("GET", `/api/digital-forms/public/${h.TOKEN_NORMAL}`);
    expect(r.status).toBe(200);
    expect(r.body.title).toBe("Safety Survey");
  });

  it("POST a normal public submission → 201, recorded, NO training event created", async () => {
    const r = await api("POST", `/api/digital-forms/public/${h.TOKEN_NORMAL}/submit`, {
      formData: { feedback: "great" },
      submitterEmail: "someone@example.com",
    });
    expect(r.status).toBe(201);
    expect(h.insertedSubmissions).toHaveLength(1);
    expect(h.insertedTrainingEvents).toHaveLength(0);
    expect(signing.signTrainingRecord).not.toHaveBeenCalled();
  });

  it("unknown token → 404", async () => {
    const r = await api("GET", "/api/digital-forms/public/no-such-token");
    expect(r.status).toBe(404);
  });
});
