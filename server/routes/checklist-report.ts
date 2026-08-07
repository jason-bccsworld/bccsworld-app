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
import { chunkText, selectChunks, batchItems } from "../services/checklist-review-utils";

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
    CREATE UNIQUE INDEX IF NOT EXISTS bccs_checklist_report_items_org_area_number
    ON bccs_checklist_report_items (organization_id, area_id, item_number)
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS bccs_checklist_ai_findings_org_item
    ON bccs_checklist_ai_findings (organization_id, item_id)
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
    const [currentManual] = await db.execute(sql`
      SELECT id FROM bccs_ops_manuals WHERE organization_id = ${orgId}
      ORDER BY uploaded_at DESC LIMIT 1
    `).then((r: any) => r.rows);
    const findings = await db.execute(sql`
      SELECT DISTINCT ON (item_id) item_id, manual_id, verdict, excerpt, remediation, reviewed_at
      FROM bccs_checklist_ai_findings WHERE organization_id = ${orgId}
      ORDER BY item_id, reviewed_at DESC
    `).then((r: any) => r.rows);
    const findingByItem: Record<string, any> = {};
    for (const f of findings) {
      findingByItem[f.item_id] = { ...f, stale: !currentManual || f.manual_id !== currentManual.id };
    }

    const areas: any[] = [];
    for (const row of rows) {
      let area = areas.find((a) => a.id === row.area_id);
      if (!area) {
        area = { id: row.area_id, name: row.area_name, description: row.area_description, items: [] };
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

// ── Import / reset ───────────────────────────────────────────────────────────

// POST /import — replace the org checklist from pasted/uploaded text.
// Line format: number | description | reference | area name
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
    if (items.length === 0) return res.status(400).json({ message: "No checklist items could be parsed" });
    if (items.length > MAX_IMPORT_ITEMS) {
      return res.status(400).json({ message: `Too many items (${items.length}). The maximum is ${MAX_IMPORT_ITEMS}.` });
    }
    const distinctAreas = new Set(items.map((it) => it.areaName));
    if (distinctAreas.size > MAX_IMPORT_AREAS) {
      return res.status(400).json({ message: `Too many areas (${distinctAreas.size}). The maximum is ${MAX_IMPORT_AREAS}.` });
    }

    await db.transaction(async (tx) => {
      await tx.execute(sql`DELETE FROM bccs_checklist_ai_findings WHERE organization_id = ${orgId}`);
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
    res.json({ success: true, imported: items.length });
  } catch (err) {
    console.error("Checklist import error:", err);
    res.status(500).json({ message: "Failed to import checklist" });
  }
});

// POST /reset — restore the built-in Part 142 checklist
router.post("/reset", isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    await db.execute(sql`DELETE FROM bccs_checklist_ai_findings WHERE organization_id = ${orgId}`);
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

// POST /manual — upload (replaces any previous manual for the org)
router.post("/manual", isAuthenticated, requireAdmin, upload.single("file"), async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (![".pdf", ".docx", ".txt"].includes(ext)) {
      return res.status(400).json({ message: "Unsupported file type. Please upload a PDF, Word (.docx), or plain-text file." });
    }

    let text: string;
    try {
      text = await extractText(req.file.originalname, req.file.buffer);
    } catch (extractErr: any) {
      return res.status(422).json({ message: `Could not read the document: ${extractErr.message}` });
    }
    if (!text || text.trim().length < 200) {
      return res.status(422).json({ message: "Very little text could be extracted from this document. Please upload a text-based PDF or Word document." });
    }

    const [manual] = await db.transaction(async (tx) => {
      await tx.execute(sql`DELETE FROM bccs_ops_manuals WHERE organization_id = ${orgId}`);
      return await tx.execute(sql`
        INSERT INTO bccs_ops_manuals (organization_id, filename, extracted_text, text_chars, uploaded_by)
        VALUES (${orgId}, ${req.file.originalname}, ${text}, ${text.length}, ${req.user?.email || req.user?.id || "system"})
        RETURNING id, filename, text_chars, uploaded_by, uploaded_at
      `).then((r: any) => r.rows);
    });
    res.status(201).json(manual);
  } catch (err) {
    console.error("Manual upload error:", err);
    res.status(500).json({ message: "Failed to upload the operations manual" });
  }
});

// GET /manual — current manual metadata + review status
router.get("/manual", isAuthenticated, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const [manual] = await db.execute(sql`
      SELECT id, filename, text_chars, uploaded_by, uploaded_at FROM bccs_ops_manuals
      WHERE organization_id = ${orgId} ORDER BY uploaded_at DESC LIMIT 1
    `).then((r: any) => r.rows);
    if (!manual) return res.json({ manual: null, lastReviewAt: null, reviewStale: false });
    const [lastReview] = await db.execute(sql`
      SELECT MAX(reviewed_at) AS last,
             COUNT(*) FILTER (WHERE manual_id <> ${manual.id}) AS stale_count
      FROM bccs_checklist_ai_findings WHERE organization_id = ${orgId}
    `).then((r: any) => r.rows);
    const reviewStale = Number(lastReview?.stale_count || 0) > 0;
    res.json({ manual, lastReviewAt: lastReview?.last || null, reviewStale });
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
    const [manual] = await db.execute(sql`
      SELECT id, extracted_text FROM bccs_ops_manuals WHERE organization_id = ${orgId}
      ORDER BY uploaded_at DESC LIMIT 1
    `).then((r: any) => r.rows);
    if (!manual) return res.status(400).json({ message: "Upload an operations manual first" });

    const items = await db.execute(sql`
      SELECT id, item_number, description, reference FROM bccs_checklist_report_items
      WHERE organization_id = ${orgId} AND area_id = ${req.params.areaId}
      ORDER BY item_order
    `).then((r: any) => r.rows);
    if (items.length === 0) return res.status(404).json({ message: "Checklist area not found" });

    const chunks = chunkText(manual.extracted_text);

    // Review the area in bounded batches — one OpenAI call per batch of items,
    // each with a capped excerpt budget, so prompt and completion sizes stay
    // within the model limits regardless of manual or checklist size.
    const validVerdicts = new Set(["covered", "partial", "not_addressed"]);
    const byItem = new Map<string, any>();
    for (const batch of batchItems(items)) {
      const relevant = selectChunks(chunks, batch.map((i: any) => i.description));

      const prompt = `You are an FAA Part 142 compliance auditor. Review the following excerpts from a training center's operations manual and evaluate whether each checklist item is addressed by the manual.

OPERATIONS MANUAL EXCERPTS (most relevant sections):
${relevant.map((c, i) => `--- Excerpt ${i + 1} ---\n${c}`).join("\n\n")}

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
          INSERT INTO bccs_checklist_ai_findings (organization_id, item_id, manual_id, verdict, excerpt, remediation)
          VALUES (${orgId}, ${item.id}, ${manual.id}, ${f.verdict}, ${String(f.excerpt || "").slice(0, 1000)}, ${String(f.remediation || "").slice(0, 1000)})
          ON CONFLICT (organization_id, item_id) DO UPDATE SET
            manual_id = EXCLUDED.manual_id,
            verdict = EXCLUDED.verdict,
            excerpt = EXCLUDED.excerpt,
            remediation = EXCLUDED.remediation,
            reviewed_at = NOW()
        `);
      }
    });
    res.json({ success: true, areaId: req.params.areaId, itemsReviewed: items.length, itemsInArea: items.length });
  } catch (err) {
    console.error("AI review error:", err);
    res.status(500).json({ message: "Failed to run AI review" });
  }
});

export default router;
