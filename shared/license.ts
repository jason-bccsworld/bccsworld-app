// ── BCCS-US License & Plan Definitions ──────────────────────────────────────

export type PlanKey = 'trial' | 'standard' | 'professional' | 'enterprise';
export type LicenseStatus = 'active' | 'trial' | 'suspended' | 'expired';

export interface PlanFeatures {
  maxUsers: number;           // -1 = unlimited
  maxFormTemplates: number;   // -1 = unlimited
  aiDocumentProcessing: boolean;
  aiFormGeneration: boolean;
  complianceReports: boolean;
  advancedAnalytics: boolean;
  customRoles: boolean;
  blockchainRecords: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
}

export const PLAN_FEATURES: Record<PlanKey, PlanFeatures> = {
  trial: {
    maxUsers: 5,
    maxFormTemplates: 2,
    aiDocumentProcessing: false,
    aiFormGeneration: false,
    complianceReports: false,
    advancedAnalytics: false,
    customRoles: false,
    blockchainRecords: false,
    apiAccess: false,
    prioritySupport: false,
  },
  standard: {
    maxUsers: 15,
    maxFormTemplates: 5,
    aiDocumentProcessing: false,
    aiFormGeneration: false,
    complianceReports: false,
    advancedAnalytics: false,
    customRoles: false,
    blockchainRecords: false,
    apiAccess: false,
    prioritySupport: false,
  },
  professional: {
    maxUsers: 50,
    maxFormTemplates: -1,
    aiDocumentProcessing: true,
    aiFormGeneration: true,
    complianceReports: true,
    advancedAnalytics: true,
    customRoles: true,
    blockchainRecords: false,
    apiAccess: false,
    prioritySupport: false,
  },
  enterprise: {
    maxUsers: -1,
    maxFormTemplates: -1,
    aiDocumentProcessing: true,
    aiFormGeneration: true,
    complianceReports: true,
    advancedAnalytics: true,
    customRoles: true,
    blockchainRecords: true,
    apiAccess: true,
    prioritySupport: true,
  },
};

export const PLAN_DISPLAY: Record<PlanKey, { label: string; annualPrice: number; color: string; description: string }> = {
  trial: {
    label: 'Free Trial',
    annualPrice: 0,
    color: 'bg-slate-100 text-slate-700',
    description: '30-day evaluation, 5 users',
  },
  standard: {
    label: 'Standard',
    annualPrice: 4000,
    color: 'bg-sky-100 text-sky-700',
    description: '$4,000/year — up to 15 users',
  },
  professional: {
    label: 'Professional',
    annualPrice: 9000,
    color: 'bg-blue-100 text-blue-700',
    description: '$9,000/year — up to 50 users, AI features',
  },
  enterprise: {
    label: 'Enterprise',
    annualPrice: 20000,
    color: 'bg-violet-100 text-violet-700',
    description: '$20,000/year — unlimited users, full feature set',
  },
};

// ── Trial lifecycle ─────────────────────────────────────────────────────────
// Warnings go out 7 days and 1 day before expiry; after expiry the org keeps
// read-only access for a short grace period before the workspace locks.
export const TRIAL_GRACE_PERIOD_DAYS = 7;

export type TrialLifecycleState = 'active' | 'expiring_soon' | 'grace' | 'locked';

export interface TrialLifecycle {
  state: TrialLifecycleState;
  /** Whole days until expiry (negative once expired). Null when no period end is set. */
  daysRemaining: number | null;
  /** End of the read-only grace period (ISO string), when applicable. */
  graceEndsAt: string | null;
  isExpired: boolean;
}

/**
 * Compute where a license sits in the trial lifecycle. Non-trial plans and
 * licenses without an end date are always 'active'.
 */
export function getTrialLifecycle(
  plan: PlanKey | string,
  currentPeriodEnd: string | Date | null | undefined,
  now: Date = new Date(),
): TrialLifecycle {
  if (plan !== 'trial' || !currentPeriodEnd) {
    return { state: 'active', daysRemaining: null, graceEndsAt: null, isExpired: false };
  }
  const end = new Date(currentPeriodEnd);
  if (isNaN(end.getTime())) {
    return { state: 'active', daysRemaining: null, graceEndsAt: null, isExpired: false };
  }
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / msPerDay);
  const graceEnd = new Date(end.getTime() + TRIAL_GRACE_PERIOD_DAYS * msPerDay);
  const isExpired = end < now;
  if (!isExpired) {
    return {
      state: daysRemaining <= 7 ? 'expiring_soon' : 'active',
      daysRemaining,
      graceEndsAt: null,
      isExpired: false,
    };
  }
  return {
    state: now < graceEnd ? 'grace' : 'locked',
    daysRemaining,
    graceEndsAt: graceEnd.toISOString(),
    isExpired: true,
  };
}

export function getPlanFeatures(plan: PlanKey): PlanFeatures {
  return PLAN_FEATURES[plan] ?? PLAN_FEATURES.trial;
}

export function canAccessFeature(plan: PlanKey, status: LicenseStatus, feature: keyof PlanFeatures): boolean {
  if (status === 'suspended' || status === 'expired') return false;
  const features = getPlanFeatures(plan);
  const val = features[feature];
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0; // -1 = unlimited = true, 0 = blocked
  return false;
}

export interface LicenseInfo {
  id: string;
  plan: PlanKey;
  status: LicenseStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  seatsLimit: number;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  assignedBy: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  features: PlanFeatures;
}
