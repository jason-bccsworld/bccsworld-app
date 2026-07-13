/**
 * GATE — Governed Action Trust Engine (AIEOS)
 *
 * Runtime governance core: decides whether an action is ADMISSIBLE before it
 * executes. Every evaluated action is recorded to governance_decisions
 * (Enterprise Memory) and bridged into the existing audit_logs trail.
 *
 * Decision outcomes:
 *   - allowed   : requester authority meets/exceeds the policy requirement
 *   - refused   : action is inadmissible (protected state, or policy rule = refuse)
 *   - escalated : authority insufficient but policy allows human approval
 */
import { db } from "../db";
import { sql } from "drizzle-orm";
import { getCurrentOrgId } from "../middleware/tenant";

// Authority hierarchy — higher rank can perform lower-rank actions.
const AUTHORITY_RANK: Record<string, number> = {
  viewer: 0,
  instructor: 1,
  auditor: 1,
  support_admin: 2,
  admin: 2,
  chief_pilot: 3,
  faa_designated_examiner: 4,
};

export function authorityRank(authority?: string | null): number {
  if (!authority) return 0;
  return AUTHORITY_RANK[authority] ?? 0;
}

// Whitelist check — only known authority levels may be used as an evaluation identity.
export function isValidAuthority(authority?: string | null): boolean {
  return !!authority && Object.prototype.hasOwnProperty.call(AUTHORITY_RANK, authority);
}

export interface EvaluateActionInput {
  actionType: string;
  actionDescription?: string;
  requestedBy: string;
  requesterAuthority: string;
  userId?: string;
  orgId?: string;
  context?: Record<string, any>;
}

export interface GateDecision {
  decisionId: string;
  decision: "allowed" | "refused" | "escalated";
  admissible: boolean;
  reasoning: string;
  policy: {
    id: string;
    actionType: string;
    label: string;
    requiredAuthority: string;
    decisionRule: string;
    isProtected: boolean;
    regulatoryBasis: string;
    regulatoryText: string | null;
  } | null;
  regulatoryBasis: string | null;
  escalationId?: string;
  requiredApproverRole?: string;
}

async function getPolicy(actionType: string): Promise<any | null> {
  const rows = await db
    .execute(sql`SELECT * FROM governance_policies WHERE action_type = ${actionType}`)
    .then((r) => (r as any).rows);
  return rows[0] ?? null;
}

async function logToAuditTrail(
  decision: string,
  input: EvaluateActionInput,
  reasoning: string,
  regulatoryBasis: string | null,
) {
  const severity = decision === "refused" ? "warning" : decision === "escalated" ? "info" : "info";
  await db
    .execute(sql`
      INSERT INTO audit_logs (event_type, severity, message, details, source_system, user_id, organization_id, timestamp)
      VALUES (
        ${"governance_decision"},
        ${severity},
        ${`GATE ${decision.toUpperCase()}: ${input.actionType}`},
        ${JSON.stringify({
          actionType: input.actionType,
          actionDescription: input.actionDescription,
          requestedBy: input.requestedBy,
          requesterAuthority: input.requesterAuthority,
          decision,
          reasoning,
          regulatoryBasis,
          orgId: input.orgId,
        })},
        ${"gate_engine"},
        ${input.userId ?? input.requestedBy},
        ${input.orgId ?? getCurrentOrgId()},
        NOW()
      )
    `)
    .catch((err) => console.error("[gate-engine] audit log write failed:", err));
}

/**
 * Core evaluation. Persists the decision and (when escalated) an approval request.
 */
export async function evaluateAction(input: EvaluateActionInput): Promise<GateDecision> {
  const policy = await getPolicy(input.actionType);
  const description = input.actionDescription ?? input.actionType;
  const reqRank = authorityRank(input.requesterAuthority);

  let decision: "allowed" | "refused" | "escalated";
  let reasoning: string;
  let regulatoryBasis: string | null = policy?.regulatory_basis ?? null;

  if (!policy) {
    // No policy on record — default to escalation so a human decides an unknown action.
    decision = "escalated";
    reasoning =
      `No governance policy is on record for "${input.actionType}". ` +
      `The action cannot be auto-admitted; routing to human review to establish a policy precedent.`;
  } else {
    const reqAuthorityRank = authorityRank(policy.required_authority);
    const meetsAuthority = reqRank >= reqAuthorityRank;

    if (meetsAuthority && policy.decision_rule !== "refuse") {
      decision = "allowed";
      reasoning =
        `Admissible. Requester authority "${input.requesterAuthority}" meets the required ` +
        `"${policy.required_authority}" level for this action under ${policy.regulatory_basis}.`;
    } else if (policy.decision_rule === "refuse") {
      decision = "refused";
      reasoning = policy.is_protected
        ? `Refused — protected state. "${policy.label}" is inadmissible under ${policy.regulatory_basis}. ` +
          `${policy.regulatory_text ?? ""} Even elevated authority cannot bypass this control; ` +
          `an auditable alternative (versioned append) must be used instead.`
        : `Refused. "${policy.label}" requires "${policy.required_authority}" authority under ` +
          `${policy.regulatory_basis}, and this action is categorically non-admissible at the requester's level.`;
    } else {
      // decision_rule === 'escalate' and authority insufficient
      decision = "escalated";
      reasoning =
        `Authority insufficient. "${input.requesterAuthority}" is below the required ` +
        `"${policy.required_authority}" level for "${policy.label}" (${policy.regulatory_basis}). ` +
        `Human approval is required before execution.`;
    }
  }

  // Persist the decision (Enterprise Memory)
  const decisionId = await db
    .execute(sql`
      INSERT INTO governance_decisions
        (action_type, action_description, requested_by, requester_authority, policy_id, decision, reasoning, regulatory_basis, org_id, context)
      VALUES
        (${input.actionType}, ${description}, ${input.requestedBy}, ${input.requesterAuthority},
         ${policy?.id ?? null}, ${decision}, ${reasoning}, ${regulatoryBasis}, ${input.orgId ?? getCurrentOrgId()},
         ${JSON.stringify(input.context ?? {})})
      RETURNING id
    `)
    .then((r) => (r as any).rows[0].id);

  // Bridge to the existing audit trail
  await logToAuditTrail(decision, input, reasoning, regulatoryBasis);

  // Emit a live agent event so Shared Enterprise Awareness (agent feed) reflects
  // this decision in real time — the cross-demo beat where a Q&A check moves the feed.
  const verb = decision === "allowed" ? "admitted" : decision === "refused" ? "refused" : "escalated";
  await db
    .execute(sql`
      INSERT INTO agent_events (agent_name, event_type, message, related_event_id, org_id)
      VALUES (
        ${"GATE Sentinel"},
        ${`action_${decision}`},
        ${`Evaluated "${policy?.label ?? input.actionType}" for ${input.requestedBy} (${input.requesterAuthority}) → ${verb}${regulatoryBasis ? ` · ${regulatoryBasis}` : ""}`},
        ${decisionId},
        ${input.orgId ?? getCurrentOrgId()}
      )
    `)
    .catch((err) => console.error("[gate-engine] agent event write failed:", err));

  let escalationId: string | undefined;
  let requiredApproverRole: string | undefined;

  if (decision === "escalated") {
    requiredApproverRole = policy?.required_authority ?? "admin";
    escalationId = await db
      .execute(sql`
        INSERT INTO governance_escalations
          (decision_id, required_approver_role, status, requested_by)
        VALUES
          (${decisionId}, ${requiredApproverRole}, 'pending', ${input.requestedBy})
        RETURNING id
      `)
      .then((r) => (r as any).rows[0].id);
  }

  return {
    decisionId,
    decision,
    admissible: decision === "allowed",
    reasoning,
    policy: policy
      ? {
          id: policy.id,
          actionType: policy.action_type,
          label: policy.label,
          requiredAuthority: policy.required_authority,
          decisionRule: policy.decision_rule,
          isProtected: policy.is_protected,
          regulatoryBasis: policy.regulatory_basis,
          regulatoryText: policy.regulatory_text,
        }
      : null,
    regulatoryBasis,
    escalationId,
    requiredApproverRole,
  };
}

/**
 * Recall prior decisions for a given action type (Enterprise Memory / Demo 9).
 * Tenant isolation: results are always scoped to the caller's organization —
 * no org context means no rows.
 */
export async function recallDecisions(actionType: string, limit = 5, orgId?: string | null): Promise<any[]> {
  const org = orgId ?? getCurrentOrgId();
  if (!org) return [];
  return db
    .execute(sql`
      SELECT id, action_type, action_description, requested_by, requester_authority,
             decision, reasoning, regulatory_basis, created_at
      FROM governance_decisions
      WHERE action_type = ${actionType} AND org_id = ${org}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `)
    .then((r) => (r as any).rows);
}
