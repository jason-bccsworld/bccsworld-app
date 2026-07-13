import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { PLAN_FEATURES, type PlanKey, type LicenseStatus, type PlanFeatures } from '../../shared/license';

export interface LicenseRow {
  id: string;
  plan: PlanKey;
  status: LicenseStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  seats_limit: number;
  current_period_start: string | null;
  current_period_end: string | null;
  assigned_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Per-org license cache. Keys: org UUID, 'platform' (unassigned fallback),
// or 'legacy' (no tenant context — earliest active org wins).
const licenseCache = new Map<string, { row: LicenseRow | null; expiry: number }>();
const CACHE_TTL = 30_000; // 30 seconds

async function fetchPlatformLicense(): Promise<LicenseRow | null> {
  const fallback = await db.execute(sql`
    SELECT * FROM bccs_licenses
    WHERE organization_id IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `);
  return (fallback.rows[0] as unknown as LicenseRow | undefined) ?? null;
}

/**
 * Resolve the effective license.
 * - With an orgId: that organization's license, falling back to the
 *   platform-wide (unassigned) license if the org has none.
 * - Without an orgId (legacy / no tenant context): license of the earliest
 *   active organization, falling back to the platform-wide license.
 * Results are cached for 30 seconds per organization.
 */
export async function getActiveLicense(orgId?: string | null): Promise<LicenseRow | null> {
  const key = orgId ?? 'legacy';
  const now = Date.now();
  const cached = licenseCache.get(key);
  if (cached && now < cached.expiry) return cached.row;

  let row: LicenseRow | undefined;
  if (orgId) {
    row = (await getLicenseForOrg(orgId)) ?? undefined;
  } else {
    const orgScoped = await db.execute(sql`
      SELECT l.* FROM bccs_licenses l
      JOIN training_organizations o ON o.id = l.organization_id
      WHERE o.is_active = TRUE
      ORDER BY o.created_at ASC, l.updated_at DESC
      LIMIT 1
    `);
    row = orgScoped.rows[0] as unknown as LicenseRow | undefined;
  }

  if (!row) {
    row = (await fetchPlatformLicense()) ?? undefined;
  }

  const result = row ?? null;
  licenseCache.set(key, { row: result, expiry: now + CACHE_TTL });
  return result;
}

/** License assigned to a specific organization (no cache). */
export async function getLicenseForOrg(orgId: string): Promise<LicenseRow | null> {
  const result = await db.execute(sql`
    SELECT * FROM bccs_licenses
    WHERE organization_id = ${orgId}
    ORDER BY updated_at DESC
    LIMIT 1
  `);
  return (result.rows[0] as unknown as LicenseRow | undefined) ?? null;
}

export function invalidateLicenseCache() {
  licenseCache.clear();
}

export function isLicenseExpired(license: LicenseRow): boolean {
  if (!license.current_period_end) return false;
  return new Date(license.current_period_end) < new Date();
}

export function getLicenseFeatures(license: LicenseRow): PlanFeatures {
  const plan = isLicenseExpired(license) ? 'trial' : (license.plan as PlanKey);
  return PLAN_FEATURES[plan] ?? PLAN_FEATURES.trial;
}

/**
 * Express middleware: adds req.license to every request, scoped to the
 * request's active organization when tenant context is present.
 */
export async function attachLicense(req: Request, _res: Response, next: NextFunction) {
  try {
    (req as any).license = await getActiveLicense((req as any).orgId ?? undefined);
  } catch {
    (req as any).license = null;
  }
  next();
}

/**
 * Express middleware factory: blocks the route if the active license doesn't include the feature.
 */
export function requireFeature(feature: keyof PlanFeatures) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const license: LicenseRow | null = (req as any).license ?? await getActiveLicense((req as any).orgId ?? undefined);
    if (!license) {
      return res.status(402).json({ message: 'No license found. Please contact support.', feature });
    }
    if (license.status === 'suspended') {
      return res.status(402).json({ message: 'License suspended. Please contact BCCS support.', feature });
    }
    const expired = isLicenseExpired(license);
    const features = PLAN_FEATURES[expired ? 'trial' : license.plan] ?? PLAN_FEATURES.trial;
    const val = features[feature];
    const allowed = typeof val === 'boolean' ? val : (val as number) !== 0;
    if (!allowed) {
      return res.status(402).json({
        message: `This feature requires a higher plan. Current plan: ${license.plan}.`,
        feature,
        currentPlan: license.plan,
        upgradeRequired: true,
      });
    }
    next();
  };
}

/**
 * Middleware: require support_admin or admin role (for license management endpoints)
 */
export function requireLicenseAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ message: 'Not authenticated' });
  if (user.role !== 'admin' && user.role !== 'support_admin') {
    return res.status(403).json({ message: 'Insufficient permissions to manage licenses' });
  }
  next();
}
