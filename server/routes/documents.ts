/**
 * Agentic document pipeline API.
 *
 * POST /upload           — persist file (bytea) + fire the Document Extraction Agent
 * GET  /                 — list org documents (optionally ?status=needs_review)
 * GET  /:id/extracted-data — extracted fields for a document
 * POST /:id/review       — human review: approve (with corrections) or reject
 * POST /seed-demo        — generate sample documents and run them through the pipeline
 */
import { Router } from "express";
import multer from "multer";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";
import { requireOrg } from "../middleware/tenant";
import { isKnownDocumentType } from "../services/nlp";
import {
  processDocument,
  maybeLearnFromCorrections,
  sha256Hash,
} from "../services/document-agent";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "text/plain",
  "text/csv",
]);

function docToJson(row: any) {
  return {
    id: row.id,
    fileName: row.file_name,
    fileSize: Number(row.file_size ?? 0),
    mimeType: row.mime_type,
    documentType: row.document_type,
    status: row.status,
    overallConfidence: row.overall_confidence != null ? Number(row.overall_confidence) : null,
    blockchainHash: row.blockchain_hash,
    errorMessage: row.error_message,
    uploadedBy: row.uploaded_by,
    uploadedAt: row.created_at,
    processedAt: row.processed_at,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
  };
}

// ── Upload → agent takes over ───────────────────────────────────────────────
router.post("/upload", isAuthenticated, upload.single("file"), async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    if (!req.file) return res.status(400).json({ message: "No file provided" });

    const mime = req.file.mimetype || "application/octet-stream";
    if (!ALLOWED_MIME.has(mime)) {
      return res.status(400).json({
        message: `Unsupported file type "${mime}". The AI agent can process PDF, PNG, JPG, TXT and CSV files.`,
      });
    }

    const requestedType = String(req.body?.documentType || "").trim();
    const documentType = isKnownDocumentType(requestedType) ? requestedType : "pilot_record";
    const userId = req.user?.id ?? req.user?.email ?? null;

    const [inserted] = await db
      .execute(sql`
        INSERT INTO bccs_documents (organization_id, file_name, mime_type, file_size, file_data, document_type, status, uploaded_by)
        VALUES (${orgId}, ${req.file.originalname}, ${mime}, ${req.file.size}, ${req.file.buffer}, ${documentType}, 'uploaded', ${userId})
        RETURNING id, file_name, mime_type, file_size, document_type, status, uploaded_by, created_at
      `)
      .then((r) => (r as any).rows);

    // Fire-and-forget: the agent processes outside the request cycle.
    processDocument(inserted.id, orgId, userId).catch((err) =>
      console.error("[documents] agent job crashed:", err),
    );

    res.status(201).json({
      ...docToJson(inserted),
      message: "Document uploaded — the AI agent is processing it now.",
    });
  } catch (error) {
    console.error("Document upload error:", error);
    res.status(500).json({ message: "Failed to upload document" });
  }
});

// ── List documents (never returns file bytes) ───────────────────────────────
router.get("/", isAuthenticated, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const status = typeof req.query.status === "string" ? req.query.status : null;
    const rows = await db
      .execute(
        status
          ? sql`SELECT id, file_name, mime_type, file_size, document_type, status, overall_confidence,
                       blockchain_hash, error_message, uploaded_by, created_at, processed_at, reviewed_at, reviewed_by
                FROM bccs_documents
                WHERE organization_id = ${orgId} AND status = ${status}
                ORDER BY created_at DESC LIMIT 200`
          : sql`SELECT id, file_name, mime_type, file_size, document_type, status, overall_confidence,
                       blockchain_hash, error_message, uploaded_by, created_at, processed_at, reviewed_at, reviewed_by
                FROM bccs_documents
                WHERE organization_id = ${orgId}
                ORDER BY created_at DESC LIMIT 200`,
      )
      .then((r) => (r as any).rows);
    res.json(rows.map(docToJson));
  } catch (error) {
    console.error("Document list error:", error);
    res.status(500).json({ message: "Failed to fetch documents" });
  }
});

// ── Extracted fields for a document ─────────────────────────────────────────
router.get("/:id/extracted-data", isAuthenticated, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const [doc] = await db
      .execute(sql`SELECT id FROM bccs_documents WHERE id = ${req.params.id} AND organization_id = ${orgId}`)
      .then((r) => (r as any).rows);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const rows = await db
      .execute(sql`
        SELECT id, field_name, extracted_value, corrected_value, confidence, status
        FROM bccs_document_fields
        WHERE document_id = ${req.params.id}
        ORDER BY created_at ASC, field_name ASC
      `)
      .then((r) => (r as any).rows);

    res.json(
      rows.map((f: any) => ({
        id: f.id,
        fieldName: f.field_name,
        extractedValue: f.extracted_value,
        correctedValue: f.corrected_value,
        confidenceScore: f.confidence != null ? Number(f.confidence) : null,
        status: f.status,
      })),
    );
  } catch (error) {
    console.error("Extracted data error:", error);
    res.status(500).json({ message: "Failed to fetch extracted data" });
  }
});

// ── Human review: approve (with corrections) or reject ─────────────────────
router.post("/:id/review", isAuthenticated, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const action = req.body?.action;
    if (action !== "approve" && action !== "reject") {
      return res.status(400).json({ message: 'action must be "approve" or "reject"' });
    }
    const corrections: Record<string, string> =
      req.body?.corrections && typeof req.body.corrections === "object" ? req.body.corrections : {};

    const [doc] = await db
      .execute(sql`
        SELECT id, file_name, document_type, status FROM bccs_documents
        WHERE id = ${req.params.id} AND organization_id = ${orgId}
      `)
      .then((r) => (r as any).rows);
    if (!doc) return res.status(404).json({ message: "Document not found" });
    if (!["needs_review", "auto_approved"].includes(doc.status)) {
      return res.status(400).json({ message: `Document is "${doc.status}" — only documents awaiting or past review can be reviewed.` });
    }

    const userId = req.user?.id ?? req.user?.email ?? "unknown";

    if (action === "reject") {
      await db.execute(sql`
        UPDATE bccs_documents SET status = 'rejected', reviewed_at = NOW(), reviewed_by = ${userId}
        WHERE id = ${doc.id}
      `);
      await db.execute(sql`UPDATE bccs_document_fields SET status = 'rejected' WHERE document_id = ${doc.id}`);
      await db.execute(sql`
        INSERT INTO agent_events (agent_name, event_type, message, org_id)
        VALUES ('Document Extraction Agent', 'document_rejected',
                ${`Human reviewer rejected "${doc.file_name}" — extraction discarded`}, ${orgId})
      `);
      return res.json({ success: true, status: "rejected" });
    }

    // Approve: apply corrections, record feedback, hash, and trigger learning.
    const fields = await db
      .execute(sql`
        SELECT id, field_name, extracted_value FROM bccs_document_fields WHERE document_id = ${doc.id}
      `)
      .then((r) => (r as any).rows);

    let correctionCount = 0;
    for (const f of fields) {
      const corrected = corrections[f.field_name];
      const changed = corrected !== undefined && corrected !== null && String(corrected) !== String(f.extracted_value ?? "");
      if (changed) {
        correctionCount++;
        await db.execute(sql`
          UPDATE bccs_document_fields SET corrected_value = ${String(corrected)}, status = 'corrected'
          WHERE id = ${f.id}
        `);
        await db.execute(sql`
          INSERT INTO bccs_ml_feedback (organization_id, document_id, document_type, field_name, original_value, corrected_value, user_id)
          VALUES (${orgId}, ${doc.id}, ${doc.document_type}, ${f.field_name}, ${f.extracted_value}, ${String(corrected)}, ${userId})
        `);
      } else {
        await db.execute(sql`UPDATE bccs_document_fields SET status = 'approved' WHERE id = ${f.id}`);
      }
    }

    const finalFields = fields.map((f: any) => ({
      n: f.field_name,
      v: corrections[f.field_name] !== undefined ? String(corrections[f.field_name]) : f.extracted_value,
    }));
    const hash = sha256Hash({ documentId: doc.id, fields: finalFields });

    await db.execute(sql`
      UPDATE bccs_documents
      SET status = 'approved', blockchain_hash = ${hash}, reviewed_at = NOW(), reviewed_by = ${userId}
      WHERE id = ${doc.id}
    `);
    await db.execute(sql`
      INSERT INTO agent_events (agent_name, event_type, message, org_id)
      VALUES ('Document Extraction Agent', 'document_approved',
              ${`Human reviewer approved "${doc.file_name}"${correctionCount > 0 ? ` with ${correctionCount} correction${correctionCount === 1 ? "" : "s"} — feeding the learning loop` : " with no corrections"} · blockchain-anchored (${hash.slice(0, 12)}…)`},
              ${orgId})
    `);

    // Learning pass runs outside the request cycle.
    if (correctionCount > 0) {
      maybeLearnFromCorrections(orgId, doc.document_type).catch((err) =>
        console.error("[documents] learning pass crashed:", err),
      );
    }

    res.json({ success: true, status: "approved", corrections: correctionCount, blockchainHash: hash });
  } catch (error) {
    console.error("Document review error:", error);
    res.status(500).json({ message: "Failed to submit review" });
  }
});

// ── Demo seeding: generate sample documents and run the full pipeline ───────
const DEMO_DOCS: { fileName: string; documentType: string; content: string }[] = [
  {
    fileName: "training_record_rivera_sim4.txt",
    documentType: "pilot_record",
    content: `PART 142 TRAINING CENTER — TRAINING EVENT RECORD

Student Name: Alice Rivera
Student ID: S-1042
Instructor (CFI): Capt. James Holt
Instructor Certificate: CFI-3382914
Event Type: Simulator Session
Date of Training: 2026-07-10
Duration: 2.0 hours
Aircraft/Simulator: CE-525 Full Flight Simulator Level D
Curriculum Item: Session 4 — ILS approaches, missed approach procedures
Remarks: Student demonstrated proficiency in coupled ILS approaches. Missed approach callouts improving. Recommend progression to Session 5.`,
  },
  {
    fileName: "airman_certificate_chen.txt",
    documentType: "certificate",
    content: `FEDERAL AVIATION ADMINISTRATION
AIRMAN CERTIFICATE

Name of Holder: Marcus Chen
Certificate Type: Commercial Pilot
Certificate Number: 3771182CC
Date of Issue: 2024-03-18
Ratings: Airplane Multiengine Land; Instrument Airplane
Limitations: English Proficient
Date of Birth: 1994-11-02
Issuing Authority: FAA`,
  },
  {
    fileName: "far142_inspection_summary_q2.txt",
    documentType: "faa_audit",
    content: `FAA INSPECTION SUMMARY — PART 142 TRAINING CENTER

Document Title: Quarterly Surveillance Inspection Summary Q2 2026
Regulatory Reference: 14 CFR 142.73, 14 CFR 142.37
Inspection Date: 2026-06-24
Inspector: J. Whitfield, ASI (Operations)
Organization: BCCS Flight Training Center
Findings: Recordkeeping current. One discrepancy noted — simulator daily discrepancy log missing two entries for May 2026.
Compliance Status: Partial
Corrective Actions: Submit corrected simulator log procedure within 30 days per 14 CFR 142.73(f).`,
  },
];

router.post("/seed-demo", isAuthenticated, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const userId = req.user?.id ?? req.user?.email ?? null;
    const created: string[] = [];

    for (const demo of DEMO_DOCS) {
      const buffer = Buffer.from(demo.content, "utf8");
      const [inserted] = await db
        .execute(sql`
          INSERT INTO bccs_documents (organization_id, file_name, mime_type, file_size, file_data, document_type, status, uploaded_by)
          VALUES (${orgId}, ${demo.fileName}, 'text/plain', ${buffer.length}, ${buffer}, ${demo.documentType}, 'uploaded', ${userId})
          RETURNING id
        `)
        .then((r) => (r as any).rows);
      created.push(inserted.id);
      processDocument(inserted.id, orgId, userId).catch((err) =>
        console.error("[documents] demo agent job crashed:", err),
      );
    }

    res.status(201).json({
      success: true,
      created: created.length,
      message: "Demo documents created — the AI agent is processing them now.",
    });
  } catch (error) {
    console.error("Demo seed error:", error);
    res.status(500).json({ message: "Failed to seed demo documents" });
  }
});

export default router;
