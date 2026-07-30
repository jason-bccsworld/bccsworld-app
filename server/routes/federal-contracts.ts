/**
 * Federal Contracts workspace API — backend for the Federal Contracts Monitor
 * agent's domain page.
 *  - GET/POST/DELETE /api/federal-contracts/watchlist       manage watch targets
 *  - GET             /api/federal-contracts/opportunities   tracked opportunity dossiers
 *  - PATCH           /api/federal-contracts/opportunities/:id  archive / restore
 *  - GET             /api/federal-contracts/awards          award dossiers + risk scoreboard
 *  - GET/POST        /api/federal-contracts/evidence        evidence log per subject
 *  - GET/PATCH       /api/federal-contracts/checklist       manual due-diligence items
 */
import { Router } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";
import { requireOrg, isPlatformStaff } from "../middleware/tenant";
import { getEmailAlertSettings } from "../services/email-alerts";

const router = Router();

function isViewer(req: any): boolean {
  return (req.user?.role || "viewer") === "viewer";
}

const WATCH_KINDS = ["agency", "naics", "keyword", "vendor", "vendor_uei", "contract"];

function isAdmin(req: any): boolean {
  return (req.user?.role || "viewer") === "admin" || isPlatformStaff(req.user?.email);
}

/* ── Email alert settings (critical-finding notifications, per-org) ──────── */

router.get("/email-alerts", isAuthenticated, async (req, res) => {
  const orgId = requireOrg(req, res);
  if (!orgId) return;
  if (!isAdmin(req)) return res.status(403).json({ message: "Only admins can view email alert settings." });
  res.json(await getEmailAlertSettings(orgId));
});

router.put("/email-alerts", isAuthenticated, async (req, res) => {
  const orgId = requireOrg(req, res);
  if (!orgId) return;
  if (!isAdmin(req)) return res.status(403).json({ message: "Only admins can change email alert settings." });
  const { criticalFindingsEnabled, extraRecipients } = req.body ?? {};
  if (typeof criticalFindingsEnabled !== "boolean") {
    return res.status(400).json({ message: "criticalFindingsEnabled must be a boolean" });
  }
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const extras: string[] = Array.isArray(extraRecipients) ? extraRecipients : [];
  if (extras.length > 20) return res.status(400).json({ message: "At most 20 extra recipients allowed" });
  const cleaned: string[] = [];
  for (const raw of extras) {
    const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";
    if (!emailRe.test(email) || email.length > 255) {
      return res.status(400).json({ message: `Invalid recipient email: ${String(raw).slice(0, 100)}` });
    }
    // Staff-domain addresses are reserved — non-staff users cannot route alerts to them.
    if (isPlatformStaff(email) && !isPlatformStaff((req.user as any)?.email)) {
      return res.status(403).json({ message: "Staff-domain email addresses cannot be added as recipients." });
    }
    if (!cleaned.includes(email)) cleaned.push(email);
  }
  const user = req.user as any;
  await db.execute(sql`
    INSERT INTO bccs_email_alert_settings (org_id, critical_findings_enabled, extra_recipients, updated_by, updated_at)
    VALUES (${orgId}, ${criticalFindingsEnabled}, ${JSON.stringify(cleaned)}::jsonb, ${user?.email ?? null}, NOW())
    ON CONFLICT (org_id) DO UPDATE SET
      critical_findings_enabled = EXCLUDED.critical_findings_enabled,
      extra_recipients = EXCLUDED.extra_recipients,
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW()
  `);
  res.json(await getEmailAlertSettings(orgId));
});

/* ── Watchlist ───────────────────────────────────────────────────────────── */

router.get("/watchlist", isAuthenticated, async (req, res) => {
  const orgId = requireOrg(req, res);
  if (!orgId) return;
  const rows = await db
    .execute(sql`SELECT * FROM bccs_fedcon_watchlist WHERE org_id = ${orgId} ORDER BY created_at DESC`)
    .then((r) => (r as any).rows);
  res.json(rows);
});

router.post("/watchlist", isAuthenticated, async (req, res) => {
  const orgId = requireOrg(req, res);
  if (!orgId) return;
  if (isViewer(req)) return res.status(403).json({ message: "Viewers cannot modify the watchlist." });
  const { kind, value, label } = req.body ?? {};
  if (!WATCH_KINDS.includes(kind)) {
    return res.status(400).json({ message: `kind must be one of: ${WATCH_KINDS.join(", ")}` });
  }
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed || trimmed.length > 300) {
    return res.status(400).json({ message: "value is required (max 300 characters)" });
  }
  const user = req.user as any;
  const rows = await db
    .execute(sql`
      INSERT INTO bccs_fedcon_watchlist (org_id, kind, value, label, created_by)
      VALUES (${orgId}, ${kind}, ${trimmed}, ${typeof label === "string" ? label.slice(0, 300) : null}, ${user?.email ?? null})
      ON CONFLICT (org_id, kind, value) DO NOTHING
      RETURNING *
    `)
    .then((r) => (r as any).rows);
  if (!rows[0]) return res.status(409).json({ message: "That watch target already exists." });
  res.status(201).json(rows[0]);
});

router.delete("/watchlist/:id", isAuthenticated, async (req, res) => {
  const orgId = requireOrg(req, res);
  if (!orgId) return;
  if (isViewer(req)) return res.status(403).json({ message: "Viewers cannot modify the watchlist." });
  const rows = await db
    .execute(sql`DELETE FROM bccs_fedcon_watchlist WHERE id = ${req.params.id} AND org_id = ${orgId} RETURNING id`)
    .then((r) => (r as any).rows);
  if (!rows[0]) return res.status(404).json({ message: "Watch target not found" });
  res.json({ deleted: rows[0].id });
});

/* ── Opportunities ───────────────────────────────────────────────────────── */

router.get("/opportunities", isAuthenticated, async (req, res) => {
  const orgId = requireOrg(req, res);
  if (!orgId) return;
  const status = typeof req.query.status === "string" ? req.query.status : "tracking";
  const rows = await db
    .execute(sql`
      SELECT * FROM bccs_fedcon_opportunities
      WHERE org_id = ${orgId} AND status = ${status}
      ORDER BY posted_date DESC NULLS LAST, created_at DESC
      LIMIT 200
    `)
    .then((r) => (r as any).rows);
  res.json(rows);
});

router.patch("/opportunities/:id", isAuthenticated, async (req, res) => {
  const orgId = requireOrg(req, res);
  if (!orgId) return;
  if (isViewer(req)) return res.status(403).json({ message: "Viewers cannot update opportunities." });
  const status = req.body?.status;
  if (!["tracking", "archived"].includes(status)) {
    return res.status(400).json({ message: "status must be 'tracking' or 'archived'" });
  }
  const rows = await db
    .execute(sql`
      UPDATE bccs_fedcon_opportunities SET status = ${status}, updated_at = NOW()
      WHERE id = ${req.params.id} AND org_id = ${orgId}
      RETURNING *
    `)
    .then((r) => (r as any).rows);
  if (!rows[0]) return res.status(404).json({ message: "Opportunity not found" });
  res.json(rows[0]);
});

/* ── Awards / risk scoreboard ────────────────────────────────────────────── */

router.get("/awards", isAuthenticated, async (req, res) => {
  const orgId = requireOrg(req, res);
  if (!orgId) return;
  const rows = await db
    .execute(sql`
      SELECT * FROM bccs_fedcon_awards
      WHERE org_id = ${orgId}
      ORDER BY CASE risk_tier WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'moderate' THEN 2 ELSE 3 END,
               risk_score DESC, award_amount DESC NULLS LAST
      LIMIT 300
    `)
    .then((r) => (r as any).rows);
  res.json(rows);
});

/* ── Evidence log ────────────────────────────────────────────────────────── */

router.get("/evidence", isAuthenticated, async (req, res) => {
  const orgId = requireOrg(req, res);
  if (!orgId) return;
  const subjectId = typeof req.query.subjectId === "string" ? req.query.subjectId : null;
  const rows = await db
    .execute(
      subjectId
        ? sql`SELECT * FROM bccs_fedcon_evidence WHERE org_id = ${orgId} AND subject_id = ${subjectId} ORDER BY created_at DESC LIMIT 200`
        : sql`SELECT * FROM bccs_fedcon_evidence WHERE org_id = ${orgId} ORDER BY created_at DESC LIMIT 200`,
    )
    .then((r) => (r as any).rows);
  res.json(rows);
});

router.post("/evidence", isAuthenticated, async (req, res) => {
  const orgId = requireOrg(req, res);
  if (!orgId) return;
  if (isViewer(req)) return res.status(403).json({ message: "Viewers cannot add evidence entries." });
  const { subjectType, subjectId, entryType, content, sourceRef } = req.body ?? {};
  if (!["vendor", "award", "opportunity"].includes(subjectType)) {
    return res.status(400).json({ message: "subjectType must be vendor, award, or opportunity" });
  }
  if (!["fact", "question", "flag"].includes(entryType)) {
    return res.status(400).json({ message: "entryType must be fact, question, or flag" });
  }
  if (typeof subjectId !== "string" || !subjectId.trim() || typeof content !== "string" || !content.trim()) {
    return res.status(400).json({ message: "subjectId and content are required" });
  }
  const user = req.user as any;
  const rows = await db
    .execute(sql`
      INSERT INTO bccs_fedcon_evidence (org_id, subject_type, subject_id, entry_type, content, source_ref, created_by)
      VALUES (${orgId}, ${subjectType}, ${subjectId.trim().slice(0, 300)}, ${entryType},
              ${content.trim().slice(0, 5000)}, ${typeof sourceRef === "string" ? sourceRef.slice(0, 1000) : null}, ${user?.email ?? null})
      RETURNING *
    `)
    .then((r) => (r as any).rows);
  res.status(201).json(rows[0]);
});

/* ── Manual due-diligence checklist ──────────────────────────────────────── */

router.get("/checklist", isAuthenticated, async (req, res) => {
  const orgId = requireOrg(req, res);
  if (!orgId) return;
  const subjectId = typeof req.query.subjectId === "string" ? req.query.subjectId : null;
  const rows = await db
    .execute(
      subjectId
        ? sql`SELECT * FROM bccs_fedcon_checklist WHERE org_id = ${orgId} AND subject_id = ${subjectId} ORDER BY item_key`
        : sql`SELECT * FROM bccs_fedcon_checklist WHERE org_id = ${orgId} ORDER BY subject_id, item_key LIMIT 500`,
    )
    .then((r) => (r as any).rows);
  res.json(rows);
});

router.patch("/checklist/:id", isAuthenticated, async (req, res) => {
  const orgId = requireOrg(req, res);
  if (!orgId) return;
  if (isViewer(req)) return res.status(403).json({ message: "Viewers cannot update checklist items." });
  const { status, note } = req.body ?? {};
  if (!["not_started", "in_progress", "cleared", "flagged"].includes(status)) {
    return res.status(400).json({ message: "status must be not_started, in_progress, cleared, or flagged" });
  }
  const user = req.user as any;
  const rows = await db
    .execute(sql`
      UPDATE bccs_fedcon_checklist
      SET status = ${status}, note = ${typeof note === "string" ? note.slice(0, 2000) : null},
          updated_by = ${user?.email ?? null}, updated_at = NOW()
      WHERE id = ${req.params.id} AND org_id = ${orgId}
      RETURNING *
    `)
    .then((r) => (r as any).rows);
  if (!rows[0]) return res.status(404).json({ message: "Checklist item not found" });
  res.json(rows[0]);
});

export default router;
