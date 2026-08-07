import { Router } from "express";
import { db } from "../db";
import { digitalFormTemplates, digitalFormSubmissions } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";
import { requireOrg } from "../middleware/tenant";
import { queueAuditReadinessRefresh } from "../services/audit-readiness";
import crypto from "crypto";
import OpenAI from "openai";

const router = Router();

function generateToken(): string {
  return crypto.randomBytes(12).toString("base64url");
}

// Ensure tables exist (with all columns including new ones)
async function ensureTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS digital_form_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(300) NOT NULL,
      description TEXT,
      organization_name VARCHAR(300),
      faa_source_id VARCHAR(100),
      faa_document_title VARCHAR(300),
      faa_document_type VARCHAR(50),
      fields JSONB NOT NULL DEFAULT '[]',
      status VARCHAR(20) DEFAULT 'active',
      public_token VARCHAR(100) UNIQUE,
      is_public BOOLEAN DEFAULT true,
      created_by VARCHAR(200),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Add new columns to existing table if they don't exist
  await db.execute(sql`ALTER TABLE digital_form_templates ADD COLUMN IF NOT EXISTS organization_name VARCHAR(300)`);
  await db.execute(sql`ALTER TABLE digital_form_templates ADD COLUMN IF NOT EXISTS public_token VARCHAR(100)`);
  await db.execute(sql`ALTER TABLE digital_form_templates ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true`);
  await db.execute(sql`ALTER TABLE digital_form_templates ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false`);
  await db.execute(sql`ALTER TABLE digital_form_templates ADD COLUMN IF NOT EXISTS checklist_version_hash TEXT`);
  await db.execute(sql`ALTER TABLE digital_form_templates ADD COLUMN IF NOT EXISTS regulation_status VARCHAR(20) DEFAULT 'current'`);
  await db.execute(sql`ALTER TABLE digital_form_templates ADD COLUMN IF NOT EXISTS generated_from_section VARCHAR(200)`);
  await db.execute(sql`ALTER TABLE digital_form_templates ADD COLUMN IF NOT EXISTS organization_id UUID`);

  // Back-fill public tokens for existing templates that don't have one
  const rows = await db.execute(sql`SELECT id FROM digital_form_templates WHERE public_token IS NULL`);
  for (const row of rows.rows) {
    await db.execute(sql`UPDATE digital_form_templates SET public_token = ${generateToken()} WHERE id = ${row.id}`);
  }

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS digital_form_submissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id UUID NOT NULL REFERENCES digital_form_templates(id) ON DELETE CASCADE,
      template_title VARCHAR(300),
      organization_name VARCHAR(300),
      submitted_by VARCHAR(200),
      submitter_name VARCHAR(200),
      submitter_email VARCHAR(300),
      form_data JSONB NOT NULL DEFAULT '{}',
      status VARCHAR(20) DEFAULT 'submitted',
      notes TEXT,
      submitted_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Add submitter columns if they don't exist
  await db.execute(sql`ALTER TABLE digital_form_submissions ADD COLUMN IF NOT EXISTS submitter_name VARCHAR(200)`);
  await db.execute(sql`ALTER TABLE digital_form_submissions ADD COLUMN IF NOT EXISTS submitter_email VARCHAR(300)`);
  await db.execute(sql`ALTER TABLE digital_form_submissions ADD COLUMN IF NOT EXISTS organization_id UUID`);
  // Provenance link: submissions of the system Training Event template create a training record
  await db.execute(sql`ALTER TABLE digital_form_submissions ADD COLUMN IF NOT EXISTS training_event_id UUID`);
}

// ── System "Training Event" form template ──────────────────────────────────
// Every org gets a built-in Training Event template. Submissions of this
// template are ingested straight into bccs_training_events so they are
// signed, counted, and monitored by the audit agents like any other record.
const TRAINING_EVENT_MARKER = "system:training-event";

const TRAINING_EVENT_FIELDS = [
  { id: "student_name", label: "Student Name", type: "text", required: true, placeholder: "Full name" },
  { id: "instructor_name", label: "Instructor Name", type: "text", required: true, placeholder: "Full name" },
  { id: "event_type", label: "Event Type", type: "select", required: true, options: ["ground", "flight", "simulator", "check_ride", "evaluation", "proficiency_check", "recurrent"] },
  { id: "event_date", label: "Event Date", type: "date", required: true },
  { id: "duration_hours", label: "Duration (hours)", type: "number", required: false },
  { id: "curriculum_item", label: "Curriculum Item", type: "text", required: false, placeholder: "e.g. Stage 2 — Instrument procedures" },
  { id: "notes", label: "Notes", type: "textarea", required: false },
];

async function ensureTrainingEventTemplate(orgId: string): Promise<void> {
  const existing = await db.execute(sql`
    SELECT id FROM digital_form_templates
    WHERE organization_id = ${orgId} AND generated_from_section = ${TRAINING_EVENT_MARKER} AND status = 'active'
    LIMIT 1
  `).then(r => (r as any).rows);
  if (existing[0]) return;
  await db.execute(sql`
    INSERT INTO digital_form_templates (title, description, fields, status, public_token, is_public, generated_from_section, organization_id, created_by)
    VALUES (
      'Training Event',
      'Log a completed training event. Submissions are recorded as official training records, cryptographically signed when an org key exists, and tracked by the audit agents.',
      ${JSON.stringify(TRAINING_EVENT_FIELDS)}::jsonb,
      'active', ${generateToken()}, false, ${TRAINING_EVENT_MARKER}, ${orgId}, 'system'
    )
  `);
}

function isTrainingEventTemplate(template: any): boolean {
  const marker = template?.generatedFromSection ?? template?.generated_from_section;
  return marker === TRAINING_EVENT_MARKER;
}

interface ParsedTrainingEventForm {
  studentName: string;
  instructorName: string;
  eventType: string;
  eventDate: Date;
  durationHours: number | null;
  curriculumItem: string | null;
  notes: string | null;
}

/** Validate BEFORE anything is persisted — throws on invalid input. */
function parseTrainingEventForm(formData: Record<string, any>): ParsedTrainingEventForm {
  const studentName = String(formData?.student_name ?? "").trim();
  const instructorName = String(formData?.instructor_name ?? "").trim();
  const eventType = String(formData?.event_type ?? "").trim();
  const eventDate = formData?.event_date ? new Date(formData.event_date) : null;
  if (!studentName || !instructorName || !eventType || !eventDate || isNaN(eventDate.getTime())) {
    throw new Error("Training Event form requires student name, instructor name, event type, and a valid date");
  }
  const durationHours = formData.duration_hours != null && formData.duration_hours !== "" ? Number(formData.duration_hours) : null;
  if (durationHours != null && isNaN(durationHours)) throw new Error("Duration must be a number");
  return {
    studentName, instructorName, eventType, eventDate, durationHours,
    curriculumItem: formData.curriculum_item || null,
    notes: formData.notes || null,
  };
}

/**
 * Inside a transaction: create the official training record from a validated
 * form and link it to the submission. Returns the new training event id.
 */
async function createTrainingEventFromForm(
  tx: any,
  submissionId: string,
  orgId: string,
  parsed: ParsedTrainingEventForm,
  submittedBy: string,
): Promise<string> {
  // Link to roster records only on an unambiguous full-name match
  const uniqueId = async (table: "students" | "bccs_instructor_records", name: string) => {
    const rows = await tx.execute(sql`
      SELECT id FROM ${sql.raw(table)}
      WHERE organization_id = ${orgId}
        AND LOWER(TRIM(first_name || ' ' || last_name)) = ${name.toLowerCase()}
    `).then((r: any) => r.rows);
    return rows.length === 1 ? rows[0].id : null;
  };
  const studentId = await uniqueId("students", parsed.studentName);
  const instructorId = await uniqueId("bccs_instructor_records", parsed.instructorName);

  const hash = `BCCS-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  const inserted = await tx.execute(sql`
    INSERT INTO bccs_training_events (student_name, student_id, instructor_name, instructor_id, event_type, event_date, duration_hours, curriculum_item, notes, status, blockchain_hash, user_id, organization_id)
    VALUES (${parsed.studentName}, ${studentId}, ${parsed.instructorName}, ${instructorId}, ${parsed.eventType}, ${parsed.eventDate}, ${parsed.durationHours}, ${parsed.curriculumItem}, ${parsed.notes}, 'completed', ${hash}, ${submittedBy}, ${orgId})
    RETURNING id
  `).then((r: any) => r.rows);
  const eventId = inserted[0]?.id;
  if (!eventId) throw new Error("Failed to create training record from form submission");

  await tx.execute(sql`UPDATE digital_form_submissions SET training_event_id = ${eventId} WHERE id = ${submissionId}`);
  return eventId;
}

/** Post-commit: auto-sign (non-fatal) and notify the audit agents. */
async function afterTrainingEventCreated(eventId: string, orgId: string): Promise<void> {
  try {
    const { getOrgActiveKey, signTrainingRecord } = await import("../services/crypto-signing");
    if (await getOrgActiveKey(orgId)) await signTrainingRecord(eventId, orgId);
  } catch (signErr) {
    console.warn("Form-submission auto-sign skipped:", (signErr as Error).message);
  }
  queueAuditReadinessRefresh(orgId, "training_event_form_submitted");
}

ensureTables().catch(console.error);

// ── PUBLIC ROUTES (no auth required) ──────────────────────────────────────

// GET public form by token — anyone with the link can access this
router.get("/public/:token", async (req, res) => {
  try {
    const [template] = await db
      .select()
      .from(digitalFormTemplates)
      .where(eq(digitalFormTemplates.publicToken, req.params.token));

    if (!template || template.status !== "active" || !template.isPublic) {
      return res.status(404).json({ message: "Form not found or no longer available" });
    }

    // Only return safe fields (no internal IDs leaking unnecessary info)
    res.json({
      id: template.id,
      title: template.title,
      description: template.description,
      organizationName: template.organizationName,
      faaSourceId: template.faaSourceId,
      faaDocumentTitle: template.faaDocumentTitle,
      faaDocumentType: template.faaDocumentType,
      fields: template.fields,
      publicToken: template.publicToken,
    });
  } catch (err) {
    console.error("Error fetching public form:", err);
    res.status(500).json({ message: "Failed to load form" });
  }
});

// POST public form submission — anyone can submit
router.post("/public/:token/submit", async (req, res) => {
  try {
    const [template] = await db
      .select()
      .from(digitalFormTemplates)
      .where(eq(digitalFormTemplates.publicToken, req.params.token));

    if (!template || template.status !== "active" || !template.isPublic) {
      return res.status(404).json({ message: "Form not found or no longer available" });
    }

    const { formData, submitterName, submitterEmail, notes } = req.body;

    if (!formData || typeof formData !== "object") {
      return res.status(400).json({ message: "Form data is required" });
    }

    const pubOrgId = (template as any).organizationId as string | null;

    // Training Event forms: validate BEFORE anything is persisted
    let parsed: ParsedTrainingEventForm | null = null;
    if (pubOrgId && isTrainingEventTemplate(template)) {
      try {
        parsed = parseTrainingEventForm(formData);
      } catch (validationErr) {
        return res.status(400).json({ message: (validationErr as Error).message });
      }
    }

    let eventId: string | null = null;
    const submission = await db.transaction(async (tx) => {
      const [sub] = await tx
        .insert(digitalFormSubmissions)
        .values({
          templateId: template.id,
          templateTitle: template.title,
          organizationName: template.organizationName,
          organizationId: pubOrgId,
          submittedBy: submitterEmail || submitterName || "anonymous",
          formData,
          notes: notes || null,
          status: "submitted",
        } as any)
        .returning();
      if (parsed && pubOrgId) eventId = await createTrainingEventFromForm(tx, sub.id, pubOrgId, parsed, submitterEmail || submitterName || "public-form");
      return sub;
    });

    if (eventId && pubOrgId) await afterTrainingEventCreated(eventId, pubOrgId);
    else if (pubOrgId) queueAuditReadinessRefresh(pubOrgId, "public_form_submitted");

    res.status(201).json({ success: true, submissionId: submission.id });
  } catch (err) {
    console.error("Error submitting public form:", err);
    res.status(500).json({ message: "Failed to submit form" });
  }
});

// ── AUTHENTICATED ROUTES ───────────────────────────────────────────────────

// GET all templates
router.get("/templates", isAuthenticated, async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    await ensureTrainingEventTemplate(orgId).catch((err) => console.error("ensureTrainingEventTemplate failed:", err));
    const templates = await db
      .select()
      .from(digitalFormTemplates)
      .where(and(eq(digitalFormTemplates.status, "active"), eq(digitalFormTemplates.organizationId, orgId)))
      .orderBy(desc(digitalFormTemplates.createdAt));
    res.json(templates);
  } catch (err) {
    console.error("Error fetching form templates:", err);
    res.status(500).json({ message: "Failed to fetch form templates" });
  }
});

// GET single template
router.get("/templates/:id", isAuthenticated, async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const [template] = await db
      .select()
      .from(digitalFormTemplates)
      .where(and(eq(digitalFormTemplates.id, req.params.id), eq(digitalFormTemplates.organizationId, orgId)));
    if (!template) return res.status(404).json({ message: "Template not found" });
    res.json(template);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch template" });
  }
});

// POST create template
router.post("/templates", isAuthenticated, async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const user = req.user as any;
    const { title, description, organizationName, faaSourceId, faaDocumentTitle, faaDocumentType, fields, isPublic } = req.body;

    if (!title?.trim()) return res.status(400).json({ message: "Title is required" });
    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({ message: "At least one field is required" });
    }

    const [template] = await db
      .insert(digitalFormTemplates)
      .values({
        title: title.trim(),
        description: description || null,
        organizationName: organizationName || null,
        organizationId: orgId,
        faaSourceId: faaSourceId || null,
        faaDocumentTitle: faaDocumentTitle || null,
        faaDocumentType: faaDocumentType || null,
        fields,
        status: "active",
        publicToken: generateToken(),
        isPublic: isPublic !== false,
        createdBy: user?.email || user?.username || "system",
      })
      .returning();

    res.status(201).json(template);
  } catch (err) {
    console.error("Error creating template:", err);
    res.status(500).json({ message: "Failed to create template" });
  }
});

// PUT update template
router.put("/templates/:id", isAuthenticated, async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const { title, description, organizationName, faaSourceId, faaDocumentTitle, faaDocumentType, fields, isPublic } = req.body;

    // The system Training Event template is locked: its structure feeds official
    // training records, and it must never be exposed publicly.
    const [existing] = await db
      .select({ generatedFromSection: digitalFormTemplates.generatedFromSection })
      .from(digitalFormTemplates)
      .where(and(eq(digitalFormTemplates.id, req.params.id), eq(digitalFormTemplates.organizationId, orgId)));
    if (!existing) return res.status(404).json({ message: "Template not found" });
    if (isTrainingEventTemplate(existing)) {
      return res.status(403).json({ message: "The built-in Training Event template cannot be edited" });
    }

    const [updated] = await db
      .update(digitalFormTemplates)
      .set({
        title: title?.trim(),
        description: description || null,
        organizationName: organizationName || null,
        faaSourceId: faaSourceId || null,
        faaDocumentTitle: faaDocumentTitle || null,
        faaDocumentType: faaDocumentType || null,
        fields: fields || [],
        isPublic: isPublic !== false,
        updatedAt: new Date(),
      })
      .where(and(eq(digitalFormTemplates.id, req.params.id), eq(digitalFormTemplates.organizationId, orgId)))
      .returning();

    if (!updated) return res.status(404).json({ message: "Template not found" });
    res.json(updated);
  } catch (err) {
    console.error("Error updating template:", err);
    res.status(500).json({ message: "Failed to update template" });
  }
});

// POST regenerate public link
router.post("/templates/:id/regenerate-token", isAuthenticated, async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const [updated] = await db
      .update(digitalFormTemplates)
      .set({ publicToken: generateToken(), updatedAt: new Date() })
      .where(and(eq(digitalFormTemplates.id, req.params.id), eq(digitalFormTemplates.organizationId, orgId)))
      .returning();
    if (!updated) return res.status(404).json({ message: "Template not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to regenerate link" });
  }
});

// DELETE (archive) template
router.delete("/templates/:id", isAuthenticated, async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const [existing] = await db
      .select({ generatedFromSection: digitalFormTemplates.generatedFromSection })
      .from(digitalFormTemplates)
      .where(and(eq(digitalFormTemplates.id, req.params.id), eq(digitalFormTemplates.organizationId, orgId)));
    if (!existing) return res.status(404).json({ message: "Template not found" });
    if (isTrainingEventTemplate(existing)) {
      return res.status(403).json({ message: "The built-in Training Event template cannot be archived" });
    }
    const [archived] = await db
      .update(digitalFormTemplates)
      .set({ status: "archived" })
      .where(and(eq(digitalFormTemplates.id, req.params.id), eq(digitalFormTemplates.organizationId, orgId)))
      .returning();
    if (!archived) return res.status(404).json({ message: "Template not found" });
    res.json({ message: "Template archived" });
  } catch (err) {
    res.status(500).json({ message: "Failed to archive template" });
  }
});

// ── SUBMISSIONS ────────────────────────────────────────────────────────────

router.get("/submissions", isAuthenticated, async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const submissions = await db
      .select()
      .from(digitalFormSubmissions)
      .where(eq(digitalFormSubmissions.organizationId, orgId))
      .orderBy(desc(digitalFormSubmissions.submittedAt));
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch submissions" });
  }
});

// GET /api/digital-forms/submissions/export — CSV download (MUST be before /:id)
router.get("/submissions/export", isAuthenticated, async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const rows = await db.execute(sql`
      SELECT s.id, s.template_title, s.organization_name, s.submitted_by,
             s.submitter_name, s.submitter_email,
             s.submitted_at, s.status, s.form_data, s.notes,
             t.faa_source_id, t.faa_document_title
      FROM digital_form_submissions s
      LEFT JOIN digital_form_templates t ON t.id = s.template_id
      WHERE s.organization_id = ${orgId}
      ORDER BY s.submitted_at DESC
    `).then(r => (r as any).rows);

    if (rows.length === 0) {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="form-submissions-${new Date().toISOString().split("T")[0]}.csv"`);
      return res.send("id,template_title,organization,submitted_by,submitted_at,status\n");
    }

    const allFieldKeys = new Set<string>();
    for (const row of rows) {
      const data = row.form_data as Record<string, any>;
      if (data && typeof data === "object") {
        Object.keys(data).forEach(k => allFieldKeys.add(k));
      }
    }
    const fieldKeys = Array.from(allFieldKeys).sort();

    const escapeCSV = (val: any): string => {
      if (val === null || val === undefined) return "";
      const s = String(val);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const staticCols = ["id", "template_title", "organization_name", "submitted_by", "submitter_name", "submitter_email", "submitted_at", "status", "notes", "faa_source_id", "faa_document_title"];
    const header = [...staticCols, ...fieldKeys.map(k => `field_${k}`)].join(",");
    const csvRows = rows.map((row: any) => {
      const data = (row.form_data as Record<string, any>) || {};
      const staticVals = staticCols.map(c => escapeCSV((row as any)[c]));
      const fieldVals = fieldKeys.map(k => escapeCSV(data[k]));
      return [...staticVals, ...fieldVals].join(",");
    });

    const csv = [header, ...csvRows].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="form-submissions-${new Date().toISOString().split("T")[0]}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error("Form export error:", err);
    res.status(500).json({ message: "Failed to export submissions" });
  }
});

router.get("/submissions/:id", isAuthenticated, async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const [submission] = await db
      .select()
      .from(digitalFormSubmissions)
      .where(and(eq(digitalFormSubmissions.id, req.params.id), eq(digitalFormSubmissions.organizationId, orgId)));
    if (!submission) return res.status(404).json({ message: "Submission not found" });
    res.json(submission);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch submission" });
  }
});

// Internal (authenticated) submission — for admins filling forms themselves
router.post("/submissions", isAuthenticated, async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const user = req.user as any;
    const { templateId, templateTitle, organizationName, formData, notes, status } = req.body;
    if (!templateId) return res.status(400).json({ message: "Template ID is required" });

    // The template being filled must belong to the active organization.
    const [template] = await db
      .select({ id: digitalFormTemplates.id, generatedFromSection: digitalFormTemplates.generatedFromSection })
      .from(digitalFormTemplates)
      .where(and(eq(digitalFormTemplates.id, templateId), eq(digitalFormTemplates.organizationId, orgId)));
    if (!template) return res.status(404).json({ message: "Template not found" });

    // Training Event forms: validate BEFORE anything is persisted
    let parsed: ParsedTrainingEventForm | null = null;
    if (isTrainingEventTemplate(template)) {
      try {
        parsed = parseTrainingEventForm(formData || {});
      } catch (validationErr) {
        return res.status(400).json({ message: (validationErr as Error).message });
      }
    }

    // Submission + training record + backlink commit or roll back together
    let eventId: string | null = null;
    const submission = await db.transaction(async (tx) => {
      const [sub] = await tx
        .insert(digitalFormSubmissions)
        .values({
          templateId,
          templateTitle: templateTitle || null,
          organizationName: organizationName || null,
          organizationId: orgId,
          submittedBy: user?.email || user?.username || "system",
          formData,
          status: status || "submitted",
          notes: notes || null,
        })
        .returning();
      if (parsed) eventId = await createTrainingEventFromForm(tx, sub.id, orgId, parsed, user?.email || "form");
      return sub;
    });

    if (eventId) await afterTrainingEventCreated(eventId, orgId);
    else queueAuditReadinessRefresh(orgId, "form_submitted");
    res.status(201).json(submission);
  } catch (err) {
    res.status(500).json({ message: "Failed to save form submission" });
  }
});

router.patch("/submissions/:id/status", isAuthenticated, async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const { status } = req.body;
    const [updated] = await db
      .update(digitalFormSubmissions)
      .set({ status })
      .where(and(eq(digitalFormSubmissions.id, req.params.id), eq(digitalFormSubmissions.organizationId, orgId)))
      .returning();
    if (!updated) return res.status(404).json({ message: "Submission not found" });
    queueAuditReadinessRefresh(orgId, "form_submission_status_changed");
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update status" });
  }
});

router.get("/stats", isAuthenticated, async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const [{ templateCount }] = await db
      .select({ templateCount: sql<number>`count(*)` })
      .from(digitalFormTemplates)
      .where(and(eq(digitalFormTemplates.status, "active"), eq(digitalFormTemplates.organizationId, orgId)));

    const [{ totalSubmissions }] = await db
      .select({ totalSubmissions: sql<number>`count(*)` })
      .from(digitalFormSubmissions)
      .where(eq(digitalFormSubmissions.organizationId, orgId));

    const [{ submittedCount }] = await db
      .select({ submittedCount: sql<number>`count(*)` })
      .from(digitalFormSubmissions)
      .where(and(eq(digitalFormSubmissions.status, "submitted"), eq(digitalFormSubmissions.organizationId, orgId)));

    const [{ approvedCount }] = await db
      .select({ approvedCount: sql<number>`count(*)` })
      .from(digitalFormSubmissions)
      .where(and(eq(digitalFormSubmissions.status, "approved"), eq(digitalFormSubmissions.organizationId, orgId)));

    res.json({
      templateCount: Number(templateCount),
      totalSubmissions: Number(totalSubmissions),
      submittedCount: Number(submittedCount),
      approvedCount: Number(approvedCount),
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

// ── CHECKLIST GENERATION & MONITORING ─────────────────────────────────────

const openai = new OpenAI();

// The Part 142 checklist sections we can auto-generate templates for
const PART_142_SECTIONS = [
  {
    id: "142-general",
    sectionRef: "§142.1–142.11",
    title: "General Requirements",
    description: "Applicability, certificate requirements, and general operating standards for aviation training centers.",
    requirements: [
      "Applicability and certificate required (§142.1)",
      "Certificate application requirements (§142.5)",
      "Issue of certificate and training specifications (§142.7)",
      "Duration of certificate (§142.9)",
      "Display of certificate (§142.11)",
      "Falsification of applications, certificates, and reports (§142.13)",
    ],
  },
  {
    id: "142-personnel",
    sectionRef: "§142.27–142.35",
    title: "Personnel Requirements",
    description: "Chief instructor, assistant chief instructor, and other personnel qualifications and requirements.",
    requirements: [
      "Director of safety (§142.27)",
      "Check instructor qualifications (§142.29)",
      "Flight simulation device instructor qualifications (§142.31)",
      "Training center instructor qualifications (§142.33)",
      "Employment of former FAA employees (§142.35)",
    ],
  },
  {
    id: "142-training-programs",
    sectionRef: "§142.37–142.59",
    title: "Training Programs & Curriculum",
    description: "Curriculum and course content requirements, training programs, and quality assurance for Part 142 training centers.",
    requirements: [
      "Approval of training programs (§142.37)",
      "Limitations on training programs (§142.39)",
      "Use and approval of training devices (§142.41)",
      "Qualifications of check instructors (§142.43)",
      "Requalification of check instructors (§142.45)",
      "Training program curriculum requirements (§142.47)",
      "Airline transport pilot certification training program (§142.49)",
    ],
  },
  {
    id: "142-facilities",
    sectionRef: "§142.61–142.67",
    title: "Facilities & Equipment",
    description: "Physical facility requirements, training equipment standards, and FSTD requirements for Part 142 centers.",
    requirements: [
      "Facility requirements (§142.61)",
      "Flight simulation device requirements (§142.63)",
      "FSTD maintenance and qualification standards (§142.65)",
      "Aircraft simulators and training devices (§142.67)",
      "Facility inspection access for FAA (§142.67(d))",
    ],
  },
  {
    id: "142-records",
    sectionRef: "§142.71–142.79",
    title: "Records & Reporting",
    description: "Recordkeeping requirements, record availability, and reporting obligations for Part 142 training centers.",
    requirements: [
      "Recordkeeping requirements (§142.71)",
      "Records: Instructors (§142.73)",
      "Records: Students and graduates (§142.75)",
      "Records: Maintenance of training devices (§142.77)",
      "Availability of records for inspection (§142.79)",
    ],
  },
  {
    id: "142-ops",
    sectionRef: "§142.11–142.25",
    title: "Operating Rules & Authorizations",
    description: "Privileges, limitations, deviations, and flight simulation quality assurance program requirements.",
    requirements: [
      "Privileges of certificate (§142.11)",
      "Limitations of certificate (§142.13)",
      "Devation authority (§142.17)",
      "Flight simulation quality assurance program (§142.25)",
      "Satellite training centers (§142.26)",
    ],
  },
];

// GET checklist sources — returns FAA docs appropriate for template generation
router.get("/checklist-sources", isAuthenticated, async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT source_id, title, source_type, status, content_hash, last_changed_at, amendment_date
      FROM bccs_faa_repository
      WHERE (far_parts @> ARRAY['142']::text[] OR source_id LIKE '%142%')
      ORDER BY priority DESC, title ASC
    `);

    res.json({
      faaDocuments: result.rows,
      part142Sections: PART_142_SECTIONS,
    });
  } catch (err) {
    console.error("Error fetching checklist sources:", err);
    res.status(500).json({ message: "Failed to fetch checklist sources" });
  }
});

// GET stale check — returns regulation_status for all auto-generated templates
router.get("/stale-check", isAuthenticated, async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    // Get this org's auto-generated templates that link to FAA docs
    const templates = await db.execute(sql`
      SELECT t.id, t.faa_source_id, t.checklist_version_hash, t.regulation_status
      FROM digital_form_templates t
      WHERE t.auto_generated = true AND t.faa_source_id IS NOT NULL AND t.status = 'active'
        AND t.organization_id = ${orgId}
    `);

    if (templates.rows.length === 0) return res.json({});

    // Get current hashes from FAA repository
    const sourceIds = Array.from(new Set(templates.rows.map((r: any) => r.faa_source_id)));
    const faaRows = await db.execute(sql`
      SELECT source_id, content_hash, status FROM bccs_faa_repository
      WHERE source_id = ANY(${sourceIds}::text[])
    `);

    const faaHashMap: Record<string, { hash: string | null; status: string }> = {};
    for (const row of faaRows.rows as any[]) {
      faaHashMap[row.source_id] = { hash: row.content_hash, status: row.status };
    }

    const staleMap: Record<string, { stale: boolean; faaStatus: string }> = {};
    for (const tmpl of templates.rows as any[]) {
      const faaInfo = faaHashMap[tmpl.faa_source_id];
      if (!faaInfo) { staleMap[tmpl.id] = { stale: false, faaStatus: 'unknown' }; continue; }

      const isStale =
        faaInfo.status === 'updated' ||
        (faaInfo.hash && tmpl.checklist_version_hash && faaInfo.hash !== tmpl.checklist_version_hash);

      staleMap[tmpl.id] = { stale: !!isStale, faaStatus: faaInfo.status };

      // Persist the regulation_status if it has changed
      if (isStale && tmpl.regulation_status !== 'needs_review') {
        await db.execute(sql`
          UPDATE digital_form_templates SET regulation_status = 'needs_review', updated_at = NOW()
          WHERE id = ${tmpl.id}
        `);
      }
    }

    res.json(staleMap);
  } catch (err) {
    console.error("Error checking stale templates:", err);
    res.status(500).json({ message: "Failed to check stale templates" });
  }
});

// POST generate templates from FAA Part 142 checklist section
router.post("/generate-from-checklist", isAuthenticated, async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const user = req.user as any;
    const { sectionId, organizationName, faaSourceId } = req.body;

    const section = PART_142_SECTIONS.find((s) => s.id === sectionId);
    if (!section) return res.status(400).json({ message: "Unknown checklist section" });

    // Fetch the current amendment hash for this FAA source
    let currentHash: string | null = null;
    if (faaSourceId) {
      try {
        const hashResult = await db.execute(sql`
          SELECT content_hash FROM bccs_faa_repository WHERE source_id = ${faaSourceId}
        `);
        currentHash = (hashResult.rows[0] as any)?.content_hash || null;
      } catch (dbErr: any) {
        console.warn("[Generate] Could not fetch FAA hash:", dbErr?.message);
      }
    }

    // Build the prompt
    const prompt = `You are an expert in FAA aviation regulations for Part 142 Training Centers.
Generate a comprehensive compliance inspection checklist form for the section: ${section.title} (${section.sectionRef}).

The checklist form is for an FAA Aviation Safety Inspector (ASI) conducting a surveillance inspection of a Part 142 aviation training center.

Section description: ${section.description}

Key regulatory requirements to cover:
${section.requirements.map((r, i) => `${i + 1}. ${r}`).join("\n")}

Generate a JSON array of form fields. Each field should have:
- "id": unique snake_case string
- "label": clear inspection item label (15-60 chars)
- "type": one of ["text", "textarea", "checkbox", "select", "date", "number"]
- "required": boolean
- "options": array of strings (only for "select" type), otherwise omit
- "placeholder": helpful hint (only for text/textarea/number)

Requirements:
- Include 10-18 checklist items covering the section requirements
- Mix field types appropriately:
  * Use "checkbox" for yes/no compliance items
  * Use "select" for status items (Satisfactory/Unsatisfactory/N/A or similar)
  * Use "textarea" for findings/narrative fields
  * Use "date" for dates
  * Use "text" for names, certificate numbers, identifiers
- First field should always be: inspector name (text, required)
- Second field: inspection date (date, required)  
- Third field: training center name (text, required)
- Fourth field: certificate number (text, required)
- Then the section-specific compliance items
- Last field: overall findings/comments (textarea)

Respond with a JSON object in this exact format: { "fields": [ ...array of field objects... ] }`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    let fields: any[] = [];
    try {
      const raw = completion.choices[0].message.content || "{}";
      const parsed = JSON.parse(raw);
      // Try known keys first, then find any array value
      fields = parsed.fields || parsed.items || parsed.checklist || parsed.form_fields ||
        (Object.values(parsed).find((v) => Array.isArray(v)) as any[]);
      if (!Array.isArray(fields) || fields.length === 0) {
        console.error("OpenAI response had no valid array. Raw:", raw.slice(0, 300));
        throw new Error("No field array in AI response");
      }
    } catch (parseErr: any) {
      return res.status(500).json({ message: `AI response parsing failed: ${parseErr.message}` });
    }

    // Create the template
    const [template] = await db
      .insert(digitalFormTemplates)
      .values({
        title: `Part 142 – ${section.title} Inspection`,
        description: `FAA inspection checklist for ${section.sectionRef}: ${section.description}`,
        organizationName: organizationName || null,
        organizationId: orgId,
        faaSourceId: faaSourceId || "14-CFR-142",
        faaDocumentTitle: "14 CFR Part 142 – Training Centers",
        faaDocumentType: "cfr_part",
        fields,
        status: "active",
        publicToken: generateToken(),
        isPublic: true,
        autoGenerated: true,
        checklistVersionHash: currentHash,
        regulationStatus: "current",
        generatedFromSection: `${section.sectionRef} ${section.title}`,
        createdBy: user?.email || user?.username || "system",
      } as any)
      .returning();

    res.status(201).json(template);
  } catch (err: any) {
    console.error("Error generating template from checklist:", err?.message || err);
    res.status(500).json({ message: "Failed to generate template from checklist" });
  }
});

// POST refresh a single template from FAA regulation (AI re-generate fields)
router.post("/templates/:id/refresh-from-faa", isAuthenticated, async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const [existing] = await db
      .select()
      .from(digitalFormTemplates)
      .where(and(eq(digitalFormTemplates.id, req.params.id), eq(digitalFormTemplates.organizationId, orgId)));

    if (!existing) return res.status(404).json({ message: "Template not found" });
    if (!existing.autoGenerated) return res.status(400).json({ message: "Only AI-generated templates can be refreshed from FAA" });

    // Find the section to regenerate from
    const section = PART_142_SECTIONS.find(
      (s) => existing.generatedFromSection?.includes(s.sectionRef) || existing.generatedFromSection?.includes(s.title)
    );

    // Fetch current amendment hash
    let currentHash: string | null = null;
    if (existing.faaSourceId) {
      const hashResult = await db.execute(sql`
        SELECT content_hash FROM bccs_faa_repository WHERE source_id = ${existing.faaSourceId}
      `);
      currentHash = (hashResult.rows[0] as any)?.content_hash || null;
    }

    const sectionDescription = section
      ? `${section.title} (${section.sectionRef})\n\nKey requirements:\n${section.requirements.join("\n")}`
      : existing.generatedFromSection || "Part 142 Training Centers";

    const prompt = `You are an expert in FAA aviation regulations for Part 142 Training Centers.
The FAA has updated 14 CFR Part 142. Regenerate an improved compliance inspection checklist for:
${sectionDescription}

Current form title: ${existing.title}
Current field count: ${(existing.fields as any[]).length}

Generate an updated JSON array of form fields reflecting current regulatory requirements.
Each field must have: "id" (snake_case), "label" (15-60 chars), "type" (text/textarea/checkbox/select/date/number), "required" (boolean).
Add "options" array only for "select" type fields. Add "placeholder" for text/textarea/number fields.

Requirements:
- 10-18 fields total
- Start with: inspector name (text), inspection date (date), training center name (text), certificate number (text)
- Cover all section compliance requirements with appropriate field types
- End with overall findings/comments (textarea)

Respond with ONLY a valid JSON object: { "fields": [...] }`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    let newFields: any[] = [];
    try {
      const raw = completion.choices[0].message.content || "{}";
      const parsed = JSON.parse(raw);
      newFields = parsed.fields || parsed.items || parsed.checklist || parsed.form_fields ||
        (Object.values(parsed).find((v) => Array.isArray(v)) as any[]);
      if (!Array.isArray(newFields) || newFields.length === 0) throw new Error("No field array in AI response");
    } catch (parseErr: any) {
      return res.status(500).json({ message: `AI response parsing failed: ${parseErr.message}` });
    }

    const [updated] = await db
      .update(digitalFormTemplates)
      .set({
        fields: newFields,
        checklistVersionHash: currentHash,
        regulationStatus: "current",
        updatedAt: new Date(),
      } as any)
      .where(and(eq(digitalFormTemplates.id, req.params.id), eq(digitalFormTemplates.organizationId, orgId)))
      .returning();

    res.json(updated);
  } catch (err) {
    console.error("Error refreshing template from FAA:", err);
    res.status(500).json({ message: "Failed to refresh template from FAA" });
  }
});

export default router;
