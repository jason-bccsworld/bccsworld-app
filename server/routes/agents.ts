/**
 * Agent Workforce API — the Command Center backend.
 *  - GET   /api/agents               roster + live status (last run, open findings)
 *  - POST  /api/agents/:id/run       manually trigger a run (GATE-governed)
 *  - GET   /api/agents/findings      list findings for the caller's org
 *  - PATCH /api/agents/findings/:id  acknowledge / resolve a finding
 */
import { Router } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";
import { requireOrg } from "../middleware/tenant";
import { evaluateAction } from "../services/gate-engine";
import { AGENTS, getAgent, tryAcquireRunLock, releaseRunLock } from "../services/agent-registry";
import { regulatoryMonitor } from "../services/regulatory-monitor";
import { faaDocumentMonitor } from "../services/faa-document-monitor";
import { linkMonitoringService } from "../services/link-monitor";
import { runComplianceWatchdog } from "../services/compliance-watchdog";
import { runAuditReadiness } from "../services/audit-readiness";
import { runFederalContractsMonitor } from "../services/federal-contracts-monitor";

const router = Router();

function userAuthority(user: any): string {
  return user?.role || "viewer";
}

// ── Roster with live status ──────────────────────────────────────────────────
router.get("/", isAuthenticated, async (req, res) => {
  const orgId = requireOrg(req, res);
  if (!orgId) return;

  const [lastRuns, openFindings, activity24h] = await Promise.all([
    // Latest run per agent visible to this org (own runs + global runs).
    db
      .execute(sql`
        SELECT DISTINCT ON (agent_id) agent_id, id, org_id, status, started_at, finished_at,
               items_processed, findings_count, summary
        FROM bccs_agent_runs
        WHERE org_id = ${orgId} OR org_id IS NULL
        ORDER BY agent_id, started_at DESC
      `)
      .then((r) => (r as any).rows),
    db
      .execute(sql`
        SELECT agent_id, COUNT(*)::int AS n,
               COUNT(*) FILTER (WHERE severity IN ('high', 'critical'))::int AS severe
        FROM bccs_agent_findings
        WHERE org_id = ${orgId} AND status = 'open'
        GROUP BY agent_id
      `)
      .then((r) => (r as any).rows),
    db
      .execute(sql`
        SELECT COUNT(*)::int AS n FROM bccs_agent_runs
        WHERE (org_id = ${orgId} OR org_id IS NULL) AND started_at > NOW() - INTERVAL '24 hours'
      `)
      .then((r) => (r as any).rows[0]?.n ?? 0),
  ]);

  const runByAgent = new Map<string, any>(lastRuns.map((r: any) => [r.agent_id, r]));
  const findingsByAgent = new Map<string, any>(openFindings.map((f: any) => [f.agent_id, f]));

  const roster = AGENTS.map((agent) => {
    const lastRun = runByAgent.get(agent.id) ?? null;
    const findings = findingsByAgent.get(agent.id);
    return {
      ...agent,
      lastRun,
      openFindings: findings?.n ?? 0,
      severeFindings: findings?.severe ?? 0,
    };
  });

  res.json({ agents: roster, runsLast24h: activity24h });
});

// ── Findings (must be declared before /:id routes) ──────────────────────────
router.get("/findings", isAuthenticated, async (req, res) => {
  const orgId = requireOrg(req, res);
  if (!orgId) return;
  const status = typeof req.query.status === "string" ? req.query.status : "open";
  const rows = await db
    .execute(sql`
      SELECT * FROM bccs_agent_findings
      WHERE org_id = ${orgId} AND status = ${status}
      ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
               created_at DESC
      LIMIT 100
    `)
    .then((r) => (r as any).rows);
  res.json(rows);
});

router.patch("/findings/:id", isAuthenticated, async (req, res) => {
  const orgId = requireOrg(req, res);
  if (!orgId) return;
  if (userAuthority(req.user) === "viewer") {
    return res.status(403).json({ message: "Viewers cannot update findings." });
  }
  const nextStatus = req.body?.status;
  if (!["acknowledged", "resolved", "open"].includes(nextStatus)) {
    return res.status(400).json({ message: "status must be one of: open, acknowledged, resolved" });
  }
  const rows = await db
    .execute(sql`
      UPDATE bccs_agent_findings SET status = ${nextStatus}
      WHERE id = ${req.params.id} AND org_id = ${orgId}
      RETURNING *
    `)
    .then((r) => (r as any).rows);
  if (!rows[0]) return res.status(404).json({ message: "Finding not found" });
  res.json(rows[0]);
});

// ── Manual run trigger ───────────────────────────────────────────────────────
router.post("/:id/run", isAuthenticated, async (req, res) => {
  const orgId = requireOrg(req, res);
  if (!orgId) return;
  const agent = getAgent(req.params.id);
  if (!agent) return res.status(404).json({ message: "Unknown agent" });
  if (!agent.manuallyRunnable) {
    return res.status(400).json({ message: `${agent.name} runs automatically and cannot be triggered manually.` });
  }

  const user = req.user as any;
  const gate = await evaluateAction({
    actionType: "agent_manual_run",
    actionDescription: `Manually trigger ${agent.name}`,
    requestedBy: user?.email || user?.username || "unknown",
    requesterAuthority: userAuthority(user),
    userId: user?.id,
    orgId,
    context: { agentId: agent.id },
  });
  if (!gate.admissible) {
    return res.status(403).json({ message: gate.reasoning || "GATE refused this action", gateDecisionId: gate.decisionId });
  }

  // Global agents lock globally; org agents lock per-org.
  const lockOrg = agent.scope === "org" ? orgId : null;
  if (!tryAcquireRunLock(agent.id, lockOrg)) {
    return res.status(409).json({ message: `${agent.name} is already running.` });
  }

  // Fire-and-forget: the run records its own telemetry; the UI polls for it.
  const dispatch = async () => {
    switch (agent.id) {
      case "regulatory-monitor":
        await regulatoryMonitor.performComplianceCheck();
        break;
      case "faa-repository":
        await faaDocumentMonitor.runCheck();
        break;
      case "link-integrity":
        await linkMonitoringService.initializeMonitoring();
        break;
      case "compliance-watchdog":
        await runComplianceWatchdog(orgId);
        break;
      case "audit-readiness":
        await runAuditReadiness(orgId);
        break;
      case "federal-contracts-monitor":
        await runFederalContractsMonitor(orgId);
        break;
      default:
        throw new Error(`No runner wired for agent ${agent.id}`);
    }
  };
  dispatch()
    .catch((err) => console.error(`[agents] manual run of ${agent.id} failed:`, err))
    .finally(() => releaseRunLock(agent.id, lockOrg));

  res.status(202).json({ message: `${agent.name} run started`, agentId: agent.id });
});

export default router;
