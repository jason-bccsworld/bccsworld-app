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
import { requireOrg, isPlatformStaff } from "../middleware/tenant";
import { PART142_CHECKLIST } from "@shared/part142-checklist";
import { chunkText, selectExcerpts, batchItems, promptCoverage } from "../services/checklist-review-utils";
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
}

// All routes must wait for schema initialization — a request that races the
// CREATE TABLE statements would otherwise hit a missing table and 500.
const schemaReady = ensureTables();
schemaReady.catch((err) => console.error("checklist-report schema init failed:", err));
router.use(async (_req, res, next) => {
  try {
    await schemaReady;
    next();
  } catch (err) {
    console.error("checklist-report schema unavailable:", err);
    res.status(503).json({ message: "Checklist storage is initializing or unavailable. Please try again shortly." });
  }
});

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
async function getOrgManuals(orgId: string, withText = false): Promise<any[]> {
  return db.execute(withText
    ? sql`SELECT id, filename, extracted_text, text_chars, uploaded_by, uploaded_at FROM bccs_ops_manuals
          WHERE organization_id = ${orgId} ORDER BY uploaded_at DESC, id`
    : sql`SELECT id, filename, text_chars, uploaded_by, uploaded_at FROM bccs_ops_manuals
          WHERE organization_id = ${orgId} ORDER BY uploaded_at DESC, id`
  ).then((r: any) => r.rows);
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
    const manualIds = (await getOrgManuals(orgId)).map((m: any) => m.id);
    const currentHash = manualSetHash(manualIds);
    const findings = await db.execute(sql`
      SELECT DISTINCT ON (item_id) item_id, manual_id, manual_set_hash, verdict, excerpt, remediation, reviewed_at
      FROM bccs_checklist_ai_findings WHERE organization_id = ${orgId}
      ORDER BY item_id, reviewed_at DESC
    `).then((r: any) => r.rows);
    const findingByItem: Record<string, any> = {};
    for (const f of findings) {
      findingByItem[f.item_id] = { ...f, stale: isFindingStale(f, manualIds, currentHash) };
    }
    // Persisted per-area coverage from the most recent AI review run — lets
    // the client show the coverage note after a reload.
    const coverageRows = await db.execute(sql`
      SELECT area_id, total_manual_chars, excerpt_chars, ratio, reviewed_at
      FROM bccs_checklist_area_coverage WHERE organization_id = ${orgId}
    `).then((r: any) => r.rows);
    const coverageByArea: Record<string, any> = {};
    for (const c of coverageRows) {
      coverageByArea[c.area_id] = {
        totalManualChars: Number(c.total_manual_chars),
        excerptChars: Number(c.excerpt_chars),
        ratio: Number(c.ratio),
        reviewedAt: c.reviewed_at,
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
    const manualIds = manuals.map((m: any) => m.id);
    const currentHash = manualSetHash(manualIds);
    const findings = await db.execute(sql`
      SELECT DISTINCT ON (item_id) item_id, manual_id, manual_set_hash, verdict, excerpt, remediation
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
        aiStale: f ? isFindingStale(f, manualIds, currentHash) : false,
        evidenceCount: evidenceByItem[row.id] || 0,
      });
    }

    const buffer = await buildChecklistWorkbook({
      areas,
      organization: org
        ? { name: org.organization_name, certificateNumber: org.certificate_number, regulatoryAuthority: org.regulatory_authority }
        : null,
      manuals: manuals.map((m: any) => ({ filename: m.filename, uploadedAt: m.uploaded_at })),
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
    await db.execute(sql`DELETE FROM bccs_checklist_report_items WHERE organization_id = ${orgId}`);
    await seedChecklist(orgId);
    res.json({ success: true });
  } catch (err) {
    console.error("Checklist reset error:", err);
    res.status(500).json({ message: "Failed to reset checklist" });
  }
});

// ── Operations manual upload & extraction ────────────────────────────────────

async function extractText(filename: string, buffer: Buffer): Promise<string> {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".txt") return buffer.toString("utf8");
  const tmp = path.join(os.tmpdir(), `manual-${crypto.randomBytes(6).toString("hex")}${ext}`);
  fs.writeFileSync(tmp, buffer);
  try {
    if (ext === ".pdf") {
      const { processDocumentOCR } = await import("../services/ocr");
      return await processDocumentOCR(tmp);
    }
    if (ext === ".docx") {
      // .docx is a zip; pull the main document XML and strip tags
      const { stdout } = await execAsync(`unzip -p "${tmp}" word/document.xml`, { maxBuffer: 100 * 1024 * 1024 });
      return stdout
        .replace(/<w:p[ >]/g, "\n<w:p ")
        .replace(/<[^>]+>/g, "")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }
    throw new Error("Unsupported file type. Please upload a PDF, Word (.docx), or plain-text file.");
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
      if (![".pdf", ".docx", ".txt"].includes(ext)) {
        return res.status(400).json({ message: `${f.originalname}: unsupported file type. Please upload PDF, Word (.docx), or plain-text files.` });
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
        const [row] = await tx.execute(sql`
          INSERT INTO bccs_ops_manuals (organization_id, filename, extracted_text, text_chars, uploaded_by)
          VALUES (${orgId}, ${file.originalname}, ${text}, ${text.length}, ${req.user?.email || req.user?.id || "system"})
          RETURNING id, filename, text_chars, uploaded_by, uploaded_at
        `).then((r: any) => r.rows);
        rows.push(row);
      }
      return rows;
    });
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
    const result = await db.execute(sql`
      DELETE FROM bccs_ops_manuals
      WHERE id = ${req.params.id} AND organization_id = ${orgId}
      RETURNING id
    `);
    if (((result as any).rows || []).length === 0) return res.status(404).json({ message: "Manual document not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("Manual delete error:", err);
    res.status(500).json({ message: "Failed to remove the manual document" });
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
    const manualIds = manuals.map((m: any) => m.id);
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
    const currentHash = manualSetHash(manuals.map((m: any) => m.id));

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
          INSERT INTO bccs_checklist_ai_findings (organization_id, item_id, manual_id, manual_set_hash, verdict, excerpt, remediation)
          VALUES (${orgId}, ${item.id}, ${manuals[0].id}, ${currentHash}, ${f.verdict}, ${String(f.excerpt || "").slice(0, 1000)}, ${String(f.remediation || "").slice(0, 1000)})
          ON CONFLICT (organization_id, item_id) DO UPDATE SET
            manual_id = EXCLUDED.manual_id,
            manual_set_hash = EXCLUDED.manual_set_hash,
            verdict = EXCLUDED.verdict,
            excerpt = EXCLUDED.excerpt,
            remediation = EXCLUDED.remediation,
            reviewed_at = NOW()
        `);
      }
    });
    // Persist this area's measured coverage so the checklist page can still
    // show the coverage note after a reload, not just in the running session.
    const coverageRatio = totalManualChars > 0 ? Math.min(1, minSelectedSourceChars / totalManualChars) : 1;
    await db.execute(sql`
      INSERT INTO bccs_checklist_area_coverage (organization_id, area_id, total_manual_chars, excerpt_chars, ratio)
      VALUES (${orgId}, ${req.params.areaId}, ${totalManualChars}, ${minSelectedSourceChars}, ${coverageRatio})
      ON CONFLICT (organization_id, area_id) DO UPDATE SET
        total_manual_chars = EXCLUDED.total_manual_chars,
        excerpt_chars = EXCLUDED.excerpt_chars,
        ratio = EXCLUDED.ratio,
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
