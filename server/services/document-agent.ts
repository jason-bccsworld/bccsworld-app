/**
 * Document Extraction Agent — the agentic document pipeline.
 *
 * upload → OCR/text extraction → GPT-4o field extraction (doc-type-aware,
 * enriched with learned guidance from past human corrections) → GATE-governed
 * confidence gate:
 *   - high confidence  → GATE admits auto-approval → blockchain hash anchored
 *   - low confidence   → GATE escalates → human review queue (needs_review)
 * Human corrections are recorded as ML feedback; once enough corrections
 * accumulate for a document type, a learning pass distills them into prompt
 * guidance that future extractions actually use.
 */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as crypto from "crypto";
import OpenAI from "openai";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { processDocumentOCR } from "./ocr";
import { extractFieldsWithNLP, type ExtractedField } from "./nlp";
import { evaluateAction } from "./gate-engine";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "not-configured" });

/** Average field confidence required for the agent to request auto-approval. */
export const AUTO_APPROVE_CONFIDENCE = 85;
/** New corrections per document type that trigger a learning pass. */
export const LEARNING_BATCH_SIZE = 5;

const AGENT_NAME = "Document Extraction Agent";
const LEARNING_AGENT_NAME = "Extraction Learning Agent";

export function sha256Hash(payload: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

async function emitAgentEvent(agentName: string, eventType: string, message: string, orgId: string | null) {
  await db
    .execute(sql`
      INSERT INTO agent_events (agent_name, event_type, message, org_id)
      VALUES (${agentName}, ${eventType}, ${message}, ${orgId})
    `)
    .catch((err) => console.error("[document-agent] agent event write failed:", err));
}

/** Load the active learned guidance for a document type (org-scoped). */
export async function loadGuidance(orgId: string | null, documentType: string): Promise<string | null> {
  if (!orgId) return null;
  const rows = await db
    .execute(sql`
      SELECT guidance FROM bccs_prompt_guidance
      WHERE organization_id = ${orgId} AND document_type = ${documentType} AND is_active = TRUE
      LIMIT 1
    `)
    .then((r) => (r as any).rows);
  return rows[0]?.guidance ?? null;
}

/**
 * Turn the stored file bytes into text. Plain text and CSV are decoded
 * directly; PDFs and images go through the OCR service (pdftotext /
 * pdftoppm + tesseract) via a temp file.
 */
async function extractText(fileName: string, mimeType: string, buffer: Buffer): Promise<string> {
  if (mimeType.startsWith("text/") || mimeType === "application/json" || mimeType === "text/csv") {
    return buffer.toString("utf8");
  }
  const ext = path.extname(fileName).toLowerCase();
  const ocrExts = [".pdf", ".png", ".jpg", ".jpeg"];
  const extFromMime =
    mimeType === "application/pdf" ? ".pdf" :
    mimeType === "image/png" ? ".png" :
    mimeType === "image/jpeg" ? ".jpg" : null;
  const useExt = ocrExts.includes(ext) ? ext : extFromMime;
  if (!useExt) {
    throw new Error(`Unsupported file type for AI extraction: ${mimeType || ext || "unknown"}. Supported: PDF, PNG, JPG, TXT, CSV.`);
  }
  const tmpPath = path.join(os.tmpdir(), `bccs-doc-${crypto.randomUUID()}${useExt}`);
  fs.writeFileSync(tmpPath, buffer);
  try {
    return await processDocumentOCR(tmpPath);
  } finally {
    fs.unlink(tmpPath, () => {});
  }
}

/**
 * The agent job. Runs fire-and-forget after upload — never inside the request
 * cycle. orgId is passed explicitly because AsyncLocalStorage tenant context
 * does not survive into detached async work.
 */
export async function processDocument(documentId: string, orgId: string, userId: string | null): Promise<void> {
  try {
    const [doc] = await db
      .execute(sql`
        SELECT id, file_name, mime_type, document_type, file_data
        FROM bccs_documents
        WHERE id = ${documentId} AND organization_id = ${orgId}
      `)
      .then((r) => (r as any).rows);
    if (!doc) throw new Error("Document not found");

    await db.execute(sql`UPDATE bccs_documents SET status = 'processing' WHERE id = ${documentId}`);
    await emitAgentEvent(
      AGENT_NAME,
      "document_processing",
      `Started processing "${doc.file_name}" (${doc.document_type}) — OCR + AI field extraction`,
      orgId,
    );

    // 1) OCR / text extraction
    const buffer: Buffer = Buffer.isBuffer(doc.file_data) ? doc.file_data : Buffer.from(doc.file_data);
    const text = await extractText(doc.file_name, doc.mime_type, buffer);
    if (!text || text.trim().length < 10) {
      throw new Error("No readable text could be extracted from the document.");
    }

    // 2) AI field extraction with learned guidance
    const guidance = await loadGuidance(orgId, doc.document_type);
    const fields: ExtractedField[] = await extractFieldsWithNLP(text, doc.document_type, guidance ?? undefined);
    if (fields.length === 0) {
      // Nothing extracted — a human must look at it.
      await db.execute(sql`
        UPDATE bccs_documents
        SET status = 'needs_review', ocr_text = ${text}, overall_confidence = 0, processed_at = NOW()
        WHERE id = ${documentId}
      `);
      await emitAgentEvent(
        AGENT_NAME,
        "document_needs_review",
        `No fields could be extracted from "${doc.file_name}" — routed to human review`,
        orgId,
      );
      return;
    }

    for (const f of fields) {
      await db.execute(sql`
        INSERT INTO bccs_document_fields (document_id, field_name, extracted_value, confidence)
        VALUES (${documentId}, ${f.fieldName}, ${f.extractedValue}, ${f.confidenceScore})
      `);
    }

    const overall = Math.round(fields.reduce((s, f) => s + f.confidenceScore, 0) / fields.length);

    // 3) GATE-governed confidence gate. The agent acts with delegated admin
    //    authority only when confidence clears the threshold; below it the
    //    agent requests as a low-authority identity so GATE escalates the
    //    decision to a human — every document decision lands in the
    //    governance ledger and the live agent feed.
    const confident = overall >= AUTO_APPROVE_CONFIDENCE;
    const gate = await evaluateAction({
      actionType: "document_auto_approve",
      actionDescription: `Auto-approve AI-extracted data for "${doc.file_name}" (${fields.length} fields, avg confidence ${overall}%)`,
      requestedBy: AGENT_NAME,
      requesterAuthority: confident ? "admin" : "viewer",
      userId: userId ?? undefined,
      orgId,
      context: { documentId, fileName: doc.file_name, documentType: doc.document_type, fieldCount: fields.length, overallConfidence: overall },
    });

    if (gate.admissible) {
      const hash = sha256Hash({ documentId, fields: fields.map((f) => ({ n: f.fieldName, v: f.extractedValue })) });
      await db.execute(sql`
        UPDATE bccs_documents
        SET status = 'auto_approved', ocr_text = ${text}, overall_confidence = ${overall},
            blockchain_hash = ${hash}, gate_decision_id = ${gate.decisionId}, processed_at = NOW()
        WHERE id = ${documentId}
      `);
      await db.execute(sql`UPDATE bccs_document_fields SET status = 'approved' WHERE document_id = ${documentId}`);
      await emitAgentEvent(
        AGENT_NAME,
        "document_auto_approved",
        `Auto-approved "${doc.file_name}" — ${fields.length} fields at ${overall}% confidence, blockchain-anchored (${hash.slice(0, 12)}…)`,
        orgId,
      );
    } else {
      await db.execute(sql`
        UPDATE bccs_documents
        SET status = 'needs_review', ocr_text = ${text}, overall_confidence = ${overall},
            gate_decision_id = ${gate.decisionId}, processed_at = NOW()
        WHERE id = ${documentId}
      `);
      await emitAgentEvent(
        AGENT_NAME,
        "document_needs_review",
        `"${doc.file_name}" extracted at ${overall}% confidence (below ${AUTO_APPROVE_CONFIDENCE}% threshold) — GATE escalated to human review`,
        orgId,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown processing error";
    console.error(`[document-agent] processing failed for ${documentId}:`, error);
    await db
      .execute(sql`
        UPDATE bccs_documents
        SET status = 'failed', error_message = ${message}, processed_at = NOW()
        WHERE id = ${documentId}
      `)
      .catch(() => {});
    await emitAgentEvent(AGENT_NAME, "document_failed", `Processing failed: ${message}`, orgId);
  }
}

/**
 * Learning loop. Called after a human review submits corrections. When a
 * document type has accumulated LEARNING_BATCH_SIZE new corrections since the
 * last pass, GPT-4o distills the correction patterns into guidance that is
 * injected into every future extraction prompt for that document type.
 */
export async function maybeLearnFromCorrections(orgId: string, documentType: string): Promise<void> {
  try {
    const [countRow] = await db
      .execute(sql`
        SELECT COUNT(*)::int AS n FROM bccs_ml_feedback
        WHERE organization_id = ${orgId} AND document_type = ${documentType}
      `)
      .then((r) => (r as any).rows);
    const total = countRow?.n ?? 0;

    const [guidanceRow] = await db
      .execute(sql`
        SELECT id, version, source_correction_count FROM bccs_prompt_guidance
        WHERE organization_id = ${orgId} AND document_type = ${documentType}
      `)
      .then((r) => (r as any).rows);
    const incorporated = guidanceRow?.source_correction_count ?? 0;

    if (total - incorporated < LEARNING_BATCH_SIZE) return;

    const corrections = await db
      .execute(sql`
        SELECT field_name, original_value, corrected_value FROM bccs_ml_feedback
        WHERE organization_id = ${orgId} AND document_type = ${documentType}
        ORDER BY created_at DESC
        LIMIT 30
      `)
      .then((r) => (r as any).rows);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an ML training analyst for an aviation document extraction system. Human reviewers corrected the AI's extractions below. Analyze the correction patterns and write concise, actionable guidance (max 8 bullet points) that, if followed, would have prevented these corrections. Focus on formatting conventions, field disambiguation, and common misreads. Return JSON: {"guidance": "- bullet one\\n- bullet two"}`,
        },
        {
          role: "user",
          content: `Document type: ${documentType}\n\nCorrections (AI extracted → human corrected):\n${corrections
            .map((c: any) => `- ${c.field_name}: "${c.original_value}" → "${c.corrected_value}"`)
            .join("\n")}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(response.choices[0].message.content || "{}");
    const guidance = typeof parsed.guidance === "string" ? parsed.guidance.trim() : "";
    if (!guidance) return;

    const newVersion = (guidanceRow?.version ?? 0) + 1;
    await db.execute(sql`
      INSERT INTO bccs_prompt_guidance (organization_id, document_type, guidance, version, is_active, source_correction_count, updated_at)
      VALUES (${orgId}, ${documentType}, ${guidance}, ${newVersion}, TRUE, ${total}, NOW())
      ON CONFLICT (organization_id, document_type)
      DO UPDATE SET guidance = ${guidance}, version = ${newVersion}, is_active = TRUE,
                    source_correction_count = ${total}, updated_at = NOW()
    `);

    // Stamp the training meta so the ML dashboard reflects the real pass.
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bccs_ml_meta (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    const payload = JSON.stringify({ date: new Date().toISOString(), version: `guidance-${documentType}-v${newVersion}` });
    await db.execute(sql`
      INSERT INTO bccs_ml_meta (key, value, updated_at)
      VALUES ('last_training', ${payload}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${payload}, updated_at = NOW()
    `);

    await emitAgentEvent(
      LEARNING_AGENT_NAME,
      "model_updated",
      `Learned from ${total} human corrections on ${documentType.replace(/_/g, " ")} documents — extraction guidance updated to v${newVersion}`,
      orgId,
    );
  } catch (error) {
    console.error("[document-agent] learning pass failed (non-fatal):", error);
  }
}
