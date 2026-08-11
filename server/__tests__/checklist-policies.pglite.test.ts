/**
 * Enforcement policy tests — real route SQL on in-process Postgres (PGlite).
 *
 * Covered:
 *   - draft-policy requires an approved operation (409) and drafts from it
 *   - saving a policy ties it to the latest approval's manual + revision
 *   - list includes item context; edit/adopt/delete work
 *   - viewers get 403 on all mutating routes; cross-org access is denied
 *   - aiCoverageScore math (covered=1, partial=0.5, stale/none excluded)
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import express from "express";
import { aiCoverageScore } from "../services/checklist-excel";

const h = vi.hoisted(() => ({
  dbPromise: (async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const client = new PGlite();
    return { client, db: drizzle(client) };
  })(),
  state: { orgId: "", role: "admin", email: "admin@acme.com" },
  aiResponse: { title: "Instructor Records Policy", body: "Purpose: ensure records.\nResponsible role: Training Manager.\nMonitoring: quarterly audit.\nTraining & communication: onboarding brief.\nConsequences: corrective action.\nEffective date: upon adoption" },
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
    chat = {
      completions: {
        create: vi.fn(async () => ({
          choices: [{ message: { content: JSON.stringify(h.aiResponse) } }],
        })),
      },
    };
  },
}));

const ORG1 = "11111111-1111-4111-8111-111111111111";
const ORG2 = "22222222-2222-4222-8222-222222222222";

let pg: import("@electric-sql/pglite").PGlite;
let server: import("http").Server;
let base: string;

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
  const { default: router } = await import("../routes/checklist-report");
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.user = { id: "u1", email: h.state.email, role: h.state.role };
    next();
  });
  app.use("/api/checklist-report", router);
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

let itemId: string;
let manualId: string;
let policyId: string;

describe("enforcement policies", () => {
  it("seeds checklist + manual, and draft-policy 409s before any approval", async () => {
    const imp = await api("POST", "/import", {
      text: "1-01 | Instructor records | 142.13 | Management\n1-02 | Facility checks | 142.15 | Management",
      confirm: true,
    });
    expect(imp.status).toBe(200);
    const fd = new FormData();
    fd.append("files", new Blob(["Operations manual text. ".repeat(20)], { type: "text/plain" }), "manual.txt");
    const up = await fetch(`${base}/api/checklist-report/manual`, { method: "POST", body: fd });
    expect(up.status).toBe(201);
    manualId = (await up.json()).manuals[0].id;
    itemId = (await api("GET", "/checklist")).body.areas[0].items[0].id;

    const draft = await api("POST", `/items/${itemId}/draft-policy`);
    expect(draft.status).toBe(409);

    // Direct save (even attempting adopted status) is equally rejected —
    // every persisted policy must be grounded in an approved operation.
    const directSave = await api("POST", `/items/${itemId}/policies`, {
      title: "Ungrounded policy", body: "No approval exists.", status: "adopted",
    });
    expect(directSave.status).toBe(409);
    const { rows } = await pg.query<any>(`SELECT COUNT(*)::int AS n FROM bccs_checklist_policies`);
    expect(rows[0].n).toBe(0);
  });

  it("drafts a policy from the approved operation and returns the approval's manual/revision", async () => {
    const appr = await api("POST", `/items/${itemId}/approve-operation`, {
      operationText: "The Training Manager maintains instructor qualification records, reviewed quarterly.",
    });
    expect(appr.status).toBe(201);
    const draft = await api("POST", `/items/${itemId}/draft-policy`);
    expect(draft.status).toBe(200);
    expect(draft.body.title).toBe("Instructor Records Policy");
    expect(draft.body.body).toContain("Responsible role");
    expect(draft.body.manualId).toBe(manualId);
    expect(draft.body.revision).toBe(2);
  });

  it("saves an edited policy tied to the latest approval's manual + revision", async () => {
    const save = await api("POST", `/items/${itemId}/policies`, {
      title: "Instructor Records Enforcement Policy",
      body: "Purpose: keep records current. Responsible role: Training Manager. Monitoring: quarterly.",
    });
    expect(save.status).toBe(201);
    policyId = save.body.policy.id;
    expect(save.body.policy).toMatchObject({
      item_id: itemId,
      manual_id: manualId,
      revision: 2,
      status: "draft",
      created_by: "admin@acme.com",
    });
  });

  it("lists policies with item context; edit and adopt work", async () => {
    const list = await api("GET", "/policies");
    expect(list.status).toBe(200);
    expect(list.body.policies).toHaveLength(1);
    expect(list.body.policies[0]).toMatchObject({ item_number: "1-01", manual_filename: "manual.txt" });

    const edit = await api("PUT", `/policies/${policyId}`, { body: "Updated policy body.", status: "adopted" });
    expect(edit.status).toBe(200);
    expect(edit.body.policy).toMatchObject({ status: "adopted", body: "Updated policy body.", title: "Instructor Records Enforcement Policy" });

    expect((await api("PUT", `/policies/${policyId}`, { status: "bogus" })).status).toBe(400);
    expect((await api("POST", `/items/${itemId}/policies`, { title: "", body: "x" })).status).toBe(400);
  });

  it("blocks viewers (403) from draft/save/edit/delete but lets them read the list", async () => {
    h.state.role = "viewer";
    try {
      expect((await api("POST", `/items/${itemId}/draft-policy`)).status).toBe(403);
      expect((await api("POST", `/items/${itemId}/policies`, { title: "t", body: "b" })).status).toBe(403);
      expect((await api("PUT", `/policies/${policyId}`, { title: "hack" })).status).toBe(403);
      expect((await api("DELETE", `/policies/${policyId}`)).status).toBe(403);
      expect((await api("GET", "/policies")).status).toBe(200);
    } finally {
      h.state.role = "admin";
    }
  });

  it("denies cross-org access: foreign org sees no policies and cannot touch them", async () => {
    h.state.orgId = ORG2;
    try {
      expect((await api("GET", "/policies")).body.policies).toHaveLength(0);
      expect((await api("PUT", `/policies/${policyId}`, { title: "hijack" })).status).toBe(404);
      expect((await api("DELETE", `/policies/${policyId}`)).status).toBe(404);
      expect((await api("POST", `/items/${itemId}/draft-policy`)).status).toBe(404);
      expect((await api("POST", `/items/${itemId}/policies`, { title: "t", body: "b" })).status).toBe(404);
    } finally {
      h.state.orgId = ORG1;
    }
  });

  it("keeps policy provenance readable after the manual document is deleted", async () => {
    const del = await fetch(`${base}/api/checklist-report/manual/${manualId}`, { method: "DELETE" });
    expect(del.status).toBe(200);

    const list = await api("GET", "/policies");
    expect(list.body.policies[0]).toMatchObject({
      manual_filename: "manual.txt",
      revision: 2,
      manual_deleted: true,
    });

    // Approval shown on the checklist keeps its manual filename too.
    const checklist = await api("GET", "/checklist");
    const item = checklist.body.areas[0].items.find((i: any) => i.id === itemId);
    expect(item.approval).toMatchObject({ manualFilename: "manual.txt", revision: 2 });

    // Excel export still succeeds with the deleted-manual policy included.
    const xlsx = await fetch(`${base}/api/checklist-report/export.xlsx`);
    expect(xlsx.status).toBe(200);
  });

  it("deletes a policy", async () => {
    expect((await api("DELETE", `/policies/${policyId}`)).status).toBe(200);
    expect((await api("GET", "/policies")).body.policies).toHaveLength(0);
  });
});

describe("aiCoverageScore", () => {
  const item = (aiVerdict: string | null, aiStale = false) => ({ aiVerdict, aiStale });

  it("gives full credit for covered, half for partial, none for not_addressed", () => {
    expect(aiCoverageScore([item("covered"), item("covered")])).toBe(100);
    expect(aiCoverageScore([item("covered"), item("not_addressed")])).toBe(50);
    expect(aiCoverageScore([item("partial"), item("partial")])).toBe(50);
    expect(aiCoverageScore([item("covered"), item("partial"), item("not_addressed"), item("not_addressed")])).toBe(38);
  });

  it("excludes stale and unreviewed items; null when nothing current", () => {
    expect(aiCoverageScore([item("covered"), item("covered", true), item(null)])).toBe(100);
    expect(aiCoverageScore([item(null), item("covered", true)])).toBeNull();
    expect(aiCoverageScore([])).toBeNull();
  });

  it("rises when a not_addressed item becomes covered (the compliance loop)", () => {
    const before = aiCoverageScore([item("covered"), item("not_addressed")]);
    const after = aiCoverageScore([item("covered"), item("covered")]);
    expect(after!).toBeGreaterThan(before!);
  });
});
