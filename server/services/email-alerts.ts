/**
 * Email alerts for critical agent findings.
 *
 * Transport: SMTP via nodemailer, configured entirely from environment
 * variables (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM /
 * ALERT_EMAIL_FROM, SMTP_SECURE). When SMTP is not configured the alert is
 * surfaced as a skipped check — never silently dropped (same contract as the
 * SAM.gov key checks).
 *
 * Recipients (guarded per-org):
 *   - active org admins from user_organizations (org_role = 'admin')
 *   - in single-workspace mode only, falls back to active global-admin users
 *     when the org has no membership rows (legacy installs). In multi-tenant
 *     mode there is NO cross-org fallback — no admins means no email.
 *   - plus any extra recipients configured in bccs_email_alert_settings.
 */
import nodemailer from "nodemailer";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { isMultiTenant } from "../middleware/tenant";
import { emitAgentEvent } from "./agent-registry";

export interface CriticalFindingAlert {
  title: string;
  findingType: string;
  detail?: Record<string, unknown>;
}

export function emailAlertsConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

function buildTransport() {
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

export interface EmailAlertSettings {
  criticalFindingsEnabled: boolean;
  extraRecipients: string[];
}

export async function getEmailAlertSettings(orgId: string): Promise<EmailAlertSettings> {
  const rows = await db
    .execute(sql`SELECT critical_findings_enabled, extra_recipients FROM bccs_email_alert_settings WHERE org_id = ${orgId}`)
    .then((r) => (r as any).rows);
  if (!rows[0]) return { criticalFindingsEnabled: true, extraRecipients: [] };
  const extras = Array.isArray(rows[0].extra_recipients) ? rows[0].extra_recipients : [];
  return {
    criticalFindingsEnabled: rows[0].critical_findings_enabled !== false,
    extraRecipients: extras.filter((e: unknown) => typeof e === "string"),
  };
}

/** Active org admins' email addresses for a tenant. */
async function orgAdminEmails(orgId: string): Promise<string[]> {
  const rows = await db
    .execute(sql`
      SELECT u.email
      FROM user_organizations uo
      JOIN users u ON u.id = uo.user_id
      WHERE uo.organization_id::text = ${orgId}
        AND uo.org_role = 'admin'
        AND uo.is_active = TRUE
        AND u.is_active = TRUE
        AND u.email IS NOT NULL
    `)
    .then((r) => (r as any).rows.map((row: any) => String(row.email)));
  if (rows.length > 0) return rows;
  // Single-workspace legacy fallback only — never cross-tenant in multi-tenant mode.
  if (!isMultiTenant()) {
    return db
      .execute(sql`SELECT email FROM users WHERE role = 'admin' AND is_active = TRUE AND email IS NOT NULL`)
      .then((r) => (r as any).rows.map((row: any) => String(row.email)));
  }
  return [];
}

/**
 * Send an arbitrary email to an org's active admins (plus configured extra
 * recipients). Returns null on success, or a human-readable skip/failure
 * reason the caller must surface — never silently dropped. Not gated by the
 * critical-findings toggle: used for license lifecycle notices that must
 * always attempt delivery.
 */
export async function sendEmailToOrgAdmins(
  orgId: string,
  message: { subject: string; text: string; html: string },
): Promise<string | null> {
  if (!emailAlertsConfigured()) {
    return "Email skipped: SMTP is not configured (set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM).";
  }
  const settings = await getEmailAlertSettings(orgId);
  const admins = await orgAdminEmails(orgId);
  const recipients = Array.from(new Set([...admins, ...settings.extraRecipients].map((e) => e.toLowerCase())));
  if (recipients.length === 0) {
    return "Email skipped: no active org admins or configured recipients found.";
  }
  try {
    await buildTransport().sendMail({
      from: process.env.ALERT_EMAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER,
      to: recipients.join(", "),
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    return null;
  } catch (err: any) {
    const reason = `Email delivery failed: ${err?.message ?? String(err)}`;
    console.error(`[email-alerts] ${reason} (org ${orgId})`);
    return reason;
  }
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Email org admins about newly created critical-severity findings.
 * Returns null on success, or a human-readable skip/failure reason that the
 * caller must surface (skipped-check contract — never silently dropped).
 */
export async function notifyCriticalFindings(
  orgId: string,
  agentName: string,
  findings: CriticalFindingAlert[],
): Promise<string | null> {
  if (findings.length === 0) return null;

  const settings = await getEmailAlertSettings(orgId);
  if (!settings.criticalFindingsEnabled) {
    return "Critical-finding email alerts are disabled for this organization.";
  }
  if (!emailAlertsConfigured()) {
    return "Email alerts skipped: SMTP is not configured (set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM).";
  }

  const admins = await orgAdminEmails(orgId);
  const recipients = Array.from(new Set([...admins, ...settings.extraRecipients].map((e) => e.toLowerCase())));
  if (recipients.length === 0) {
    return "Email alerts skipped: no active org admins or configured recipients found.";
  }

  const subject = `[Critical] ${agentName}: ${findings.length === 1 ? findings[0].title : `${findings.length} critical findings raised`}`;
  const lines = findings.map(
    (f) => `<li><strong>${escapeHtml(f.title)}</strong> <em>(${escapeHtml(f.findingType)})</em></li>`,
  );
  const html = `
    <p>The ${escapeHtml(agentName)} agent raised ${findings.length} critical-severity finding(s) for your organization:</p>
    <ul>${lines.join("")}</ul>
    <p>Review the details in the Command Center findings panel.</p>
  `;
  const text =
    `The ${agentName} agent raised ${findings.length} critical-severity finding(s):\n` +
    findings.map((f) => `- ${f.title} (${f.findingType})`).join("\n") +
    "\n\nReview the details in the Command Center findings panel.";

  try {
    await buildTransport().sendMail({
      from: process.env.ALERT_EMAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER,
      to: recipients.join(", "),
      subject,
      text,
      html,
    });
    await emitAgentEvent(
      agentName,
      "email_alert_sent",
      `Critical-finding email alert sent to ${recipients.length} recipient(s) for ${findings.length} finding(s)`,
      orgId,
    );
    return null;
  } catch (err: any) {
    const reason = `Email alert delivery failed: ${err?.message ?? String(err)}`;
    console.error(`[email-alerts] ${reason} (org ${orgId})`);
    return reason;
  }
}
