/**
 * Instructor Portal — key-based access for instructors.
 *
 * Admins assign each instructor a key from the Instructor Roster. The
 * instructor uses that key (no account) at /instructor to see a limited
 * dashboard: their certificate status, their students, and the form
 * templates an admin has enabled for instructors.
 *
 * Security model mirrors bccs_reviewer_keys: random secret, SHA-256 hash
 * stored (never the raw key), preview only, active flag. Every portal
 * endpoint is scoped to the key's instructor AND organization — the client
 * never supplies an organizationId.
 */
import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";
import { requireOrg, isPlatformStaff } from "../middleware/tenant";
import {
  isTrainingEventTemplate,
  parseTrainingEventForm,
  createTrainingEventFromForm,
  afterTrainingEventCreated,
  ParsedTrainingEventForm,
} from "./digital-forms";
import { queueAuditReadinessRefresh } from "../services/audit-readiness";

const router = Router();

async function ensureTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS bccs_instructor_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      instructor_id UUID NOT NULL,
      organization_id UUID NOT NULL,
      key_hash VARCHAR(128) NOT NULL UNIQUE,
      key_preview VARCHAR(40) NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_by VARCHAR(200),
      created_at TIMESTAMP DEFAULT NOW(),
      last_used_at TIMESTAMP
    )
  `);
}
ensureTable().catch(console.error);

function generateKey(): string {
  return `bccs_inst_${crypto.randomBytes(20).toString("base64url")}`;
}
function hashKey(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}
function extractKey(req: Request): string | null {
  const header = req.headers["x-instructor-key"];
  if (typeof header === "string" && header) return header;
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

/** Key-auth middleware: attaches the instructor record + org to the request. */
/** Admin-only guard for key management (platform staff also allowed). */
function requireAdmin(req: any, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin" && !isPlatformStaff(req.user?.email)) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

async function requireInstructorKey(req: any, res: Response, next: NextFunction) {
  try {
    const raw = extractKey(req);
    if (!raw) return res.status(401).json({ message: "Instructor key required" });
    const [keyRow] = await db.execute(sql`
      SELECT k.id AS key_id, k.instructor_id, k.organization_id, i.first_name, i.last_name,
             i.email, i.certificate_type, i.certificate_number, i.issue_date, i.expiration_date,
             i.currency_date, i.ratings, i.training_authorizations, i.status
      FROM bccs_instructor_keys k
      JOIN bccs_instructor_records i ON i.id = k.instructor_id::text
      WHERE k.key_hash = ${hashKey(raw)} AND k.is_active = TRUE
    `).then((r: any) => r.rows);
    if (!keyRow) return res.status(401).json({ message: "This key is invalid or has been revoked. Contact your organization for a new key." });
    db.execute(sql`UPDATE bccs_instructor_keys SET last_used_at = NOW() WHERE id = ${keyRow.key_id}`)
      .catch(() => {});
    req.instructor = keyRow;
    next();
  } catch (err) {
    console.error("Instructor key auth error:", err);
    res.status(500).json({ message: "Authentication failed" });
  }
}

// ── ADMIN: key management (authenticated, org-scoped) ───────────────────────

// GET key status for all instructors in the active org
router.get("/keys", isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const rows = await db.execute(sql`
      SELECT instructor_id, key_preview, created_at, last_used_at
      FROM bccs_instructor_keys
      WHERE organization_id = ${orgId} AND is_active = TRUE
    `).then((r: any) => r.rows);
    res.json(rows);
  } catch (err) {
    console.error("Instructor keys list error:", err);
    res.status(500).json({ message: "Failed to fetch key status" });
  }
});

// POST assign (or regenerate) a key for an instructor — raw key returned ONCE
router.post("/keys/:instructorId", isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const [instructor] = await db.execute(sql`
      SELECT id, first_name, last_name FROM bccs_instructor_records
      WHERE id = ${req.params.instructorId} AND organization_id = ${orgId}
    `).then((r: any) => r.rows);
    if (!instructor) return res.status(404).json({ message: "Instructor not found" });

    const rawKey = generateKey();
    const preview = rawKey.slice(0, 15) + "...";
    // Regeneration revokes any previous key for this instructor
    await db.execute(sql`
      UPDATE bccs_instructor_keys SET is_active = FALSE
      WHERE instructor_id = ${instructor.id} AND organization_id = ${orgId}
    `);
    await db.execute(sql`
      INSERT INTO bccs_instructor_keys (instructor_id, organization_id, key_hash, key_preview, created_by)
      VALUES (${instructor.id}, ${orgId}, ${hashKey(rawKey)}, ${preview}, ${req.user?.email || req.user?.id || "system"})
    `);
    res.status(201).json({
      key: rawKey,
      keyPreview: preview,
      instructorId: instructor.id,
      instructorName: `${instructor.first_name} ${instructor.last_name}`,
      warning: "Store this key securely — it will not be shown again.",
    });
  } catch (err) {
    console.error("Instructor key assign error:", err);
    res.status(500).json({ message: "Failed to assign key" });
  }
});

// DELETE revoke an instructor's key
router.delete("/keys/:instructorId", isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const result = await db.execute(sql`
      UPDATE bccs_instructor_keys SET is_active = FALSE
      WHERE instructor_id = ${req.params.instructorId} AND organization_id = ${orgId} AND is_active = TRUE
      RETURNING id
    `);
    if (((result as any).rows || []).length === 0) return res.status(404).json({ message: "No active key for this instructor" });
    res.json({ message: "Key revoked" });
  } catch (err) {
    res.status(500).json({ message: "Failed to revoke key" });
  }
});

// ── PORTAL: key-authenticated instructor endpoints ───────────────────────────

// GET /me — instructor profile + certificate status
router.get("/me", requireInstructorKey, async (req: any, res) => {
  const i = req.instructor;
  res.json({
    instructorId: i.instructor_id,
    firstName: i.first_name,
    lastName: i.last_name,
    email: i.email,
    certificateType: i.certificate_type,
    certificateNumber: i.certificate_number,
    issueDate: i.issue_date,
    expirationDate: i.expiration_date,
    currencyDate: i.currency_date,
    ratings: i.ratings,
    trainingAuthorizations: i.training_authorizations,
    status: i.status,
  });
});

// GET /students — students this instructor has trained (via linked training events)
router.get("/students", requireInstructorKey, async (req: any, res) => {
  try {
    const { instructor_id, organization_id } = req.instructor;
    const rows = await db.execute(sql`
      SELECT s.id, s.first_name, s.last_name, s.email, s.status, s.enrollment_date,
             COUNT(e.id)::int AS event_count, MAX(e.event_date) AS last_event_date
      FROM bccs_training_events e
      JOIN students s ON s.id::text = e.student_id AND s.organization_id = ${organization_id}
      WHERE e.organization_id = ${organization_id} AND e.instructor_id = ${instructor_id}::text
      GROUP BY s.id, s.first_name, s.last_name, s.email, s.status, s.enrollment_date
      ORDER BY MAX(e.event_date) DESC
    `).then((r: any) => r.rows);
    res.json(rows);
  } catch (err) {
    console.error("Instructor students error:", err);
    res.status(500).json({ message: "Failed to fetch students" });
  }
});

// GET /forms — only instructor-enabled, active templates of the instructor's org
router.get("/forms", requireInstructorKey, async (req: any, res) => {
  try {
    const { organization_id } = req.instructor;
    const rows = await db.execute(sql`
      SELECT id, title, description, fields, generated_from_section
      FROM digital_form_templates
      WHERE organization_id = ${organization_id} AND status = 'active' AND instructor_enabled = TRUE
      ORDER BY created_at DESC
    `).then((r: any) => r.rows);
    res.json(rows);
  } catch (err) {
    console.error("Instructor forms error:", err);
    res.status(500).json({ message: "Failed to fetch forms" });
  }
});

// POST /forms/:templateId/submit — submit an enabled form as this instructor
router.post("/forms/:templateId/submit", requireInstructorKey, async (req: any, res) => {
  try {
    const { instructor_id, organization_id, first_name, last_name, email } = req.instructor;
    const [template] = await db.execute(sql`
      SELECT * FROM digital_form_templates
      WHERE id = ${req.params.templateId} AND organization_id = ${organization_id}
        AND status = 'active' AND instructor_enabled = TRUE
    `).then((r: any) => r.rows);
    if (!template) return res.status(404).json({ message: "Form not found or not enabled for instructors" });

    const { formData, notes } = req.body;
    if (!formData || typeof formData !== "object") {
      return res.status(400).json({ message: "Form data is required" });
    }

    const submitterLabel = email || `${first_name} ${last_name}`;

    // Training Event forms: validate BEFORE anything is persisted
    let parsed: ParsedTrainingEventForm | null = null;
    if (isTrainingEventTemplate(template)) {
      try {
        parsed = parseTrainingEventForm({ ...formData, instructor_name: `${first_name} ${last_name}` });
        // Identity comes from the key, never from submitted form data
        parsed.instructorName = `${first_name} ${last_name}`;
      } catch (validationErr) {
        return res.status(400).json({ message: (validationErr as Error).message });
      }
    }

    let eventId: string | null = null;
    const submission = await db.transaction(async (tx) => {
      const inserted = await tx.execute(sql`
        INSERT INTO digital_form_submissions
          (template_id, template_title, organization_name, organization_id, submitted_by, form_data, notes, status)
        VALUES
          (${template.id}, ${template.title}, ${template.organization_name}, ${organization_id},
           ${`instructor:${submitterLabel}`}, ${JSON.stringify(formData)}::jsonb, ${notes || null}, 'submitted')
        RETURNING *
      `).then((r: any) => r.rows);
      const sub = inserted[0];
      if (parsed) eventId = await createTrainingEventFromForm(tx, sub.id, organization_id, parsed, `instructor:${instructor_id}`, instructor_id);
      return sub;
    });

    if (eventId) await afterTrainingEventCreated(eventId, organization_id);
    else queueAuditReadinessRefresh(organization_id, "instructor_form_submitted");

    res.status(201).json({ success: true, submissionId: submission.id });
  } catch (err) {
    console.error("Instructor form submit error:", err);
    res.status(500).json({ message: "Failed to submit form" });
  }
});

export default router;
