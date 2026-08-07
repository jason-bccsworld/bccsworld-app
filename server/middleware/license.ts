import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { PLAN_FEATURES, getTrialLifecycle, type PlanKey, type LicenseStatus, type PlanFeatures } from '../../shared/license';

export interface LicenseRow {
  id: string;
  organization_id: string | null;
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

// Per-org license cache. Keys: org UUID, or 'platform' (no tenant context —
// platform-wide unassigned license only, never another org's license).
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
 * - Without tenant context (null/undefined orgId): the platform-wide license
 *   ONLY. Never another organization's license — a user with no resolved org
 *   must not be gated (or granted features) by an unrelated org's plan.
 * Results are cached for 30 seconds per organization.
 */
export async function getActiveLicense(orgId?: string | null): Promise<LicenseRow | null> {
  const key = orgId ?? 'platform';
  const now = Date.now();
  const cached = licenseCache.get(key);
  if (cached && now < cached.expiry) return cached.row;

  let row: LicenseRow | undefined;
  if (orgId) {
    row = (await getLicenseForOrg(orgId)) ?? undefined;
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
    (req as any).license = await getActiveLicense((req as any).orgId ?? null);
  } catch {
    (req as any).license = null;
  }
  next();
}

// Paths that must stay reachable even when a trial has expired, so the org
// admin can still sign in, see the upgrade prompt, and pay.
const TRIAL_LOCK_ALLOWLIST = [
  '/api/login',
  '/api/logout',
  '/api/signup',
  '/api/callback',
  '/api/auth',
  '/api/session',
  '/api/license',
  '/api/user',
  '/api/billing',
  '/api/stripe',
  '/api/checkout',
  '/api/webhook',
  '/api/support',
];

function isTrialLockExempt(path: string): boolean {
  return TRIAL_LOCK_ALLOWLIST.some((p) => path === p || path.startsWith(p + '/'));
}

/**
 * Express middleware: enforces the trial lifecycle for org-assigned trial
 * licenses (self-serve orgs).
 *  - During the post-expiry grace period: read-only — writes are rejected
 *    with 402 and an upgrade prompt, reads still work.
 *  - After the grace period: all API access is rejected with 402 except an
 *    allowlist (auth, license/billing, support) so the admin can upgrade.
 * Platform staff and the platform-wide (unassigned) license are never gated.
 */
export async function enforceTrialLifecycle(req: Request, res: Response, next: NextFunction) {
  try {
    const license: LicenseRow | null = (req as any).license ?? null;
    if (!license || !license.organization_id || license.plan !== 'trial') return next();

    const email: string = (req as any).user?.email ?? '';
    if (email.toLowerCase().endsWith('@bccsworld.com')) return next(); // SuperAdmins manage expired orgs

    const lifecycle = getTrialLifecycle(license.plan, license.current_period_end);
    if (lifecycle.state === 'active' || lifecycle.state === 'expiring_soon') return next();
    // req.path is relative to the mount point under app.use('/api', ...), so
    // match the allowlist against the full original URL path.
    const fullPath = (req.originalUrl ?? req.path).split('?')[0];
    if (isTrialLockExempt(fullPath)) return next();

    const isRead = req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS';
    if (lifecycle.state === 'grace' && isRead) return next();

    return res.status(402).json({
      message:
        lifecycle.state === 'grace'
          ? 'Your 30-day trial has expired. Your workspace is read-only during the grace period — upgrade to a paid plan to continue making changes.'
          : 'Your trial and grace period have ended. Upgrade to a paid plan to regain access to your workspace.',
      licenseState: lifecycle.state,
      graceEndsAt: lifecycle.graceEndsAt,
      upgradeRequired: true,
    });
  } catch {
    return next(); // enforcement must never take the API down
  }
}

/**
 * Express middleware factory: blocks the route if the active license doesn't include the feature.
 */
export function requireFeature(feature: keyof PlanFeatures) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const license: LicenseRow | null = (req as any).license ?? await getActiveLicense((req as any).orgId ?? null);
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
