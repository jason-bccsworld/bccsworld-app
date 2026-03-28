import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star } from "lucide-react";

const pricingTiers = [
  {
    id: "trial",
    name: "Free Trial",
    price: 0,
    period: "30 days",
    description: "Perfect for evaluating BCCS-US",
    userLimit: "5 users",
    documentLimit: "100 documents",
    features: [
      "Basic document processing",
      "OCR extraction",
      "Mobile access",
      "Email support"
    ],
    buttonText: "Start Free Trial",
    buttonVariant: "outline" as const
  },
  {
    id: "training_center",
    name: "Training Center",
    price: 299,
    period: "per month",
    description: "Ideal for Part 142 training centers",
    userLimit: "50 users",
    documentLimit: "1,000 documents",
    features: [
      "Full Part 142 compliance",
      "AI document processing",
      "Blockchain audit trails",
      "Mobile PWA access",
      "Email support",
      "Regulatory monitoring"
    ],
    buttonText: "Get Started",
    buttonVariant: "default" as const,
    isPopular: true
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 799,
    period: "per month",
    description: "For large training organizations",
    userLimit: "Unlimited users",
    documentLimit: "Unlimited documents",
    features: [
      "Everything in Training Center",
      "Advanced analytics & forecasting",
      "Multi-jurisdiction compliance",
      "API integrations",
      "Priority support",
      "Custom reporting",
      "Multi-organization management"
    ],
    buttonText: "Contact Sales",
    buttonVariant: "outline" as const
  },
  {
    id: "regulatory",
    name: "Regulatory",
    price: 1499,
    period: "per month",
    description: "For aviation authorities and oversight bodies",
    userLimit: "Unlimited users",
    documentLimit: "Unlimited documents",
    features: [
      "Everything in Enterprise",
      "Multi-organization oversight",
      "Regulatory monitoring & alerts",
      "Advanced audit capabilities",
      "Dedicated support",
      "Custom compliance reports",
      "International compliance tracking"
    ],
    buttonText: "Contact Sales",
    buttonVariant: "outline" as const
  }
];

export default function Pricing() {
  const handlePlanSelect = (planId: string) => {
    if (planId === "trial") {
      // Redirect to signup with trial parameter
      window.location.href = "/login";
    } else {
      // Contact sales for paid plans
      window.location.href = "mailto:sales@bccs142.com?subject=Interest in " + pricingTiers.find(t => t.id === planId)?.name + " Plan";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Choose the perfect plan for your aviation training organization. 
            All plans include our complete compliance platform with no hidden fees.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {pricingTiers.map((tier) => (
            <Card key={tier.id} className={`relative ${tier.isPopular ? 'border-aviation-blue border-2 shadow-lg' : ''}`}>
              {tier.isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-aviation-blue text-white px-3 py-1">
                    <Star className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-lg font-semibold">{tier.name}</CardTitle>
                <CardDescription className="text-sm">{tier.description}</CardDescription>
                <div className="mt-4">
                  <div className="flex items-baseline justify-center">
                    <span className="text-3xl font-bold text-slate-900">${tier.price}</span>
                    <span className="text-sm text-slate-600 ml-1">/{tier.period}</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Usage Limits */}
                <div className="text-center py-3 bg-slate-50 rounded-lg">
                  <div className="text-sm font-medium text-slate-700">{tier.userLimit}</div>
                  <div className="text-sm font-medium text-slate-700">{tier.documentLimit}</div>
                </div>

                {/* Features List */}
                <div className="space-y-2">
                  {tier.features.map((feature, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-slate-600">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <Button 
                  className={`w-full mt-6 ${tier.isPopular ? 'bg-aviation-blue hover:bg-blue-700' : ''}`}
                  variant={tier.buttonVariant}
                  onClick={() => handlePlanSelect(tier.id)}
                >
                  {tier.buttonText}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Value Proposition */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            Why Choose BCCS-US?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">No Setup Fees</h3>
              <p className="text-sm text-slate-600">
                Get started immediately with zero implementation costs. 
                Competitors charge $50K-500K for setup.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Star className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Enterprise Features</h3>
              <p className="text-sm text-slate-600">
                AI processing, blockchain security, and regulatory monitoring 
                included in all plans.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Instant Deployment</h3>
              <p className="text-sm text-slate-600">
                Start using BCCS-US in hours, not months. 
                No lengthy implementation projects required.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Can I switch plans anytime?</h3>
              <p className="text-slate-600">Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Is there a pilot program available?</h3>
              <p className="text-slate-600">Yes, we offer extended pilot programs for training centers wanting to validate our platform with their specific workflows.</p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">What about data migration?</h3>
              <p className="text-slate-600">We provide free data migration assistance for all customers, helping you import existing training records and documents.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}