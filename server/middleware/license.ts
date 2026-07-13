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

let cachedLicense: LicenseRow | null = null;
let cacheExpiry = 0;

/**
 * Resolve the effective license.
 * Priority: license assigned to the primary (earliest active) organization,
 * falling back to the most recent unassigned (platform-wide) license.
 */
export async function getActiveLicense(): Promise<LicenseRow | null> {
  const now = Date.now();
  if (cachedLicense && now < cacheExpiry) return cachedLicense;

  const orgScoped = await db.execute(sql`
    SELECT l.* FROM bccs_licenses l
    JOIN training_organizations o ON o.id = l.organization_id
    WHERE o.is_active = TRUE
    ORDER BY o.created_at ASC, l.updated_at DESC
    LIMIT 1
  `);

  let row = orgScoped.rows[0] as unknown as LicenseRow | undefined;
  if (!row) {
    const fallback = await db.execute(sql`
      SELECT * FROM bccs_licenses
      WHERE organization_id IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `);
    row = fallback.rows[0] as unknown as LicenseRow | undefined;
  }

  cachedLicense = row ?? null;
  cacheExpiry = now + 30_000; // 30-second cache
  return cachedLicense;
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
  cachedLicense = null;
  cacheExpiry = 0;
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
 * Express middleware: adds req.license to every request
 */
export async function attachLicense(req: Request, _res: Response, next: NextFunction) {
  try {
    (req as any).license = await getActiveLicense();
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
    const license: LicenseRow | null = (req as any).license ?? await getActiveLicense();
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
