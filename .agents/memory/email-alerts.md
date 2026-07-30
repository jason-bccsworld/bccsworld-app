---
name: Email alert delivery
description: How outbound email works (and doesn't) in this workspace
---

There is no transactional-email Replit integration available to this workspace (only OAuth mail connectors like Gmail/Outlook, which need user sign-in). Outbound email is done with nodemailer over SMTP configured purely from env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, and `SMTP_FROM`/`ALERT_EMAIL_FROM`. `SMTP_HOST` unset means "not configured".

**Rule:** any email send that cannot happen (SMTP unconfigured, org disabled alerts, zero recipients) must return/surface a human-readable skip reason — same contract as SAM.gov key-gated checks. Never silently drop.

**Recipient guard:** org admins come from `user_organizations` (org_role='admin', active). Falling back to global `users.role='admin'` is allowed ONLY in single-workspace mode; in multi-tenant mode no membership means no email (cross-tenant leak otherwise). Extra recipients configured per-org must reject staff-domain addresses for non-staff (see tenant-context.md).
