import { db } from "../db";
import * as schema from "../../shared/schema";
import { eq } from "drizzle-orm";

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

export class SubscriptionService {
  
  // Check if organization can perform action based on limits
  async checkUsageLimit(organizationId: string, type: 'users' | 'documents'): Promise<boolean> {
    const org = await db.select().from(schema.organizations).where(
      eq(schema.organizations.id, organizationId)
    ).limit(1);
    
    if (!org.length) return false;
    
    const organization = org[0];
    
    // Pilot programs have unlimited access
    if (organization.isPilotProgram) return true;
    
    const tier = SUBSCRIPTION_TIERS[organization.subscriptionTier];
    if (!tier) return false;
    
    if (type === 'users') {
      if (tier.userLimit === -1) return true; // unlimited
      const currentUsers = await db.select().from(schema.users).where(
        eq(schema.users.organizationId, organizationId)
      );
      return currentUsers.length < tier.userLimit;
    }
    
    if (type === 'documents') {
      if (tier.documentLimit === -1) return true; // unlimited
      const currentDocuments = await db.select().from(schema.documents).where(
        eq(schema.documents.organizationId, organizationId)
      );
      return currentDocuments.length < tier.documentLimit;
    }
    
    return false;
  }
  
  // Get organization's current usage
  async getUsageStats(organizationId: string) {
    const org = await storage.db.select().from(storage.schema.organizations).where(
      storage.schema.organizations.id.eq(organizationId)
    ).limit(1);
    
    if (!org.length) return null;
    
    const organization = org[0];
    const tier = SUBSCRIPTION_TIERS[organization.subscriptionTier];
    
    const [users, documents] = await Promise.all([
      storage.db.select().from(storage.schema.users).where(
        storage.schema.users.organizationId.eq(organizationId)
      ),
      storage.db.select().from(storage.schema.documents).where(
        storage.schema.documents.organizationId.eq(organizationId)
      )
    ]);
    
    return {
      tier: tier,
      isPilotProgram: organization.isPilotProgram,
      usage: {
        users: users.length,
        documents: documents.length
      },
      limits: {
        users: tier.userLimit,
        documents: tier.documentLimit
      }
    };
  }
  
  // Start pilot program
  async startPilotProgram(organizationId: string, durationDays: number = 90, notes?: string) {
    const pilotEndDate = new Date();
    pilotEndDate.setDate(pilotEndDate.getDate() + durationDays);
    
    await storage.db.update(storage.schema.organizations)
      .set({
        isPilotProgram: true,
        pilotStartDate: new Date(),
        pilotEndDate: pilotEndDate,
        pilotNotes: notes,
        subscriptionStatus: 'pilot'
      })
      .where(storage.schema.organizations.id.eq(organizationId));
    
    return true;
  }
  
  // Convert pilot to paid subscription
  async convertPilotToSubscription(organizationId: string, tier: string) {
    const subscriptionTier = SUBSCRIPTION_TIERS[tier];
    if (!subscriptionTier) throw new Error('Invalid subscription tier');
    
    const nextBillingDate = new Date();
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    
    await storage.db.update(storage.schema.organizations)
      .set({
        subscriptionTier: tier,
        subscriptionStatus: 'active',
        isPilotProgram: false,
        monthlyPrice: subscriptionTier.price.toString(),
        lastBillingDate: new Date(),
        nextBillingDate: nextBillingDate,
        userLimit: subscriptionTier.userLimit,
        documentLimit: subscriptionTier.documentLimit
      })
      .where(storage.schema.organizations.id.eq(organizationId));
    
    return true;
  }
  
  // Check if feature is available for organization
  async hasFeatureAccess(organizationId: string, feature: string): Promise<boolean> {
    const org = await storage.db.select().from(storage.schema.organizations).where(
      storage.schema.organizations.id.eq(organizationId)
    ).limit(1);
    
    if (!org.length) return false;
    
    const organization = org[0];
    
    // Pilot programs have access to all features
    if (organization.isPilotProgram) return true;
    
    const tier = SUBSCRIPTION_TIERS[organization.subscriptionTier];
    if (!tier) return false;
    
    return tier.features.includes(feature);
  }
}

export const subscriptionService = new SubscriptionService();