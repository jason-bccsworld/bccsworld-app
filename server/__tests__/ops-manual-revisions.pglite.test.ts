/**
 * Operations-manual revision tests — real route SQL against in-process
 * Postgres (PGlite), with the production tables created by the router's own
 * ensureTables().
 *
 * Covered:
 *   - initial upload is revision 1 with an "Initial upload" history row
 *   - applyManualRevision bumps the revision, updates text, preserves history
 *   - a revision bump flips existing AI findings stale (hash token changes)
 *   - export renders the current revision (labeled) as printable HTML
 *   - cross-org access to history/export/revision service is denied
 *   - deleting a manual removes its history rows
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import express from "express";
import crypto from "crypto";

const h = vi.hoisted(() => ({
  dbPromise: (async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const client = new PGlite();
    return { client, db: drizzle(client) };
  })(),
  state: { orgId: "" },
}));

vi.mock("../db", async () => {
  const { db } = await h.dbPromise;
  return { db, pool: {} };
});

vi.mock("../localAuth", () => ({
  isAuthenticated: (req: any, res: any, next: any) =>
    req.user ? next() : res.status(401).json({ message: "Unauthorized" }),
}));

vi.mock("../middleware/tenant", () => ({
  requireOrg: () => h.state.orgId,
  isPlatformStaff: (email?: string) => !!email && email.toLowerCase().endsWith("@bccsworld.com"),
}));

vi.mock("openai", () => ({
  default: class {
    chat = { completions: { create: vi.fn(async () => { throw new Error("AI not used in this test"); }) } };
  },
}));

const ORG1 = "11111111-1111-4111-8111-111111111111";
const ORG2 = "22222222-2222-4222-8222-222222222222";

let pg: import("@electric-sql/pglite").PGlite;
let server: import("http").Server;
let base: string;
let applyManualRevision: (opts: {
  orgId: string; manualId: string; newText: string; changeSummary: string; actor: string;
}) => Promise<any | null>;

beforeAll(async () => {
  h.state.orgId = ORG1;
  pg = (await h.dbPromise).client;
  await pg.exec(`
    CREATE TABLE training_organizations (
      id UUID PRIMARY KEY,
      organization_name TEXT NOT NULL,
      certificate_number TEXT,
      regulatory_authority TEXT
    );
    INSERT INTO training_organizations (id, organization_name, certificate_number, regulatory_authority)
    VALUES ('${ORG1}', 'Acme Flight', 'CERT-1', 'FAA');
  `);
  const mod = await import("../routes/checklist-report");
  applyManualRevision = mod.applyManualRevision;
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.user = { id: "admin1", email: "admin@acme.com", role: "admin" };
    next();
  });
  app.use("/api/checklist-report", mod.default);
  await new Promise<void>((resolve) => { server = app.listen(0, () => resolve()); });
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});

afterAll(async () => {
  server?.close();
  await pg?.close();
});

async function api(method: string, path: string, body?: any) {
  const res = await fetch(`${base}/api/checklist-report${path}`, {
    method,
    headers: { "content-type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* not json */ }
  return { status: res.status, body: json };
}

async function addManual(filename: string, content?: string) {
  const text = content ?? `Operations manual ${filename}. `.repeat(20);
  const fd = new FormData();
  fd.append("files", new Blob([text], { type: "text/plain" }), filename);
  const res = await fetch(`${base}/api/checklist-report/manual`, { method: "POST", body: fd });
  expect(res.status).toBe(201);
  const body = await res.json();
  return body.manuals[0] as { id: string; revision: number };
}

const setHash = (tokens: string[]) =>
  crypto.createHash("md5").update([...tokens].sort().join(",")).digest("hex");

let manualId: string;

describe("operations-manual revisions", () => {
  it("initial upload is revision 1 with an 'Initial upload' history row", async () => {
    const manual = await addManual("ops-manual.txt");
    manualId = manual.id;
    expect(Number(manual.revision)).toBe(1);

    const hist = await api("GET", `/manual/${manualId}/revisions`);
    expect(hist.status).toBe(200);
    expect(hist.body.manual.revision).toBe(1);
    expect(hist.body.revisions).toHaveLength(1);
    expect(hist.body.revisions[0]).toMatchObject({ revision: 1, change_summary: "Initial upload" });

    const list = await api("GET", "/manual");
    expect(list.body.manuals[0].revision).toBe(1);
  });

  it("a revision bump preserves history, updates text, and flips findings stale", async () => {
    // Seed a checklist item + a fresh finding hashed against rev-1 set.
    const imp = await api("POST", "/import", {
      text: "1-01 | Instructor records | 142.13 | Management",
      confirm: true,
    });
    expect(imp.status).toBe(200);
    const items = (await api("GET", "/checklist")).body.areas[0].items;
    const itemId = items[0].id;
    await pg.query(
      `INSERT INTO bccs_checklist_ai_findings (organization_id, item_id, manual_id, manual_set_hash, verdict, excerpt, remediation)
       VALUES ($1, $2, $3, $4, 'covered', 'quote', '')`,
      [ORG1, itemId, manualId, setHash([manualId])],
    );
    expect((await api("GET", "/manual")).body.reviewStale).toBe(false);

    const updated = await applyManualRevision({
      orgId: ORG1,
      manualId,
      newText: "Revised manual text. ".repeat(30),
      changeSummary: "Added approved operation 1-01",
      actor: "admin@acme.com",
    });
    expect(Number(updated.revision)).toBe(2);

    // History has both revisions, newest first; live row carries new text.
    const hist = await api("GET", `/manual/${manualId}/revisions`);
    expect(hist.body.revisions.map((r: any) => r.revision)).toEqual([2, 1]);
    expect(hist.body.revisions[0].change_summary).toBe("Added approved operation 1-01");
    const { rows } = await pg.query<any>(
      `SELECT extracted_text, revision FROM bccs_ops_manuals WHERE id = $1`, [manualId]);
    expect(rows[0].revision).toBe(2);
    expect(rows[0].extracted_text.startsWith("Revised manual text.")).toBe(true);
    const { rows: prior } = await pg.query<any>(
      `SELECT extracted_text FROM bccs_ops_manual_revisions WHERE manual_id = $1 AND revision = 1`, [manualId]);
    expect(prior[0].extracted_text.startsWith("Operations manual")).toBe(true);

    // Findings judged against rev 1 are now stale on every surface.
    expect((await api("GET", "/manual")).body.reviewStale).toBe(true);
    const item = (await api("GET", "/checklist")).body.areas[0].items[0];
    expect(item.aiFinding.stale).toBe(true);
  });

  it("export renders the current revision as labeled printable HTML", async () => {
    const res = await fetch(`${base}/api/checklist-report/manual/${manualId}/export`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain("Revision 2");
    expect(html).toContain("ops-manual.txt");
    expect(html).toContain("Revised manual text.");
    expect(html).not.toContain("Operations manual ops-manual.txt."); // prior text not exported
    expect(html).toContain("formatted rendering of the text extracted");
  });

  it("denies cross-org access to history, export, and the revision service", async () => {
    h.state.orgId = ORG2;
    try {
      expect((await api("GET", `/manual/${manualId}/revisions`)).status).toBe(404);
      const exp = await fetch(`${base}/api/checklist-report/manual/${manualId}/export`);
      expect(exp.status).toBe(404);
      const out = await applyManualRevision({
        orgId: ORG2, manualId, newText: "hijack ".repeat(40), changeSummary: "x", actor: "evil@other.com",
      });
      expect(out).toBeNull();
    } finally {
      h.state.orgId = ORG1;
    }
    // Unchanged by the cross-org attempts.
    expect((await api("GET", `/manual/${manualId}/revisions`)).body.manual.revision).toBe(2);
  });

  it("deleting a manual removes its revision history", async () => {
    expect((await api("DELETE", `/manual/${manualId}`)).status).toBe(200);
    const { rows } = await pg.query<any>(
      `SELECT COUNT(*)::int AS n FROM bccs_ops_manual_revisions WHERE manual_id = $1`, [manualId]);
    expect(rows[0].n).toBe(0);
  });
});
