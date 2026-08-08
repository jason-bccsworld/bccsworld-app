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
  manualRows: [
    { id: "manual-1", extracted_text: "Some manual text.\n\nMore text.", filename: "m.txt", text_chars: 30, uploaded_at: new Date().toISOString() },
  ] as any[],
  aiPrompts: [] as string[],
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
    if (text.includes("FROM bccs_ops_manuals") && !text.includes("DELETE")) {
      return { rows: h.manualRows };
    }
    if (text.includes("FROM bccs_checklist_report_items")) {
      return { rows: [{ id: "item-1", area_id: "area1", area_name: "A", area_description: "", item_number: "1-01", description: "d", reference: "", status: "pending", comments: "", findings: "", item_order: 1 }] };
    }
    if (text.includes("UPDATE bccs_checklist_report_items")) {
      return { rows: [{ id: "item-1" }] };
    }
    if (text.includes("COUNT(*)::int AS count")) {
      return { rows: [{ count: 0 }] };
    }
    if (text.includes("DELETE FROM bccs_checklist_evidence") && text.includes("RETURNING")) {
      return { rows: [{ id: "ev-1" }] };
    }
    if (text.includes("DELETE FROM bccs_ops_manuals") && text.includes("RETURNING")) {
      return { rows: [{ id: "manual-1" }] };
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
    chat = {
      completions: {
        create: vi.fn(async (args: any) => {
          for (const m of args?.messages || []) h.aiPrompts.push(String(m.content || ""));
          throw Object.assign(new Error("quota"), { status: 429 });
        }),
      },
    };
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
      ["DELETE", "/manual/manual-1", undefined],
      ["POST", "/items/item-1/evidence", undefined],
      ["POST", "/import-file", undefined],
      ["DELETE", "/evidence/ev-1", undefined],
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

  it("requires auth for the Excel export and returns a workbook for members", async () => {
    expect((await api(null, "GET", "/export.xlsx")).status).toBe(401);
    const res = await fetch(`${base}/api/checklist-report/export.xlsx`, { headers: { "x-test-user": "member1" } });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("spreadsheetml");
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.subarray(0, 2).toString()).toBe("PK"); // valid zip/xlsx magic
  });

  it("import-file previews without writing, and only replaces on confirm", async () => {
    const csv = "Number,Description,Reference,Area\n1-01,Check instructors,142.13,Management\n1-02,Check facility,142.15,Facilities\n";
    const upload = async (confirm: boolean) => {
      const fd = new FormData();
      fd.append("file", new Blob([csv], { type: "text/csv" }), "checklist.csv");
      if (confirm) fd.append("confirm", "true");
      const res = await fetch(`${base}/api/checklist-report/import-file`, {
        method: "POST",
        headers: { "x-test-user": "admin1" },
        body: fd,
      });
      return { status: res.status, body: await res.json() };
    };

    // Preview phase: summary returned, no deletes/inserts executed
    h.executed.length = 0;
    const preview = await upload(false);
    expect(preview.status).toBe(200);
    expect(preview.body.preview).toBe(true);
    expect(preview.body.itemCount).toBe(2);
    expect(preview.body.areas).toEqual([
      { name: "Management", itemCount: 1 },
      { name: "Facilities", itemCount: 1 },
    ]);
    expect(preview.body.skippedSheets).toEqual([]);
    const writes = h.executed.filter((t) => /DELETE FROM|INSERT INTO/i.test(t));
    expect(writes).toEqual([]);

    // Confirm phase: destructive replace executes
    h.executed.length = 0;
    const confirmed = await upload(true);
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.success).toBe(true);
    expect(confirmed.body.imported).toBe(2);
    expect(h.executed.some((t) => t.includes("DELETE FROM bccs_checklist_report_items"))).toBe(true);
    expect(h.executed.some((t) => t.includes("INSERT INTO bccs_checklist_report_items"))).toBe(true);
  });

  it("imports multiple spreadsheet files in one request, merged in file order", async () => {
    const csvA = "Number,Description,Reference,Area\n1-01,Check instructors,142.13,Management\n";
    const csvB = "Number,Description,Reference,Area\n2-01,Check facility,142.15,Facilities\n";
    const fd = new FormData();
    fd.append("files", new Blob([csvA], { type: "text/csv" }), "a.csv");
    fd.append("files", new Blob([csvB], { type: "text/csv" }), "b.csv");
    h.executed.length = 0;
    const res = await fetch(`${base}/api/checklist-report/import-file`, {
      method: "POST",
      headers: { "x-test-user": "admin1" },
      body: fd,
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.preview).toBe(true);
    expect(body.itemCount).toBe(2);
    expect(body.areas).toEqual([
      { name: "Management", itemCount: 1 },
      { name: "Facilities", itemCount: 1 },
    ]);
    expect(body.files).toEqual([
      { name: "a.csv", itemCount: 1 },
      { name: "b.csv", itemCount: 1 },
    ]);
    expect(h.executed.filter((t) => /DELETE FROM|INSERT INTO/i.test(t))).toEqual([]);
  });

  it("names the failing file when one of several import files is bad", async () => {
    const good = "Number,Description,Reference,Area\n1-01,Check instructors,142.13,Management\n";
    const fd = new FormData();
    fd.append("files", new Blob([good], { type: "text/csv" }), "good.csv");
    fd.append("files", new Blob(["junk"], { type: "text/csv" }), "bad.csv");
    const res = await fetch(`${base}/api/checklist-report/import-file`, {
      method: "POST",
      headers: { "x-test-user": "admin1" },
      body: fd,
    });
    const body = await res.json();
    expect(res.status).toBe(422);
    expect(body.message).toContain("bad.csv");
  });

  it("rejects duplicate item numbers within an area across combined files", async () => {
    const csv = "Number,Description,Reference,Area\n1-01,Check instructors,142.13,Management\n";
    const fd = new FormData();
    fd.append("files", new Blob([csv], { type: "text/csv" }), "a.csv");
    fd.append("files", new Blob([csv], { type: "text/csv" }), "b.csv");
    const res = await fetch(`${base}/api/checklist-report/import-file`, {
      method: "POST",
      headers: { "x-test-user": "admin1" },
      body: fd,
    });
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.message).toMatch(/duplicate item number/i);
  });

  it("AI review draws its manual content from every uploaded document", async () => {
    const prev = h.manualRows;
    h.manualRows = [
      { id: "manual-2", extracted_text: "Volume two content about facilities.", filename: "vol2.txt", text_chars: 36, uploaded_at: new Date().toISOString() },
      { id: "manual-1", extracted_text: "Volume one content about instructors.", filename: "vol1.txt", text_chars: 37, uploaded_at: new Date().toISOString() },
    ];
    h.aiPrompts.length = 0;
    try {
      const res = await api("admin1", "POST", "/review/area1");
      expect(res.status).toBe(502); // mocked quota failure — after the prompt was built
      const combined = h.aiPrompts.join("\n");
      expect(combined).toContain("(from vol1.txt)");
      expect(combined).toContain("(from vol2.txt)");
      expect(combined).toContain("Volume one content");
      expect(combined).toContain("Volume two content");
    } finally {
      h.manualRows = prev;
    }
  });

  it("uploads multiple manual documents and supports per-document delete", async () => {
    const text = "Operations manual content. ".repeat(20);
    const fd = new FormData();
    fd.append("files", new Blob([text], { type: "text/plain" }), "vol1.txt");
    fd.append("files", new Blob([text], { type: "text/plain" }), "vol2.txt");
    h.executed.length = 0;
    const res = await fetch(`${base}/api/checklist-report/manual`, {
      method: "POST",
      headers: { "x-test-user": "admin1" },
      body: fd,
    });
    expect(res.status).toBe(201);
    const inserts = h.executed.filter((t) => t.includes("INSERT INTO bccs_ops_manuals"));
    expect(inserts.length).toBe(2);
    // No blanket delete of prior manuals anymore
    expect(h.executed.some((t) => t.includes("DELETE FROM bccs_ops_manuals") && !t.includes("id ="))).toBe(false);

    // Per-document delete is org-scoped; mocked DB returns a row so it succeeds
    const del = await api("admin1", "DELETE", "/manual/manual-1");
    expect(del.status).toBe(200);
  });

  it("returns a clear JSON error when too many files are uploaded", async () => {
    const csv = "Number,Description,Reference,Area\n1-01,x,142.13,Management\n";
    const fd = new FormData();
    for (let i = 0; i < 11; i++) fd.append("files", new Blob([csv], { type: "text/csv" }), `f${i}.csv`);
    const res = await fetch(`${base}/api/checklist-report/import-file`, {
      method: "POST",
      headers: { "x-test-user": "admin1" },
      body: fd,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/too many files|unexpected/i);
  });

  it("pasted-text import previews without writing, and only replaces on confirm", async () => {
    const text = "1-01 | Check instructors | 142.13 | Management\n1-02 | Check facility | 142.15 | Facilities";

    // Preview phase: summary returned, no deletes/inserts executed
    h.executed.length = 0;
    const preview = await api("admin1", "POST", "/import", { text });
    expect(preview.status).toBe(200);
    expect(preview.body.preview).toBe(true);
    expect(preview.body.itemCount).toBe(2);
    expect(preview.body.areas).toEqual([
      { name: "Management", itemCount: 1 },
      { name: "Facilities", itemCount: 1 },
    ]);
    expect(h.executed.filter((t) => /DELETE FROM|INSERT INTO/i.test(t))).toEqual([]);

    // Confirm phase: destructive replace executes
    h.executed.length = 0;
    const confirmed = await api("admin1", "POST", "/import", { text, confirm: true });
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.success).toBe(true);
    expect(confirmed.body.imported).toBe(2);
    expect(h.executed.some((t) => t.includes("DELETE FROM bccs_checklist_report_items"))).toBe(true);
    expect(h.executed.some((t) => t.includes("INSERT INTO bccs_checklist_report_items"))).toBe(true);
  });

  it("guards evidence routes: admins pass, deletes are org-scoped", async () => {
    // Admin passes the guard; without a multipart file the route 400s (not 403)
    const upload = await api("admin1", "POST", "/items/item-1/evidence");
    expect(upload.status).toBe(400);
    expect(upload.body?.message).toMatch(/no file/i);
    // Admin delete succeeds against the org-scoped row
    expect((await api("admin1", "DELETE", "/evidence/ev-1")).status).toBe(200);
    // Members can view evidence files (read), but the mocked select returns nothing
    expect((await api("member1", "GET", "/evidence/ev-1/file")).status).toBe(404);
  });
});
