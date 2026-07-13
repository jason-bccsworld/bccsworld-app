---
name: License resolution & SuperAdmin model
description: How feature-gating licenses resolve (org vs platform row) and why @bccsworld.com invites are blocked
---

# License resolution
`bccs_licenses.organization_id` NULL = platform-wide row; non-NULL = assigned to one org.
Effective license: org-assigned license of the earliest active org wins; otherwise newest platform-wide (NULL) row. Cached ~30s server-side; assignment endpoints invalidate the cache.
**Why:** per-org licensing was a production requirement; platform row kept as fallback so existing installs keep working.
**How to apply:** platform license editor (PUT /api/license) must only touch `organization_id IS NULL` rows or it clobbers org assignments. If unlicensed orgs should NOT inherit the platform plan, set the platform row to trial.

# SuperAdmin model
SuperAdmin = email ending in @bccsworld.com (suffix check, no DB flag).
**Why:** because it is only a suffix check, the user-invite endpoint must reject @bccsworld.com emails — otherwise any customer admin can mint a SuperAdmin (proven exploitable in testing).
**How to apply:** any new user-creation path (invite, register, import) needs the same domain guard.

# Audit log gotcha
`audit_logs.message` is NOT NULL — every `createAuditLog` call must include `message`, and audit writes should be non-fatal (`.catch`) so logging failures don't 500 the main operation.
