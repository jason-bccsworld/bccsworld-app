/**
 * Part 142 Checklist Report — org-scoped checklist persistence, checklist
 * import, operations-manual upload + text extraction, and AI review of the
 * manual against each checklist item.
 *
 * The checklist is seeded per-organization from the canonical Part 142 data
 * in shared/part142-checklist.ts the first time an org loads the page.
 */
import { Router } from "express";
import multer from "multer";
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { exec } from "child_process";
import { promisify } from "util";
import OpenAI from "openai";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";
import { makeSchemaGate } from "../lib/schema-init";
import { requireOrg, isPlatformStaff } from "../middleware/tenant";
import { PART142_CHECKLIST } from "@shared/part142-checklist";
import { chunkText, selectExcerpts, batchItems, promptCoverage, segmentEntries, normalizeEvidence, MAX_SEGMENTS, MAP_PARALLEL, MAX_QUOTE_CHARS } from "../services/checklist-review-utils";
import { parseChecklistWorkbook, buildChecklistWorkbook, type ImportedItem } from "../services/checklist-excel";

const execAsync = promisify(exec);
const router = Router();
const openai = new OpenAI();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

async function ensureTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS bccs_checklist_report_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL,
      area_id VARCHAR(50) NOT NULL,
      area_name VARCHAR(300) NOT NULL,
      area_description TEXT,
      item_number VARCHAR(30) NOT NULL,
      description TEXT NOT NULL,
      reference VARCHAR(300),
      status VARCHAR(30) DEFAULT 'pending',
      comments TEXT DEFAULT '',
      findings TEXT DEFAULT '',
      item_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS bccs_ops_manuals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL,
      filename VARCHAR(300) NOT NULL,
      extracted_text TEXT NOT NULL,
      text_chars INTEGER NOT NULL,
      uploaded_by VARCHAR(200),
      uploaded_at TIMESTAMP DEFAULT NOW()
    )
  `);
  // Additive: manuals carry a revision number (initial upload = revision 1).
  await db.execute(sql`
    ALTER TABLE bccs_ops_manuals ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1
  `);
  // Full text of every revision of every manual (including the current one),
  // with who/what produced it — powers the revision history and export.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS bccs_ops_manual_revisions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL,
      manual_id UUID NOT NULL,
      revision INTEGER NOT NULL,
      extracted_text TEXT NOT NULL,
      text_chars INTEGER NOT NULL,
      change_summary TEXT,
      changed_by VARCHAR(200),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS bccs_ops_manual_revisions_manual_rev
    ON bccs_ops_manual_revisions (manual_id, revision)
  `);
  // Backfill: manuals uploaded before revisioning get a revision-1 history
  // row from their current text (idempotent via the unique index).
  await db.execute(sql`
    INSERT INTO bccs_ops_manual_revisions (organization_id, manual_id, revision, extracted_text, text_chars, change_summary, changed_by, created_at)
    SELECT m.organization_id, m.id, 1, m.extracted_text, m.text_chars, 'Initial upload', m.uploaded_by, COALESCE(m.uploaded_at, NOW())
    FROM bccs_ops_manuals m
    WHERE m.revision = 1
      AND NOT EXISTS (SELECT 1 FROM bccs_ops_manual_revisions r WHERE r.manual_id = m.id AND r.revision = 1)
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS bccs_checklist_ai_findings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL,
      item_id UUID NOT NULL,
      manual_id UUID NOT NULL,
      verdict VARCHAR(30) NOT NULL,
      excerpt TEXT,
      remediation TEXT,
      reviewed_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS bccs_checklist_evidence (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL,
      item_id UUID NOT NULL,
      filename VARCHAR(300) NOT NULL,
      content_type VARCHAR(100) NOT NULL,
      size_bytes INTEGER NOT NULL,
      data BYTEA NOT NULL,
      uploaded_by VARCHAR(200),
      uploaded_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS bccs_checklist_evidence_org_item
    ON bccs_checklist_evidence (organization_id, item_id)
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS bccs_checklist_report_items_org_area_number
    ON bccs_checklist_report_items (organization_id, area_id, item_number)
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS bccs_checklist_ai_findings_org_item
    ON bccs_checklist_ai_findings (organization_id, item_id)
  `);
  // Additive: findings are now tied to the whole manual *set* (multi-document
  // support). Legacy rows have NULL here and fall back to manual_id staleness.
  await db.execute(sql`
    ALTER TABLE bccs_checklist_ai_findings ADD COLUMN IF NOT EXISTS manual_set_hash VARCHAR(64)
  `);
  // Additive: ready-to-adopt operations-manual language for partial /
  // not_addressed items. Legacy findings have NULL and render remediation only.
  await db.execute(sql`
    ALTER TABLE bccs_checklist_ai_findings ADD COLUMN IF NOT EXISTS suggested_operation TEXT
  `);
  // Provenance of operations approved into a manual: who adopted what text,
  // into which manual, producing which revision.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS bccs_checklist_operation_approvals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL,
      item_id UUID NOT NULL,
      manual_id UUID NOT NULL,
      revision INTEGER NOT NULL,
      operation_text TEXT NOT NULL,
      approved_by VARCHAR(200),
      approved_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS bccs_checklist_operation_approvals_org_item
    ON bccs_checklist_operation_approvals (organization_id, item_id)
  `);
  // Enforcement policies: the organizational rule describing how an approved
  // operation is enforced. Tied to the checklist item and the manual revision
  // the operation was approved into.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS bccs_checklist_policies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL,
      item_id UUID NOT NULL,
      manual_id UUID,
      revision INTEGER,
      title VARCHAR(300) NOT NULL,
      body TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      created_by VARCHAR(200),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS bccs_checklist_policies_org_item
    ON bccs_checklist_policies (organization_id, item_id)
  `);
  // Durable provenance: keep the manual's filename on policies and approvals
  // so the audit trail stays readable after the manual document is deleted.
  await db.execute(sql`
    ALTER TABLE bccs_checklist_policies ADD COLUMN IF NOT EXISTS manual_filename VARCHAR(300)
  `);
  await db.execute(sql`
    ALTER TABLE bccs_checklist_operation_approvals ADD COLUMN IF NOT EXISTS manual_filename VARCHAR(300)
  `);
  // Backfill from manuals that still exist.
  await db.execute(sql`
    UPDATE bccs_checklist_policies p SET manual_filename = m.filename
    FROM bccs_ops_manuals m
    WHERE p.manual_filename IS NULL AND m.id = p.manual_id AND m.organization_id = p.organization_id
  `);
  await db.execute(sql`
    UPDATE bccs_checklist_operation_approvals a SET manual_filename = m.filename
    FROM bccs_ops_manuals m
    WHERE a.manual_filename IS NULL AND m.id = a.manual_id AND m.organization_id = a.organization_id
  `);
  // Per-area manual coverage measured at AI-review time — persisted so the
  // checklist page can still explain partial coverage after a reload.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS bccs_checklist_area_coverage (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL,
      area_id VARCHAR(100) NOT NULL,
      total_manual_chars INTEGER NOT NULL,
      excerpt_chars INTEGER NOT NULL,
      ratio DOUBLE PRECISION NOT NULL,
      reviewed_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS bccs_checklist_area_coverage_org_area
    ON bccs_checklist_area_coverage (organization_id, area_id)
  `);
  // Additive: coverage rows record which manual set they were measured
  // against, so the note can be flagged stale when the set changes.
  // Legacy rows have NULL and are treated as stale (unknown provenance).
  await db.execute(sql`
    ALTER TABLE bccs_checklist_area_coverage ADD COLUMN IF NOT EXISTS manual_set_hash VARCHAR(64)
  `);
  // Server-owned state for full-coverage (map-reduce) AI review runs. The
  // client only drives the phases; evidence and progress live here so a
  // caller can neither fabricate evidence nor skip manual sections.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS bccs_checklist_review_runs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL,
      area_id VARCHAR(100) NOT NULL,
      manual_set_hash VARCHAR(64) NOT NULL,
      total_segments INTEGER NOT NULL,
      segments_done INTEGER NOT NULL DEFAULT 0,
      evidence JSONB NOT NULL DEFAULT '[]',
      verdicts JSONB NOT NULL DEFAULT '{}',
      batches_done INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS bccs_checklist_review_runs_org_area
    ON bccs_checklist_review_runs (organization_id, area_id)
  `);
}

// All routes must wait for schema initialization; the shared gate retries on
// failure so a transient cold-start error never poisons the instance.
const schemaGate = makeSchemaGate(
  ensureTables,
  "Checklist storage is initializing or unavailable. Please try again shortly.",
  "checklist-report",
);
router.use(schemaGate.middleware);

// Bounds for imports and AI review so a single org cannot create unbounded
// review workloads (each area = one OpenAI call).
const MAX_IMPORT_ITEMS = 500;
const MAX_IMPORT_AREAS = 20;

/** Admin-only guard for mutating actions (platform staff also allowed). */
function requireAdmin(req: any, res: any, next: any) {
  if (req.user?.role !== "admin" && !isPlatformStaff(req.user?.email)) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

// Max operations-manual documents per org (each = one upload, text extracted).
const MAX_MANUALS = 5;
// Max spreadsheet files per import request.
const MAX_IMPORT_FILES = 10;

/** Stable fingerprint of the org's current manual set (order-independent). */
function manualSetHash(manualIds: string[]): string {
  return crypto.createHash("md5").update([...manualIds].sort().join(",")).digest("hex");
}

/** Hash token for one manual. Revision 1 stays the bare id so hashes recorded
 * before revisioning existed remain valid; any later revision changes the
 * token (and thus the set hash), flipping findings stale on content change. */
function manualToken(m: { id: string; revision?: number | string | null }): string {
  const rev = Number(m.revision) || 1;
  return rev > 1 ? `${m.id}@${rev}` : String(m.id);
}

/** A finding is stale when the manual set changed since it was produced.
 * Legacy findings (no set hash) fall back to the old single-manual check. */
function isFindingStale(finding: { manual_set_hash?: string | null; manual_id: string }, manualIds: string[], currentHash: string): boolean {
  if (manualIds.length === 0) return true;
  if (finding.manual_set_hash) return finding.manual_set_hash !== currentHash;
  // Legacy finding reviewed against a single manual: stale unless the current
  // set is exactly that one manual.
  return manualIds.length !== 1 || manualIds[0] !== finding.manual_id;
}

/** All manual documents for an org, newest first. */
/** Ops manuals changed: federal-contracts AI-audit verdicts were judged
 * against the old manual set, so clear them (checklist annotations + the
 * work-package audit summary) rather than presenting stale results. */
async function invalidateFedconAudits(orgId: string) {
  try {
    await db.execute(sql`
      UPDATE bccs_fedcon_checklist SET ai_audit = NULL
      WHERE org_id = ${orgId} AND subject_type = 'opportunity' AND ai_audit IS NOT NULL
    `);
    await db.execute(sql`
      UPDATE bccs_fedcon_opportunities SET dossier = dossier #- '{workPackage,audit}', updated_at = NOW()
      WHERE org_id = ${orgId} AND dossier -> 'workPackage' -> 'audit' IS NOT NULL
    `);
  } catch (e) {
    console.error("Fedcon audit invalidation failed:", e);
  }
}

async function getOrgManuals(orgId: string, withText = false): Promise<any[]> {
  return db.execute(withText
    ? sql`SELECT id, filename, extracted_text, text_chars, revision, uploaded_by, uploaded_at FROM bccs_ops_manuals
          WHERE organization_id = ${orgId} ORDER BY uploaded_at DESC, id`
    : sql`SELECT id, filename, text_chars, revision, uploaded_by, uploaded_at FROM bccs_ops_manuals
          WHERE organization_id = ${orgId} ORDER BY uploaded_at DESC, id`
  ).then((r: any) => r.rows);
}

/** Apply a content change to one manual: bumps the revision, updates the live
 * text, and records the new revision (full text + change summary + actor) in
 * the history table. Findings staleness follows automatically — the manual's
 * hash token changes with the revision, exactly like an upload/delete would.
 * Returns the updated manual row, or null when the manual isn't in this org.
 * Callers should also invalidate fedcon audits (same as upload/delete). */
export async function applyManualRevision(opts: {
  orgId: string;
  manualId: string;
  /** Full replacement text. Provide either this or appendText. */
  newText?: string;
  /**
   * Text appended to the *locked, freshly-read* current text — safe under
   * concurrent revisions (a pre-read snapshot passed as newText is not).
   */
  appendText?: string;
  changeSummary: string;
  actor: string;
  /**
   * Runs inside the same transaction after the revision is written — use for
   * provenance rows that must commit atomically with the manual change.
   */
  afterUpdate?: (tx: any, updated: any) => Promise<void>;
}): Promise<any | null> {
  const { orgId, manualId, changeSummary, actor, afterUpdate } = opts;
  return db.transaction(async (tx) => {
    const [manual] = await tx.execute(sql`
      SELECT id, revision, extracted_text FROM bccs_ops_manuals
      WHERE id = ${manualId} AND organization_id = ${orgId}
      FOR UPDATE
    `).then((r: any) => r.rows);
    if (!manual) return null;
    const newText = opts.appendText !== undefined
      ? String(manual.extracted_text || "") + opts.appendText
      : String(opts.newText ?? "");
    const newRevision = (Number(manual.revision) || 1) + 1;
    const [updated] = await tx.execute(sql`
      UPDATE bccs_ops_manuals
      SET extracted_text = ${newText}, text_chars = ${newText.length}, revision = ${newRevision}
      WHERE id = ${manualId} AND organization_id = ${orgId}
      RETURNING id, filename, text_chars, revision, uploaded_by, uploaded_at
    `).then((r: any) => r.rows);
    await tx.execute(sql`
      INSERT INTO bccs_ops_manual_revisions (organization_id, manual_id, revision, extracted_text, text_chars, change_summary, changed_by)
      VALUES (${orgId}, ${manualId}, ${newRevision}, ${newText}, ${newText.length}, ${changeSummary}, ${actor})
    `);
    if (afterUpdate) await afterUpdate(tx, updated);
    return updated;
  });
}

async function seedChecklist(orgId: string) {
  // ON CONFLICT DO NOTHING + the unique (org, area, number) index makes
  // seeding idempotent under concurrent first loads.
  await db.transaction(async (tx) => {
    for (const area of PART142_CHECKLIST) {
      let order = 0;
      for (const item of area.items) {
        order++;
        await tx.execute(sql`
          INSERT INTO bccs_checklist_report_items
            (organization_id, area_id, area_name, area_description, item_number, description, reference, item_order)
          VALUES (${orgId}, ${area.id}, ${area.name}, ${area.description}, ${item.number}, ${item.description}, ${item.reference}, ${order})
          ON CONFLICT (organization_id, area_id, item_number) DO NOTHING
        `);
      }
    }
  });
}

function friendlyOpenAIError(err: any): string {
  const msg = String(err?.message || err);
  if (err?.status === 429 || /credit|quota|exceeded/i.test(msg)) {
    return "The AI service is out of credits or rate-limited. Please top up the OpenAI account and try again.";
  }
  if (err?.status === 401 || /api key/i.test(msg)) {
    return "The AI service API key is invalid or missing. Please check the OpenAI key configuration.";
  }
  return `AI review failed: ${msg}`;
}

// ── Checklist read/update ────────────────────────────────────────────────────

// GET /checklist — org checklist grouped by area (+latest AI findings)
router.get("/checklist", isAuthenticated, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    let rows = await db.execute(sql`
      SELECT * FROM bccs_checklist_report_items WHERE organization_id = ${orgId}
      ORDER BY area_id, item_order
    `).then((r: any) => r.rows);
    if (rows.length === 0) {
      await seedChecklist(orgId);
      rows = await db.execute(sql`
        SELECT * FROM bccs_checklist_report_items WHERE organization_id = ${orgId}
        ORDER BY area_id, item_order
      `).then((r: any) => r.rows);
    }
    const manualIds = (await getOrgManuals(orgId)).map(manualToken);
    const currentHash = manualSetHash(manualIds);
    const findings = await db.execute(sql`
      SELECT DISTINCT ON (item_id) item_id, manual_id, manual_set_hash, verdict, excerpt, remediation, suggested_operation, reviewed_at
      FROM bccs_checklist_ai_findings WHERE organization_id = ${orgId}
      ORDER BY item_id, reviewed_at DESC
    `).then((r: any) => r.rows);
    const findingByItem: Record<string, any> = {};
    for (const f of findings) {
      findingByItem[f.item_id] = { ...f, stale: isFindingStale(f, manualIds, currentHash) };
    }
    // Latest approved-into-manual operation per item — powers the
    // "Addressed in rev N — re-run the AI review" state.
    const approvals = await db.execute(sql`
      SELECT DISTINCT ON (a.item_id) a.item_id, a.manual_id, a.revision, a.approved_by, a.approved_at,
             COALESCE(m.filename, a.manual_filename) AS manual_filename
      FROM bccs_checklist_operation_approvals a
      LEFT JOIN bccs_ops_manuals m ON m.id = a.manual_id AND m.organization_id = a.organization_id
      WHERE a.organization_id = ${orgId}
      ORDER BY a.item_id, a.approved_at DESC
    `).then((r: any) => r.rows);
    const approvalByItem: Record<string, any> = {};
    for (const a of approvals) {
      approvalByItem[a.item_id] = {
        manualId: a.manual_id,
        manualFilename: a.manual_filename || null,
        revision: Number(a.revision),
        approvedBy: a.approved_by,
        approvedAt: a.approved_at,
      };
    }
    // Persisted per-area coverage from the most recent AI review run — lets
    // the client show the coverage note after a reload.
    const coverageRows = await db.execute(sql`
      SELECT area_id, total_manual_chars, excerpt_chars, ratio, manual_set_hash, reviewed_at
      FROM bccs_checklist_area_coverage WHERE organization_id = ${orgId}
    `).then((r: any) => r.rows);
    const coverageByArea: Record<string, any> = {};
    for (const c of coverageRows) {
      coverageByArea[c.area_id] = {
        totalManualChars: Number(c.total_manual_chars),
        excerptChars: Number(c.excerpt_chars),
        ratio: Number(c.ratio),
        reviewedAt: c.reviewed_at,
        // Stale when the manual set changed since this coverage was measured.
        // Legacy rows (NULL hash) and empty manual sets are treated as stale.
        stale: manualIds.length === 0 || !c.manual_set_hash || c.manual_set_hash !== currentHash,
      };
    }
    const evidence = await db.execute(sql`
      SELECT id, item_id, filename, content_type, size_bytes, uploaded_by, uploaded_at
      FROM bccs_checklist_evidence WHERE organization_id = ${orgId}
      ORDER BY uploaded_at
    `).then((r: any) => r.rows);
    const evidenceByItem: Record<string, any[]> = {};
    for (const e of evidence) {
      (evidenceByItem[e.item_id] ||= []).push({
        id: e.id,
        filename: e.filename,
        contentType: e.content_type,
        sizeBytes: Number(e.size_bytes),
        uploadedBy: e.uploaded_by,
        uploadedAt: e.uploaded_at,
      });
    }

    const areas: any[] = [];
    for (const row of rows) {
      let area = areas.find((a) => a.id === row.area_id);
      if (!area) {
        area = { id: row.area_id, name: row.area_name, description: row.area_description, coverage: coverageByArea[row.area_id] || null, items: [] };
        areas.push(area);
      }
      area.items.push({
        id: row.id,
        number: row.item_number,
        description: row.description,
        reference: row.reference || "",
        status: row.status,
        comments: row.comments || "",
        findings: row.findings || "",
        aiFinding: findingByItem[row.id] || null,
        approval: approvalByItem[row.id] || null,
        evidence: evidenceByItem[row.id] || [],
      });
    }
    // Approved organization identity for the auditor report header —
    // resolved server-side from the active org, never client-provided.
    const [org] = await db.execute(sql`
      SELECT organization_name, certificate_number, regulatory_authority
      FROM training_organizations WHERE id = ${orgId}
    `).then((r: any) => r.rows);

    res.json({
      areas,
      organization: org
        ? {
            name: org.organization_name,
            certificateNumber: org.certificate_number,
            regulatoryAuthority: org.regulatory_authority,
          }
        : null,
    });
  } catch (err) {
    console.error("Checklist load error:", err);
    res.status(500).json({ message: "Failed to load checklist" });
  }
});

// Bound on the edited operation text a user can approve into a manual.
const MAX_OPERATION_CHARS = 8000;

// POST /items/:id/approve-operation — adopt (possibly edited) suggested
// operation text into an operations manual: appends a labeled section,
// creates a new manual revision (history + staleness follow automatically),
// and records approval provenance. Admin-only, org-scoped.
router.post("/items/:id/approve-operation", isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const operationText = String(req.body?.operationText || "").trim();
    if (!operationText) return res.status(400).json({ message: "The operation text is empty. Edit the suggested operation and try again." });
    if (operationText.length > MAX_OPERATION_CHARS) {
      return res.status(400).json({ message: `The operation text is too long (${operationText.length} characters; the maximum is ${MAX_OPERATION_CHARS}).` });
    }
    const [item] = await db.execute(sql`
      SELECT id, item_number, reference, description FROM bccs_checklist_report_items
      WHERE id = ${req.params.id} AND organization_id = ${orgId}
    `).then((r: any) => r.rows);
    if (!item) return res.status(404).json({ message: "Checklist item not found" });

    const manuals = await getOrgManuals(orgId);
    if (manuals.length === 0) return res.status(409).json({ message: "Upload an operations manual before approving operations into it." });
    let manual: any;
    if (req.body?.manualId) {
      manual = manuals.find((m: any) => String(m.id) === String(req.body.manualId));
      if (!manual) return res.status(404).json({ message: "Manual document not found" });
    } else if (manuals.length === 1) {
      manual = manuals[0];
    } else {
      return res.status(400).json({ message: "Choose which manual document this operation should be added to." });
    }

    const actor = req.user?.email || req.user?.id || "system";
    const dateStr = new Date().toISOString().slice(0, 10);
    const section = [
      "",
      "",
      "────────────────────────────────────────",
      `APPROVED OPERATION — Checklist item ${item.item_number}${item.reference ? ` (ref ${item.reference})` : ""}`,
      `Adopted ${dateStr} by ${actor}`,
      "",
      operationText,
      "",
    ].join("\n");

    // Append under the row lock (fresh re-read inside the transaction) and
    // write approval provenance atomically with the manual revision — a
    // concurrent approval to the same manual cannot discard this section,
    // and a manual can never change without its approval record.
    const updated = await applyManualRevision({
      orgId,
      manualId: manual.id,
      appendText: section,
      changeSummary: `Approved operation for checklist item ${item.item_number}`,
      actor,
      afterUpdate: async (tx, u) => {
        await tx.execute(sql`
          INSERT INTO bccs_checklist_operation_approvals (organization_id, item_id, manual_id, revision, operation_text, approved_by, manual_filename)
          VALUES (${orgId}, ${item.id}, ${manual.id}, ${Number(u.revision)}, ${operationText}, ${actor}, ${u.filename || manual.filename || null})
        `);
      },
    });
    if (!updated) return res.status(404).json({ message: "Manual document not found" });
    // Manual content changed — same downstream invalidation as upload/delete.
    await invalidateFedconAudits(orgId);
    res.status(201).json({
      success: true,
      manualId: manual.id,
      filename: updated.filename,
      revision: Number(updated.revision),
      approval: { manualId: manual.id, revision: Number(updated.revision), approvedBy: actor, approvedAt: new Date().toISOString() },
    });
  } catch (err) {
    console.error("Approve operation error:", err);
    res.status(500).json({ message: "Failed to approve the operation into the manual" });
  }
});

// ── Enforcement policies ────────────────────────────────────────────────────
const MAX_POLICY_TITLE = 300;
const MAX_POLICY_BODY = 8000;
const POLICY_STATUSES = new Set(["draft", "adopted"]);

/** Latest approved operation for an org item, or null. */
async function latestApproval(orgId: string, itemId: string): Promise<any | null> {
  const [row] = await db.execute(sql`
    SELECT manual_id, revision, operation_text, approved_at, manual_filename
    FROM bccs_checklist_operation_approvals
    WHERE organization_id = ${orgId} AND item_id = ${itemId}
    ORDER BY approved_at DESC LIMIT 1
  `).then((r: any) => r.rows);
  return row || null;
}

// POST /items/:id/draft-policy — AI-draft an enforcement policy from the
// item's latest approved operation. Returns the draft only (nothing saved);
// the user edits and saves it via POST /items/:id/policies. Admin-only.
router.post("/items/:id/draft-policy", isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const [item] = await db.execute(sql`
      SELECT id, item_number, reference, description FROM bccs_checklist_report_items
      WHERE id = ${req.params.id} AND organization_id = ${orgId}
    `).then((r: any) => r.rows);
    if (!item) return res.status(404).json({ message: "Checklist item not found" });
    const approval = await latestApproval(orgId, item.id);
    if (!approval) return res.status(409).json({ message: "Approve an operation into the manual first — the policy is drafted from the approved operation text." });

    const prompt = `You are an FAA Part 142 training-center compliance officer. An operation was just approved into the operations manual to satisfy this checklist requirement:

CHECKLIST ITEM: (${item.item_number}, ref ${item.reference || "n/a"}) ${item.description}

APPROVED OPERATION TEXT:
${String(approval.operation_text).slice(0, 4000)}

Draft the organizational ENFORCEMENT POLICY for this operation — the rule describing how the organization will make sure the operation is actually followed. Respond with JSON:
{ "title": "short policy title (max 120 chars)", "body": "the policy text with these labeled sections, each 1-3 sentences:\nPurpose: …\nResponsible role: …\nMonitoring: … (how and how often compliance is checked)\nTraining & communication: …\nConsequences: … (what happens on non-compliance)\nEffective date: upon adoption" }`;

    let draft: any;
    try {
      const completion = await openai.chat.completions.create(
        {
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.2,
          max_tokens: 1024,
        },
        // Kept under the serverless request deadline (30s on Vercel).
        { timeout: 25_000, maxRetries: 0 },
      );
      draft = JSON.parse(completion.choices[0].message.content || "{}");
      if (!draft.title || !draft.body) throw new Error("AI returned an incomplete policy draft");
    } catch (aiErr: any) {
      return res.status(502).json({ message: friendlyOpenAIError(aiErr), retryable: true });
    }
    res.json({
      title: String(draft.title).slice(0, MAX_POLICY_TITLE),
      body: String(draft.body).slice(0, MAX_POLICY_BODY),
      manualId: approval.manual_id,
      revision: Number(approval.revision),
    });
  } catch (err) {
    console.error("Draft policy error:", err);
    res.status(500).json({ message: "Failed to draft the enforcement policy" });
  }
});

// POST /items/:id/policies — save an (edited) enforcement policy for an item.
router.post("/items/:id/policies", isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const [item] = await db.execute(sql`
      SELECT id FROM bccs_checklist_report_items
      WHERE id = ${req.params.id} AND organization_id = ${orgId}
    `).then((r: any) => r.rows);
    if (!item) return res.status(404).json({ message: "Checklist item not found" });
    const title = String(req.body?.title || "").trim();
    const body = String(req.body?.body || "").trim();
    const status = String(req.body?.status || "draft");
    if (!title || !body) return res.status(400).json({ message: "The policy needs both a title and a body." });
    if (title.length > MAX_POLICY_TITLE || body.length > MAX_POLICY_BODY) {
      return res.status(400).json({ message: `The policy is too long (title max ${MAX_POLICY_TITLE} chars, body max ${MAX_POLICY_BODY}).` });
    }
    if (!POLICY_STATUSES.has(status)) return res.status(400).json({ message: "Policy status must be draft or adopted." });
    // Policies enforce approved operations — without an approval there is
    // nothing to enforce, and the policy would lack manual/revision provenance.
    const approval = await latestApproval(orgId, item.id);
    if (!approval) return res.status(409).json({ message: "Approve an operation into the manual first — policies enforce approved operations." });
    const actor = req.user?.email || req.user?.id || "system";
    const [policy] = await db.execute(sql`
      INSERT INTO bccs_checklist_policies (organization_id, item_id, manual_id, revision, title, body, status, created_by, manual_filename)
      VALUES (${orgId}, ${item.id}, ${approval.manual_id}, ${Number(approval.revision)}, ${title}, ${body}, ${status}, ${actor}, ${approval.manual_filename || null})
      RETURNING id, item_id, manual_id, revision, title, body, status, created_by, created_at, updated_at
    `).then((r: any) => r.rows);
    res.status(201).json({ policy });
  } catch (err) {
    console.error("Save policy error:", err);
    res.status(500).json({ message: "Failed to save the policy" });
  }
});

// GET /policies — all enforcement policies for the org, with item context.
router.get("/policies", isAuthenticated, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const policies = await db.execute(sql`
      SELECT p.id, p.item_id, p.manual_id, p.revision, p.title, p.body, p.status,
             p.created_by, p.created_at, p.updated_at,
             i.item_number, i.description AS item_description,
             COALESCE(m.filename, p.manual_filename) AS manual_filename,
             (m.id IS NULL AND p.manual_id IS NOT NULL) AS manual_deleted
      FROM bccs_checklist_policies p
      LEFT JOIN bccs_checklist_report_items i ON i.id = p.item_id AND i.organization_id = p.organization_id
      LEFT JOIN bccs_ops_manuals m ON m.id = p.manual_id AND m.organization_id = p.organization_id
      WHERE p.organization_id = ${orgId}
      ORDER BY p.created_at DESC
    `).then((r: any) => r.rows);
    res.json({ policies });
  } catch (err) {
    console.error("List policies error:", err);
    res.status(500).json({ message: "Failed to load policies" });
  }
});

// PUT /policies/:id — edit title/body or change status (draft ↔ adopted).
router.put("/policies/:id", isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const [existing] = await db.execute(sql`
      SELECT id, title, body, status FROM bccs_checklist_policies
      WHERE id = ${req.params.id} AND organization_id = ${orgId}
    `).then((r: any) => r.rows);
    if (!existing) return res.status(404).json({ message: "Policy not found" });
    const title = req.body?.title !== undefined ? String(req.body.title).trim() : existing.title;
    const body = req.body?.body !== undefined ? String(req.body.body).trim() : existing.body;
    const status = req.body?.status !== undefined ? String(req.body.status) : existing.status;
    if (!title || !body) return res.status(400).json({ message: "The policy needs both a title and a body." });
    if (title.length > MAX_POLICY_TITLE || body.length > MAX_POLICY_BODY) {
      return res.status(400).json({ message: `The policy is too long (title max ${MAX_POLICY_TITLE} chars, body max ${MAX_POLICY_BODY}).` });
    }
    if (!POLICY_STATUSES.has(status)) return res.status(400).json({ message: "Policy status must be draft or adopted." });
    const [policy] = await db.execute(sql`
      UPDATE bccs_checklist_policies
      SET title = ${title}, body = ${body}, status = ${status}, updated_at = NOW()
      WHERE id = ${req.params.id} AND organization_id = ${orgId}
      RETURNING id, item_id, manual_id, revision, title, body, status, created_by, created_at, updated_at
    `).then((r: any) => r.rows);
    res.json({ policy });
  } catch (err) {
    console.error("Update policy error:", err);
    res.status(500).json({ message: "Failed to update the policy" });
  }
});

// DELETE /policies/:id — remove a policy.
router.delete("/policies/:id", isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const deleted = await db.execute(sql`
      DELETE FROM bccs_checklist_policies WHERE id = ${req.params.id} AND organization_id = ${orgId}
      RETURNING id
    `).then((r: any) => r.rows);
    if (!deleted.length) return res.status(404).json({ message: "Policy not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete policy error:", err);
    res.status(500).json({ message: "Failed to delete the policy" });
  }
});

// PUT /items/:id — update a single item's status/comments/findings
router.put("/items/:id", isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const { status, comments, findings } = req.body;
    const allowed = ["compliant", "non-compliant", "pending", "not-applicable"];
    if (status !== undefined && !allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const result = await db.execute(sql`
      UPDATE bccs_checklist_report_items SET
        status = COALESCE(${status ?? null}, status),
        comments = COALESCE(${comments ?? null}, comments),
        findings = COALESCE(${findings ?? null}, findings),
        updated_at = NOW()
      WHERE id = ${req.params.id} AND organization_id = ${orgId}
      RETURNING id
    `);
    if (((result as any).rows || []).length === 0) return res.status(404).json({ message: "Item not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("Checklist item update error:", err);
    res.status(500).json({ message: "Failed to update item" });
  }
});

// ── Evidence attachments ─────────────────────────────────────────────────────

const EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;
const EVIDENCE_MAX_PER_ITEM = 10;
const EVIDENCE_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

const evidenceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: EVIDENCE_MAX_BYTES },
});

// POST /items/:id/evidence — attach a PDF or image to a checklist item
router.post("/items/:id/evidence", isAuthenticated, requireAdmin, evidenceUpload.single("file"), async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const ext = path.extname(req.file.originalname).toLowerCase();
    const contentType = EVIDENCE_TYPES[ext];
    if (!contentType) {
      return res.status(400).json({ message: "Unsupported file type. Please upload a PDF or image (PNG, JPG, GIF, WebP)." });
    }
    // Item must belong to the caller's org
    const [item] = await db.execute(sql`
      SELECT id FROM bccs_checklist_report_items
      WHERE id = ${req.params.id} AND organization_id = ${orgId}
    `).then((r: any) => r.rows);
    if (!item) return res.status(404).json({ message: "Checklist item not found" });
    const [{ count }] = await db.execute(sql`
      SELECT COUNT(*)::int AS count FROM bccs_checklist_evidence
      WHERE organization_id = ${orgId} AND item_id = ${item.id}
    `).then((r: any) => r.rows);
    if (Number(count) >= EVIDENCE_MAX_PER_ITEM) {
      return res.status(400).json({ message: `Each checklist item can hold at most ${EVIDENCE_MAX_PER_ITEM} evidence files.` });
    }
    const [row] = await db.execute(sql`
      INSERT INTO bccs_checklist_evidence (organization_id, item_id, filename, content_type, size_bytes, data, uploaded_by)
      VALUES (${orgId}, ${item.id}, ${req.file.originalname}, ${contentType}, ${req.file.size}, ${req.file.buffer}, ${req.user?.email || req.user?.id || "system"})
      RETURNING id, item_id, filename, content_type, size_bytes, uploaded_by, uploaded_at
    `).then((r: any) => r.rows);
    res.status(201).json({
      id: row.id,
      filename: row.filename,
      contentType: row.content_type,
      sizeBytes: Number(row.size_bytes),
      uploadedBy: row.uploaded_by,
      uploadedAt: row.uploaded_at,
    });
  } catch (err) {
    console.error("Evidence upload error:", err);
    res.status(500).json({ message: "Failed to upload evidence file" });
  }
});

// GET /evidence/:id/file — download/view an evidence file (org-scoped)
router.get("/evidence/:id/file", isAuthenticated, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const [row] = await db.execute(sql`
      SELECT filename, content_type, data FROM bccs_checklist_evidence
      WHERE id = ${req.params.id} AND organization_id = ${orgId}
    `).then((r: any) => r.rows);
    if (!row) return res.status(404).json({ message: "Evidence file not found" });
    res.setHeader("Content-Type", row.content_type);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(row.filename)}"`);
    res.send(Buffer.from(row.data));
  } catch (err) {
    console.error("Evidence download error:", err);
    res.status(500).json({ message: "Failed to load evidence file" });
  }
});

// DELETE /evidence/:id — remove an evidence file (org-scoped)
router.delete("/evidence/:id", isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const result = await db.execute(sql`
      DELETE FROM bccs_checklist_evidence
      WHERE id = ${req.params.id} AND organization_id = ${orgId}
      RETURNING id
    `);
    if (((result as any).rows || []).length === 0) return res.status(404).json({ message: "Evidence file not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("Evidence delete error:", err);
    res.status(500).json({ message: "Failed to delete evidence file" });
  }
});

// ── Import / reset ───────────────────────────────────────────────────────────

/** Validate import bounds. Returns a user-facing error message, or null when OK. */
function importBoundsError(items: ImportedItem[]): string | null {
  if (items.length === 0) return "No checklist items could be parsed";
  if (items.length > MAX_IMPORT_ITEMS) {
    return `Too many items (${items.length}). The maximum is ${MAX_IMPORT_ITEMS}.`;
  }
  const distinctAreas = new Set(items.map((it) => it.areaName));
  if (distinctAreas.size > MAX_IMPORT_AREAS) {
    return `Too many areas (${distinctAreas.size}). The maximum is ${MAX_IMPORT_AREAS}.`;
  }
  // Item numbers must be unique within an area (DB unique index) — reject up
  // front with a clear message instead of failing the insert transaction.
  const seen = new Set<string>();
  for (const it of items) {
    const key = `${it.areaName}\u0000${it.number}`;
    if (seen.has(key)) {
      return `Duplicate item number "${it.number}" in area "${it.areaName}". Item numbers must be unique within an area (this can happen when combining files — give items distinct numbers or areas).`;
    }
    seen.add(key);
  }
  return null;
}

/** Validate bounds and transactionally replace the org checklist. Sends the
 * error response and returns null on failure; returns the item count on success. */
async function replaceChecklist(orgId: string, items: ImportedItem[], res: any): Promise<number | null> {
  const boundsError = importBoundsError(items);
  if (boundsError) {
    res.status(400).json({ message: boundsError });
    return null;
  }
  await db.transaction(async (tx) => {
    await tx.execute(sql`DELETE FROM bccs_checklist_ai_findings WHERE organization_id = ${orgId}`);
    await tx.execute(sql`DELETE FROM bccs_checklist_area_coverage WHERE organization_id = ${orgId}`);
    await tx.execute(sql`DELETE FROM bccs_checklist_evidence WHERE organization_id = ${orgId}`);
    await tx.execute(sql`DELETE FROM bccs_checklist_review_runs WHERE organization_id = ${orgId}`);
    await tx.execute(sql`DELETE FROM bccs_checklist_report_items WHERE organization_id = ${orgId}`);
    const areaIds = new Map<string, string>();
    let order = 0;
    for (const it of items) {
      if (!areaIds.has(it.areaName)) areaIds.set(it.areaName, `import-${areaIds.size + 1}`);
      order++;
      await tx.execute(sql`
        INSERT INTO bccs_checklist_report_items
          (organization_id, area_id, area_name, area_description, item_number, description, reference, item_order)
        VALUES (${orgId}, ${areaIds.get(it.areaName)}, ${it.areaName}, ${""}, ${it.number}, ${it.description}, ${it.reference}, ${order})
      `);
    }
  });
  return items.length;
}

// POST /import — replace the org checklist from pasted/uploaded text.
// Line format: number | description | reference | area name
// Two-phase like /import-file: without `confirm: true` in the body the text
// is parsed only (no DB writes) and a preview summary is returned; the client
// then re-submits the same text with confirm: true to perform the
// destructive replace. Bounds are enforced identically in both phases.
router.post("/import", isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const { text } = req.body;
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ message: "Checklist text is required" });
    }
    const lines = text.split("\n").map((l: string) => l.trim()).filter(Boolean);
    const items = lines.map((line: string, i: number) => {
      const parts = line.split("|").map((p) => p.trim());
      return {
        number: parts[0] || `ITEM-${i + 1}`,
        description: parts[1] || line,
        reference: parts[2] || "",
        areaName: parts[3] || "Imported Checklist",
      };
    }).filter((it) => it.description);
    if (req.body?.confirm !== true) {
      // Parse-only preview: same bounds as the real import so text that
      // would be rejected is rejected up front, before the admin confirms.
      const boundsError = importBoundsError(items);
      if (boundsError) return res.status(400).json({ message: boundsError });
      const areaOrder: string[] = [];
      const areaCounts = new Map<string, number>();
      for (const it of items) {
        if (!areaCounts.has(it.areaName)) areaOrder.push(it.areaName);
        areaCounts.set(it.areaName, (areaCounts.get(it.areaName) || 0) + 1);
      }
      return res.json({
        preview: true,
        itemCount: items.length,
        areas: areaOrder.map((name) => ({ name, itemCount: areaCounts.get(name) })),
      });
    }
    const imported = await replaceChecklist(orgId, items, res);
    if (imported === null) return;
    res.json({ success: true, imported });
  } catch (err) {
    console.error("Checklist import error:", err);
    res.status(500).json({ message: "Failed to import checklist" });
  }
});

// POST /import-file — replace the org checklist from one or more Excel/CSV
// uploads. Files can be sent as a single `file` field or a multi-file `files`
// field; parsed items are combined in file order.
// Two-phase: without a `confirm=true` form field the files are parsed only
// (no DB writes) and a preview summary is returned; the client then
// re-uploads the same files with confirm=true to perform the destructive
// replace. Bounds are enforced identically in both phases.
router.post(
  "/import-file",
  isAuthenticated,
  requireAdmin,
  upload.fields([{ name: "file", maxCount: 1 }, { name: "files", maxCount: MAX_IMPORT_FILES }]),
  async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const uploads: Express.Multer.File[] = [
      ...((req.files?.file as any[]) || []),
      ...((req.files?.files as any[]) || []),
    ];
    if (uploads.length === 0) return res.status(400).json({ message: "No file uploaded" });
    if (uploads.length > MAX_IMPORT_FILES) {
      return res.status(400).json({ message: `Too many files (${uploads.length}). The maximum is ${MAX_IMPORT_FILES} per import.` });
    }
    for (const f of uploads) {
      const ext = path.extname(f.originalname).toLowerCase();
      // Legacy binary .xls is parsed via SheetJS (converted to .xlsx in-memory)
      // inside parseChecklistWorkbook.
      if (![".xlsx", ".xls", ".csv"].includes(ext)) {
        return res.status(400).json({ message: `${f.originalname}: unsupported file type. Please upload Excel (.xlsx or .xls) or CSV files.` });
      }
    }

    // Parse every file; collect per-file errors so the admin sees exactly
    // which file failed. Nothing is imported unless every file parses.
    const multiFile = uploads.length > 1;
    const items: ImportedItem[] = [];
    const skippedSheets: string[] = [];
    const fileSummaries: { name: string; itemCount: number }[] = [];
    const parseErrors: string[] = [];
    for (const f of uploads) {
      try {
        const parsed = await parseChecklistWorkbook(f.buffer, f.originalname, {
          // With several files, a sheet without an Area column becomes an
          // area named after its file so files don't silently merge.
          defaultAreaName: multiFile ? path.basename(f.originalname, path.extname(f.originalname)) : undefined,
          itemNumberOffset: items.length,
        });
        items.push(...parsed.items);
        fileSummaries.push({ name: f.originalname, itemCount: parsed.items.length });
        skippedSheets.push(...parsed.skippedSheets.map((s) => (multiFile ? `${f.originalname}: ${s}` : s)));
      } catch (parseErr: any) {
        parseErrors.push(multiFile ? `${f.originalname}: ${parseErr.message}` : parseErr.message);
      }
    }
    if (parseErrors.length > 0) {
      return res.status(422).json({ message: parseErrors.join(" ") });
    }
    if (req.body?.confirm !== "true") {
      // Parse-only preview: same bounds as the real import so a file that
      // would be rejected is rejected up front, before the admin confirms.
      const boundsError = importBoundsError(items);
      if (boundsError) return res.status(400).json({ message: boundsError });
      const areaOrder: string[] = [];
      const areaCounts = new Map<string, number>();
      for (const it of items) {
        if (!areaCounts.has(it.areaName)) areaOrder.push(it.areaName);
        areaCounts.set(it.areaName, (areaCounts.get(it.areaName) || 0) + 1);
      }
      return res.json({
        preview: true,
        itemCount: items.length,
        areas: areaOrder.map((name) => ({ name, itemCount: areaCounts.get(name) })),
        skippedSheets,
        files: fileSummaries,
      });
    }
    const imported = await replaceChecklist(orgId, items, res);
    if (imported === null) return;
    res.json({ success: true, imported, skippedSheets, files: fileSummaries });
  } catch (err) {
    console.error("Checklist Excel import error:", err);
    res.status(500).json({ message: "Failed to import checklist file" });
  }
});

// GET /export.xlsx — download the auditor report as an Excel workbook
router.get("/export.xlsx", isAuthenticated, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const rows = await db.execute(sql`
      SELECT * FROM bccs_checklist_report_items WHERE organization_id = ${orgId}
      ORDER BY area_id, item_order
    `).then((r: any) => r.rows);
    if (rows.length === 0) return res.status(404).json({ message: "No checklist items to export" });
    const manuals = await getOrgManuals(orgId);
    const manualIds = manuals.map(manualToken);
    const currentHash = manualSetHash(manualIds);
    const findings = await db.execute(sql`
      SELECT DISTINCT ON (item_id) item_id, manual_id, manual_set_hash, verdict, excerpt, remediation, suggested_operation
      FROM bccs_checklist_ai_findings WHERE organization_id = ${orgId}
      ORDER BY item_id, reviewed_at DESC
    `).then((r: any) => r.rows);
    const findingByItem: Record<string, any> = {};
    for (const f of findings) findingByItem[f.item_id] = f;
    const evidenceCounts = await db.execute(sql`
      SELECT item_id, COUNT(*)::int AS count FROM bccs_checklist_evidence
      WHERE organization_id = ${orgId} GROUP BY item_id
    `).then((r: any) => r.rows);
    const evidenceByItem: Record<string, number> = {};
    for (const e of evidenceCounts) evidenceByItem[e.item_id] = Number(e.count);
    const [org] = await db.execute(sql`
      SELECT organization_name, certificate_number, regulatory_authority
      FROM training_organizations WHERE id = ${orgId}
    `).then((r: any) => r.rows);

    const areas: any[] = [];
    for (const row of rows) {
      let area = areas.find((a) => a.id === row.area_id);
      if (!area) {
        area = { id: row.area_id, name: row.area_name, description: row.area_description || "", items: [] };
        areas.push(area);
      }
      const f = findingByItem[row.id];
      area.items.push({
        number: row.item_number,
        description: row.description,
        reference: row.reference || "",
        status: row.status || "pending",
        comments: row.comments || "",
        findings: row.findings || "",
        aiVerdict: f?.verdict || null,
        aiExcerpt: f?.excerpt || null,
        aiRemediation: f?.remediation || null,
        aiSuggestedOperation: f?.suggested_operation || null,
        aiStale: f ? isFindingStale(f, manualIds, currentHash) : false,
        evidenceCount: evidenceByItem[row.id] || 0,
      });
    }

    const policyRows = await db.execute(sql`
      SELECT p.title, p.body, p.status, p.revision, p.created_by, p.created_at,
             i.item_number, COALESCE(m.filename, p.manual_filename) AS manual_filename
      FROM bccs_checklist_policies p
      LEFT JOIN bccs_checklist_report_items i ON i.id = p.item_id AND i.organization_id = p.organization_id
      LEFT JOIN bccs_ops_manuals m ON m.id = p.manual_id AND m.organization_id = p.organization_id
      WHERE p.organization_id = ${orgId}
      ORDER BY p.created_at DESC
    `).then((r: any) => r.rows);

    const buffer = await buildChecklistWorkbook({
      areas,
      organization: org
        ? { name: org.organization_name, certificateNumber: org.certificate_number, regulatoryAuthority: org.regulatory_authority }
        : null,
      manuals: manuals.map((m: any) => ({ filename: m.filename, uploadedAt: m.uploaded_at })),
      policies: policyRows.map((p: any) => ({
        title: p.title,
        body: p.body,
        status: p.status,
        itemNumber: p.item_number || null,
        manualFilename: p.manual_filename || null,
        revision: p.revision != null ? Number(p.revision) : null,
        createdBy: p.created_by || null,
        createdAt: p.created_at || null,
      })),
    });
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="part-checklist-report-${date}.xlsx"`);
    res.send(buffer);
  } catch (err) {
    console.error("Checklist Excel export error:", err);
    res.status(500).json({ message: "Failed to export the Excel report" });
  }
});

// POST /reset — restore the built-in Part 142 checklist
router.post("/reset", isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    await db.execute(sql`DELETE FROM bccs_checklist_ai_findings WHERE organization_id = ${orgId}`);
    await db.execute(sql`DELETE FROM bccs_checklist_area_coverage WHERE organization_id = ${orgId}`);
    await db.execute(sql`DELETE FROM bccs_checklist_evidence WHERE organization_id = ${orgId}`);
    await db.execute(sql`DELETE FROM bccs_checklist_review_runs WHERE organization_id = ${orgId}`);
    await db.execute(sql`DELETE FROM bccs_checklist_report_items WHERE organization_id = ${orgId}`);
    await seedChecklist(orgId);
    res.json({ success: true });
  } catch (err) {
    console.error("Checklist reset error:", err);
    res.status(500).json({ message: "Failed to reset checklist" });
  }
});

// ── Operations manual upload & extraction ────────────────────────────────────

export async function extractText(filename: string, buffer: Buffer): Promise<string> {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".txt") return buffer.toString("utf8");
  const tmp = path.join(os.tmpdir(), `manual-${crypto.randomBytes(6).toString("hex")}${ext}`);
  fs.writeFileSync(tmp, buffer);
  try {
    if (ext === ".pdf") {
      const { processDocumentOCR } = await import("../services/ocr");
      return await processDocumentOCR(tmp);
    }
    if (ext === ".xlsx" || ext === ".xls" || ext === ".csv") {
      const { extractWorkbookText } = await import("../services/checklist-excel");
      return await extractWorkbookText(buffer, filename);
    }
    if (ext === ".docx") {
      // .docx is a zip; pull the main document XML in-process (no external
      // `unzip` binary — it is unavailable on serverless hosts) and strip tags.
      const JSZip = (await import("jszip")).default;
      let xml: string | undefined;
      try {
        const zip = await JSZip.loadAsync(buffer);
        xml = await zip.file("word/document.xml")?.async("string");
      } catch {
        throw new Error("This file could not be read as a Word (.docx) document.");
      }
      if (!xml) throw new Error("This file could not be read as a Word (.docx) document.");
      return xml
        .replace(/<w:p[ >]/g, "\n<w:p ")
        .replace(/<[^>]+>/g, "")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }
    throw new Error("Unsupported file type. Please upload a PDF, Word (.docx), spreadsheet (.xlsx/.xls/.csv), or plain-text file.");
  } finally {
    fs.unlinkSync(tmp);
  }
}

// POST /manual — upload one or more documents. Documents are ADDED to the
// org's manual set (up to MAX_MANUALS); remove individual documents with
// DELETE /manual/:id. Accepts a single `file` field (legacy) or a
// multi-file `files` field. Nothing is stored unless every file extracts.
router.post(
  "/manual",
  isAuthenticated,
  requireAdmin,
  upload.fields([{ name: "file", maxCount: 1 }, { name: "files", maxCount: MAX_MANUALS }]),
  async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const uploads: Express.Multer.File[] = [
      ...((req.files?.file as any[]) || []),
      ...((req.files?.files as any[]) || []),
    ];
    if (uploads.length === 0) return res.status(400).json({ message: "No file uploaded" });
    const [{ count: existing }] = await db.execute(sql`
      SELECT COUNT(*)::int AS count FROM bccs_ops_manuals WHERE organization_id = ${orgId}
    `).then((r: any) => r.rows);
    if (Number(existing) + uploads.length > MAX_MANUALS) {
      return res.status(400).json({
        message: `An organization can keep at most ${MAX_MANUALS} operations-manual documents (${existing} already on file). Remove a document before adding more.`,
      });
    }
    const multiFile = uploads.length > 1;
    for (const f of uploads) {
      const ext = path.extname(f.originalname).toLowerCase();
      if (![".pdf", ".docx", ".txt", ".xlsx", ".xls", ".csv"].includes(ext)) {
        return res.status(400).json({ message: `${f.originalname}: unsupported file type. Please upload PDF, Word (.docx), spreadsheet (.xlsx/.xls/.csv), or plain-text files.` });
      }
    }

    // Extract every file first — per-file errors, nothing stored on failure.
    const extracted: { file: Express.Multer.File; text: string }[] = [];
    const errors: string[] = [];
    for (const f of uploads) {
      try {
        const text = await extractText(f.originalname, f.buffer);
        if (!text || text.trim().length < 200) {
          throw new Error("Very little text could be extracted from this document. Please upload a text-based PDF or Word document.");
        }
        extracted.push({ file: f, text });
      } catch (extractErr: any) {
        errors.push(`${multiFile ? `${f.originalname}: ` : ""}Could not read the document: ${extractErr.message}`);
      }
    }
    if (errors.length > 0) return res.status(422).json({ message: errors.join(" ") });

    const inserted = await db.transaction(async (tx) => {
      const rows: any[] = [];
      for (const { file, text } of extracted) {
        const actor = req.user?.email || req.user?.id || "system";
        const [row] = await tx.execute(sql`
          INSERT INTO bccs_ops_manuals (organization_id, filename, extracted_text, text_chars, uploaded_by)
          VALUES (${orgId}, ${file.originalname}, ${text}, ${text.length}, ${actor})
          RETURNING id, filename, text_chars, revision, uploaded_by, uploaded_at
        `).then((r: any) => r.rows);
        await tx.execute(sql`
          INSERT INTO bccs_ops_manual_revisions (organization_id, manual_id, revision, extracted_text, text_chars, change_summary, changed_by)
          VALUES (${orgId}, ${row.id}, 1, ${text}, ${text.length}, 'Initial upload', ${actor})
        `);
        rows.push(row);
      }
      return rows;
    });
    await invalidateFedconAudits(orgId);
    res.status(201).json({ manuals: inserted });
  } catch (err) {
    console.error("Manual upload error:", err);
    res.status(500).json({ message: "Failed to upload the operations manual" });
  }
});

// DELETE /manual/:id — remove one manual document (org-scoped)
router.delete("/manual/:id", isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const deleted = await db.transaction(async (tx) => {
      const result = await tx.execute(sql`
        DELETE FROM bccs_ops_manuals
        WHERE id = ${req.params.id} AND organization_id = ${orgId}
        RETURNING id
      `);
      if (((result as any).rows || []).length === 0) return false;
      await tx.execute(sql`
        DELETE FROM bccs_ops_manual_revisions
        WHERE manual_id = ${req.params.id} AND organization_id = ${orgId}
      `);
      return true;
    });
    if (!deleted) return res.status(404).json({ message: "Manual document not found" });
    await invalidateFedconAudits(orgId);
    res.json({ success: true });
  } catch (err) {
    console.error("Manual delete error:", err);
    res.status(500).json({ message: "Failed to remove the manual document" });
  }
});

// GET /manual/:id/revisions — revision history of one manual (org-scoped)
router.get("/manual/:id/revisions", isAuthenticated, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const [manual] = await db.execute(sql`
      SELECT id, filename, revision FROM bccs_ops_manuals
      WHERE id = ${req.params.id} AND organization_id = ${orgId}
    `).then((r: any) => r.rows);
    if (!manual) return res.status(404).json({ message: "Manual document not found" });
    const revisions = await db.execute(sql`
      SELECT revision, text_chars, change_summary, changed_by, created_at
      FROM bccs_ops_manual_revisions
      WHERE manual_id = ${req.params.id} AND organization_id = ${orgId}
      ORDER BY revision DESC
    `).then((r: any) => r.rows);
    res.json({ manual, revisions });
  } catch (err) {
    console.error("Manual revisions error:", err);
    res.status(500).json({ message: "Failed to load the revision history" });
  }
});

function escHtml(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// GET /manual/:id/export — printable HTML of the manual's current revision.
// HTML rather than server-side PDF (no external binaries, Vercel-safe); the
// browser's Print → Save as PDF gives users a portable file. Originals are
// stored as extracted text, so this is a formatted rendering of that text.
router.get("/manual/:id/export", isAuthenticated, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const [manual] = await db.execute(sql`
      SELECT id, filename, extracted_text, text_chars, revision, uploaded_by, uploaded_at
      FROM bccs_ops_manuals
      WHERE id = ${req.params.id} AND organization_id = ${orgId}
    `).then((r: any) => r.rows);
    if (!manual) return res.status(404).json({ message: "Manual document not found" });
    const [latest] = await db.execute(sql`
      SELECT change_summary, changed_by, created_at FROM bccs_ops_manual_revisions
      WHERE manual_id = ${manual.id} AND organization_id = ${orgId}
      ORDER BY revision DESC LIMIT 1
    `).then((r: any) => r.rows);
    const revDate = latest?.created_at || manual.uploaded_at;
    const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escHtml(manual.filename)} — Revision ${escHtml(manual.revision)}</title>
<style>
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; max-width: 860px; margin: 32px auto; padding: 0 20px; font-size: 14px; line-height: 1.6; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .meta { color: #475569; font-size: 13px; margin: 2px 0 0; }
  .rev { display: inline-block; padding: 2px 10px; border-radius: 999px; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; font-weight: 600; font-size: 12px; }
  .note, .print-hint { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; font-size: 12px; color: #64748b; margin: 16px 0; }
  pre { white-space: pre-wrap; word-wrap: break-word; font-family: inherit; font-size: 14px; margin-top: 16px; }
  .footer { margin-top: 32px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  @media print { .print-hint { display: none; } body { margin: 0; } }
</style></head><body>
<h1>${escHtml(manual.filename)}</h1>
<p class="meta"><span class="rev">Revision ${escHtml(manual.revision)}</span> &nbsp; ${escHtml(revDate ? new Date(revDate).toISOString().slice(0, 10) : "")}${latest?.changed_by ? ` · ${escHtml(latest.changed_by)}` : ""}${latest?.change_summary ? ` · ${escHtml(latest.change_summary)}` : ""}</p>
<div class="note">This document is a formatted rendering of the text extracted from the uploaded manual (not the original file).</div>
<div class="print-hint">Use your browser's Print → “Save as PDF” to keep a portable copy of this document.</div>
<pre>${escHtml(manual.extracted_text)}</pre>
<div class="footer">Exported ${escHtml(new Date().toISOString().slice(0, 16).replace("T", " "))} UTC · Operations Manual · Revision ${escHtml(manual.revision)}</div>
</body></html>`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.send(html);
  } catch (err) {
    console.error("Manual export error:", err);
    res.status(500).json({ message: "Failed to export the manual" });
  }
});

// GET /manual — all manual documents + review status
router.get("/manual", isAuthenticated, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const manuals = await getOrgManuals(orgId);
    // `manual` kept as the newest document for backward compatibility.
    if (manuals.length === 0) return res.json({ manuals: [], manual: null, lastReviewAt: null, reviewStale: false });
    const manualIds = manuals.map(manualToken);
    const currentHash = manualSetHash(manualIds);
    const findings = await db.execute(sql`
      SELECT manual_id, manual_set_hash, reviewed_at
      FROM bccs_checklist_ai_findings WHERE organization_id = ${orgId}
    `).then((r: any) => r.rows);
    let lastReviewAt: any = null;
    let reviewStale = false;
    for (const f of findings) {
      if (!lastReviewAt || new Date(f.reviewed_at) > new Date(lastReviewAt)) lastReviewAt = f.reviewed_at;
      if (isFindingStale(f, manualIds, currentHash)) reviewStale = true;
    }
    const totalChars = manuals.reduce((s: number, m: any) => s + (Number(m.text_chars) || 0), 0);
    res.json({ manuals, manual: manuals[0], lastReviewAt, reviewStale, totalChars, promptCoverage: promptCoverage(totalChars) });
  } catch (err) {
    console.error("Manual status error:", err);
    res.status(500).json({ message: "Failed to load manual status" });
  }
});

// ── AI review ────────────────────────────────────────────────────────────────

// POST /review/:areaId — AI-review one checklist area against the manual
router.post("/review/:areaId", isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const manuals = await getOrgManuals(orgId, true);
    if (manuals.length === 0) return res.status(400).json({ message: "Upload an operations manual first" });
    const currentHash = manualSetHash(manuals.map(manualToken));

    const items = await db.execute(sql`
      SELECT id, item_number, description, reference FROM bccs_checklist_report_items
      WHERE organization_id = ${orgId} AND area_id = ${req.params.areaId}
      ORDER BY item_order
    `).then((r: any) => r.rows);
    if (items.length === 0) return res.status(404).json({ message: "Checklist area not found" });

    // Combined content of every manual document — each chunk stays within a
    // single document, and selectExcerpts caps total prompt content regardless
    // of how many documents are on file.
    const chunkEntries = manuals.flatMap((m: any) =>
      chunkText(m.extracted_text).map((c: string) => ({ text: c, source: m.filename as string }))
    );
    // Raw extracted text of all documents — the same accounting basis as the
    // stored text_chars totals and the /manual promptCoverage warning.
    // Filename labels are added outside this budget when the prompt is built.
    const totalManualChars = chunkEntries.reduce((s, e) => s + e.text.length, 0);
    // Least measured coverage across this area's batches — what the client
    // reports as "how much of the manual set was consulted".
    let minSelectedSourceChars = totalManualChars;

    // Review the area in bounded batches — one OpenAI call per batch of items,
    // each with a capped excerpt budget, so prompt and completion sizes stay
    // within the model limits regardless of manual or checklist size.
    const validVerdicts = new Set(["covered", "partial", "not_addressed"]);
    const byItem = new Map<string, any>();
    for (const batch of batchItems(items)) {
      const { excerpts, selectedSourceChars } = selectExcerpts(chunkEntries, batch.map((i: any) => i.description));
      minSelectedSourceChars = Math.min(minSelectedSourceChars, selectedSourceChars);

      const prompt = `You are an FAA Part 142 compliance auditor. Review the following excerpts from a training center's operations manual and evaluate whether each checklist item is addressed by the manual.

OPERATIONS MANUAL EXCERPTS (most relevant sections):
${excerpts.map((e, i) => `--- Excerpt ${i + 1} (from ${e.source}) ---\n${e.text}`).join("\n\n")}

CHECKLIST ITEMS:
${batch.map((it: any) => `[${it.id}] (${it.item_number}, ref ${it.reference || "n/a"}) ${it.description}`).join("\n")}

For EACH checklist item, respond with:
- "itemId": the exact bracketed id
- "verdict": one of "covered" (manual clearly addresses it), "partial" (mentioned but incomplete/unclear), "not_addressed" (nothing relevant in the excerpts)
- "excerpt": a short direct quote (max 300 chars) from the manual supporting the verdict, or empty string if not_addressed
- "remediation": for partial/not_addressed, one concise sentence describing what the manual should add; empty string if covered
- "suggestedOperation": for partial/not_addressed, 3-6 sentences of concrete, ready-to-insert operations-manual language that would satisfy this requirement — written in the manual's own voice (procedure steps, who is responsible, what records are kept), NOT advice about what to fix; empty string if covered

Respond with JSON: { "findings": [ ... one object per checklist item ... ] }`;

      let findings: any[];
      try {
        const completion = await openai.chat.completions.create(
          {
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.1,
            max_tokens: 4096,
          },
          { timeout: 90_000, maxRetries: 1 },
        );
        const parsed = JSON.parse(completion.choices[0].message.content || "{}");
        findings = parsed.findings || (Object.values(parsed).find((v) => Array.isArray(v)) as any[]) || [];
        if (!Array.isArray(findings) || findings.length === 0) throw new Error("AI returned no findings");
      } catch (aiErr: any) {
        return res.status(502).json({ message: friendlyOpenAIError(aiErr) });
      }

      for (const f of findings) {
        const itemId = String(f.itemId || "").replace(/[\[\]]/g, "");
        if (validVerdicts.has(f.verdict)) byItem.set(itemId, f);
      }
    }

    // Require exactly one valid finding per checklist item — a partial or
    // malformed AI response must not silently leave stale/missing findings.
    const missing = items.filter((i: any) => !byItem.has(i.id));
    if (missing.length > 0) {
      return res.status(502).json({
        message: `The AI response was incomplete for this area (${missing.length} of ${items.length} items missing a verdict). Please run the review again.`,
      });
    }

    // Atomically replace this area's findings with the validated set.
    await db.transaction(async (tx) => {
      for (const item of items) {
        const f = byItem.get(item.id);
        await tx.execute(sql`
          INSERT INTO bccs_checklist_ai_findings (organization_id, item_id, manual_id, manual_set_hash, verdict, excerpt, remediation, suggested_operation)
          VALUES (${orgId}, ${item.id}, ${manuals[0].id}, ${currentHash}, ${f.verdict}, ${String(f.excerpt || "").slice(0, 1000)}, ${String(f.remediation || "").slice(0, 1000)}, ${String(f.suggestedOperation || "").slice(0, 4000) || null})
          ON CONFLICT (organization_id, item_id) DO UPDATE SET
            manual_id = EXCLUDED.manual_id,
            manual_set_hash = EXCLUDED.manual_set_hash,
            verdict = EXCLUDED.verdict,
            excerpt = EXCLUDED.excerpt,
            remediation = EXCLUDED.remediation,
            suggested_operation = EXCLUDED.suggested_operation,
            reviewed_at = NOW()
        `);
      }
    });
    // Persist this area's measured coverage so the checklist page can still
    // show the coverage note after a reload, not just in the running session.
    const coverageRatio = totalManualChars > 0 ? Math.min(1, minSelectedSourceChars / totalManualChars) : 1;
    await db.execute(sql`
      INSERT INTO bccs_checklist_area_coverage (organization_id, area_id, total_manual_chars, excerpt_chars, ratio, manual_set_hash)
      VALUES (${orgId}, ${req.params.areaId}, ${totalManualChars}, ${minSelectedSourceChars}, ${coverageRatio}, ${currentHash})
      ON CONFLICT (organization_id, area_id) DO UPDATE SET
        total_manual_chars = EXCLUDED.total_manual_chars,
        excerpt_chars = EXCLUDED.excerpt_chars,
        ratio = EXCLUDED.ratio,
        manual_set_hash = EXCLUDED.manual_set_hash,
        reviewed_at = NOW()
    `);
    res.json({
      success: true,
      areaId: req.params.areaId,
      itemsReviewed: items.length,
      itemsInArea: items.length,
      // How much of the combined manual set a single review prompt consulted
      // for this area — lets the client explain partial coverage.
      // Measured, not theoretical: the least raw source text any of this
      // area's prompts actually included, over the combined raw manual text.
      coverage: {
        totalManualChars,
        excerptChars: minSelectedSourceChars,
        ratio: totalManualChars > 0 ? Math.min(1, minSelectedSourceChars / totalManualChars) : 1,
      },
    });
  } catch (err) {
    console.error("AI review error:", err);
    res.status(500).json({ message: "Failed to run AI review" });
  }
});

// ── Full-coverage (map-reduce) AI review ────────────────────────────────────
// The client drives the review area by area in two phases so every request
// stays within serverless time limits while ALL manual text gets consulted:
//   1. POST /review/:areaId/map { segment } — scans up to MAP_PARALLEL
//      consecutive segments of the combined manual set (each its own AI call)
//      and returns the per-item evidence quotes found in those sections.
//   2. POST /review/:areaId/reduce — compiles the server-stored evidence into
//      final verdicts, one item-batch per request, and persists findings +
//      full coverage after the last batch.
//
// All run state (evidence, progress, manual-set hash) is server-owned in
// bccs_checklist_review_runs: the client can neither fabricate evidence nor
// skip sections, and a manual add/delete mid-run invalidates the run.

/** Read this org+area's review run, normalizing JSONB columns. */
async function getReviewRun(orgId: string, areaId: string): Promise<any | null> {
  const rows = await db.execute(sql`
    SELECT id, manual_set_hash, total_segments, segments_done, evidence, verdicts, batches_done
    FROM bccs_checklist_review_runs
    WHERE organization_id = ${orgId} AND area_id = ${areaId}
  `).then((r: any) => r.rows);
  if (!rows.length) return null;
  const run = rows[0];
  if (typeof run.evidence === "string") run.evidence = JSON.parse(run.evidence);
  if (typeof run.verdicts === "string") run.verdicts = JSON.parse(run.verdicts);
  return run;
}

/** Load the area's items and the segmented manual set — shared by map/reduce. */
type LoadedAreaReview =
  | { error: { status: number; message: string }; manuals?: never; items?: never; segments?: never; totalManualChars?: never }
  | { error?: never; manuals: any[]; items: any[]; segments: { text: string; source: string }[][]; totalManualChars: number };
async function loadAreaForReview(orgId: string, areaId: string): Promise<LoadedAreaReview> {
  const manuals = await getOrgManuals(orgId, true);
  if (manuals.length === 0) return { error: { status: 400, message: "Upload an operations manual first" } } as const;
  const items = await db.execute(sql`
    SELECT id, item_number, description, reference FROM bccs_checklist_report_items
    WHERE organization_id = ${orgId} AND area_id = ${areaId}
    ORDER BY item_order
  `).then((r: any) => r.rows);
  if (items.length === 0) return { error: { status: 404, message: "Checklist area not found" } } as const;
  const chunkEntries = manuals.flatMap((m: any) =>
    chunkText(m.extracted_text).map((c: string) => ({ text: c, source: m.filename as string }))
  );
  const segments = segmentEntries(chunkEntries);
  if (segments.length > MAX_SEGMENTS) {
    return { error: { status: 400, message: `The combined manual set is too large for a full review (${segments.length} sections; the maximum is ${MAX_SEGMENTS}). Remove or trim documents.` } } as const;
  }
  const totalManualChars = chunkEntries.reduce((s: number, e: any) => s + e.text.length, 0);
  return { manuals, items, segments, totalManualChars } as const;
}

// Phase 1: scan a window of manual segments for evidence relevant to the area.
router.post("/review/:areaId/map", isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const loaded = await loadAreaForReview(orgId, req.params.areaId);
    if (loaded.error) return res.status(loaded.error.status).json({ message: loaded.error.message });
    const { manuals, items, segments } = loaded;
    // Runs are bound to the manual set AND the checklist item set: an import
    // or reset mid-run replaces item ids, changes this hash, and voids the run.
    const runHash = manualSetHash([...manuals.map(manualToken), ...items.map((i: any) => String(i.id))]);
    const start = Math.max(0, Math.floor(Number(req.body?.segment) || 0));
    if (start >= segments.length) return res.status(400).json({ message: "Segment out of range" });

    let priorEvidence: any[] = [];
    if (start === 0) {
      // Resume instead of restarting: if an incomplete run for the SAME manual
      // + checklist set already exists, don't rescan finished sections — tell
      // the client where to pick up. A changed hash still forces a fresh run.
      const existing = await getReviewRun(orgId, req.params.areaId);
      if (
        existing &&
        existing.manual_set_hash === runHash &&
        Number(existing.segments_done) > 0 &&
        Number(existing.segments_done) < Number(existing.total_segments) &&
        Number(existing.total_segments) === segments.length
      ) {
        return res.json({
          segmentsDone: Number(existing.segments_done),
          totalSegments: segments.length,
          nextSegment: Number(existing.segments_done),
          resumed: true,
        });
      }
      // (Re)start the run for this area against the current manual + item set.
      await db.execute(sql`
        INSERT INTO bccs_checklist_review_runs (organization_id, area_id, manual_set_hash, total_segments)
        VALUES (${orgId}, ${req.params.areaId}, ${runHash}, ${segments.length})
        ON CONFLICT (organization_id, area_id) DO UPDATE SET
          manual_set_hash = EXCLUDED.manual_set_hash,
          total_segments = EXCLUDED.total_segments,
          segments_done = 0,
          evidence = '[]',
          verdicts = '{}',
          batches_done = 0,
          created_at = NOW()
      `);
    } else {
      const run = await getReviewRun(orgId, req.params.areaId);
      if (!run || run.manual_set_hash !== runHash) {
        return res.status(409).json({ message: "The manuals or checklist changed since this review started. Restart the AI review." });
      }
      if (start !== Number(run.segments_done)) {
        return res.status(409).json({ message: "Manual sections must be scanned in order. Restart the AI review." });
      }
      priorEvidence = Array.isArray(run.evidence) ? run.evidence : [];
    }
    const window = segments.slice(start, start + MAP_PARALLEL);

    const itemList = items.map((it: any) => `[${it.id}] (${it.item_number}, ref ${it.reference || "n/a"}) ${it.description}`).join("\n");
    const settled = await Promise.allSettled(window.map(async (segment, wi) => {
      const segIndex = start + wi;
      const prompt = `You are an FAA Part 142 compliance auditor scanning section ${segIndex + 1} of ${segments.length} of a training center's operations-manual document set. Your ONLY job in this pass is to extract evidence: find passages in THIS section that are relevant to any of the checklist items below.

MANUAL SECTION ${segIndex + 1}/${segments.length}:
${segment.map((e) => `--- (from ${e.source}) ---\n${e.text}`).join("\n\n")}

CHECKLIST ITEMS:
${itemList}

Return JSON: { "evidence": [ { "itemId": "<exact bracketed id>", "quote": "<short direct quote from THIS section, max ${MAX_QUOTE_CHARS} chars>" } ] }
Include an entry ONLY when this section genuinely contains material relevant to that item (multiple entries per item allowed). If nothing in this section is relevant to any item, return { "evidence": [] }.`;
      const completion = await openai.chat.completions.create(
        {
          // Evidence extraction is a mechanical quote-finding pass — the fast
          // model keeps each call well under the serverless deadline; the
          // reduce phase (actual verdicts) stays on the stronger model.
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0,
          max_tokens: 4096,
        },
        // Kept well under the serverless request deadline (30s on Vercel).
        { timeout: 25_000, maxRetries: 0 },
      );
      const parsed = JSON.parse(completion.choices[0].message.content || "{}");
      const list = Array.isArray(parsed.evidence) ? parsed.evidence : [];
      const sources = Array.from(new Set(segment.map((e) => e.source))).join(", ");
      return list.map((e: any) => ({
        itemId: String(e?.itemId || "").replace(/[\[\]]/g, ""),
        quote: String(e?.quote || "").slice(0, MAX_QUOTE_CHARS),
        source: sources,
      }));
    }));

    // Keep whatever succeeded as a consecutive prefix from `start` — a slow or
    // failed call must not discard the other segments' work. The client simply
    // retries from the first unfinished segment.
    const okPrefix: { itemId: string; quote: string; source: string }[][] = [];
    for (const r of settled) {
      if (r.status !== "fulfilled") break;
      okPrefix.push(r.value);
    }
    if (okPrefix.length === 0) {
      const firstErr = settled.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
      return res.status(502).json({ message: friendlyOpenAIError(firstErr?.reason), retryable: true });
    }
    const results = okPrefix;

    const validIds = new Set<string>(items.map((i: any) => String(i.id)));
    // Merge with prior evidence and re-normalize (dedupe + per-item bounds),
    // then persist server-side — evidence never round-trips via the client.
    const mergedByItem = normalizeEvidence([...priorEvidence, ...results.flat()], validIds);
    const merged = Array.from(mergedByItem.values()).flat();
    const segmentsDone = start + results.length;
    // Conditional update: only advances the exact run state this request read,
    // so a concurrent restart or duplicate request cannot clobber progress.
    const updated = await db.execute(sql`
      UPDATE bccs_checklist_review_runs
      SET segments_done = ${segmentsDone}, evidence = ${JSON.stringify(merged)}::jsonb
      WHERE organization_id = ${orgId} AND area_id = ${req.params.areaId}
        AND segments_done = ${start} AND manual_set_hash = ${runHash}
      RETURNING id
    `).then((r: any) => r.rows);
    if (!updated.length) {
      return res.status(409).json({ message: "This review run was superseded by another request. Restart the AI review." });
    }
    const nextSegment = segmentsDone < segments.length ? segmentsDone : null;
    res.json({ segmentsDone, totalSegments: segments.length, nextSegment });
  } catch (err: any) {
    if (err?.isAiError) return res.status(502).json({ message: err.message });
    console.error("AI review map error:", err);
    res.status(500).json({ message: "Failed to scan manual sections" });
  }
});

// Phase 2: compile the server-stored evidence into final verdicts — ONE item
// batch per request (client keeps calling until done) so each request stays
// within the serverless deadline regardless of area size.
router.post("/review/:areaId/reduce", isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const loaded = await loadAreaForReview(orgId, req.params.areaId);
    if (loaded.error) return res.status(loaded.error.status).json({ message: loaded.error.message });
    const { manuals, items, totalManualChars } = loaded;
    // Findings/coverage record the manual-set hash; run validity uses the
    // combined manual + checklist-item hash (see the map route).
    const currentHash = manualSetHash(manuals.map(manualToken));
    const runHash = manualSetHash([...manuals.map(manualToken), ...items.map((i: any) => String(i.id))]);
    const validIds = new Set<string>(items.map((i: any) => String(i.id)));

    // Evidence and progress come from the server-owned run — never the client.
    const run = await getReviewRun(orgId, req.params.areaId);
    if (!run || run.manual_set_hash !== runHash) {
      return res.status(409).json({ message: "The manuals or checklist changed since this review started. Restart the AI review." });
    }
    if (Number(run.segments_done) < Number(run.total_segments)) {
      return res.status(409).json({
        message: `The manual scan is incomplete (${run.segments_done} of ${run.total_segments} sections). Restart the AI review.`,
      });
    }
    const evidenceByItem = normalizeEvidence(Array.isArray(run.evidence) ? run.evidence : [], validIds);

    const validVerdicts = new Set(["covered", "partial", "not_addressed"]);
    const batches = batchItems(items);
    const batchIndex = Number(run.batches_done) || 0;
    const byItem = new Map<string, any>(Object.entries(run.verdicts || {}));
    // One AI batch per request. Finalization (all the DB persistence) happens
    // in its own follow-up request so no single request combines a long AI
    // call with the full write set — keeps every request under the 30s cap.
    if (batchIndex < batches.length) {
      const batch = batches[batchIndex];
      const prompt = `You are an FAA Part 142 compliance auditor compiling the final report. Every page of the training center's operations-manual document set has already been scanned section by section; below is ALL of the evidence found for each checklist item. Because the ENTIRE document set was scanned, an item with no evidence listed is genuinely not addressed anywhere in the manuals.

CHECKLIST ITEMS AND THE EVIDENCE FOUND FOR EACH:
${batch.map((it: any) => {
  const quotes = evidenceByItem.get(String(it.id)) || [];
  const ev = quotes.length
    ? quotes.map((q, qi) => `  ${qi + 1}. "${q.quote}"${q.source ? ` (from ${q.source})` : ""}`).join("\n")
    : "  (no relevant material found anywhere in the document set)";
  return `[${it.id}] (${it.item_number}, ref ${it.reference || "n/a"}) ${it.description}\n${ev}`;
}).join("\n\n")}

For EACH checklist item, respond with:
- "itemId": the exact bracketed id
- "verdict": one of "covered" (evidence clearly addresses it), "partial" (evidence is related but incomplete/unclear), "not_addressed" (no relevant evidence)
- "excerpt": the strongest supporting quote (max 300 chars) from the evidence, or empty string if not_addressed
- "remediation": for partial/not_addressed, one concise sentence describing what the manual should add; empty string if covered
- "suggestedOperation": for partial/not_addressed, 3-6 sentences of concrete, ready-to-insert operations-manual language that would satisfy this requirement — written in the manual's own voice (procedure steps, who is responsible, what records are kept), NOT advice about what to fix; empty string if covered

Respond with JSON: { "findings": [ ... one object per checklist item ... ] }`;

      let findings: any[];
      try {
        const completion = await openai.chat.completions.create(
          {
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.1,
            max_tokens: 4096,
          },
          // Kept well under the serverless request deadline (30s on Vercel).
          { timeout: 25_000, maxRetries: 0 },
        );
        const parsed = JSON.parse(completion.choices[0].message.content || "{}");
        findings = parsed.findings || (Object.values(parsed).find((v) => Array.isArray(v)) as any[]) || [];
        if (!Array.isArray(findings) || findings.length === 0) throw new Error("AI returned no findings");
      } catch (aiErr: any) {
        return res.status(502).json({ message: friendlyOpenAIError(aiErr) });
      }
      for (const f of findings) {
        const itemId = String(f.itemId || "").replace(/[\[\]]/g, "");
        if (validVerdicts.has(f.verdict) && validIds.has(itemId)) {
          byItem.set(itemId, { verdict: f.verdict, excerpt: String(f.excerpt || "").slice(0, 1000), remediation: String(f.remediation || "").slice(0, 1000), suggestedOperation: String(f.suggestedOperation || "").slice(0, 4000) });
        }
      }

      // Persist this batch's verdicts with a conditional update so a
      // concurrent/duplicate request cannot clobber or double-advance
      // progress. Finalization happens in the client's next request.
      const updated = await db.execute(sql`
        UPDATE bccs_checklist_review_runs
        SET batches_done = ${batchIndex + 1}, verdicts = ${JSON.stringify(Object.fromEntries(byItem))}::jsonb
        WHERE organization_id = ${orgId} AND area_id = ${req.params.areaId}
          AND batches_done = ${batchIndex} AND manual_set_hash = ${runHash}
        RETURNING id
      `).then((r: any) => r.rows);
      if (!updated.length) {
        return res.status(409).json({ message: "This review run was superseded by another request. Restart the AI review." });
      }
      return res.json({ done: false, batchesDone: batchIndex + 1, totalBatches: batches.length });
    }

    // Finalize: all batches are compiled — this request only does DB writes.
    const missing = items.filter((i: any) => !byItem.has(String(i.id)));
    if (missing.length > 0) {
      // Unrecoverable within this run (some items never got a verdict) —
      // clear it so the client's retry starts a fresh scan.
      await db.execute(sql`
        DELETE FROM bccs_checklist_review_runs WHERE organization_id = ${orgId} AND area_id = ${req.params.areaId}
      `);
      return res.status(502).json({
        message: `The AI response was incomplete for this area (${missing.length} of ${items.length} items missing a verdict). Please run the review again.`,
      });
    }

    // Claim the run atomically before persisting: exactly one finalizer wins.
    const claimed = await db.execute(sql`
      DELETE FROM bccs_checklist_review_runs
      WHERE organization_id = ${orgId} AND area_id = ${req.params.areaId}
        AND manual_set_hash = ${runHash} AND batches_done = ${batches.length}
      RETURNING id
    `).then((r: any) => r.rows);
    if (!claimed.length) {
      return res.status(409).json({ message: "This review run was superseded by another request. Restart the AI review." });
    }

    await db.transaction(async (tx) => {
      for (const item of items) {
        const f = byItem.get(String(item.id));
        await tx.execute(sql`
          INSERT INTO bccs_checklist_ai_findings (organization_id, item_id, manual_id, manual_set_hash, verdict, excerpt, remediation, suggested_operation)
          VALUES (${orgId}, ${item.id}, ${manuals[0].id}, ${currentHash}, ${f.verdict}, ${String(f.excerpt || "").slice(0, 1000)}, ${String(f.remediation || "").slice(0, 1000)}, ${String(f.suggestedOperation || "").slice(0, 4000) || null})
          ON CONFLICT (organization_id, item_id) DO UPDATE SET
            manual_id = EXCLUDED.manual_id,
            manual_set_hash = EXCLUDED.manual_set_hash,
            verdict = EXCLUDED.verdict,
            excerpt = EXCLUDED.excerpt,
            remediation = EXCLUDED.remediation,
            suggested_operation = EXCLUDED.suggested_operation,
            reviewed_at = NOW()
        `);
      }
    });
    // Full-coverage run: every character of the manual set was scanned during
    // the map phase, so measured coverage is complete by construction.
    await db.execute(sql`
      INSERT INTO bccs_checklist_area_coverage (organization_id, area_id, total_manual_chars, excerpt_chars, ratio, manual_set_hash)
      VALUES (${orgId}, ${req.params.areaId}, ${totalManualChars}, ${totalManualChars}, 1, ${currentHash})
      ON CONFLICT (organization_id, area_id) DO UPDATE SET
        total_manual_chars = EXCLUDED.total_manual_chars,
        excerpt_chars = EXCLUDED.excerpt_chars,
        ratio = EXCLUDED.ratio,
        manual_set_hash = EXCLUDED.manual_set_hash,
        reviewed_at = NOW()
    `);
    res.json({
      done: true,
      success: true,
      areaId: req.params.areaId,
      itemsReviewed: items.length,
      itemsInArea: items.length,
      coverage: { totalManualChars, excerptChars: totalManualChars, ratio: 1 },
    });
  } catch (err) {
    console.error("AI review reduce error:", err);
    res.status(500).json({ message: "Failed to compile the AI review" });
  }
});

// Multer errors (too many files, file too large, unexpected field) become
// clear JSON responses instead of falling through to a generic 500.
router.use((err: any, _req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    const messages: Record<string, string> = {
      LIMIT_FILE_SIZE: "A file exceeds the maximum upload size.",
      LIMIT_FILE_COUNT: "Too many files in one upload.",
      LIMIT_UNEXPECTED_FILE: "Too many files, or an unexpected upload field was used.",
    };
    return res.status(400).json({ message: messages[err.code] || `Upload rejected: ${err.message}` });
  }
  next(err);
});

export default router;
