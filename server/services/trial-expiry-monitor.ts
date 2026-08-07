/**
 * Trial expiry monitor.
 *
 * Periodic sweep over org-assigned trial licenses (self-serve orgs):
 *   - emails org admins 7 days and 1 day before the trial expires
 *   - when the trial expires, flips the license status to 'expired' (so
 *     SuperAdmins see it in the Command Center) and emails the admins that
 *     the workspace is read-only for a grace period with an upgrade prompt
 *
 * Each notification is deduplicated per license via
 * bccs_license_notifications (UNIQUE license_id + kind) so restarts and
 * repeated sweeps never re-send. Email skips (SMTP unconfigured, no
 * recipients) are logged — never silently dropped — and the dedupe row is
 * only written after a successful send so a later sweep can retry.
 */
import { db } from "../db";
import { sql } from "drizzle-orm";
import { getTrialLifecycle, TRIAL_GRACE_PERIOD_DAYS } from "../../shared/license";
import { sendEmailToOrgAdmins } from "./email-alerts";
import { invalidateLicenseCache } from "../middleware/license";

interface TrialLicenseRow {
  id: string;
  organization_id: string;
  status: string;
  current_period_end: string | null;
  organization_name: string | null;
}

let sweepTimer: NodeJS.Timeout | null = null;

export function startTrialExpiryMonitor(intervalHours = 6) {
  if (sweepTimer) return;
  runTrialExpirySweep().catch((err) => console.error("[trial-expiry] initial sweep failed:", err));
  sweepTimer = setInterval(() => {
    runTrialExpirySweep().catch((err) => console.error("[trial-expiry] sweep failed:", err));
  }, intervalHours * 60 * 60 * 1000);
  console.log(`[trial-expiry] monitor started (every ${intervalHours}h)`);
}

/** True if this (license, kind) was already sent. Records nothing. */
async function alreadySent(licenseId: string, kind: string): Promise<boolean> {
  const r = await db.execute(sql`
    SELECT 1 FROM bccs_license_notifications
    WHERE license_id = ${licenseId} AND kind = ${kind} LIMIT 1
  `);
  return r.rows.length > 0;
}

async function markSent(licenseId: string, orgId: string, kind: string) {
  await db.execute(sql`
    INSERT INTO bccs_license_notifications (license_id, organization_id, kind)
    VALUES (${licenseId}, ${orgId}, ${kind})
    ON CONFLICT (license_id, kind) DO NOTHING
  `);
}

async function notify(row: TrialLicenseRow, kind: string, subject: string, body: string) {
  if (await alreadySent(row.id, kind)) return;
  const html = `<p>${body}</p><p>Sign in and open <strong>Settings → Plans</strong> to upgrade, or contact BCCS support.</p>`;
  const text = `${body}\n\nSign in and open Settings → Plans to upgrade, or contact BCCS support.`;
  const skip = await sendEmailToOrgAdmins(row.organization_id, { subject, text, html });
  if (skip) {
    console.warn(`[trial-expiry] ${kind} email for org ${row.organization_id} (${row.organization_name ?? "unknown"}): ${skip}`);
    return; // no dedupe row — retried on the next sweep once email is configured
  }
  await markSent(row.id, row.organization_id, kind);
  console.log(`[trial-expiry] sent ${kind} notice to admins of org ${row.organization_id} (${row.organization_name ?? "unknown"})`);
}

export async function runTrialExpirySweep(): Promise<void> {
  const result = await db.execute(sql`
    SELECT l.id, l.organization_id::text AS organization_id, l.status, l.current_period_end,
           o.organization_name
    FROM bccs_licenses l
    LEFT JOIN training_organizations o ON o.id = l.organization_id
    WHERE l.plan = 'trial'
      AND l.organization_id IS NOT NULL
      AND l.current_period_end IS NOT NULL
      AND l.status NOT IN ('suspended')
  `);
  const rows = result.rows as unknown as TrialLicenseRow[];

  for (const row of rows) {
    try {
      const lifecycle = getTrialLifecycle("trial", row.current_period_end);
      const org = row.organization_name ?? "your organization";
      const endDate = row.current_period_end ? new Date(row.current_period_end).toDateString() : "soon";

      if (lifecycle.isExpired) {
        // Flip status so the Command Center clearly shows the expired trial.
        if (row.status !== "expired") {
          await db.execute(sql`
            UPDATE bccs_licenses SET status = 'expired', updated_at = NOW() WHERE id = ${row.id}
          `);
          invalidateLicenseCache();
        }
        await notify(
          row,
          "trial_expired",
          `Your BCCS-US trial for ${org} has expired`,
          `The 30-day trial for ${org} ended on ${endDate}. Your workspace is now read-only for a ${TRIAL_GRACE_PERIOD_DAYS}-day grace period. Upgrade to a paid plan to restore full access — after the grace period the workspace will be locked.`,
        );
      } else if (lifecycle.daysRemaining !== null && lifecycle.daysRemaining <= 1) {
        await notify(
          row,
          "trial_warning_1d",
          `Your BCCS-US trial for ${org} expires tomorrow`,
          `The 30-day trial for ${org} expires on ${endDate} — that's tomorrow. Upgrade now to avoid interruption; after expiry the workspace becomes read-only for ${TRIAL_GRACE_PERIOD_DAYS} days, then locks.`,
        );
      } else if (lifecycle.daysRemaining !== null && lifecycle.daysRemaining <= 7) {
        await notify(
          row,
          "trial_warning_7d",
          `Your BCCS-US trial for ${org} expires in ${lifecycle.daysRemaining} days`,
          `The 30-day trial for ${org} expires on ${endDate}. Upgrade to a paid plan to keep full access; after expiry the workspace becomes read-only for ${TRIAL_GRACE_PERIOD_DAYS} days, then locks.`,
        );
      }
    } catch (err) {
      console.error(`[trial-expiry] failed processing license ${row.id} (org ${row.organization_id}):`, err);
    }
  }
}
