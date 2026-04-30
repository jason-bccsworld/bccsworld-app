import { Router } from "express";
import { db } from "../db";
import { digitalFormTemplates, digitalFormSubmissions } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";
import crypto from "crypto";

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

    const [submission] = await db
      .insert(digitalFormSubmissions)
      .values({
        templateId: template.id,
        templateTitle: template.title,
        organizationName: template.organizationName,
        submittedBy: submitterEmail || submitterName || "anonymous",
        formData,
        notes: notes || null,
        status: "submitted",
      } as any)
      .returning();

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
    const templates = await db
      .select()
      .from(digitalFormTemplates)
      .where(eq(digitalFormTemplates.status, "active"))
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
    const [template] = await db
      .select()
      .from(digitalFormTemplates)
      .where(eq(digitalFormTemplates.id, req.params.id));
    if (!template) return res.status(404).json({ message: "Template not found" });
    res.json(template);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch template" });
  }
});

// POST create template
router.post("/templates", isAuthenticated, async (req, res) => {
  try {
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
    const { title, description, organizationName, faaSourceId, faaDocumentTitle, faaDocumentType, fields, isPublic } = req.body;

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
      .where(eq(digitalFormTemplates.id, req.params.id))
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
    const [updated] = await db
      .update(digitalFormTemplates)
      .set({ publicToken: generateToken(), updatedAt: new Date() })
      .where(eq(digitalFormTemplates.id, req.params.id))
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
    await db
      .update(digitalFormTemplates)
      .set({ status: "archived" })
      .where(eq(digitalFormTemplates.id, req.params.id));
    res.json({ message: "Template archived" });
  } catch (err) {
    res.status(500).json({ message: "Failed to archive template" });
  }
});

// ── SUBMISSIONS ────────────────────────────────────────────────────────────

router.get("/submissions", isAuthenticated, async (req, res) => {
  try {
    const submissions = await db
      .select()
      .from(digitalFormSubmissions)
      .orderBy(desc(digitalFormSubmissions.submittedAt));
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch submissions" });
  }
});

router.get("/submissions/:id", isAuthenticated, async (req, res) => {
  try {
    const [submission] = await db
      .select()
      .from(digitalFormSubmissions)
      .where(eq(digitalFormSubmissions.id, req.params.id));
    if (!submission) return res.status(404).json({ message: "Submission not found" });
    res.json(submission);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch submission" });
  }
});

// Internal (authenticated) submission — for admins filling forms themselves
router.post("/submissions", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const { templateId, templateTitle, organizationName, formData, notes, status } = req.body;
    if (!templateId) return res.status(400).json({ message: "Template ID is required" });

    const [submission] = await db
      .insert(digitalFormSubmissions)
      .values({
        templateId,
        templateTitle: templateTitle || null,
        organizationName: organizationName || null,
        submittedBy: user?.email || user?.username || "system",
        formData,
        status: status || "submitted",
        notes: notes || null,
      })
      .returning();

    res.status(201).json(submission);
  } catch (err) {
    res.status(500).json({ message: "Failed to save form submission" });
  }
});

router.patch("/submissions/:id/status", isAuthenticated, async (req, res) => {
  try {
    const { status } = req.body;
    const [updated] = await db
      .update(digitalFormSubmissions)
      .set({ status })
      .where(eq(digitalFormSubmissions.id, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ message: "Submission not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update status" });
  }
});

router.get("/stats", isAuthenticated, async (req, res) => {
  try {
    const [{ templateCount }] = await db
      .select({ templateCount: sql<number>`count(*)` })
      .from(digitalFormTemplates)
      .where(eq(digitalFormTemplates.status, "active"));

    const [{ totalSubmissions }] = await db
      .select({ totalSubmissions: sql<number>`count(*)` })
      .from(digitalFormSubmissions);

    const [{ submittedCount }] = await db
      .select({ submittedCount: sql<number>`count(*)` })
      .from(digitalFormSubmissions)
      .where(eq(digitalFormSubmissions.status, "submitted"));

    const [{ approvedCount }] = await db
      .select({ approvedCount: sql<number>`count(*)` })
      .from(digitalFormSubmissions)
      .where(eq(digitalFormSubmissions.status, "approved"));

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

export default router;
