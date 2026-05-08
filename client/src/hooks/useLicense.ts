import { useQuery } from '@tanstack/react-query';
import { PLAN_FEATURES, PLAN_DISPLAY, type PlanKey, type LicenseStatus, type PlanFeatures } from '../../../shared/license';

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
}

export function useLicense() {
  const { data: license, isLoading, error, refetch } = useQuery<LicenseInfo>({
    queryKey: ['/api/license'],
    staleTime: 30_000,
  });

  const plan: PlanKey = license?.plan ?? 'trial';
  const status: LicenseStatus = license?.status ?? 'trial';
  const isExpired = license?.currentPeriodEnd
    ? new Date(license.currentPeriodEnd) < new Date()
    : false;

  const effectivePlan: PlanKey = isExpired ? 'trial' : plan;
  const features: PlanFeatures = PLAN_FEATURES[effectivePlan] ?? PLAN_FEATURES.trial;

  function canUse(feature: keyof PlanFeatures): boolean {
    if (status === 'suspended') return false;
    const val = features[feature];
    if (typeof val === 'boolean') return val;
    return (val as number) !== 0; // -1 = unlimited = OK, 0 = blocked
  }

  function isAtUserLimit(currentUsers: number): boolean {
    const limit = features.maxUsers;
    if (limit === -1) return false;
    return currentUsers >= limit;
  }

  function isAtTemplateLimit(currentTemplates: number): boolean {
    const limit = features.maxFormTemplates;
    if (limit === -1) return false;
    return currentTemplates >= limit;
  }

  const display = PLAN_DISPLAY[effectivePlan];

  return {
    license,
    isLoading,
    error,
    refetch,
    plan: effectivePlan,
    status,
    isExpired,
    features,
    canUse,
    isAtUserLimit,
    isAtTemplateLimit,
    display,
    seatsLimit: features.maxUsers,
    planLabel: display.label,
  };
}
