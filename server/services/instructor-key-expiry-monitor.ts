/**
 * Instructor portal key expiry monitor.
 *
 * Periodic sweep over active instructor portal keys (bccs_instructor_keys):
 * finds keys whose expires_at falls within the next 14 days (or has already
 * passed while the key is still active) and emails each affected org's
 * admins a single digest via the shared alert email path
 * (sendEmailToOrgAdmins).
 *
 * Dedupe: each (key, expiry date) is recorded in
 * bccs_instructor_key_notifications after a successful send, so restarts and
 * repeated sweeps never re-send. Renewing a key changes expires_at, which
 * makes it eligible for a fresh notice when the new expiry approaches.
 * Email skips (SMTP unconfigured, no recipients) are logged — never
 * silently dropped — and no dedupe row is written so a later sweep retries.
 */
import { db } from "../db";
import { sql } from "drizzle-orm";
import { sendEmailToOrgAdmins } from "./email-alerts";

const WARNING_WINDOW_DAYS = 14;

interface ExpiringKeyRow {
  key_id: string;
  organization_id: string;
  expires_at: string;
  instructor_name: string;
  organization_name: string | null;
}

let sweepTimer: NodeJS.Timeout | null = null;

export function startInstructorKeyExpiryMonitor(intervalHours = 6) {
  if (sweepTimer) return;
  runInstructorKeyExpirySweep().catch((err) =>
    console.error("[instructor-key-expiry] initial sweep failed:", err),
  );
  sweepTimer = setInterval(() => {
    runInstructorKeyExpirySweep().catch((err) =>
      console.error("[instructor-key-expiry] sweep failed:", err),
    );
  }, intervalHours * 60 * 60 * 1000);
  console.log(`[instructor-key-expiry] monitor started (every ${intervalHours}h)`);
}

/** Dedupe kind ties the notice to the specific expiry date, so a renewal (new expires_at) re-arms the warning. */
function noticeKind(expiresAt: string): string {
  return `expiry_${new Date(expiresAt).toISOString().slice(0, 10)}`;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function runInstructorKeyExpirySweep(): Promise<void> {
  // Active keys expiring within the window (or already expired but still
  // flagged active) that have NOT been notified for their current expiry date.
  const result = await db.execute(sql`
    SELECT k.id AS key_id, k.organization_id::text AS organization_id, k.expires_at,
           COALESCE(i.first_name || ' ' || i.last_name, 'Unknown instructor') AS instructor_name,
           o.organization_name
    FROM bccs_instructor_keys k
    LEFT JOIN bccs_instructor_records i ON i.id = k.instructor_id::text
    LEFT JOIN training_organizations o ON o.id = k.organization_id
    WHERE k.is_active = TRUE
      AND k.expires_at IS NOT NULL
      AND k.expires_at <= NOW() + INTERVAL '14 days'
      AND NOT EXISTS (
        SELECT 1 FROM bccs_instructor_key_notifications n
        WHERE n.key_id = k.id
          AND n.kind = 'expiry_' || to_char(k.expires_at, 'YYYY-MM-DD')
      )
    ORDER BY k.organization_id, k.expires_at
  `);
  const rows = (result as any).rows as ExpiringKeyRow[];
  if (rows.length === 0) return;

  // Group into one digest per org.
  const byOrg = new Map<string, ExpiringKeyRow[]>();
  for (const row of rows) {
    const list = byOrg.get(row.organization_id) ?? [];
    list.push(row);
    byOrg.set(row.organization_id, list);
  }

  for (const [orgId, keys] of Array.from(byOrg.entries())) {
    try {
      const orgName = keys[0].organization_name ?? "your organization";
      const now = Date.now();
      const describe = (r: ExpiringKeyRow) => {
        const exp = new Date(r.expires_at);
        const days = Math.ceil((exp.getTime() - now) / (24 * 60 * 60 * 1000));
        const when =
          days <= 0 ? "has EXPIRED" : days === 1 ? "expires tomorrow" : `expires in ${days} days`;
        return { name: r.instructor_name, when, date: exp.toDateString() };
      };
      const items = keys.map(describe);

      const subject = `[Action needed] ${keys.length === 1 ? `Instructor portal key for ${items[0].name} ${items[0].when}` : `${keys.length} instructor portal keys expiring soon`} — ${orgName}`;
      const html = `
        <p>The following instructor portal key(s) for <strong>${escapeHtml(orgName)}</strong> are expiring within ${WARNING_WINDOW_DAYS} days:</p>
        <ul>${items.map((it) => `<li><strong>${escapeHtml(it.name)}</strong> — ${escapeHtml(it.when)} (${escapeHtml(it.date)})</li>`).join("")}</ul>
        <p>Open the <strong>Instructor Roster</strong> and use the renew action to extend a key without changing it. Expired keys lock instructors out of the portal.</p>
      `;
      const text =
        `The following instructor portal key(s) for ${orgName} are expiring within ${WARNING_WINDOW_DAYS} days:\n` +
        items.map((it) => `- ${it.name} — ${it.when} (${it.date})`).join("\n") +
        "\n\nOpen the Instructor Roster and use the renew action to extend a key without changing it. Expired keys lock instructors out of the portal.";

      const skip = await sendEmailToOrgAdmins(orgId, { subject, text, html });
      if (skip) {
        console.warn(`[instructor-key-expiry] digest for org ${orgId} (${orgName}): ${skip}`);
        continue; // no dedupe rows — retried on the next sweep once email works
      }
      for (const key of keys) {
        await db.execute(sql`
          INSERT INTO bccs_instructor_key_notifications (key_id, organization_id, kind)
          VALUES (${key.key_id}, ${orgId}, ${noticeKind(key.expires_at)})
          ON CONFLICT (key_id, kind) DO NOTHING
        `);
      }
      console.log(`[instructor-key-expiry] sent digest (${keys.length} key(s)) to admins of org ${orgId} (${orgName})`);
    } catch (err) {
      console.error(`[instructor-key-expiry] failed processing org ${orgId}:`, err);
    }
  }
}
