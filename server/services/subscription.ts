// NOTE: This service targeted an `organizations`/`documents` storage domain
// (and a `users.organizationId` column) that no longer exists in the schema.
// All data-access methods below have been explicitly retired: they throw a
// clear error instead of silently accessing removed tables. The tier catalog
// (SUBSCRIPTION_TIERS) and its types remain available for callers.

export interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  userLimit: number;
  documentLimit: number;
  features: string[];
  isPopular?: boolean;
}

export const SUBSCRIPTION_TIERS: Record<string, SubscriptionTier> = {
  trial: {
    id: "trial",
    name: "Free Trial",
    price: 0,
    userLimit: 5,
    documentLimit: 100,
    features: ["Basic document processing", "OCR extraction", "Mobile access", "30-day trial"]
  },
  training_center: {
    id: "training_center",
    name: "Training Center",
    price: 299,
    userLimit: 50,
    documentLimit: 1000,
    features: [
      "Full Part 142 compliance",
      "AI document processing",
      "Blockchain audit trails",
      "Mobile PWA access",
      "Email support"
    ],
    isPopular: true
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    price: 799,
    userLimit: -1, // unlimited
    documentLimit: -1, // unlimited
    features: [
      "Everything in Training Center",
      "Advanced analytics & forecasting",
      "Multi-jurisdiction compliance",
      "API integrations",
      "Priority support",
      "Custom reporting"
    ]
  },
  regulatory: {
    id: "regulatory",
    name: "Regulatory",
    price: 1499,
    userLimit: -1, // unlimited
    documentLimit: -1, // unlimited
    features: [
      "Everything in Enterprise",
      "Multi-organization oversight",
      "Regulatory monitoring & alerts",
      "Advanced audit capabilities",
      "Dedicated support",
      "Custom compliance reports"
    ]
  }
};

const RETIRED_MESSAGE =
  "feature unavailable: organizations storage removed";

export interface UsageStats {
  tier: SubscriptionTier | undefined;
  isPilotProgram: boolean;
  usage: { users: number; documents: number };
  limits: { users: number; documents: number };
}

export class SubscriptionService {

  // Check if organization can perform action based on limits.
  // Retired: the organizations/documents storage domain no longer exists.
  async checkUsageLimit(organizationId: string, type: 'users' | 'documents'): Promise<boolean> {
    throw new Error(RETIRED_MESSAGE);
  }

  // Get organization's current usage.
  // Retired: the organizations/documents storage domain no longer exists.
  async getUsageStats(organizationId: string): Promise<UsageStats | null> {
    throw new Error(RETIRED_MESSAGE);
  }

  // Start pilot program.
  // Retired: the organizations storage domain no longer exists.
  async startPilotProgram(organizationId: string, durationDays: number = 90, notes?: string): Promise<boolean> {
    throw new Error(RETIRED_MESSAGE);
  }

  // Convert pilot to paid subscription.
  // Retired: the organizations storage domain no longer exists.
  async convertPilotToSubscription(organizationId: string, tier: string): Promise<boolean> {
    throw new Error(RETIRED_MESSAGE);
  }

  // Check if feature is available for organization.
  // Retired: the organizations storage domain no longer exists.
  async hasFeatureAccess(organizationId: string, feature: string): Promise<boolean> {
    throw new Error(RETIRED_MESSAGE);
  }
}

export const subscriptionService = new SubscriptionService();