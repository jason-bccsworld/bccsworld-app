/**
 * Authorization tests for the Part 142 Checklist Report routes.
 *
 * Mutating endpoints (item update, import, reset, manual upload, AI review)
 * must require an org admin (or platform staff); regular org members get 403.
 * Reads (checklist, manual status) stay member-accessible.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import express from "express";

const h = vi.hoisted(() => ({
  ORG1: "11111111-1111-4111-8111-111111111111",
  users: {
    admin1: { id: "admin1", email: "admin@acme.com", role: "admin" },
    member1: { id: "member1", email: "member@acme.com", role: "manager" },
    staff1: { id: "staff1", email: "root@bccsworld.com", role: "user" },
  } as Record<string, any>,
  executed: [] as string[],
}));

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

vi.mock("../db", () => {
  const exec = async (q: any) => {
    const text = sqlText(q);
    h.executed.push(text);
    if (text.includes("FROM bccs_ops_manuals")) {
      return { rows: [{ id: "manual-1", extracted_text: "Some manual text.\n\nMore text.", filename: "m.txt", text_chars: 30, uploaded_at: new Date().toISOString() }] };
    }
    if (text.includes("FROM bccs_checklist_report_items")) {
      return { rows: [{ id: "item-1", area_id: "area1", area_name: "A", area_description: "", item_number: "1-01", description: "d", reference: "", status: "pending", comments: "", findings: "", item_order: 1 }] };
    }
    if (text.includes("UPDATE bccs_checklist_report_items")) {
      return { rows: [{ id: "item-1" }] };
    }
    return { rows: [] };
  };
  const db: any = {
    execute: vi.fn(exec),
    transaction: vi.fn(async (fn: any) => fn({ execute: exec })),
  };
  return { db, pool: {} };
});

vi.mock("../localAuth", () => ({
  isAuthenticated: (req: any, res: any, next: any) =>
    req.user ? next() : res.status(401).json({ message: "Unauthorized" }),
}));

vi.mock("../middleware/tenant", () => ({
  requireOrg: (req: any) => h.ORG1,
  isPlatformStaff: (email?: string) => !!email && email.toLowerCase().endsWith("@bccsworld.com"),
}));

vi.mock("openai", () => ({
  default: class {
    chat = { completions: { create: vi.fn(async () => { throw Object.assign(new Error("quota"), { status: 429 }); }) } };
  },
}));

let server: import("http").Server;
let base: string;

beforeAll(async () => {
  const { default: router } = await import("../routes/checklist-report");
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    const user = h.users[String(req.headers["x-test-user"] ?? "")];
    if (user) req.user = user;
    next();
  });
  app.use("/api/checklist-report", router);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address() as any;
  base = `http://127.0.0.1:${addr.port}`;
});

afterAll(() => server?.close());

async function api(userId: string | null, method: string, path: string, body?: any) {
  const res = await fetch(`${base}/api/checklist-report${path}`, {
    method,
    headers: { "content-type": "application/json", ...(userId ? { "x-test-user": userId } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* ignore */ }
  return { status: res.status, body: json };
}

describe("checklist-report authorization", () => {
  it("rejects unauthenticated requests", async () => {
    expect((await api(null, "GET", "/checklist")).status).toBe(401);
    expect((await api(null, "POST", "/import", { text: "x" })).status).toBe(401);
  });

  it("lets regular org members read the checklist and manual status", async () => {
    expect((await api("member1", "GET", "/checklist")).status).toBe(200);
    expect((await api("member1", "GET", "/manual")).status).toBe(200);
  });

  it("blocks non-admin members from every mutating endpoint", async () => {
    for (const [method, path, body] of [
      ["PUT", "/items/item-1", { status: "compliant" }],
      ["POST", "/import", { text: "1 | x" }],
      ["POST", "/reset", undefined],
      ["POST", "/review/area1", undefined],
      ["POST", "/manual", undefined],
    ] as const) {
      const r = await api("member1", method, path, body);
      expect(r.status, `${method} ${path}`).toBe(403);
      expect(r.body?.message).toMatch(/admin/i);
    }
  });

  it("allows org admins through the guard on mutating endpoints", async () => {
    expect((await api("admin1", "PUT", "/items/item-1", { status: "compliant" })).status).toBe(200);
    expect((await api("admin1", "POST", "/import", { text: "1-01 | item | ref | Area" })).status).toBe(200);
    expect((await api("admin1", "POST", "/reset")).status).toBe(200);
    // Review passes the guard and fails loudly on the (mocked) exhausted AI quota
    const review = await api("admin1", "POST", "/review/area1");
    expect(review.status).toBe(502);
    expect(review.body?.message).toMatch(/credits|rate-limited/i);
  });

  it("allows platform staff through the guard regardless of role", async () => {
    expect((await api("staff1", "POST", "/reset")).status).toBe(200);
  });
});
