---
name: Tenant context pattern
description: Multi-tenant seams and security contract for org scoping in this app
---

Tenant resolution lives in `server/middleware/tenant.ts` (`resolveTenant`, mounted after auth). It sets `req.orgId` for every request: single-workspace mode (default) resolves the earliest active org; `MULTI_TENANT=true` resolves the session's active org validated against `user_organizations` membership.

**Contract for all org-scoped work:**
- `req.orgId === null` must mean deny/empty — never "no filter". The middleware fails open, so an unfiltered fallback would be a cross-tenant data leak. Same rule for licenses: no tenant context resolves only the platform-wide (unassigned) license, never another org's.
- Every write to a tenant-owned table must stamp `organizationId` from `req.orgId`. Code without request access (storage layer) can use `getCurrentOrgId()` — an AsyncLocalStorage context that `resolveTenant` opens per request; it returns null outside requests (background jobs), which is correct.
- Backfill (NULL org → default org) runs per-boot in single-workspace mode, but exactly once under `MULTI_TENANT=true` (guarded by a `bccs_migration_flags` marker row `tenant_backfill_v1`) — so unstamped rows created after multi-tenant rollout stay orphaned by design; stamp on write instead.

**Platform staff = email-domain check** (`@bccsworld.com` via `isPlatformStaff`), which grants cross-tenant powers. Any route that lets a user set/change an email must reject staff-domain emails for non-staff (invite and profile routes already do). Long-term fix: replace domain sniffing with an explicit staff flag/column.

**Global role gates become escalation paths under self-serve signup.** Every self-serve signup hands out a global `role: 'admin'` user, so any check of the form "role === 'admin' may do X" silently grants X across all tenants (seen in admin user mutations, the role permission matrix, and org key generation). **Why:** an attacker can mint an admin account in seconds via `/signup`. **How to apply:** in multi-tenant mode, admin-role checks must additionally require either platform staff or verified active membership in the target's org (`canManageTargetUser` in server/routes.ts is the pattern); never let global role alone authorize a cross-org or platform-wide mutation.

**Background/scheduled jobs must write per-org telemetry rows, never one shared NULL-org row.** **Why:** tenant-facing queries surface NULL-org rows to every org (global-agent pattern `org_id = X OR org_id IS NULL`), so a shared row leaks cross-tenant aggregate counts (org totals, finding counts). **How to apply:** when a scheduled sweep loops over orgs, start/finish a run row per org inside the loop; reserve NULL org for genuinely global work (e.g. FAA source monitoring) whose telemetry is safe to show everyone.

Caches (default org 60s, memberships 30s, per-org license 30s) have invalidate helpers — call them after membership/org/license writes, and remember the 30s TTL when verifying license changes end-to-end.
