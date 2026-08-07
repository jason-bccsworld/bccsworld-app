import { Link } from 'wouter';
import { AlertTriangle, Lock, Clock } from 'lucide-react';
import { useLicense } from '@/hooks/useLicense';

/**
 * Global banner for the trial lifecycle:
 *  - amber countdown when the trial expires within 7 days
 *  - red read-only notice during the post-expiry grace period
 *  - red locked notice once the grace period has ended
 * Hidden for paid plans and healthy trials.
 */
export default function TrialStatusBanner() {
  const { license, plan, licenseState, daysRemaining, graceEndsAt, isLoading } = useLicense();

  if (isLoading || !license || plan !== 'trial') return null;
  if (licenseState === 'active' || licenseState == null) return null;

  const upgrade = (
    <Link
      href="/pricing"
      className="ml-3 inline-flex items-center rounded-md bg-white px-3 py-1 text-xs font-semibold shadow-sm hover:bg-slate-100 text-slate-900"
      data-testid="link-trial-upgrade"
    >
      Upgrade now
    </Link>
  );

  if (licenseState === 'expiring_soon') {
    const days = daysRemaining ?? 0;
    return (
      <div className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm text-white" data-testid="banner-trial-expiring">
        <Clock size={16} />
        <span>
          Your free trial expires {days <= 1 ? 'tomorrow' : `in ${days} days`}. Upgrade to keep full access.
        </span>
        {upgrade}
      </div>
    );
  }

  if (licenseState === 'grace') {
    const graceEnd = graceEndsAt ? new Date(graceEndsAt).toLocaleDateString() : null;
    return (
      <div className="flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-sm text-white" data-testid="banner-trial-grace">
        <AlertTriangle size={16} />
        <span>
          Your trial has expired — your workspace is read-only{graceEnd ? ` until ${graceEnd}` : ''}. Upgrade to restore full access.
        </span>
        {upgrade}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 bg-red-700 px-4 py-2 text-sm text-white" data-testid="banner-trial-locked">
      <Lock size={16} />
      <span>Your trial and grace period have ended. Upgrade to a paid plan to regain access.</span>
      {upgrade}
    </div>
  );
}
