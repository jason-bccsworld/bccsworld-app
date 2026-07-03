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
import { db } from "../db";
import { sql } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";
import { evaluateAction, recallDecisions, authorityRank, isValidAuthority } from "../services/gate-engine";
import { resetGovernanceDemo } from "../db-init";

const router = Router();

// Derive the acting user's governance authority from their app role.
function userAuthority(user: any): string {
  if (!user) return "viewer";
  if (user.email?.endsWith("@bccsworld.com")) return "faa_designated_examiner";
  return user.role || "viewer";
}

// ── GATE: evaluate an action ─────────────────────────────────────────────────
router.post("/evaluate", isAuthenticated, async (req: any, res) => {
  try {
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

    const result = await evaluateAction({
      actionType,
      actionDescription,
      requestedBy: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email || user.id,
      requesterAuthority,
      userId: user.id,
      orgId,
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
  const { decision, actionType, limit } = req.query;
  const lim = Math.min(Number(limit) || 50, 200);
  const rows = await db
    .execute(sql`
      SELECT d.*, p.label AS policy_label, p.is_protected
      FROM governance_decisions d
      LEFT JOIN governance_policies p ON p.id = d.policy_id
      WHERE (${decision ?? null}::text IS NULL OR d.decision = ${decision ?? null})
        AND (${actionType ?? null}::text IS NULL OR d.action_type = ${actionType ?? null})
      ORDER BY d.created_at DESC
      LIMIT ${lim}
    `)
    .then((r) => (r as any).rows);
  res.json(rows);
});

// ── Enterprise Memory recall for a single action type ────────────────────────
router.get("/recall/:actionType", isAuthenticated, async (req, res) => {
  const rows = await recallDecisions(req.params.actionType, 5);
  res.json(rows);
});

// ── Escalations ──────────────────────────────────────────────────────────────
router.get("/escalations", isAuthenticated, async (req: any, res) => {
  const { status } = req.query;
  const rows = await db
    .execute(sql`
      SELECT e.*, d.action_type, d.action_description, d.reasoning, d.regulatory_basis,
             d.requester_authority
      FROM governance_escalations e
      JOIN governance_decisions d ON d.id = e.decision_id
      WHERE (${status ?? null}::text IS NULL OR e.status = ${status ?? null})
      ORDER BY e.created_at DESC
    `)
    .then((r) => (r as any).rows);
  res.json(rows);
});

// ── Resolve an escalation (human sovereignty — admin only) ───────────────────
router.post("/escalations/:id/resolve", isAuthenticated, async (req: any, res) => {
  const user = req.user as any;
  const { action, note } = req.body; // action: 'approve' | 'reject'
  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({ message: "action must be 'approve' or 'reject'" });
  }

  // Load the pending escalation first so we can verify approval authority.
  const escRows = await db
    .execute(sql`SELECT * FROM governance_escalations WHERE id = ${req.params.id}`)
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
      UPDATE governance_escalations
      SET status = ${status}, approved_by = ${approver}, resolution_note = ${note ?? null}, resolved_at = NOW()
      WHERE id = ${req.params.id} AND status = 'pending'
      RETURNING *
    `)
    .then((r) => (r as any).rows);

  if (!rows[0]) {
    return res.status(404).json({ message: "Escalation not found or already resolved" });
  }

  // Log the human decision to the audit trail
  await db.execute(sql`
    INSERT INTO audit_logs (event_type, severity, message, details, source_system, user_id, timestamp)
    VALUES ('governance_escalation_resolved', 'info',
      ${`Escalation ${status} by ${approver}`},
      ${JSON.stringify({ escalationId: req.params.id, status, note: note ?? null })},
      'gate_engine', ${user.id}, NOW())
  `);

  res.json({ success: true, escalation: rows[0] });
});

// ── Agent activity feed (Shared Enterprise Awareness) ────────────────────────
router.get("/agent-events", isAuthenticated, async (_req, res) => {
  const rows = await db
    .execute(sql`SELECT * FROM agent_events ORDER BY created_at DESC LIMIT 50`)
    .then((r) => (r as any).rows);
  res.json(rows);
});

// ── APEX enterprise governance rollup ────────────────────────────────────────
router.get("/apex-summary", isAuthenticated, async (_req, res) => {
  const [decisions, escalations, agents] = await Promise.all([
    db
      .execute(sql`
        SELECT decision, COUNT(*)::int AS n
        FROM governance_decisions
        GROUP BY decision
      `)
      .then((r) => (r as any).rows),
    db
      .execute(sql`
        SELECT status, COUNT(*)::int AS n
        FROM governance_escalations
        GROUP BY status
      `)
      .then((r) => (r as any).rows),
    db
      .execute(sql`SELECT COUNT(DISTINCT agent_name)::int AS n FROM agent_events`)
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
  });
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
