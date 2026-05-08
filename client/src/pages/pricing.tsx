import { useMutation } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Shield, Phone, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLicense } from "@/hooks/useLicense";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const PLAN_CONFIG = [
  {
    key: "standard",
    name: "Standard",
    price: 4000,
    description: "For smaller Part 141/142 training centers getting started with digital compliance.",
    highlight: false,
    features: [
      "Up to 15 user accounts",
      "Core compliance records management",
      "FAA document repository",
      "5 digital form templates",
      "Student & instructor roster",
      "Audit history & CSV export",
      "Email support",
    ],
  },
  {
    key: "professional",
    name: "Professional",
    price: 9000,
    description: "Everything you need for full Part 142 digital compliance with AI-powered automation.",
    highlight: true,
    features: [
      "Up to 50 user accounts",
      "Everything in Standard",
      "AI document processing & OCR",
      "AI-generated FAA form templates",
      "Unlimited form templates",
      "PDF compliance reports",
      "Advanced analytics dashboard",
      "Custom roles & permissions",
      "Priority email support",
    ],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: 20000,
    description: "Unlimited scale with blockchain-secured records and full platform access.",
    highlight: false,
    features: [
      "Unlimited user accounts",
      "Everything in Professional",
      "Blockchain-secured training records",
      "Universal key management system",
      "API access for integrations",
      "White-label options",
      "Dedicated 24/7 support",
      "Custom onboarding & training",
    ],
  },
];

export default function Pricing() {
  const { isAuthenticated } = useAuth();
  const { plan: currentPlan } = useLicense();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: stripeProducts } = useQuery<any[]>({
    queryKey: ["/api/stripe/products"],
    queryFn: async () => {
      const res = await fetch("/api/stripe/products", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60_000,
  });

  const checkoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      const res = await apiRequest("POST", "/api/stripe/checkout", { priceId });
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data?.url) window.location.href = data.url;
    },
    onError: (err: any) =>
      toast({ title: "Checkout error", description: err.message, variant: "destructive" }),
  });

  function getStripePrice(planKey: string) {
    if (!stripeProducts) return null;
    const product = (stripeProducts as any[]).find(
      (p: any) => p.metadata?.planKey === planKey || p.name?.toLowerCase().includes(planKey)
    );
    return product?.prices?.[0] ?? null;
  }

  function handleSelect(planKey: string) {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    const price = getStripePrice(planKey);
    if (price) {
      checkoutMutation.mutate(price.id);
    } else {
      window.location.href = "mailto:sales@bccsworld.com?subject=BCCS-US " + planKey + " Plan Inquiry";
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 pt-16 pb-10 text-center">
        <Badge className="mb-4 bg-blue-100 text-blue-700 border-0">Annual billing</Badge>
        <h1 className="text-4xl font-bold text-slate-900 mb-3">
          Simple, transparent pricing
        </h1>
        <p className="text-lg text-slate-500 max-w-xl mx-auto">
          Purpose-built for Part 141, Part 142, and Part 135 aviation training organizations.
          All plans include onboarding and core compliance features.
        </p>
      </div>

      {/* Plans */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {PLAN_CONFIG.map((plan) => {
            const stripePrice = getStripePrice(plan.key);
            const isCurrent = isAuthenticated && currentPlan === plan.key;

            return (
              <Card
                key={plan.key}
                className={`relative flex flex-col ${
                  plan.highlight
                    ? "border-blue-500 ring-2 ring-blue-200 shadow-lg"
                    : "border-slate-200 shadow-sm"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white shadow-md">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="pb-4 pt-6">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">{plan.description}</CardDescription>
                  <div className="pt-2">
                    <span className="text-4xl font-bold text-slate-900">
                      ${plan.price.toLocaleString()}
                    </span>
                    <span className="text-slate-500 text-sm"> /year</span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 gap-4">
                  <ul className="space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                        <Check className="h-4 w-4 shrink-0 text-green-500 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-2">
                    {isCurrent ? (
                      <Button className="w-full" variant="outline" onClick={() => navigate("/billing")}>
                        Current Plan
                      </Button>
                    ) : (
                      <Button
                        className={`w-full ${plan.highlight ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                        disabled={checkoutMutation.isPending}
                        onClick={() => handleSelect(plan.key)}
                      >
                        {checkoutMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        {stripePrice ? "Get Started" : "Contact Sales"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Value props */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { icon: Shield, label: "FAA Compliant",    sub: "Part 141/142/135 ready" },
            { icon: Zap,    label: "AI-Powered",        sub: "Document processing & forms" },
            { icon: Shield, label: "Blockchain Records",sub: "Immutable audit trails" },
            { icon: Phone,  label: "24/7 Support",      sub: "First 12 weeks included" },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className="rounded-full bg-blue-50 p-3">
                <Icon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="font-semibold text-slate-800 text-sm">{label}</div>
              <div className="text-xs text-slate-500">{sub}</div>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-14 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {[
              { q: "Can I switch plans anytime?", a: "Yes, you can upgrade at any time. Changes take effect immediately and are prorated." },
              { q: "Is there a pilot program available?", a: "Yes, we offer extended 30-day trials for training centers wanting to validate the platform with their specific workflows." },
              { q: "What about data migration?", a: "We provide free data migration assistance for all customers, helping you import existing training records." },
            ].map(({ q, a }) => (
              <div key={q}>
                <h3 className="font-semibold text-slate-900 mb-1">{q}</h3>
                <p className="text-slate-600 text-sm">{a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-14 rounded-2xl bg-slate-900 text-white p-10 text-center">
          <h2 className="text-2xl font-bold mb-2">Need a custom arrangement?</h2>
          <p className="text-slate-400 mb-6 max-w-lg mx-auto">
            We work with international aviation training centers, government programs, and
            multi-organization consortiums. Let's talk.
          </p>
          <Button
            variant="outline"
            className="border-white text-white hover:bg-white hover:text-slate-900"
            onClick={() => (window.location.href = "mailto:sales@bccsworld.com")}
          >
            Contact Sales
          </Button>
        </div>
      </div>
    </div>
  );
}
