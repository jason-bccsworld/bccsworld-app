---
name: Tenant context pattern
description: Multi-tenant seams and security contract for org scoping in this app
---

Tenant resolution lives in `server/middleware/tenant.ts` (`resolveTenant`, mounted after auth). It sets `req.orgId` for every request: single-workspace mode (default) resolves the earliest active org; `MULTI_TENANT=true` resolves the session's active org validated against `user_organizations` membership.

**Contract for all org-scoped work:**
- `req.orgId === null` must mean deny/empty — never "no filter". The middleware fails open, so an unfiltered fallback would be a cross-tenant data leak.
- Every write to a tenant-owned table must stamp `organizationId` from `req.orgId`. The db-init backfill (NULL org → default org) is skipped when `MULTI_TENANT=true`, so unstamped rows stay orphaned.

**Platform staff = email-domain check** (`@bccsworld.com` via `isPlatformStaff`), which grants cross-tenant powers. Any route that lets a user set/change an email must reject staff-domain emails for non-staff (invite and profile routes already do). Long-term fix: replace domain sniffing with an explicit staff flag/column.

Caches (default org 60s, memberships 30s, per-org license 30s) have invalidate helpers — call them after membership/org/license writes, and remember the 30s TTL when verifying license changes end-to-end.
