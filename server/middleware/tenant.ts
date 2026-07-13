import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';

/**
 * Deployment mode flag.
 * MULTI_TENANT=true  → cloud multi-tenant: each user works inside their own org(s).
 * unset/false        → single-workspace: everyone shares the default (earliest active) org.
 */
export function isMultiTenant(): boolean {
  return process.env.MULTI_TENANT === 'true';
}

/** Platform staff (SuperAdmin) — may operate across all organizations. */
export function isPlatformStaff(email?: string | null): boolean {
  return String(email ?? '').toLowerCase().endsWith('@bccsworld.com');
}

export interface OrgMembership {
  organizationId: string;
  orgRole: string;
  organizationName: string;
}

// ── Default org (earliest active) — cached 60s ───────────────────────────────
let defaultOrgCache: { id: string | null; expiry: number } = { id: null, expiry: 0 };

export async function getDefaultOrgId(): Promise<string | null> {
  const now = Date.now();
  if (defaultOrgCache.expiry > now) return defaultOrgCache.id;
  const result = await db.execute(sql`
    SELECT id FROM training_organizations
    WHERE is_active = TRUE
    ORDER BY created_at ASC
    LIMIT 1
  `);
  const id = ((result.rows[0] as any)?.id as string | undefined) ?? null;
  defaultOrgCache = { id, expiry: now + 60_000 };
  return id;
}

export function invalidateDefaultOrgCache() {
  defaultOrgCache = { id: null, expiry: 0 };
}

// ── Membership lookup — cached 30s per user ──────────────────────────────────
const membershipCache = new Map<string, { memberships: OrgMembership[]; expiry: number }>();

export async function getUserMemberships(userId: string): Promise<OrgMembership[]> {
  const now = Date.now();
  const cached = membershipCache.get(userId);
  if (cached && cached.expiry > now) return cached.memberships;

  const result = await db.execute(sql`
    SELECT uo.organization_id, uo.org_role, o.organization_name
    FROM user_organizations uo
    JOIN training_organizations o ON o.id = uo.organization_id
    WHERE uo.user_id = ${userId}
      AND uo.is_active = TRUE
      AND o.is_active = TRUE
    ORDER BY uo.created_at ASC
  `);
  const memberships: OrgMembership[] = (result.rows as any[]).map((r) => ({
    organizationId: r.organization_id,
    orgRole: r.org_role,
    organizationName: r.organization_name,
  }));
  membershipCache.set(userId, { memberships, expiry: now + 30_000 });
  return memberships;
}

export function invalidateMembershipCache(userId?: string) {
  if (userId) membershipCache.delete(userId);
  else membershipCache.clear();
}

/**
 * Tenant-context middleware. For authenticated requests, resolves the active
 * organization and attaches it as req.orgId (null when none can be resolved).
 *
 * Resolution order:
 *  - single-workspace mode: always the default org.
 *  - multi-tenant mode: the session's selected org (validated against
 *    membership, or any org for platform staff), else the user's first
 *    membership, else the default org for platform staff only.
 */
export async function resolveTenant(req: Request, _res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;
    if (!(req as any).isAuthenticated?.() || !user) {
      (req as any).orgId = null;
      return next();
    }

    if (!isMultiTenant()) {
      (req as any).orgId = await getDefaultOrgId();
      return next();
    }

    const session: any = (req as any).session;
    const staff = isPlatformStaff(user.email);
    const memberships = await getUserMemberships(user.id);
    const selected: string | undefined = session?.activeOrgId;

    if (selected && (staff || memberships.some((m) => m.organizationId === selected))) {
      (req as any).orgId = selected;
    } else {
      const resolved = memberships[0]?.organizationId ?? (staff ? await getDefaultOrgId() : null);
      (req as any).orgId = resolved;
      if (session && resolved) session.activeOrgId = resolved;
    }
    next();
  } catch (err) {
    console.error('[tenant] Failed to resolve tenant context:', err);
    (req as any).orgId = null;
    next();
  }
}
