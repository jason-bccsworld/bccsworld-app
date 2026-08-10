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
import OpenAI from "openai";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";
import { requireOrg, isPlatformStaff } from "../middleware/tenant";
import { getEmailAlertSettings } from "../services/email-alerts";
import { tierFor } from "../services/federal-contracts-monitor";

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "not-configured" });

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

/* ── Opportunity work package (risk scoreboard + checklist + evidence) ───── */

// Pursuit-risk scoring is deterministic and lives in code (never the LLM):
// each flag is an auditable rule over the opportunity record itself.
export function opportunityRiskFlags(o: any, now = new Date()): { key: string; label: string; points: number; veto: boolean }[] {
  const flags: { key: string; label: string; points: number; veto: boolean }[] = [];
  const deadline = o.response_deadline ? new Date(o.response_deadline) : null;
  if (!deadline) {
    flags.push({ key: "no_deadline", label: "No response deadline on the notice — confirm the actual due date on SAM.gov", points: 4, veto: false });
  } else {
    const daysLeft = Math.floor((deadline.getTime() - now.getTime()) / 86_400_000);
    if (daysLeft < 0) flags.push({ key: "deadline_passed", label: `Response deadline passed (${o.response_deadline})`, points: 10, veto: true });
    else if (daysLeft <= 7) flags.push({ key: "deadline_imminent", label: `Only ${daysLeft} day(s) until the response deadline`, points: 7, veto: false });
    else if (daysLeft <= 14) flags.push({ key: "deadline_near", label: `${daysLeft} days until the response deadline`, points: 4, veto: false });
  }
  if (o.set_aside) flags.push({ key: "set_aside_eligibility", label: `Set-aside restriction (${o.set_aside}) — confirm size/status eligibility before bidding`, points: 5, veto: false });
  if (!o.naics) flags.push({ key: "no_naics", label: "No NAICS code on the notice — scope/size standard unclear", points: 3, veto: false });
  const dossier = o.dossier && typeof o.dossier === "object" ? o.dossier : {};
  if (!dossier.summary && !dossier.scope) flags.push({ key: "sparse_dossier", label: "Notice text not yet summarized — review the full solicitation manually", points: 3, veto: false });
  if ((o.notice_type || "").toLowerCase().includes("sources sought") || (o.notice_type || "").toLowerCase().includes("presolicitation")) {
    flags.push({ key: "early_stage", label: `Early-stage notice (${o.notice_type}) — no solicitation yet; respond to shape requirements`, points: 2, veto: false });
  }
  return flags;
}

const OPP_BASE_CHECKLIST = (o: any): { key: string; label: string }[] => [
  { key: "solicitation_reviewed", label: "Full solicitation and all attachments downloaded from SAM.gov and reviewed" },
  { key: "eligibility_confirmed", label: o.set_aside ? `Eligibility for ${o.set_aside} set-aside confirmed (size standard for NAICS ${o.naics || "?"})` : `Size standard for NAICS ${o.naics || "?"} confirmed` },
  { key: "sam_registration_current", label: "SAM.gov entity registration active; reps & certs current" },
  { key: "deadline_on_calendar", label: o.response_deadline ? `Response deadline ${o.response_deadline} on the proposal calendar with an internal cutoff` : "Actual response deadline confirmed and on the proposal calendar" },
  { key: "qna_submitted", label: "Clarification questions submitted to the contracting officer before the Q&A cutoff" },
  { key: "past_performance_refs", label: "Relevant past-performance references identified and contacts confirmed" },
  { key: "compliance_matrix", label: "Section L/M (instructions & evaluation) compliance matrix built" },
  { key: "teaming_assessed", label: "Teaming, subcontracting, or key-personnel gaps assessed" },
];

router.post("/opportunities/:id/workpackage", isAuthenticated, async (req, res) => {
  const orgId = requireOrg(req, res);
  if (!orgId) return;
  if (isViewer(req)) return res.status(403).json({ message: "Viewers cannot generate work packages." });
  const opp = await db
    .execute(sql`SELECT * FROM bccs_fedcon_opportunities WHERE id = ${req.params.id} AND org_id = ${orgId}`)
    .then((r) => (r as any).rows[0]);
  if (!opp) return res.status(404).json({ message: "Opportunity not found" });
  const subjectId = String(opp.notice_id).slice(0, 300);
  const user = req.user as any;

  // 1. Risk scoreboard — deterministic rules, tier via the shared rubric scale.
  const flags = opportunityRiskFlags(opp);
  const score = flags.reduce((s, f) => s + f.points, 0);
  const tier = tierFor(score, flags.some((f) => f.veto));

  // 2. Checklist — deterministic base items plus (best-effort) AI-tailored
  //   items drafted from the notice dossier. AI failure never blocks the package.
  let aiItems: { key: string; label: string }[] = [];
  let aiUsed = false;
  let aiSkipReason: string | null = null;
  if (!process.env.OPENAI_API_KEY) {
    aiSkipReason = "AI tailoring skipped: no OpenAI API key configured.";
  } else {
    try {
      const dossierText = JSON.stringify(opp.dossier ?? {}).slice(0, 6000);
      const completion = await openai.chat.completions.create(
        {
          model: "gpt-4o-mini",
          messages: [{
            role: "user",
            content: `You are a federal proposal manager. Draft up to 6 ADDITIONAL due-diligence/capture checklist items specific to this SAM.gov opportunity (beyond generic items like "review solicitation", "confirm SAM registration", "build compliance matrix", "submit Q&A", "past performance refs", "teaming").\n\nTitle: ${opp.title || opp.notice_id}\nAgency: ${opp.agency || "unknown"} | NAICS: ${opp.naics || "n/a"} | Set-aside: ${opp.set_aside || "none"} | Type: ${opp.notice_type || "n/a"}\nDossier: ${dossierText}\n\nReturn JSON: { "items": [ { "key": "<snake_case_slug>", "label": "<one actionable sentence>" } ] }. Only include items genuinely specific to this notice; return { "items": [] } if nothing specific stands out.`,
          }],
          response_format: { type: "json_object" },
          temperature: 0,
          max_tokens: 800,
        },
        // Leave ample room inside Vercel's 30s function cap for the DB writes
        // that follow (checklist + evidence + dossier update).
        { timeout: 15_000, maxRetries: 0 },
      );
      const parsed = JSON.parse(completion.choices[0].message.content || "{}");
      aiItems = (Array.isArray(parsed.items) ? parsed.items : [])
        .slice(0, 6)
        .map((it: any) => ({
          key: `ai_${String(it?.key || "").replace(/[^a-z0-9_]/gi, "_").slice(0, 80) || "item"}`,
          label: String(it?.label || "").slice(0, 500),
        }))
        .filter((it: { key: string; label: string }) => it.label.length > 0);
      aiUsed = true;
    } catch (err: any) {
      aiSkipReason = `AI tailoring skipped: ${err?.status === 429 ? "AI quota exhausted" : "AI call failed"} — base checklist still generated.`;
    }
  }
  // Don't accumulate semantically duplicate AI rows across regenerations: skip
  // AI items whose label already exists for this subject (keys vary run-to-run).
  if (aiItems.length > 0) {
    const existingLabels = new Set(
      await db
        .execute(sql`SELECT LOWER(label) AS l FROM bccs_fedcon_checklist WHERE org_id = ${orgId} AND subject_type = 'opportunity' AND subject_id = ${subjectId}`)
        .then((r) => (r as any).rows.map((row: any) => String(row.l))),
    );
    aiItems = aiItems.filter((it) => !existingLabels.has(it.label.toLowerCase()));
  }
  const checklistItems = [...OPP_BASE_CHECKLIST(opp), ...aiItems];
  // One batched, conflict-safe insert; RETURNING tells us what was actually new.
  const valueRows = checklistItems.map(
    (item) => sql`(${orgId}, 'opportunity', ${subjectId}, ${item.key}, ${item.label}, ${user?.email ?? null})`,
  );
  const insertedChecklist = await db
    .execute(sql`
      INSERT INTO bccs_fedcon_checklist (org_id, subject_type, subject_id, item_key, label, updated_by)
      VALUES ${sql.join(valueRows, sql`, `)}
      ON CONFLICT (org_id, subject_type, subject_id, item_key) DO NOTHING
      RETURNING item_key
    `)
    .then((r) => (r as any).rows.length);

  // 3. Evidence log — seed starter entries once. A single INSERT…SELECT guarded
  //   by NOT EXISTS on the agent marker keeps regeneration (and near-concurrent
  //   double-clicks) from duplicating the seed rows.
  const seeds: { type: string; content: string; ref: string | null }[] = [
    { type: "fact", content: `Notice ${opp.notice_id}: ${opp.title || "untitled"} — ${[opp.agency, opp.naics && `NAICS ${opp.naics}`, opp.set_aside, opp.notice_type].filter(Boolean).join(" · ")}`, ref: opp.url || null },
    { type: "question", content: "Attach the full solicitation PDF / attachments here once downloaded from SAM.gov.", ref: opp.url || null },
    { type: "question", content: "Record eligibility determination (size standard, set-aside status) with supporting citation.", ref: null },
    ...flags.filter((f) => f.veto || f.points >= 5).map((f) => ({ type: "flag", content: `Risk flag: ${f.label}`, ref: null as string | null })),
  ];
  const seedRows = seeds.map(
    (s) => sql`(${orgId}, 'opportunity', ${subjectId}, ${s.type}, ${s.content.slice(0, 5000)}, ${s.ref}, 'agent:federal-contracts-monitor')`,
  );
  const evidenceSeeded = await db
    .execute(sql`
      INSERT INTO bccs_fedcon_evidence (org_id, subject_type, subject_id, entry_type, content, source_ref, created_by)
      SELECT * FROM (VALUES ${sql.join(seedRows, sql`, `)}) AS v(org_id, subject_type, subject_id, entry_type, content, source_ref, created_by)
      WHERE NOT EXISTS (
        SELECT 1 FROM bccs_fedcon_evidence
        WHERE org_id = ${orgId} AND subject_type = 'opportunity' AND subject_id = ${subjectId}
          AND created_by = 'agent:federal-contracts-monitor'
      )
      RETURNING id
    `)
    .then((r) => (r as any).rows.length > 0);

  // 4. Persist the scoreboard on the opportunity dossier (additive jsonb — no schema change).
  const workPackage = {
    risk: { flags, score, tier },
    generatedAt: new Date().toISOString(),
    generatedBy: user?.email ?? null,
    aiUsed,
    aiSkipReason,
  };
  const newDossier = { ...(opp.dossier && typeof opp.dossier === "object" ? opp.dossier : {}), workPackage };
  await db.execute(sql`
    UPDATE bccs_fedcon_opportunities SET dossier = ${JSON.stringify(newDossier)}::jsonb, updated_at = NOW()
    WHERE id = ${opp.id} AND org_id = ${orgId}
  `);

  res.json({
    risk: workPackage.risk,
    checklistAdded: insertedChecklist,
    checklistTotal: checklistItems.length,
    evidenceSeeded,
    aiUsed,
    aiSkipReason,
  });
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
