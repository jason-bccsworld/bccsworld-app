import { Router } from "express";
import { db } from "../db";
import { digitalFormTemplates, digitalFormSubmissions } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";

const router = Router();

// Ensure tables exist
async function ensureTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS digital_form_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(300) NOT NULL,
      description TEXT,
      faa_source_id VARCHAR(100),
      faa_document_title VARCHAR(300),
      faa_document_type VARCHAR(50),
      fields JSONB NOT NULL DEFAULT '[]',
      status VARCHAR(20) DEFAULT 'active',
      created_by VARCHAR(200),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS digital_form_submissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id UUID NOT NULL REFERENCES digital_form_templates(id) ON DELETE CASCADE,
      template_title VARCHAR(300),
      organization_name VARCHAR(300),
      submitted_by VARCHAR(200),
      form_data JSONB NOT NULL DEFAULT '{}',
      status VARCHAR(20) DEFAULT 'submitted',
      notes TEXT,
      submitted_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

ensureTables().catch(console.error);

// ── TEMPLATES ──────────────────────────────────────────────────────────────

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
    console.error("Error fetching template:", err);
    res.status(500).json({ message: "Failed to fetch template" });
  }
});

// POST create template
router.post("/templates", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const { title, description, faaSourceId, faaDocumentTitle, faaDocumentType, fields } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }
    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({ message: "At least one field is required" });
    }

    const [template] = await db
      .insert(digitalFormTemplates)
      .values({
        title: title.trim(),
        description: description || null,
        faaSourceId: faaSourceId || null,
        faaDocumentTitle: faaDocumentTitle || null,
        faaDocumentType: faaDocumentType || null,
        fields,
        status: "active",
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
    const { title, description, faaSourceId, faaDocumentTitle, faaDocumentType, fields } = req.body;

    const [updated] = await db
      .update(digitalFormTemplates)
      .set({
        title: title?.trim(),
        description: description || null,
        faaSourceId: faaSourceId || null,
        faaDocumentTitle: faaDocumentTitle || null,
        faaDocumentType: faaDocumentType || null,
        fields: fields || [],
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

// DELETE (archive) template
router.delete("/templates/:id", isAuthenticated, async (req, res) => {
  try {
    await db
      .update(digitalFormTemplates)
      .set({ status: "archived" })
      .where(eq(digitalFormTemplates.id, req.params.id));
    res.json({ message: "Template archived" });
  } catch (err) {
    console.error("Error archiving template:", err);
    res.status(500).json({ message: "Failed to archive template" });
  }
});

// ── SUBMISSIONS ────────────────────────────────────────────────────────────

// GET all submissions (document repository)
router.get("/submissions", isAuthenticated, async (req, res) => {
  try {
    const submissions = await db
      .select()
      .from(digitalFormSubmissions)
      .orderBy(desc(digitalFormSubmissions.submittedAt));
    res.json(submissions);
  } catch (err) {
    console.error("Error fetching submissions:", err);
    res.status(500).json({ message: "Failed to fetch submissions" });
  }
});

// GET single submission
router.get("/submissions/:id", isAuthenticated, async (req, res) => {
  try {
    const [submission] = await db
      .select()
      .from(digitalFormSubmissions)
      .where(eq(digitalFormSubmissions.id, req.params.id));
    if (!submission) return res.status(404).json({ message: "Submission not found" });
    res.json(submission);
  } catch (err) {
    console.error("Error fetching submission:", err);
    res.status(500).json({ message: "Failed to fetch submission" });
  }
});

// POST create submission (fill out a form)
router.post("/submissions", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const { templateId, templateTitle, organizationName, formData, notes, status } = req.body;

    if (!templateId) {
      return res.status(400).json({ message: "Template ID is required" });
    }
    if (!formData || typeof formData !== "object") {
      return res.status(400).json({ message: "Form data is required" });
    }

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
    console.error("Error creating submission:", err);
    res.status(500).json({ message: "Failed to save form submission" });
  }
});

// PATCH update submission status
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
    console.error("Error updating submission status:", err);
    res.status(500).json({ message: "Failed to update status" });
  }
});

// GET stats
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
    console.error("Error fetching stats:", err);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

export default router;
