---
name: License resolution & SuperAdmin model
description: How feature-gating licenses resolve (org vs platform row) and why @bccsworld.com invites are blocked
---

# License resolution
`bccs_licenses.organization_id` NULL = platform-wide row; non-NULL = assigned to one org.
Effective license: org-assigned license of the earliest active org wins; otherwise newest platform-wide (NULL) row. Cached ~30s server-side; assignment endpoints invalidate the cache.
**Why:** per-org licensing was a production requirement; platform row kept as fallback so existing installs keep working.
**How to apply:** platform license editor (PUT /api/license) must only touch `organization_id IS NULL` rows or it clobbers org assignments. If unlicensed orgs should NOT inherit the platform plan, set the platform row to trial.

# Trial lifecycle
Expired org-assigned trials get a read-only grace period, then a full API lock; the shared lifecycle helper is the single source of truth for server enforcement, the API, and the client banner — never fork the date math.
**Why:** only org-assigned trials are gated so a stale platform-wide (NULL-org) trial row can never lock a legacy single-workspace install; staff exempt so they can rescue expired orgs.
**How to apply:** expiry emails dedupe via a per-license notification ledger written only AFTER a successful send (skips stay retryable). Stripe webhooks must correlate a subscription to its org (checkout stamps organizationId metadata; fallback = customer→membership lookup) and update THAT org's license — never "latest row"; no correlation means platform NULL-org row only.

# SuperAdmin model
SuperAdmin = email ending in @bccsworld.com (suffix check, no DB flag).
**Why:** because it is only a suffix check, the user-invite endpoint must reject @bccsworld.com emails — otherwise any customer admin can mint a SuperAdmin (proven exploitable in testing).
**How to apply:** any new user-creation path (invite, register, import) needs the same domain guard.

# Audit log gotcha
`audit_logs.message` is NOT NULL — every `createAuditLog` call must include `message`, and audit writes should be non-fatal (`.catch`) so logging failures don't 500 the main operation.
