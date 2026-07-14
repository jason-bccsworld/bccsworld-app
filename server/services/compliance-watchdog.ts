/**
 * Compliance Watchdog Agent — patrols instructor certificates and student
 * completion dates so nothing expires unnoticed.
 *
 * Every pass scans each organization's rosters:
 *   - instructor certificates expired or expiring within 60 days
 *   - active students past their expected completion date
 * New issues become bccs_agent_findings rows (deduped against still-open
 * findings for the same record + finding type). Findings that no longer
 * apply (record fixed or removed) are auto-resolved.
 */
import { db } from "../db";
import { sql } from "drizzle-orm";
import { startRun, finishRun, emitAgentEvent } from "./agent-registry";

const AGENT_ID = "compliance-watchdog";
const AGENT_NAME = "Compliance Watchdog Agent";

interface WatchdogResult {
  itemsScanned: number;
  newFindings: number;
  autoResolved: number;
}

interface Candidate {
  findingType: string;
  severity: string;
  title: string;
  detail: Record<string, unknown>;
  relatedRecordId: string;
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

async function scanOrg(orgId: string): Promise<{ scanned: number; candidates: Candidate[] }> {
  const now = new Date();
  const candidates: Candidate[] = [];

  const instructors = await db
    .execute(sql`
      SELECT id, first_name, last_name, certificate_type, certificate_number, expiration_date, status
      FROM bccs_instructor_records
      WHERE organization_id = ${orgId} AND status = 'active'
    `)
    .then((r) => (r as any).rows);

  for (const i of instructors) {
    if (!i.expiration_date) continue;
    const exp = new Date(i.expiration_date);
    const days = daysBetween(now, exp);
    if (days < 0) {
      candidates.push({
        findingType: "cert_expired",
        severity: "critical",
        title: `${i.first_name} ${i.last_name}'s ${i.certificate_type ?? "instructor"} certificate expired ${Math.abs(days)} day(s) ago`,
        detail: { instructorId: i.id, certificateType: i.certificate_type, certificateNumber: i.certificate_number, expirationDate: i.expiration_date, daysOverdue: Math.abs(days) },
        relatedRecordId: `instructor:${i.id}`,
      });
    } else if (days <= 60) {
      candidates.push({
        findingType: "cert_expiring",
        severity: days <= 30 ? "high" : "medium",
        title: `${i.first_name} ${i.last_name}'s ${i.certificate_type ?? "instructor"} certificate expires in ${days} day(s)`,
        detail: { instructorId: i.id, certificateType: i.certificate_type, certificateNumber: i.certificate_number, expirationDate: i.expiration_date, daysRemaining: days },
        relatedRecordId: `instructor:${i.id}`,
      });
    }
  }

  const students = await db
    .execute(sql`
      SELECT id, first_name, last_name, expected_completion, status
      FROM students
      WHERE organization_id = ${orgId} AND status = 'active' AND expected_completion IS NOT NULL
    `)
    .then((r) => (r as any).rows);

  for (const s of students) {
    const due = new Date(s.expected_completion);
    const overdue = daysBetween(due, now);
    if (overdue > 0) {
      candidates.push({
        findingType: "student_overdue",
        severity: overdue > 60 ? "high" : "medium",
        title: `${s.first_name} ${s.last_name} is ${overdue} day(s) past expected training completion`,
        detail: { studentId: s.id, expectedCompletion: s.expected_completion, daysOverdue: overdue },
        relatedRecordId: `student:${s.id}`,
      });
    }
  }

  return { scanned: instructors.length + students.length, candidates };
}

async function reconcileFindings(orgId: string, candidates: Candidate[]): Promise<{ created: number; resolved: number }> {
  const openRows = await db
    .execute(sql`
      SELECT id, finding_type, related_record_id, severity, title
      FROM bccs_agent_findings
      WHERE agent_id = ${AGENT_ID} AND org_id = ${orgId} AND status IN ('open', 'acknowledged')
    `)
    .then((r) => (r as any).rows);

  const candidateKeys = new Set(candidates.map((c) => `${c.findingType}|${c.relatedRecordId}`));
  const openByKey = new Map<string, any>(
    openRows.map((r: any) => [`${r.finding_type}|${r.related_record_id}`, r]),
  );

  let created = 0;
  for (const c of candidates) {
    const existing = openByKey.get(`${c.findingType}|${c.relatedRecordId}`);
    if (existing) {
      // Condition still holds — keep the finding fresh (e.g. medium → high as a
      // certificate expiry gets closer) instead of letting it go stale.
      if (existing.severity !== c.severity || existing.title !== c.title) {
        await db.execute(sql`
          UPDATE bccs_agent_findings
          SET severity = ${c.severity}, title = ${c.title}, detail = ${JSON.stringify(c.detail)}::jsonb
          WHERE id = ${existing.id}
        `);
      }
      continue;
    }
    await db.execute(sql`
      INSERT INTO bccs_agent_findings (agent_id, org_id, finding_type, severity, title, detail, related_record_id)
      VALUES (${AGENT_ID}, ${orgId}, ${c.findingType}, ${c.severity}, ${c.title}, ${JSON.stringify(c.detail)}::jsonb, ${c.relatedRecordId})
    `);
    created++;
  }

  // Open findings whose condition no longer holds (record fixed/removed) close themselves.
  let resolved = 0;
  for (const row of openRows) {
    if (candidateKeys.has(`${row.finding_type}|${row.related_record_id}`)) continue;
    await db.execute(sql`
      UPDATE bccs_agent_findings SET status = 'resolved' WHERE id = ${row.id}
    `);
    resolved++;
  }

  return { created, resolved };
}

/**
 * Run the watchdog. With a target org (manual run from that org's workspace) it
 * patrols just that org; without one (scheduled) it patrols every org that has
 * roster data.
 */
export async function runComplianceWatchdog(targetOrgId?: string): Promise<WatchdogResult> {
  let orgIds: string[];
  if (targetOrgId) {
    orgIds = [targetOrgId];
  } else {
    orgIds = await db
      .execute(sql`
        SELECT DISTINCT organization_id AS org FROM bccs_instructor_records WHERE organization_id IS NOT NULL
        UNION
        SELECT DISTINCT organization_id AS org FROM students WHERE organization_id IS NOT NULL
      `)
      .then((r) => (r as any).rows.map((row: any) => String(row.org)));
  }

  // One run row per org so every tenant sees only its own patrol telemetry —
  // a shared NULL-org row would leak aggregate counts across tenants.
  let itemsScanned = 0;
  let newFindings = 0;
  let autoResolved = 0;
  for (const orgId of orgIds) {
    const runId = await startRun(AGENT_ID, orgId);
    try {
      const { scanned, candidates } = await scanOrg(orgId);
      const { created, resolved } = await reconcileFindings(orgId, candidates);
      itemsScanned += scanned;
      newFindings += created;
      autoResolved += resolved;

      await finishRun(runId, {
        status: "success",
        itemsProcessed: scanned,
        findingsCount: created,
        summary: `Patrolled ${scanned} roster record(s); ${created} new finding(s), ${resolved} auto-resolved.`,
      });
      if (created > 0) {
        await emitAgentEvent(
          AGENT_NAME,
          "flagged_records",
          `Compliance patrol flagged ${created} new issue(s) — expiring certificates or overdue completions need attention`,
          orgId,
        );
      } else {
        await emitAgentEvent(
          AGENT_NAME,
          "monitoring_cycle",
          `Compliance patrol complete — ${scanned} roster record(s) checked, no new issues`,
          orgId,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[compliance-watchdog] patrol of org ${orgId} failed:`, error);
      await finishRun(runId, { status: "failed", summary: message });
      await emitAgentEvent(AGENT_NAME, "run_failed", `Compliance patrol failed: ${message}`, orgId);
      if (targetOrgId) throw error; // manual run: surface the failure
    }
  }

  return { itemsScanned, newFindings, autoResolved };
}

let watchdogInterval: NodeJS.Timeout | null = null;

/** Boot hook: patrol immediately, then every 12 hours. */
export function startComplianceWatchdog(intervalHours = 12): void {
  if (watchdogInterval) return;
  runComplianceWatchdog().catch((err) => console.error("[compliance-watchdog] initial patrol failed:", err));
  watchdogInterval = setInterval(() => {
    runComplianceWatchdog().catch((err) => console.error("[compliance-watchdog] scheduled patrol failed:", err));
  }, intervalHours * 60 * 60 * 1000);
}
