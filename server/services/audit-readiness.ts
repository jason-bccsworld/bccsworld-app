/**
 * Audit Readiness Agent — on-demand AI review of an organization's compliance
 * posture, the way an FAA inspector would look at it.
 *
 * Gathers hard numbers from the live database (records, signatures, review
 * queues, watchdog findings, governance activity), has GPT-4o assess them, and
 * publishes a readiness score plus prioritized gap findings. Each report
 * supersedes the previous one: prior open audit_gap findings are resolved
 * before the new set is written.
 */
import OpenAI from "openai";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { startRun, finishRun, emitAgentEvent } from "./agent-registry";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "not-configured" });

const AGENT_ID = "audit-readiness";
const AGENT_NAME = "Audit Readiness Agent";

export interface AuditReadinessReport {
  score: number;
  summary: string;
  gaps: { title: string; severity: string; recommendation: string }[];
}

async function count(query: any): Promise<number> {
  return db.execute(query).then((r) => Number((r as any).rows[0]?.n ?? 0));
}

// ── Debounced refresh ────────────────────────────────────────────────────────
// User actions that change compliance posture (logging a training event,
// deleting a record, signing) queue a refresh so the readiness score never
// goes stale. Fixed 60s window per org: the FIRST trigger starts the timer and
// later triggers within the window are absorbed (never reset), so a burst of
// user activity produces exactly one recalculation.
const REFRESH_DEBOUNCE_MS = 60_000;
const pendingRefreshes = new Map<string, NodeJS.Timeout>();
const inFlightOrgs = new Set<string>();
const rerunRequested = new Set<string>();

export function queueAuditReadinessRefresh(orgId: string, reason: string): void {
  if (!orgId || pendingRefreshes.has(orgId)) return;
  // A run is already in flight for this org: remember that posture changed
  // again so exactly one follow-up refresh is queued when it finishes.
  if (inFlightOrgs.has(orgId)) {
    rerunRequested.add(orgId);
    return;
  }
  const timer = setTimeout(() => {
    pendingRefreshes.delete(orgId);
    void executeRefresh(orgId, reason);
  }, REFRESH_DEBOUNCE_MS);
  timer.unref?.();
  pendingRefreshes.set(orgId, timer);
}

async function executeRefresh(orgId: string, reason: string): Promise<void> {
  inFlightOrgs.add(orgId);
  try {
    await runAuditReadiness(orgId);
  } catch (err) {
    console.error(`Audit readiness refresh failed for org ${orgId} (reason: ${reason}):`, (err as Error).message);
  } finally {
    inFlightOrgs.delete(orgId);
    if (rerunRequested.delete(orgId)) {
      queueAuditReadinessRefresh(orgId, `${reason} (coalesced during previous run)`);
    }
  }
}

export async function runAuditReadiness(orgId: string): Promise<AuditReadinessReport> {
  const runId = await startRun(AGENT_ID, orgId);
  try {
    const [
      totalRecords, signedRecords, docsNeedingReview, docsFailed,
      openWatchdogFindings, criticalFindings, refusals, pendingEscalations,
      activeInstructors, expiringCerts, activeStudents, overdueStudents,
      formSubmissionsTotal, formSubmissionsPending, formSubmissionsRejected,
    ] = await Promise.all([
      count(sql`SELECT COUNT(*)::int AS n FROM bccs_training_events WHERE organization_id = ${orgId}`),
      count(sql`SELECT COUNT(*)::int AS n FROM bccs_training_events WHERE organization_id = ${orgId} AND signature IS NOT NULL`),
      count(sql`SELECT COUNT(*)::int AS n FROM bccs_documents WHERE organization_id = ${orgId} AND status = 'needs_review'`),
      count(sql`SELECT COUNT(*)::int AS n FROM bccs_documents WHERE organization_id = ${orgId} AND status = 'failed'`),
      count(sql`SELECT COUNT(*)::int AS n FROM bccs_agent_findings WHERE org_id = ${orgId} AND status = 'open' AND agent_id = 'compliance-watchdog'`),
      count(sql`SELECT COUNT(*)::int AS n FROM bccs_agent_findings WHERE org_id = ${orgId} AND status = 'open' AND severity = 'critical'`),
      count(sql`SELECT COUNT(*)::int AS n FROM governance_decisions WHERE org_id = ${orgId} AND decision = 'refused'`),
      count(sql`SELECT COUNT(*)::int AS n FROM governance_escalations e JOIN governance_decisions d ON d.id = e.decision_id WHERE d.org_id = ${orgId} AND e.status = 'pending'`),
      count(sql`SELECT COUNT(*)::int AS n FROM bccs_instructor_records WHERE organization_id = ${orgId} AND status = 'active'`),
      count(sql`SELECT COUNT(*)::int AS n FROM bccs_instructor_records WHERE organization_id = ${orgId} AND status = 'active' AND expiration_date < NOW() + INTERVAL '60 days'`),
      count(sql`SELECT COUNT(*)::int AS n FROM students WHERE organization_id = ${orgId} AND status = 'active'`),
      count(sql`SELECT COUNT(*)::int AS n FROM students WHERE organization_id = ${orgId} AND status = 'active' AND expected_completion < NOW()`),
      count(sql`SELECT COUNT(*)::int AS n FROM digital_form_submissions WHERE organization_id = ${orgId}`),
      count(sql`SELECT COUNT(*)::int AS n FROM digital_form_submissions WHERE organization_id = ${orgId} AND status = 'submitted'`),
      count(sql`SELECT COUNT(*)::int AS n FROM digital_form_submissions WHERE organization_id = ${orgId} AND status = 'rejected'`),
    ]);

    const posture = {
      trainingRecords: { total: totalRecords, cryptographicallySigned: signedRecords },
      documents: { awaitingHumanReview: docsNeedingReview, failedProcessing: docsFailed },
      watchdog: { openFindings: openWatchdogFindings, criticalFindings },
      governance: { refusedActions: refusals, pendingEscalations },
      instructors: { active: activeInstructors, certificatesExpiringWithin60Days: expiringCerts },
      students: { active: activeStudents, pastExpectedCompletion: overdueStudents },
      digitalForms: { submissionsTotal: formSubmissionsTotal, awaitingReview: formSubmissionsPending, rejected: formSubmissionsRejected },
    };

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an FAA Part 142 audit readiness inspector reviewing a training center's compliance posture. Based on the metrics provided, assess how ready this organization is for an FAA audit. Be direct and specific — reference the actual numbers. Return JSON:
{"score": <0-100 readiness score>, "summary": "<2-3 sentence plain-language assessment>", "gaps": [{"title": "<specific gap>", "severity": "low|medium|high|critical", "recommendation": "<concrete action>"}]}
Rules: max 5 gaps, ordered most severe first. If a metric shows zero issues, do not invent a gap for it. Score guidance: signed records ratio, open critical findings, expiring certificates, and pending reviews weigh heaviest.`,
        },
        { role: "user", content: JSON.stringify(posture) },
      ],
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(response.choices[0].message.content || "{}");
    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
    const summary = typeof parsed.summary === "string" ? parsed.summary : "Assessment unavailable.";
    const gaps: AuditReadinessReport["gaps"] = Array.isArray(parsed.gaps)
      ? parsed.gaps.slice(0, 5).map((g: any) => ({
          title: String(g.title ?? "Unspecified gap"),
          severity: ["low", "medium", "high", "critical"].includes(g.severity) ? g.severity : "medium",
          recommendation: String(g.recommendation ?? ""),
        }))
      : [];

    // Each report supersedes the last — close prior audit gaps, then write the new set.
    await db.execute(sql`
      UPDATE bccs_agent_findings SET status = 'resolved'
      WHERE agent_id = ${AGENT_ID} AND org_id = ${orgId} AND status IN ('open', 'acknowledged')
    `);
    for (const gap of gaps) {
      await db.execute(sql`
        INSERT INTO bccs_agent_findings (agent_id, org_id, finding_type, severity, title, detail)
        VALUES (${AGENT_ID}, ${orgId}, 'audit_gap', ${gap.severity}, ${gap.title},
                ${JSON.stringify({ recommendation: gap.recommendation, score, postureSnapshot: posture })}::jsonb)
      `);
    }

    await finishRun(runId, {
      status: "success",
      itemsProcessed: totalRecords + docsNeedingReview + activeInstructors + activeStudents + formSubmissionsTotal,
      findingsCount: gaps.length,
      summary: `Audit readiness score: ${score}/100. ${summary}`,
    });
    await emitAgentEvent(
      AGENT_NAME,
      gaps.length > 0 ? "flagged_records" : "monitoring_cycle",
      `Audit readiness review complete — score ${score}/100, ${gaps.length} gap(s) identified`,
      orgId,
    );

    return { score, summary, gaps };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[audit-readiness] review failed:", error);
    await finishRun(runId, { status: "failed", summary: message });
    await emitAgentEvent(AGENT_NAME, "run_failed", `Audit readiness review failed: ${message}`, orgId);
    throw error;
  }
}
