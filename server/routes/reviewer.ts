/**
 * BCCS Reviewer API
 * - Admin routes: generate/list/revoke API keys
 * - Reviewer routes: read-only org data, authenticated by API key
 */
import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";
import { isPlatformStaff } from "../middleware/tenant";

const router = Router();

// ── Key helpers ─────────────────────────────────────────────────────────────

function generateKey(): string {
  return "bccs_rev_" + crypto.randomBytes(20).toString("hex");
}

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

function extractKey(req: Request): string | null {
  const q = (req.query.key as string) || (req.query.apiKey as string);
  if (q) return q;
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

// ── Reviewer key auth middleware ─────────────────────────────────────────────

async function requireReviewerKey(req: Request, res: Response, next: NextFunction) {
  const key = extractKey(req);
  if (!key) {
    return res.status(401).json({ message: "API key required. Pass ?key=bccs_rev_... or Authorization: Bearer ..." });
  }
  const keyHash = hashKey(key);
  const rows = await db.execute(sql`
    SELECT * FROM bccs_reviewer_keys WHERE key_hash = ${keyHash} AND is_active = TRUE
  `).then(r => (r as any).rows);

  if (!rows[0]) return res.status(401).json({ message: "Invalid or revoked API key" });
  const keyRow = rows[0] as any;

  if (keyRow.expires_at && new Date(keyRow.expires_at) < new Date()) {
    return res.status(401).json({ message: "API key has expired" });
  }

  // Async update last_used_at (non-blocking)
  db.execute(sql`UPDATE bccs_reviewer_keys SET last_used_at = NOW() WHERE id = ${keyRow.id}`).catch(() => {});
  (req as any).reviewerKey = keyRow;
  next();
}

function canAccessOrg(keyRow: any, orgId: string): boolean {
  const orgIds: string[] | null = keyRow.org_ids;
  if (!orgIds || orgIds.length === 0) return true; // All orgs
  return orgIds.includes(orgId);
}

// ── ADMIN: key management ────────────────────────────────────────────────────

// POST /api/reviewer-keys — generate a new reviewer API key
router.post("/", isAuthenticated, async (req: any, res) => {
  const user = req.user as any;
  if (user?.role !== "admin") {
    return res.status(403).json({ message: "Customer admin access required to generate reviewer keys" });
  }

  const { label, reviewerName, reviewerEmail, expiresAt } = req.body;
  let { orgIds } = req.body;
  if (!label || !reviewerName) {
    return res.status(400).json({ message: "label and reviewerName are required" });
  }

  // Tenant scoping: only platform staff may issue all-org keys or keys for
  // other organizations. Customer admins always get keys bound to their org.
  if (!isPlatformStaff(user?.email)) {
    const activeOrgId = req.orgId as string | null;
    if (!activeOrgId) {
      return res.status(403).json({ message: "No active organization for this account" });
    }
    const requested: string[] = Array.isArray(orgIds) ? orgIds : [];
    if (requested.length === 0) {
      orgIds = [activeOrgId];
    } else if (requested.some((id) => id !== activeOrgId)) {
      return res.status(403).json({ message: "Reviewer keys may only be scoped to your own organization" });
    } else {
      orgIds = [activeOrgId];
    }
  }

  const rawKey = generateKey();
  const keyHash = hashKey(rawKey);
  const keyPreview = rawKey.slice(0, 16) + "...";

  await db.execute(sql`
    INSERT INTO bccs_reviewer_keys
      (key_hash, key_preview, label, reviewer_name, reviewer_email, org_ids, created_by, expires_at, is_active)
    VALUES
      (${keyHash}, ${keyPreview}, ${label}, ${reviewerName}, ${reviewerEmail ?? null},
       ${JSON.stringify(orgIds ?? [])}, ${user.id}, ${expiresAt ? new Date(expiresAt).toISOString() : null}, TRUE)
  `);

  // Return the raw key ONCE — it won't be recoverable after this
  res.status(201).json({
    success: true,
    key: rawKey,
    keyPreview,
    label,
    reviewerName,
    reviewerEmail,
    orgIds: orgIds ?? [],
    expiresAt: expiresAt ?? null,
    warning: "Store this key securely — it will not be shown again.",
  });
});

// GET /api/reviewer-keys — list all keys (admin)
router.get("/", isAuthenticated, async (req: any, res) => {
  const user = req.user as any;
  if (user?.role !== "admin") {
    return res.status(403).json({ message: "Customer admin access required" });
  }

  let rows = await db.execute(sql`
    SELECT id, key_preview, label, reviewer_name, reviewer_email, org_ids,
           created_by, created_at, last_used_at, expires_at, is_active
    FROM bccs_reviewer_keys
    ORDER BY created_at DESC
  `).then(r => (r as any).rows);

  // Non-staff admins only see keys scoped to their active organization.
  if (!isPlatformStaff(user?.email)) {
    const activeOrgId = req.orgId as string | null;
    rows = rows.filter((row: any) => Array.isArray(row.org_ids) && activeOrgId && row.org_ids.includes(activeOrgId));
  }

  res.json(rows);
});

// DELETE /api/reviewer-keys/:id — revoke a key
router.delete("/:id", isAuthenticated, async (req: any, res) => {
  const user = req.user as any;
  if (user?.role !== "admin") {
    return res.status(403).json({ message: "Customer admin access required" });
  }

  // Non-staff admins may only revoke keys scoped to their own organization.
  if (!isPlatformStaff(user?.email)) {
    const activeOrgId = req.orgId as string | null;
    const [keyRow] = await db.execute(sql`SELECT org_ids FROM bccs_reviewer_keys WHERE id = ${req.params.id}`).then(r => (r as any).rows);
    if (!keyRow) return res.status(404).json({ message: "Key not found" });
    const orgIds: string[] = Array.isArray(keyRow.org_ids) ? keyRow.org_ids : [];
    if (!activeOrgId || orgIds.length === 0 || !orgIds.includes(activeOrgId)) {
      return res.status(403).json({ message: "You may only revoke reviewer keys for your own organization" });
    }
  }

  await db.execute(sql`UPDATE bccs_reviewer_keys SET is_active = FALSE WHERE id = ${req.params.id}`);
  res.json({ success: true });
});

// ── REVIEWER: read-only data endpoints (API key auth) ───────────────────────

// GET /api/reviewer-keys/context — verify key and return accessible orgs
router.get("/context", requireReviewerKey, async (req: any, res) => {
  const keyRow = req.reviewerKey;
  const orgIds: string[] = keyRow.org_ids ?? [];

  // Get orgs this key can access
  let orgs: any[];
  if (orgIds.length === 0) {
    // All orgs
    orgs = await db.execute(sql`
      SELECT id, organization_name, organization_type, regulatory_authority,
             certificate_number, is_active, contact_info, created_at
      FROM training_organizations WHERE is_active = TRUE ORDER BY organization_name
    `).then(r => (r as any).rows);
  } else {
    orgs = await db.execute(sql`
      SELECT id, organization_name, organization_type, regulatory_authority,
             certificate_number, is_active, contact_info, created_at
      FROM training_organizations
      WHERE id = ANY(${orgIds}::uuid[]) AND is_active = TRUE
      ORDER BY organization_name
    `).then(r => (r as any).rows);
  }

  res.json({
    reviewerName: keyRow.reviewer_name,
    reviewerEmail: keyRow.reviewer_email,
    label: keyRow.label,
    orgScope: orgIds.length === 0 ? "all" : "restricted",
    orgCount: orgs.length,
    orgs,
    expiresAt: keyRow.expires_at,
    lastUsedAt: keyRow.last_used_at,
  });
});

// GET /api/reviewer-keys/org/:orgId/summary
router.get("/org/:orgId/summary", requireReviewerKey, async (req: any, res) => {
  if (!canAccessOrg(req.reviewerKey, req.params.orgId)) {
    return res.status(403).json({ message: "Key does not have access to this organization" });
  }

  const [orgRows, formCounts, trainingCounts, instructorCounts, studentCounts, signedCounts] =
    await Promise.all([
      db.execute(sql`
        SELECT id, organization_name, organization_type, regulatory_authority, certificate_number, contact_info, created_at
        FROM training_organizations WHERE id = ${req.params.orgId}
      `).then(r => (r as any).rows),

      db.execute(sql`
        SELECT
          (SELECT COUNT(*) FROM digital_form_templates WHERE organization_id = ${req.params.orgId}) AS templates,
          (SELECT COUNT(*) FROM digital_form_submissions WHERE organization_id = ${req.params.orgId}) AS submissions,
          (SELECT COUNT(*) FROM digital_form_submissions WHERE status = 'approved' AND organization_id = ${req.params.orgId}) AS approved,
          (SELECT COUNT(*) FROM digital_form_submissions WHERE status = 'submitted' AND organization_id = ${req.params.orgId}) AS pending
      `).then(r => (r as any).rows),

      db.execute(sql`
        SELECT COUNT(*) AS total,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending
        FROM bccs_training_events
        WHERE organization_id = ${req.params.orgId}
      `).then(r => (r as any).rows),

      db.execute(sql`
        SELECT COUNT(*) AS total,
          SUM(CASE WHEN expiration_date < NOW() THEN 1 ELSE 0 END) AS expired,
          SUM(CASE WHEN expiration_date BETWEEN NOW() AND NOW() + INTERVAL '90 days' THEN 1 ELSE 0 END) AS expiring_soon
        FROM bccs_instructor_records
        WHERE organization_id = ${req.params.orgId}
      `).then(r => (r as any).rows),

      db.execute(sql`SELECT COUNT(*) AS total FROM students WHERE organization_id = ${req.params.orgId}`).then(r => (r as any).rows),

      db.execute(sql`
        SELECT COUNT(*) AS signed FROM bccs_training_events
        WHERE signature IS NOT NULL AND organization_id = ${req.params.orgId}
      `).then(r => (r as any).rows),
    ]);

  if (!orgRows[0]) return res.status(404).json({ message: "Organization not found" });

  const fc = formCounts[0] ?? {};
  const tc = trainingCounts[0] ?? {};
  const ic = instructorCounts[0] ?? {};

  res.json({
    organization: orgRows[0],
    stats: {
      formTemplates: Number(fc.templates ?? 0),
      formSubmissions: Number(fc.submissions ?? 0),
      approvedForms: Number(fc.approved ?? 0),
      pendingForms: Number(fc.pending ?? 0),
      trainingRecords: Number(tc.total ?? 0),
      completedTraining: Number(tc.completed ?? 0),
      pendingTraining: Number(tc.pending ?? 0),
      signedRecords: Number(signedCounts[0]?.signed ?? 0),
      instructors: Number(ic.total ?? 0),
      expiredCerts: Number(ic.expired ?? 0),
      expiringCerts: Number(ic.expiring_soon ?? 0),
      students: Number(studentCounts[0]?.total ?? 0),
    },
  });
});

// GET /api/reviewer-keys/org/:orgId/forms
router.get("/org/:orgId/forms", requireReviewerKey, async (req: any, res) => {
  if (!canAccessOrg(req.reviewerKey, req.params.orgId)) {
    return res.status(403).json({ message: "Access denied" });
  }

  const [templates, submissions] = await Promise.all([
    db.execute(sql`
      SELECT id, title, faa_source_id, faa_document_title, status, regulation_status,
             auto_generated, generated_from_section, created_at, updated_at, fields
      FROM digital_form_templates
      WHERE organization_id = ${req.params.orgId}
      ORDER BY updated_at DESC
    `).then(r => (r as any).rows),

    db.execute(sql`
      SELECT s.id, s.template_id, s.template_title, s.organization_name,
             s.submitted_by, s.submitter_name, s.submitter_email,
             s.submitted_at, s.status, s.notes, s.form_data
      FROM digital_form_submissions s
      WHERE s.organization_id = ${req.params.orgId}
      ORDER BY s.submitted_at DESC
      LIMIT 200
    `).then(r => (r as any).rows),
  ]);

  res.json({ templates, submissions });
});

// GET /api/reviewer-keys/org/:orgId/compliance-records
router.get("/org/:orgId/compliance-records", requireReviewerKey, async (req: any, res) => {
  if (!canAccessOrg(req.reviewerKey, req.params.orgId)) {
    return res.status(403).json({ message: "Access denied" });
  }

  const rows = await db.execute(sql`
    SELECT id, student_name, instructor_name, event_type, event_date,
           duration_hours, curriculum_item, status, blockchain_hash,
           signature, key_fingerprint, chain_hash, signed_at, created_at
    FROM bccs_training_events
    WHERE organization_id = ${req.params.orgId}
    ORDER BY event_date DESC
    LIMIT 500
  `).then(r => (r as any).rows);

  res.json(rows);
});

// GET /api/reviewer-keys/org/:orgId/instructors
router.get("/org/:orgId/instructors", requireReviewerKey, async (req: any, res) => {
  if (!canAccessOrg(req.reviewerKey, req.params.orgId)) {
    return res.status(403).json({ message: "Access denied" });
  }

  const rows = await db.execute(sql`
    SELECT id, first_name, last_name, email, certificate_type, certificate_number,
           issue_date, expiration_date, status, ratings, notes
    FROM bccs_instructor_records
    WHERE organization_id = ${req.params.orgId}
    ORDER BY last_name, first_name
  `).then(r => (r as any).rows);

  res.json(rows);
});

// GET /api/reviewer-keys/org/:orgId/students
router.get("/org/:orgId/students", requireReviewerKey, async (req: any, res) => {
  if (!canAccessOrg(req.reviewerKey, req.params.orgId)) {
    return res.status(403).json({ message: "Access denied" });
  }

  const rows = await db.execute(sql`
    SELECT id, first_name, last_name, email, certificate_number,
           enrollment_date, expected_completion, status, notes
    FROM students
    WHERE organization_id = ${req.params.orgId}
    ORDER BY last_name, first_name
  `).then(r => (r as any).rows);

  res.json(rows);
});

export default router;
