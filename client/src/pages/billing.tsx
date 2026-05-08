import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard, CheckCircle2, XCircle, Clock, AlertTriangle,
  ExternalLink, Loader2, Users, FileText, Zap, Shield,
} from "lucide-react";
import { useLicense } from "@/hooks/useLicense";
import { PLAN_DISPLAY, PLAN_FEATURES, type PlanKey } from "@shared/license";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: any }> = {
    active:    { label: "Active",    cls: "bg-green-100 text-green-700", icon: CheckCircle2 },
    trial:     { label: "Trial",     cls: "bg-sky-100 text-sky-700",     icon: Clock },
    suspended: { label: "Suspended", cls: "bg-red-100 text-red-700",     icon: XCircle },
    expired:   { label: "Expired",   cls: "bg-amber-100 text-amber-700", icon: AlertTriangle },
  };
  const s = map[status] ?? map.trial;
  const Icon = s.icon;
  return (
    <Badge className={`gap-1 border-0 ${s.cls}`}>
      <Icon className="h-3 w-3" />
      {s.label}
    </Badge>
  );
}

function FeatureRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {enabled
        ? <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
        : <XCircle className="h-4 w-4 shrink-0 text-slate-300" />}
      <span className={enabled ? "text-slate-700" : "text-slate-400"}>{label}</span>
    </div>
  );
}

export default function Billing() {
  const { license, isLoading, plan, status, isExpired, display, features } = useLicense();
  const { toast } = useToast();

  const { data: stripeProducts } = useQuery<any[]>({
    queryKey: ["/api/stripe/products"],
    queryFn: async () => {
      const res = await fetch("/api/stripe/products", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60_000,
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/portal", {});
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data?.url) window.location.href = data.url;
    },
    onError: (err: any) => toast({ title: "Could not open billing portal", description: err.message, variant: "destructive" }),
  });

  const checkoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      const res = await apiRequest("POST", "/api/stripe/checkout", { priceId });
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data?.url) window.location.href = data.url;
    },
    onError: (err: any) => toast({ title: "Checkout failed", description: err.message, variant: "destructive" }),
  });

  const planOrder: PlanKey[] = ['standard', 'professional', 'enterprise'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const periodEnd = license?.currentPeriodEnd ? new Date(license.currentPeriodEnd) : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Billing & License</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your BCCS-US subscription and plan features.</p>
      </div>

      {/* Current plan card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">Current Plan</CardTitle>
              <CardDescription>Your active subscription details</CardDescription>
            </div>
            <StatusBadge status={isExpired ? "expired" : status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${display.color}`}>
              {display.label}
            </div>
            {plan !== 'trial' && (
              <span className="text-slate-600 text-sm">
                ${PLAN_DISPLAY[plan].annualPrice.toLocaleString()}/year
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-2">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">
                {features.maxUsers === -1 ? "∞" : features.maxUsers}
              </div>
              <div className="text-xs text-slate-500 flex items-center justify-center gap-1 mt-0.5">
                <Users className="h-3 w-3" /> Max Users
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">
                {features.maxFormTemplates === -1 ? "∞" : features.maxFormTemplates}
              </div>
              <div className="text-xs text-slate-500 flex items-center justify-center gap-1 mt-0.5">
                <FileText className="h-3 w-3" /> Form Templates
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">
                {features.aiDocumentProcessing ? "✓" : "✗"}
              </div>
              <div className="text-xs text-slate-500 flex items-center justify-center gap-1 mt-0.5">
                <Zap className="h-3 w-3" /> AI Features
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">
                {features.blockchainRecords ? "✓" : "✗"}
              </div>
              <div className="text-xs text-slate-500 flex items-center justify-center gap-1 mt-0.5">
                <Shield className="h-3 w-3" /> Blockchain
              </div>
            </div>
          </div>

          {periodEnd && (
            <p className="text-sm text-slate-500">
              {isExpired ? "Expired" : "Renews"} on{" "}
              <span className="font-medium text-slate-700">{format(periodEnd, "MMMM d, yyyy")}</span>
            </p>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => portalMutation.mutate()}
            disabled={portalMutation.isPending}
            className="gap-2"
          >
            {portalMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            Manage Billing
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </Button>
        </CardContent>
      </Card>

      {/* Feature details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Features Included</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <FeatureRow label="Core Compliance Records" enabled={true} />
            <FeatureRow label="Students & Instructors" enabled={true} />
            <FeatureRow label="FAA Document Repository" enabled={true} />
            <FeatureRow label="Audit History" enabled={true} />
            <FeatureRow label={`Digital Form Templates (up to ${features.maxFormTemplates === -1 ? "unlimited" : features.maxFormTemplates})`} enabled={true} />
            <FeatureRow label="AI Document Processing" enabled={features.aiDocumentProcessing} />
            <FeatureRow label="AI Form Generation" enabled={features.aiFormGeneration} />
            <FeatureRow label="Compliance Reports (PDF)" enabled={features.complianceReports} />
            <FeatureRow label="Advanced Analytics" enabled={features.advancedAnalytics} />
            <FeatureRow label="Custom Roles & Permissions" enabled={features.customRoles} />
            <FeatureRow label="Blockchain-Secured Records" enabled={features.blockchainRecords} />
            <FeatureRow label="API Access" enabled={features.apiAccess} />
            <FeatureRow label="Priority Support" enabled={features.prioritySupport} />
          </div>
        </CardContent>
      </Card>

      {/* Upgrade options */}
      {plan !== 'enterprise' && (
        <>
          <Separator />
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Upgrade Your Plan</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {planOrder
                .filter(p => {
                  const prices = ['trial','standard','professional','enterprise'];
                  return prices.indexOf(p) > prices.indexOf(plan);
                })
                .map(p => {
                  const pd = PLAN_DISPLAY[p];
                  const pf = PLAN_FEATURES[p];
                  const stripeProduct = stripeProducts?.find((sp: any) =>
                    sp.metadata?.planKey === p || sp.name?.toLowerCase().includes(p)
                  );
                  const stripePrice = stripeProduct?.prices?.[0];

                  return (
                    <Card key={p} className={p === 'professional' ? "border-blue-400 ring-1 ring-blue-200" : ""}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-base">{pd.label}</CardTitle>
                          {p === 'professional' && (
                            <Badge className="bg-blue-600 text-white text-xs">Popular</Badge>
                          )}
                        </div>
                        <div className="text-2xl font-bold text-slate-900">
                          ${pd.annualPrice.toLocaleString()}
                          <span className="text-sm font-normal text-slate-500">/year</span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-sm text-slate-600 space-y-1">
                          <div>✓ Up to {pf.maxUsers === -1 ? "unlimited" : pf.maxUsers} users</div>
                          {pf.aiDocumentProcessing && <div>✓ AI document processing</div>}
                          {pf.blockchainRecords && <div>✓ Blockchain records</div>}
                          {pf.apiAccess && <div>✓ API access</div>}
                        </div>
                        <Button
                          className="w-full"
                          size="sm"
                          disabled={checkoutMutation.isPending || !stripePrice}
                          onClick={() => stripePrice && checkoutMutation.mutate(stripePrice.id)}
                        >
                          {checkoutMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          {stripePrice ? "Subscribe Now" : "Contact Sales"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </div>
        </>
      )}

      <p className="text-xs text-slate-400 text-center">
        Need help with billing? Contact{" "}
        <a href="mailto:support@bccsworld.com" className="underline hover:text-slate-600">
          support@bccsworld.com
        </a>
      </p>
    </div>
  );
}
