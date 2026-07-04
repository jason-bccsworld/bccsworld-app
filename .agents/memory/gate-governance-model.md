---
name: GATE governance model (AIEOS)
description: Design decisions for the AIEOS runtime governance layer (GATE engine, escalations, APEX) built into BCCS-US.
---

# AIEOS / GATE governance model

Runtime governance layer that decides if an action is ADMISSIBLE before it executes. Core: `server/services/gate-engine.ts` (`evaluateAction`), routes in `server/routes/governance.ts` (`/api/governance`), tables + seed in `server/db-init.ts`.

## Authority hierarchy (ranks)
viewer/instructor/auditor(0-1) < support_admin/admin(2) < chief_pilot(3) < faa_designated_examiner(4). `@bccsworld.com` email maps to faa_designated_examiner (SuperAdmin). Unknown strings rank 0.

## Decision outcomes
- **allowed**: requester authority rank ≥ policy `required_authority` rank AND policy rule ≠ refuse.
- **refused**: policy `decision_rule = refuse` (protected-state resources like evidence/audit records — inadmissible at any level).
- **escalated**: authority insufficient but policy rule = escalate → creates a pending `governance_escalations` row.

## Key design decision: escalate-to-human-sovereign
The customer **`admin`** (accountable manager) and SuperAdmin are the **designated human approvers** and may resolve ANY escalation, even one whose `required_approver_role` outranks them (e.g. admin approving a chief_pilot-level waiver).
**Why:** Demo 5 "Human Sovereignty" needs the logged-in operator (an admin) to approve escalations; and operationally escalations route *up* to the accountable manager. A non-admin can only resolve if their own rank ≥ `required_approver_role`. `required_approver_role` documents the level the *action* needed, not who must click approve.
**How to apply:** don't rank-block admins from resolving; keep the `isHumanSovereign || meetsRank` check in the resolve route.

## Other decisions
- `/evaluate` accepts `asAuthority` so demos can impersonate a LOWER authority to show refusal/escalation. It's whitelisted (must be a known rank) and can only downgrade (rank ≤ caller's real rank) — never privilege-escalate.
- `POST /api/governance/demo-reset` (admin-only) truncates decisions/escalations/agent_events + re-seeds, so investor/BMA rehearsals start clean (APEX metrics otherwise accumulate refusals monotonically and only degrade).
- Every decision bridges into existing `audit_logs` (event_type `governance_decision` / `governance_escalation_resolved`).

## Free-text Q&A mapping (`POST /api/governance/ask`)
Natural-language compliance questions map to a governed action via a 3-stage cascade: **(1) deterministic keyword match** against policy label + action_type (zero-latency hot path for scripted demos), **(2) OpenAI gpt-4o JSON fallback** for ad-libbed questions (validated against the real policy list before use — prompt-injection safe, guarded on OPENAI_API_KEY), **(3) no match → slugify the raw phrase** so the GATE engine's no-policy branch safely escalates.
**Why:** demos must be reliable for scripted questions yet handle improvised ones; unknown actions must fail safe (escalate, never silently allow).
**How to apply:** keep keyword-first ordering; never let the AI fallback bypass the policy-list validation.

## Enterprise Memory recall ordering
In `/ask`, fetch `recallDecisions()` **before** `evaluateAction()` persists, so the "prior rulings" list is genuinely prior and excludes the decision just made.
**Why:** otherwise the recall shows the current decision, making "Enterprise Memory" look like it's citing itself.
