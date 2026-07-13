/**
 * Governance API (AIEOS / GATE / APEX)
 *  - POST /evaluate            run a GATE admissibility check
 *  - GET  /policies            list governance policies
 *  - GET  /decisions           list decisions (Enterprise Memory / GATE log)
 *  - GET  /recall/:actionType  recall prior decisions for one action type
 *  - GET  /escalations         list escalations
 *  - POST /escalations/:id/resolve  approve/reject an escalation (admin)
 *  - GET  /agent-events        multi-agent activity feed (Shared Awareness)
 *  - GET  /apex-summary        enterprise governance rollup (APEX dashboard)
 */
import { Router } from "express";
import OpenAI from "openai";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";
import { getCurrentOrgId, requireOrg, isPlatformStaff } from "../middleware/tenant";
import { evaluateAction, recallDecisions, authorityRank, isValidAuthority } from "../services/gate-engine";
import { verifyTrainingRecord } from "../services/crypto-signing";
import { resetGovernanceDemo } from "../db-init";

const router = Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "not-configured" });

// Deterministic keyword match of a free-text question against known policies.
// Returns the best-scoring policy's action_type, or null when nothing matches.
function keywordMatchPolicy(question: string, policies: any[]): string | null {
  const q = question.toLowerCase();
  const STOP = new Set([
    "the", "a", "an", "to", "of", "for", "and", "or", "is", "it", "can", "i",
    "we", "do", "does", "my", "our", "this", "that", "with", "without", "on",
    "in", "be", "am", "are", "should", "would", "could", "may", "if", "you",
  ]);
  let best: { actionType: string; score: number } | null = null;
  for (const p of policies) {
    const terms = `${p.label} ${String(p.action_type).replace(/_/g, " ")}`
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w: string) => w.length > 2 && !STOP.has(w));
    const score = terms.filter((t: string) => q.includes(t)).length;
    if (score > 0 && (!best || score > best.score)) {
      best = { actionType: p.action_type, score };
    }
  }
  return best ? best.actionType : null;
}

// Derive the acting user's governance authority from their app role.
function userAuthority(user: any): string {
  if (!user) return "viewer";
  if (user.email?.endsWith("@bccsworld.com")) return "faa_designated_examiner";
  return user.role || "viewer";
}

// ── GATE: evaluate an action ─────────────────────────────────────────────────
router.post("/evaluate", isAuthenticated, async (req: any, res) => {
  try {
    const activeOrgId = requireOrg(req, res);
    if (!activeOrgId) return;
    const user = req.user as any;
    const { actionType, actionDescription, orgId, context, asAuthority } = req.body;
    if (!actionType) {
      return res.status(400).json({ message: "actionType is required" });
    }
    // Demos may impersonate a lower authority to show refusal/escalation;
    // never allow escalating above the caller's real authority.
    const realAuthority = userAuthority(user);
    let requesterAuthority = realAuthority;
    if (
      asAuthority &&
      isValidAuthority(asAuthority) &&
      authorityRank(asAuthority) <= authorityRank(realAuthority)
    ) {
      requesterAuthority = asAuthority;
    }

    // Tenant isolation: non-staff callers may only stamp governance rows into
    // their own active organization — ignore any client-supplied orgId.
    const effectiveOrgId = isPlatformStaff(user.email) ? (orgId ?? activeOrgId) : activeOrgId;

    const result = await evaluateAction({
      actionType,
      actionDescription,
      requestedBy: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email || user.id,
      requesterAuthority,
      userId: user.id,
      orgId: effectiveOrgId,
      context,
    });
    res.json(result);
  } catch (err: any) {
    console.error("[governance] evaluate error:", err);
    res.status(500).json({ message: "Failed to evaluate action", error: err?.message });
  }
});

// ── Policies ─────────────────────────────────────────────────────────────────
router.get("/policies", isAuthenticated, async (_req, res) => {
  const rows = await db
    .execute(sql`SELECT * FROM governance_policies ORDER BY is_protected DESC, label ASC`)
    .then((r) => (r as any).rows);
  res.json(rows);
});

// ── Decisions (Enterprise Memory / GATE log) ─────────────────────────────────
router.get("/decisions", isAuthenticated, async (req: any, res) => {
  const orgId = requireOrg(req, res);
  if (!orgId) return;
  const { decision, actionType, limit } = req.query;
  const lim = Math.min(Number(limit) || 50, 200);
  const rows = await db
    .execute(sql`
      SELECT d.*, p.label AS policy_label, p.is_protected
      FROM governance_decisions d
      LEFT JOIN governance_policies p ON p.id = d.policy_id
      WHERE d.org_id = ${orgId}
        AND (${decision ?? null}::text IS NULL OR d.decision = ${decision ?? null})
        AND (${actionType ?? null}::text IS NULL OR d.action_type = ${actionType ?? null})
      ORDER BY d.created_at DESC
      LIMIT ${lim}
    `)
    .then((r) => (r as any).rows);
  res.json(rows);
});

// ── Enterprise Memory recall for a single action type ────────────────────────
router.get("/recall/:actionType", isAuthenticated, async (req, res) => {
  const orgId = requireOrg(req, res);
  if (!orgId) return;
  const rows = await recallDecisions(req.params.actionType, 5, orgId);
  res.json(rows);
});

// ── Escalations ──────────────────────────────────────────────────────────────
router.get("/escalations", isAuthenticated, async (req: any, res) => {
  const orgId = requireOrg(req, res);
  if (!orgId) return;
  const { status } = req.query;
  const rows = await db
    .execute(sql`
      SELECT e.*, d.action_type, d.action_description, d.reasoning, d.regulatory_basis,
             d.requester_authority
      FROM governance_escalations e
      JOIN governance_decisions d ON d.id = e.decision_id
      WHERE d.org_id = ${orgId}
        AND (${status ?? null}::text IS NULL OR e.status = ${status ?? null})
      ORDER BY e.created_at DESC
    `)
    .then((r) => (r as any).rows);
  res.json(rows);
});

// ── Resolve an escalation (human sovereignty — admin only) ───────────────────
router.post("/escalations/:id/resolve", isAuthenticated, async (req: any, res) => {
  const orgId = requireOrg(req, res);
  if (!orgId) return;
  const user = req.user as any;
  const { action, note } = req.body; // action: 'approve' | 'reject'
  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({ message: "action must be 'approve' or 'reject'" });
  }

  // Load the pending escalation first so we can verify approval authority.
  // Tenant isolation: cross-org escalations are indistinguishable from missing ones (404).
  const escRows = await db
    .execute(sql`
      SELECT e.* FROM governance_escalations e
      JOIN governance_decisions d ON d.id = e.decision_id
      WHERE e.id = ${req.params.id} AND d.org_id = ${orgId}
    `)
    .then((r) => (r as any).rows);
  const esc = escRows[0];
  if (!esc) return res.status(404).json({ message: "Escalation not found" });
  if (esc.status !== "pending") {
    return res.status(400).json({ message: `Escalation already ${esc.status}` });
  }

  // Human sovereignty: the customer admin (accountable manager) and SuperAdmin are the
  // designated human approvers and may resolve any escalation. Otherwise, the approver
  // must independently hold authority >= the level the action required.
  const isHumanSovereign = user?.role === "admin" || user?.email?.endsWith("@bccsworld.com");
  const meetsRank = authorityRank(userAuthority(user)) >= authorityRank(esc.required_approver_role);
  if (!isHumanSovereign && !meetsRank) {
    return res.status(403).json({
      message: `Approval requires ${esc.required_approver_role} authority (or an admin acting as human approver)`,
    });
  }

  const status = action === "approve" ? "approved" : "rejected";
  const approver = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email || user.id;

  const rows = await db
    .execute(sql`
      UPDATE governance_escalations e
      SET status = ${status}, approved_by = ${approver}, resolution_note = ${note ?? null}, resolved_at = NOW()
      FROM governance_decisions d
      WHERE e.id = ${req.params.id} AND e.status = 'pending'
        AND d.id = e.decision_id AND d.org_id = ${orgId}
      RETURNING e.*
    `)
    .then((r) => (r as any).rows);

  if (!rows[0]) {
    return res.status(404).json({ message: "Escalation not found or already resolved" });
  }

  // Log the human decision to the audit trail
  await db.execute(sql`
    INSERT INTO audit_logs (event_type, severity, message, details, source_system, user_id, organization_id, timestamp)
    VALUES ('governance_escalation_resolved', 'info',
      ${`Escalation ${status} by ${approver}`},
      ${JSON.stringify({ escalationId: req.params.id, status, note: note ?? null })},
      'gate_engine', ${user.id}, ${(req as any).orgId ?? getCurrentOrgId()}, NOW())
  `);

  res.json({ success: true, escalation: rows[0] });
});

// ── Agent activity feed (Shared Enterprise Awareness) ────────────────────────
router.get("/agent-events", isAuthenticated, async (req, res) => {
  const orgId = requireOrg(req, res);
  if (!orgId) return;
  const rows = await db
    .execute(sql`SELECT * FROM agent_events WHERE org_id = ${orgId} ORDER BY created_at DESC LIMIT 50`)
    .then((r) => (r as any).rows);
  res.json(rows);
});

// ── APEX enterprise governance rollup ────────────────────────────────────────
router.get("/apex-summary", isAuthenticated, async (req, res) => {
  const orgId = requireOrg(req, res);
  if (!orgId) return;
  const [decisions, escalations, agents, policyScope, signedRecords] = await Promise.all([
    db
      .execute(sql`
        SELECT decision, COUNT(*)::int AS n
        FROM governance_decisions
        WHERE org_id = ${orgId}
        GROUP BY decision
      `)
      .then((r) => (r as any).rows),
    db
      .execute(sql`
        SELECT e.status, COUNT(*)::int AS n
        FROM governance_escalations e
        JOIN governance_decisions d ON d.id = e.decision_id
        WHERE d.org_id = ${orgId}
        GROUP BY e.status
      `)
      .then((r) => (r as any).rows),
    db
      .execute(sql`SELECT COUNT(DISTINCT agent_name)::int AS n FROM agent_events WHERE org_id = ${orgId}`)
      .then((r) => (r as any).rows[0]?.n ?? 0),
    db
      .execute(sql`
        SELECT COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE is_protected)::int AS protected
        FROM governance_policies
      `)
      .then((r) => (r as any).rows[0]),
    db
      .execute(sql`SELECT COUNT(*)::int AS n FROM bccs_training_events WHERE signature IS NOT NULL AND organization_id = ${orgId}`)
      .then((r) => (r as any).rows[0]?.n ?? 0),
  ]);

  const decisionCounts: Record<string, number> = { allowed: 0, refused: 0, escalated: 0 };
  for (const row of decisions) decisionCounts[row.decision] = row.n;

  const escalationCounts: Record<string, number> = { pending: 0, approved: 0, rejected: 0 };
  for (const row of escalations) escalationCounts[row.status] = row.n;

  const totalDecisions = decisionCounts.allowed + decisionCounts.refused + decisionCounts.escalated;
  // Compliance readiness: proportion of actions that did NOT require refusal.
  const complianceReadiness =
    totalDecisions === 0 ? 100 : Math.round(((totalDecisions - decisionCounts.refused) / totalDecisions) * 100);
  // Governance health degrades with pending approvals.
  const governanceHealth = Math.max(0, 100 - escalationCounts.pending * 10);

  res.json({
    decisions: decisionCounts,
    totalDecisions,
    escalations: escalationCounts,
    activeAgents: agents,
    complianceReadiness,
    governanceHealth,
    pendingApprovals: escalationCounts.pending,
    refusals: decisionCounts.refused,
    policies: { total: policyScope?.total ?? 0, protected: policyScope?.protected ?? 0 },
    signedRecords,
  });
});

// ── AI Compliance Q&A — free-text admissibility question (Demo 1 + Demo 9) ───
// Maps a natural-language question to a governance policy (keyword-first, OpenAI
// fallback), runs the GATE check, and returns the decision + Enterprise Memory recall.
router.post("/ask", isAuthenticated, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const user = req.user as any;
    const { question, asAuthority } = req.body;
    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({ message: "question is required" });
    }

    const policies = await db
      .execute(sql`SELECT id, action_type, label, regulatory_basis FROM governance_policies`)
      .then((r) => (r as any).rows);

    // 1) deterministic keyword match (zero-latency hot path for scripted demos)
    let actionType = keywordMatchPolicy(question, policies);
    let matchedVia: "keyword" | "ai" | "none" = actionType ? "keyword" : "none";

    // 2) OpenAI fallback for ad-libbed questions
    if (!actionType && process.env.OPENAI_API_KEY) {
      try {
        const list = policies.map((p: any) => `- ${p.action_type}: ${p.label}`).join("\n");
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You map an aviation-compliance question to the single best-matching governed action from a fixed list. " +
                'Respond ONLY as JSON: {"actionType": "<exact action_type or null>"}. ' +
                "Use null if none is a clear match.",
            },
            { role: "user", content: `Governed actions:\n${list}\n\nQuestion: "${question}"` },
          ],
        });
        const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");
        if (parsed.actionType && policies.some((p: any) => p.action_type === parsed.actionType)) {
          actionType = parsed.actionType;
          matchedVia = "ai";
        }
      } catch (aiErr: any) {
        console.warn("[governance] /ask OpenAI fallback failed:", aiErr?.message);
      }
    }

    // 3) no match -> pass the raw phrase; GATE safely escalates unknown actions
    const effectiveActionType = actionType ?? question.trim().toLowerCase().replace(/\s+/g, "_").slice(0, 90);

    const realAuthority = userAuthority(user);
    let requesterAuthority = realAuthority;
    if (asAuthority && isValidAuthority(asAuthority) && authorityRank(asAuthority) <= authorityRank(realAuthority)) {
      requesterAuthority = asAuthority;
    }

    // Fetch prior rulings BEFORE evaluating, so "Enterprise Memory" shows
    // genuinely prior decisions and not the one we are about to make.
    const recall = await recallDecisions(effectiveActionType, 5, orgId);

    const decision = await evaluateAction({
      actionType: effectiveActionType,
      actionDescription: question.trim(),
      requestedBy: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email || user.id,
      requesterAuthority,
      userId: user.id,
      orgId,
      context: { question, matchedVia },
    });

    res.json({ question, matchedActionType: actionType, matchedVia, decision, recall });
  } catch (err: any) {
    console.error("[governance] ask error:", err);
    res.status(500).json({ message: "Failed to answer question", error: err?.message });
  }
});

// ── Evidence-on-Demand — assemble a verifiable evidence package (Demo 3 + 11) ─
// One JSON artifact: signed training records (batch-verified) + governance
// decisions + audit trail + integrity rollup. Ready to print/export for an auditor.
router.get("/evidence", isAuthenticated, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const student = typeof req.query.student === "string" ? req.query.student.trim() : "";
    const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10) || 50, 100);

    const records = await db
      .execute(
        student
          ? sql`SELECT id, student_name, instructor_name, event_type, event_date, duration_hours,
                       curriculum_item, status, blockchain_hash, signature, key_fingerprint, signed_at
                FROM bccs_training_events
                WHERE student_name ILIKE ${"%" + student + "%"} AND organization_id = ${orgId}
                ORDER BY event_date DESC LIMIT ${limit}`
          : sql`SELECT id, student_name, instructor_name, event_type, event_date, duration_hours,
                       curriculum_item, status, blockchain_hash, signature, key_fingerprint, signed_at
                FROM bccs_training_events
                WHERE organization_id = ${orgId}
                ORDER BY event_date DESC LIMIT ${limit}`,
      )
      .then((r) => (r as any).rows);

    // Batch cryptographic verification (server-side) of signed records.
    let verified = 0;
    const trainingEvents = await Promise.all(
      records.map(async (rec: any) => {
        const isSigned = !!(rec.signature && rec.key_fingerprint);
        let verificationValid = false;
        if (isSigned) {
          try {
            const v = await verifyTrainingRecord(rec.id);
            verificationValid = v.valid;
            if (v.valid) verified++;
          } catch {
            verificationValid = false;
          }
        }
        return { ...rec, isSigned, verificationValid };
      }),
    );

    const governanceDecisions = await db
      .execute(sql`
        SELECT id, action_type, action_description, requester_authority, decision,
               reasoning, regulatory_basis, created_at
        FROM governance_decisions
        WHERE org_id = ${orgId}
        ORDER BY created_at DESC LIMIT 15
      `)
      .then((r) => (r as any).rows);

    const auditTrail = await db
      .execute(sql`
        SELECT id, event_type, severity, message, source_system, timestamp
        FROM audit_logs
        WHERE (source_system = 'gate_engine' OR event_type LIKE 'training%' OR event_type LIKE 'record%')
          AND organization_id = ${orgId}
        ORDER BY timestamp DESC LIMIT 25
      `)
      .then((r) => (r as any).rows);

    const total = trainingEvents.length;
    const signed = trainingEvents.filter((e: any) => e.isSigned).length;

    res.json({
      generatedAt: new Date().toISOString(),
      scope: student || "All students",
      integrity: { total, signed, verified, unsigned: total - signed },
      trainingEvents,
      governanceDecisions,
      auditTrail,
    });
  } catch (err: any) {
    console.error("[governance] evidence error:", err);
    res.status(500).json({ message: "Failed to build evidence package", error: err?.message });
  }
});

// ── Regulation Update Impact Analysis (Demo 7) + live-feed beat (Demo 8) ──────
// Given an FAA repository document (source_id like "14-CFR-142"), measure the
// enterprise compliance footprint of a regulation change against REAL governance
// data, produce an AI (or deterministic) impact summary, and propagate a live
// agent-awareness chain so the Shared Awareness feed animates the response.
router.post("/regulation-impact", isAuthenticated, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const user = req.user as any;
    const { sourceId, title } = req.body;
    if (!sourceId || typeof sourceId !== "string") {
      return res.status(400).json({ message: "sourceId is required" });
    }

    // Resolve the CFR part number from a repository source_id ("14-CFR-142" -> "142").
    const part = sourceId.replace(/^14-CFR-/i, "").trim();
    const isCfrPart = /^\d+$/.test(part);
    const regLabel = isCfrPart ? `14 CFR ${part}` : sourceId;

    // Anchored match so part "61" does NOT falsely match "14 CFR 142.61".
    const likePattern = `14 CFR ${part}.%`;
    const eqPattern = `14 CFR ${part}`;
    const match = isCfrPart
      ? sql`(regulatory_basis LIKE ${likePattern} OR regulatory_basis = ${eqPattern})`
      : sql`FALSE`;

    const affectedPolicies = await db
      .execute(sql`
        SELECT id, action_type, label, required_authority, decision_rule, is_protected, regulatory_basis
        FROM governance_policies
        WHERE ${match}
        ORDER BY is_protected DESC, label ASC
      `)
      .then((r) => (r as any).rows);

    const priorDecisions = await db
      .execute(sql`
        SELECT id, action_type, requester_authority, decision, reasoning, regulatory_basis, created_at
        FROM governance_decisions
        WHERE ${match} AND org_id = ${orgId}
        ORDER BY created_at DESC
        LIMIT 10
      `)
      .then((r) => (r as any).rows);

    const signedRecords = await db
      .execute(sql`SELECT COUNT(*)::int AS n FROM bccs_training_events WHERE signature IS NOT NULL AND organization_id = ${orgId}`)
      .then((r) => (r as any).rows[0]?.n ?? 0);

    const protectedPolicies = affectedPolicies.filter((p: any) => p.is_protected).length;

    // Deterministic impact summary from the measured counts (AI-independent fallback).
    const plural = (n: number, s: string, p = s + "s") => `${n} ${n === 1 ? s : p}`;
    let summary =
      `${plural(affectedPolicies.length, "governance policy", "governance policies")} and ` +
      `${plural(priorDecisions.length, "prior decision")} are tied to ${regLabel}. ` +
      `${plural(signedRecords, "signed training record")} fall under its recordkeeping scope and should be ` +
      `reviewed for continued compliance` +
      (protectedPolicies > 0 ? `, including ${plural(protectedPolicies, "protected-state control")}.` : ".");
    let recommendedActions: string[] = [
      `Review the ${plural(affectedPolicies.length, "affected policy", "affected policies")} against the revised ${regLabel} text.`,
      `Re-verify ${plural(signedRecords, "signed training record")} for retention and evidence compliance.`,
      protectedPolicies > 0
        ? `Confirm ${plural(protectedPolicies, "protected-state control")} still block inadmissible edits under ${regLabel}.`
        : `Confirm no protected-state controls require adjustment for ${regLabel}.`,
    ];
    let aiPowered = false;

    if (process.env.OPENAI_API_KEY) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You are an FAA Part 142 compliance analyst. Given a regulation update and its measured " +
                "enterprise impact, write a concise plain-language impact summary (2-3 sentences) and 3-5 " +
                'concrete recommended actions. Respond ONLY as JSON: {"summary": string, "recommendedActions": string[]}.',
            },
            {
              role: "user",
              content:
                `Regulation: ${regLabel}${title ? ` (${title})` : ""}.\n` +
                `Measured impact:\n` +
                `- Affected governance policies: ${affectedPolicies.length}` +
                (affectedPolicies.length ? ` (${affectedPolicies.map((p: any) => p.label).join("; ")})` : "") +
                `\n- Protected-state policies: ${protectedPolicies}` +
                `\n- Prior governance decisions citing this regulation: ${priorDecisions.length}` +
                `\n- Signed training records under recordkeeping scope: ${signedRecords}`,
            },
          ],
        });
        const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");
        if (parsed.summary && typeof parsed.summary === "string") {
          summary = parsed.summary;
          aiPowered = true;
        }
        if (Array.isArray(parsed.recommendedActions) && parsed.recommendedActions.length) {
          const clean = parsed.recommendedActions.filter((a: any) => typeof a === "string" && a.trim());
          if (clean.length) recommendedActions = clean;
        }
      } catch (aiErr: any) {
        console.warn("[governance] regulation-impact OpenAI fallback:", aiErr?.message);
      }
    }

    // Debounce: don't flood the 50-row agent feed if the same regulation was
    // analyzed within the last 10 minutes. Scoped per-org so one tenant's
    // analysis never suppresses another tenant's propagation.
    const recent = await db
      .execute(sql`
        SELECT 1 FROM agent_events
        WHERE event_type = 'detected_change'
          AND org_id = ${orgId}
          AND message ILIKE ${"%" + regLabel + "%"}
          AND created_at > NOW() - interval '10 minutes'
        LIMIT 1
      `)
      .then((r) => (r as any).rows);

    let propagated = false;
    if (recent.length === 0) {
      propagated = true;
      const detectionId = await db
        .execute(sql`
          INSERT INTO agent_events (agent_name, event_type, message, org_id)
          VALUES ('Regulatory Watch Agent', 'detected_change',
            ${`Detected FAA update to ${regLabel} — running enterprise compliance impact analysis.`},
            ${orgId})
          RETURNING id
        `)
        .then((r) => (r as any).rows[0].id);

      const reactions: [string, string, string][] = [
        ["Compliance Agent", "updated_checklist", `Cross-checked ${plural(affectedPolicies.length, "governance policy", "governance policies")} governed by ${regLabel}.`],
        ["Records Agent", "flagged_records", `Flagged ${plural(signedRecords, "signed training record")} for ${regLabel} retention review.`],
        ["Governance Agent", "policy_synced", `Confirmed ${plural(protectedPolicies, "protected-state control")} still enforced under ${regLabel}.`],
        ["Dashboard", "dashboard_synced", `Enterprise dashboard refreshed — ${regLabel} impact folded into audit readiness.`],
      ];
      // Stagger the reactions so successive feed polls animate the propagation live.
      reactions.forEach(([agent, type, msg], i) => {
        setTimeout(() => {
          db.execute(sql`
            INSERT INTO agent_events (agent_name, event_type, message, related_event_id, org_id)
            VALUES (${agent}, ${type}, ${msg}, ${detectionId}, ${orgId})
          `).catch((err) => console.error("[governance] reaction event write failed:", err));
        }, (i + 1) * 2000);
      });
    }

    // Analysis footprint — bridged to the audit trail only. This is analysis, NOT
    // a governed action, so it is deliberately kept out of governance_decisions
    // (Enterprise Memory) and out of the apex compliance counters.
    await db
      .execute(sql`
        INSERT INTO audit_logs (event_type, severity, message, details, source_system, user_id, organization_id, timestamp)
        VALUES ('regulation_impact_analysis', 'info',
          ${`Regulation impact analyzed for ${regLabel}`},
          ${JSON.stringify({
            sourceId,
            regulation: regLabel,
            affectedPolicies: affectedPolicies.length,
            priorDecisions: priorDecisions.length,
            signedRecords,
            propagated,
          })},
          'gate_engine', ${user?.id ?? "system"}, ${orgId}, NOW())
      `)
      .catch((err) => console.error("[governance] impact audit write failed:", err));

    res.json({
      regulation: regLabel,
      sourceId,
      title: title ?? regLabel,
      aiPowered,
      summary,
      recommendedActions,
      propagated,
      impact: {
        affectedPolicies,
        protectedPolicies,
        priorDecisions,
        signedRecordsForReview: signedRecords,
      },
    });
  } catch (err: any) {
    console.error("[governance] regulation-impact error:", err);
    res.status(500).json({ message: "Failed to analyze regulation impact", error: err?.message });
  }
});

// ── Enterprise Memory recall (Demo 9) ────────────────────────────────────────
// Backward-looking precedent search over governance_decisions. Distinct from
// /ask (forward-looking admissibility): given a plain-language question, the AI
// synthesizes what the organization has decided before and cites the specific
// prior rulings. Degrades to keyword-matched decisions if the AI is unavailable.
router.post("/memory-recall", isAuthenticated, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const { query } = req.body;
    if (!query || typeof query !== "string" || !query.trim()) {
      return res.status(400).json({ message: "query is required" });
    }

    const decisions = await db
      .execute(sql`
        SELECT id, action_type, action_description, requested_by, requester_authority,
               decision, reasoning, regulatory_basis, created_at
        FROM governance_decisions
        WHERE org_id = ${orgId}
        ORDER BY created_at DESC
        LIMIT 40
      `)
      .then((r) => (r as any).rows);

    if (decisions.length === 0) {
      return res.json({
        query,
        summary: "No prior governance decisions are on record yet.",
        aiPowered: false,
        decisions: [],
      });
    }

    // Deterministic keyword ranking (fallback + guarantees a sensible default set).
    const STOPWORDS = new Set([
      "the", "a", "an", "to", "of", "for", "and", "or", "is", "it", "can", "i",
      "we", "do", "does", "my", "our", "this", "that", "with", "without", "on",
      "in", "be", "am", "are", "should", "would", "could", "may", "if", "you",
      "what", "have", "has", "about", "when", "who", "how", "was", "were", "did",
    ]);
    const terms = query
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w: string) => w.length > 2 && !STOPWORDS.has(w));
    const ranked = decisions
      .map((d: any) => {
        const hay = `${d.action_type} ${d.action_description} ${d.reasoning} ${d.regulatory_basis ?? ""}`.toLowerCase();
        return { d, score: terms.filter((t: string) => hay.includes(t)).length };
      })
      .sort((a: { score: number }, b: { score: number }) => b.score - a.score);
    let cited = (ranked[0]?.score > 0 ? ranked.filter((x: { score: number }) => x.score > 0) : ranked)
      .slice(0, 5)
      .map((x: { d: any }) => x.d);

    let summary = "Showing keyword-matched prior decisions (AI synthesis unavailable).";
    let aiPowered = false;

    if (process.env.OPENAI_API_KEY) {
      try {
        const list = decisions
          .map(
            (d: any, i: number) =>
              `[${i + 1}] ${String(d.decision).toUpperCase()} — ${d.action_type}: ${d.reasoning} (${d.regulatory_basis ?? "no basis"})`,
          )
          .join("\n");
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You are the Enterprise Memory of an FAA Part 142 compliance system. Given a numbered list of " +
                "prior governance decisions and a question about past precedent, synthesize what the organization " +
                "has decided before (2-4 sentences). Cite only the item numbers that are actually relevant; if none " +
                'are relevant, say so plainly. Respond ONLY as JSON: {"summary": string, "citedIndexes": number[]}.',
            },
            { role: "user", content: `Prior decisions:\n${list}\n\nQuestion: "${query}"` },
          ],
        });
        const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");
        if (parsed.summary && typeof parsed.summary === "string") {
          summary = parsed.summary;
          aiPowered = true;
        }
        if (Array.isArray(parsed.citedIndexes)) {
          const mapped = parsed.citedIndexes
            .map((n: any) => decisions[Number(n) - 1])
            .filter(Boolean);
          if (mapped.length) cited = mapped;
        }
      } catch (aiErr: any) {
        console.warn("[governance] memory-recall OpenAI fallback:", aiErr?.message);
      }
    }

    res.json({ query, summary, aiPowered, decisions: cited });
  } catch (err: any) {
    console.error("[governance] memory-recall error:", err);
    res.status(500).json({ message: "Failed to recall enterprise memory", error: err?.message });
  }
});

// ── Demo reset — restore seed state for a fresh rehearsal (admin only) ───────
router.post("/demo-reset", isAuthenticated, async (req: any, res) => {
  const user = req.user as any;
  if (user?.role !== "admin" && !user?.email?.endsWith("@bccsworld.com")) {
    return res.status(403).json({ message: "Admin access required to reset the governance demo" });
  }
  try {
    await resetGovernanceDemo();
    res.json({ success: true, message: "Governance demo data reset to seed state" });
  } catch (err: any) {
    console.error("[governance] demo-reset error:", err);
    res.status(500).json({ message: "Failed to reset demo data", error: err?.message });
  }
});

export default router;
