import { Lock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLicense } from '@/hooks/useLicense';
import type { PlanFeatures } from '../../../shared/license';
import { useLocation } from 'wouter';

interface FeatureGateProps {
  feature: keyof PlanFeatures;
  children: React.ReactNode;
  /** Short label shown on the upgrade prompt, e.g. "AI Document Processing" */
  featureLabel?: string;
  /** Render children grayed out behind a lock overlay instead of completely hiding */
  overlay?: boolean;
}

export function FeatureGate({ feature, children, featureLabel, overlay = false }: FeatureGateProps) {
  const { canUse, planLabel, isLoading } = useLicense();
  const [, navigate] = useLocation();

  if (isLoading) return <>{children}</>;
  if (canUse(feature)) return <>{children}</>;

  const label = featureLabel ?? String(feature).replace(/([A-Z])/g, ' $1').trim();

  const prompt = (
    <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <Lock className="h-6 w-6 text-slate-500" />
      </div>
      <div>
        <p className="font-semibold text-slate-800">{label}</p>
        <p className="mt-1 text-sm text-slate-500">
          Not available on your current <Badge variant="outline">{planLabel}</Badge> plan.
        </p>
      </div>
      <Button
        size="sm"
        className="gap-1.5"
        onClick={() => navigate('/pricing')}
      >
        <Zap className="h-4 w-4" />
        Upgrade Plan
      </Button>
    </div>
  );

  if (overlay) {
    return (
      <div className="relative">
        <div className="pointer-events-none select-none opacity-30 blur-[1px]">{children}</div>
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/80 backdrop-blur-sm">
          {prompt}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50">
      {prompt}
    </div>
  );
}

/** Inline chip that renders next to a nav item or tab label when it's locked */
export function LockedBadge() {
  return (
    <Badge variant="outline" className="ml-1.5 gap-1 text-[10px] font-medium text-slate-500">
      <Lock className="h-2.5 w-2.5" />
      Upgrade
    </Badge>
  );
}
