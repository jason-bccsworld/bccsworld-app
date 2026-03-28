import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { CreditCard, Wallet, Shield, Check, Star } from "lucide-react";

interface SubscriptionTier {
  id: string;
  tierName: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  analyticsAccess: string[];
}

interface CryptoConfig {
  supportedChains: Array<{ id: number; name: string }>;
  supportedStableCoins: string[];
  contractAddresses: Record<number, Record<string, string>>;
}

export default function CryptoSubscriptions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedTier, setSelectedTier] = useState<string>("");
  const [walletAddress, setWalletAddress] = useState("");
  const [selectedChain, setSelectedChain] = useState<number>(1);
  const [selectedStableCoin, setSelectedStableCoin] = useState<string>("USDC");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");

  // Fetch crypto configuration
  const { data: cryptoConfig } = useQuery<{ success: boolean; data: CryptoConfig }>({
    queryKey: ["/api/crypto/config"],
  });

  // Fetch subscription tiers
  const { data: subscriptionTiers } = useQuery<{ data: SubscriptionTier[] }>({
    queryKey: ["/api/subscription-tiers"],
  });

  // Fetch user's current subscriptions
  const { data: userSubscriptions, refetch: refetchSubscriptions } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ["/api/crypto/subscriptions"],
  });

  // Setup crypto subscription mutation
  const setupSubscriptionMutation = useMutation({
    mutationFn: async (data: {
      tierId: string;
      walletAddress: string;
      stableCoin: string;
      chainId: number;
      billingPeriod: "monthly" | "annual";
    }) => {
      const response = await fetch("/api/crypto/subscriptions/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Setup failed');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Crypto subscription setup successfully!",
      });
      refetchSubscriptions();
      // Reset form
      setSelectedTier("");
      setWalletAddress("");
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Please log in to continue.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to setup crypto subscription",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTier || !walletAddress) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      toast({
        title: "Invalid Wallet",
        description: "Please enter a valid Ethereum wallet address",
        variant: "destructive",
      });
      return;
    }

    setupSubscriptionMutation.mutate({
      tierId: selectedTier,
      walletAddress,
      stableCoin: selectedStableCoin,
      chainId: selectedChain,
      billingPeriod,
    });
  };

  const getSelectedTierData = () => {
    return subscriptionTiers?.data?.find(tier => tier.id === selectedTier);
  };

  const getPrice = (tier: SubscriptionTier) => {
    return billingPeriod === "monthly" ? tier.monthlyPrice : tier.annualPrice;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Wallet className="h-6 w-6 text-blue-600" />
        <h1 className="text-3xl font-bold">Crypto Subscriptions</h1>
      </div>

      {/* Current Subscriptions */}
      {userSubscriptions?.data && userSubscriptions.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Your Current Subscriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {userSubscriptions.data.map((subscription: any) => (
                <div key={subscription.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{subscription.tierName || 'Subscription'}</p>
                    <p className="text-sm text-gray-600">
                      Wallet: {subscription.walletAddress?.slice(0, 6)}...{subscription.walletAddress?.slice(-4)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Network: {subscription.chainId === 1 ? 'Ethereum' : 'Polygon'} | 
                      Token: {subscription.stableCoin}
                    </p>
                  </div>
                  <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                    {subscription.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription Tiers */}
      <div className="grid md:grid-cols-3 gap-6">
        {subscriptionTiers?.data?.map((tier) => (
          <Card 
            key={tier.id} 
            className={`cursor-pointer transition-all ${
              selectedTier === tier.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'
            }`}
            onClick={() => setSelectedTier(tier.id)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{tier.tierName}</CardTitle>
                {tier.tierName === 'Enterprise' && (
                  <Star className="h-5 w-5 text-yellow-500" />
                )}
              </div>
              <div className="text-3xl font-bold text-blue-600">
                ${getPrice(tier)}
                <span className="text-sm text-gray-500 font-normal">
                  /{billingPeriod}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium mb-2">Features:</h4>
                  <ul className="space-y-1">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                {tier.analyticsAccess?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Analytics:</h4>
                    <ul className="space-y-1">
                      {tier.analyticsAccess.map((access, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-blue-500" />
                          {access}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Crypto Payment Setup Form */}
      {selectedTier && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Crypto Payment Setup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Billing Period</Label>
                  <Select value={billingPeriod} onValueChange={(value: "monthly" | "annual") => setBillingPeriod(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Blockchain Network</Label>
                  <Select value={selectedChain.toString()} onValueChange={(value) => setSelectedChain(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cryptoConfig?.data?.supportedChains?.map((chain) => (
                        <SelectItem key={chain.id} value={chain.id.toString()}>
                          {chain.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Stablecoin</Label>
                  <Select value={selectedStableCoin} onValueChange={setSelectedStableCoin}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cryptoConfig?.data?.supportedStableCoins?.map((coin) => (
                        <SelectItem key={coin} value={coin}>
                          {coin}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Wallet Address</Label>
                  <Input
                    type="text"
                    placeholder="0x..."
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter your Ethereum-compatible wallet address
                  </p>
                </div>
              </div>

              {/* Payment Summary */}
              {selectedTier && (
                <div className="bg-blue-50 p-4 rounded-lg border">
                  <h4 className="font-medium mb-2">Payment Summary</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Plan:</span>
                      <span>{getSelectedTierData()?.tierName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Billing:</span>
                      <span>{billingPeriod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Amount:</span>
                      <span>${getPrice(getSelectedTierData()!)} {selectedStableCoin}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Network:</span>
                      <span>{cryptoConfig?.data?.supportedChains?.find(c => c.id === selectedChain)?.name}</span>
                    </div>
                  </div>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={setupSubscriptionMutation.isPending}
              >
                {setupSubscriptionMutation.isPending ? "Setting up..." : "Setup Crypto Subscription"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Crypto Info */}
      <Card>
        <CardHeader>
          <CardTitle>How Crypto Subscriptions Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <h4 className="font-medium">Automated Renewals</h4>
              <p className="text-sm text-gray-600">
                Smart contracts automatically handle subscription renewals using your approved stablecoin allowance.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Wallet className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <h4 className="font-medium">Global Payments</h4>
              <p className="text-sm text-gray-600">
                Pay from anywhere in the world with stablecoins (USDC, USDT, DAI) on Ethereum or Polygon.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Check className="h-5 w-5 text-purple-500 mt-0.5" />
            <div>
              <h4 className="font-medium">Transparent & Secure</h4>
              <p className="text-sm text-gray-600">
                All payments are recorded on the blockchain for complete transparency and security.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}