import {
  users,
  aircraftRegistry,
  aircraftOwnership,
  tokenOfferings,
  tokenHolders,
  tokenTransactions,
  complianceChecks,
  auditLogs,
  cryptoPayments,
  smartContracts,
  customerSubscriptions,
  subscriptionTiers,
  trainingOrganizations,
  professionalCredentials,
  organizationMembers,
  blockchainTrainingRecords,
  keyRecoveryRequests,
  crossPlatformVerifications,
  type User,
  type UpsertUser,
  type AircraftRegistry,
  type InsertAircraftRegistry,
  type TokenOffering,
  type InsertTokenOffering,
  type TokenHolder,
  type InsertTokenHolder,
  type TokenTransaction,
  type InsertTokenTransaction,
  type ComplianceCheck,
  type AuditLog,
  type InsertAuditLog,
  type CryptoPayment,
  type InsertCryptoPayment,
  type SmartContract,
  type InsertSmartContract,
  type CustomerSubscription,
  type InsertCustomerSubscription,
  type TrainingOrganization,
  type InsertTrainingOrganization,
  type ProfessionalCredential,
  type InsertProfessionalCredential,
  type OrganizationMember,
  type InsertOrganizationMember,
  type BlockchainTrainingRecord,
  type InsertBlockchainTrainingRecord,
  type KeyRecoveryRequest,
  type InsertKeyRecoveryRequest,
  type CrossPlatformVerification,
  type InsertCrossPlatformVerification,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, like, and, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Aircraft Registry operations
  createAircraft(aircraft: InsertAircraftRegistry): Promise<AircraftRegistry>;
  getAircraft(id: string): Promise<AircraftRegistry | undefined>;
  getAircraftByTailNumber(tailNumber: string): Promise<AircraftRegistry | undefined>;
  getAllAircraft(): Promise<AircraftRegistry[]>;
  updateAircraft(id: string, aircraft: Partial<AircraftRegistry>): Promise<void>;
  deleteAircraft(id: string): Promise<void>;

  // Token offering operations
  createTokenOffering(offering: InsertTokenOffering): Promise<TokenOffering>;
  getTokenOffering(id: string): Promise<TokenOffering | undefined>;
  getTokenOfferingByAircraftId(aircraftId: string): Promise<TokenOffering | undefined>;
  getAllTokenOfferings(): Promise<TokenOffering[]>;
  updateTokenOffering(id: string, offering: Partial<TokenOffering>): Promise<void>;

  // Token holder operations
  createTokenHolder(holder: InsertTokenHolder): Promise<TokenHolder>;
  getTokenHoldersByOffering(offeringId: string): Promise<TokenHolder[]>;
  updateTokenHolder(id: string, holder: Partial<TokenHolder>): Promise<void>;

  // Token transaction operations
  createTokenTransaction(transaction: InsertTokenTransaction): Promise<TokenTransaction>;
  getTokenTransactionsByOffering(offeringId: string): Promise<TokenTransaction[]>;
  getAllTokenTransactions(): Promise<TokenTransaction[]>;

  // Compliance operations
  performComplianceCheck(aircraftId: string, checkType: string): Promise<ComplianceCheck>;
  getComplianceChecksByAircraft(aircraftId: string): Promise<ComplianceCheck[]>;

  // Analytics
  getRegistryStats(): Promise<{
    totalAircraft: number;
    tokenizedAircraft: number;
    totalTokenVolume: number;
    activeInvestors: number;
  }>;

  // Audit logging
  createAuditLog(auditLog: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(filters?: { eventType?: string; severity?: string; limit?: number }): Promise<AuditLog[]>;

  // Crypto payments and subscriptions
  createCryptoPayment(payment: InsertCryptoPayment): Promise<CryptoPayment>;
  getCryptoPaymentsBySubscription(subscriptionId: string): Promise<CryptoPayment[]>;
  updateCryptoPayment(id: string, payment: Partial<CryptoPayment>): Promise<void>;

  // Smart contracts
  createSmartContract(contract: InsertSmartContract): Promise<SmartContract>;
  getSmartContractByChain(chainId: number): Promise<SmartContract | undefined>;
  getSmartContractsByChain(chainId: number): Promise<SmartContract[]>;
  updateSmartContract(id: string, contract: Partial<SmartContract>): Promise<void>;

  // Customer subscriptions
  createCustomerSubscription(subscription: InsertCustomerSubscription): Promise<CustomerSubscription>;
  getCustomerSubscription(id: string): Promise<CustomerSubscription | undefined>;
  updateCustomerSubscription(id: string, subscription: Partial<CustomerSubscription>): Promise<void>;
  getSubscriptionTier(id: string): Promise<any>;

  // Universal Blockchain Key Management operations
  createTrainingOrganization(org: InsertTrainingOrganization): Promise<TrainingOrganization>;
  getTrainingOrganization(id: string): Promise<TrainingOrganization | undefined>;
  getTrainingOrganizationByPublicKey(publicKey: string): Promise<TrainingOrganization | undefined>;
  
  createProfessionalCredential(credential: InsertProfessionalCredential): Promise<ProfessionalCredential>;
  getProfessionalCredential(id: string): Promise<ProfessionalCredential | undefined>;
  getProfessionalCredentialByLicense(licenseNumber: string, authority: string): Promise<ProfessionalCredential | undefined>;
  
  createOrganizationMember(member: InsertOrganizationMember): Promise<OrganizationMember>;
  getOrganizationMembers(organizationId: string): Promise<OrganizationMember[]>;
  
  createBlockchainTrainingRecord(record: InsertBlockchainTrainingRecord): Promise<BlockchainTrainingRecord>;
  getTrainingRecordsByCredential(credentialId: string): Promise<BlockchainTrainingRecord[]>;
  
  createKeyRecoveryRequest(request: InsertKeyRecoveryRequest): Promise<KeyRecoveryRequest>;
  getKeyRecoveryRequest(id: string): Promise<KeyRecoveryRequest | undefined>;
  updateKeyRecoveryRequest(id: string, updates: Partial<KeyRecoveryRequest>): Promise<void>;
  
  createCrossPlatformVerification(verification: InsertCrossPlatformVerification): Promise<CrossPlatformVerification>;
  getVerificationHistory(credentialId: string): Promise<CrossPlatformVerification[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Aircraft Registry operations
  async createAircraft(aircraft: InsertAircraftRegistry): Promise<AircraftRegistry> {
    const [newAircraft] = await db.insert(aircraftRegistry).values(aircraft).returning();
    return newAircraft;
  }

  async getAircraft(id: string): Promise<AircraftRegistry | undefined> {
    const [aircraft] = await db.select().from(aircraftRegistry).where(eq(aircraftRegistry.id, id));
    return aircraft;
  }

  async getAircraftByTailNumber(tailNumber: string): Promise<AircraftRegistry | undefined> {
    const [aircraft] = await db.select().from(aircraftRegistry).where(eq(aircraftRegistry.tailNumber, tailNumber));
    return aircraft;
  }

  async getAllAircraft(): Promise<AircraftRegistry[]> {
    return await db
      .select()
      .from(aircraftRegistry)
      .orderBy(desc(aircraftRegistry.createdAt));
  }

  async updateAircraft(id: string, aircraft: Partial<AircraftRegistry>): Promise<void> {
    await db
      .update(aircraftRegistry)
      .set({ ...aircraft, updatedAt: new Date() })
      .where(eq(aircraftRegistry.id, id));
  }

  async deleteAircraft(id: string): Promise<void> {
    await db.delete(aircraftRegistry).where(eq(aircraftRegistry.id, id));
  }

  // Token offering operations
  async createTokenOffering(offering: InsertTokenOffering): Promise<TokenOffering> {
    const [newOffering] = await db.insert(tokenOfferings).values(offering).returning();
    // Update aircraft as tokenized
    await this.updateAircraft(newOffering.aircraftId, { isTokenized: true });
    return newOffering;
  }

  async getTokenOffering(id: string): Promise<TokenOffering | undefined> {
    const [offering] = await db.select().from(tokenOfferings).where(eq(tokenOfferings.id, id));
    return offering;
  }

  async getTokenOfferingByAircraftId(aircraftId: string): Promise<TokenOffering | undefined> {
    const [offering] = await db.select().from(tokenOfferings).where(eq(tokenOfferings.aircraftId, aircraftId));
    return offering;
  }

  async getAllTokenOfferings(): Promise<TokenOffering[]> {
    return await db
      .select()
      .from(tokenOfferings)
      .orderBy(desc(tokenOfferings.launchDate));
  }

  async updateTokenOffering(id: string, offering: Partial<TokenOffering>): Promise<void> {
    await db
      .update(tokenOfferings)
      .set(offering)
      .where(eq(tokenOfferings.id, id));
  }

  // Token holder operations
  async createTokenHolder(holder: InsertTokenHolder): Promise<TokenHolder> {
    const [newHolder] = await db.insert(tokenHolders).values(holder).returning();
    return newHolder;
  }

  async getTokenHoldersByOffering(offeringId: string): Promise<TokenHolder[]> {
    return await db
      .select()
      .from(tokenHolders)
      .where(eq(tokenHolders.offeringId, offeringId))
      .orderBy(desc(tokenHolders.tokensOwned));
  }

  async updateTokenHolder(id: string, holder: Partial<TokenHolder>): Promise<void> {
    await db
      .update(tokenHolders)
      .set({ ...holder, lastTransactionDate: new Date() })
      .where(eq(tokenHolders.id, id));
  }

  // Token transaction operations
  async createTokenTransaction(transaction: InsertTokenTransaction): Promise<TokenTransaction> {
    const [newTransaction] = await db.insert(tokenTransactions).values(transaction).returning();
    return newTransaction;
  }

  async getTokenTransactionsByOffering(offeringId: string): Promise<TokenTransaction[]> {
    return await db
      .select()
      .from(tokenTransactions)
      .where(eq(tokenTransactions.offeringId, offeringId))
      .orderBy(desc(tokenTransactions.transactionDate));
  }

  async getAllTokenTransactions(): Promise<TokenTransaction[]> {
    return await db
      .select()
      .from(tokenTransactions)
      .orderBy(desc(tokenTransactions.transactionDate))
      .limit(100);
  }

  // Compliance operations
  async performComplianceCheck(aircraftId: string, checkType: string): Promise<ComplianceCheck> {
    // Mock compliance check logic - in production this would check actual compliance
    const checkResult = Math.random() > 0.1 ? "passed" : "warning";
    const checkDetails = {
      automated: true,
      timestamp: new Date().toISOString(),
      details: `${checkType} check completed successfully`
    };

    const [check] = await db.insert(complianceChecks).values({
      aircraftId,
      checkType,
      checkResult,
      checkDetails,
      performedBy: "system",
      nextCheckDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    }).returning();

    return check;
  }

  async getComplianceChecksByAircraft(aircraftId: string): Promise<ComplianceCheck[]> {
    return await db
      .select()
      .from(complianceChecks)
      .where(eq(complianceChecks.aircraftId, aircraftId))
      .orderBy(desc(complianceChecks.checkDate));
  }

  // Analytics
  async getRegistryStats(): Promise<{
    totalAircraft: number;
    tokenizedAircraft: number;
    totalTokenVolume: number;
    activeInvestors: number;
  }> {
    const totalAircraftResult = await db.select({ count: count() }).from(aircraftRegistry);
    const tokenizedAircraftResult = await db
      .select({ count: count() })
      .from(aircraftRegistry)
      .where(eq(aircraftRegistry.isTokenized, true));

    const totalTokenVolumeResult = await db
      .select({ 
        sum: sql<number>`COALESCE(SUM(CAST(${tokenTransactions.totalAmount} AS DECIMAL)), 0)`
      })
      .from(tokenTransactions);

    const activeInvestorsResult = await db
      .select({ 
        count: sql<number>`COUNT(DISTINCT ${tokenHolders.investorId})`
      })
      .from(tokenHolders);

    return {
      totalAircraft: totalAircraftResult[0]?.count || 0,
      tokenizedAircraft: tokenizedAircraftResult[0]?.count || 0,
      totalTokenVolume: Number(totalTokenVolumeResult[0]?.sum || 0),
      activeInvestors: Number(activeInvestorsResult[0]?.count || 0),
    };
  }

  // Audit logging operations
  async createAuditLog(auditLogData: InsertAuditLog): Promise<AuditLog> {
    const [auditLog] = await db.insert(auditLogs).values(auditLogData).returning();
    return auditLog;
  }

  async getAuditLogs(filters?: { eventType?: string; severity?: string; limit?: number }): Promise<AuditLog[]> {
    const conditions = [];
    
    if (filters?.eventType) {
      conditions.push(eq(auditLogs.eventType, filters.eventType));
    }
    
    if (filters?.severity) {
      conditions.push(eq(auditLogs.severity, filters.severity));
    }
    
    return await db.select().from(auditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.timestamp))
      .limit(filters?.limit ?? 1000);
  }

  // Crypto payments operations
  async createCryptoPayment(paymentData: InsertCryptoPayment): Promise<CryptoPayment> {
    const [payment] = await db.insert(cryptoPayments).values(paymentData).returning();
    return payment;
  }

  async getCryptoPaymentsBySubscription(subscriptionId: string): Promise<CryptoPayment[]> {
    return await db
      .select()
      .from(cryptoPayments)
      .where(eq(cryptoPayments.subscriptionId, subscriptionId))
      .orderBy(desc(cryptoPayments.createdAt));
  }

  async updateCryptoPayment(id: string, paymentData: Partial<CryptoPayment>): Promise<void> {
    await db
      .update(cryptoPayments)
      .set(paymentData)
      .where(eq(cryptoPayments.id, id));
  }

  // Smart contracts operations
  async createSmartContract(contractData: InsertSmartContract): Promise<SmartContract> {
    const [contract] = await db.insert(smartContracts).values(contractData).returning();
    return contract;
  }

  async getSmartContractByChain(chainId: number): Promise<SmartContract | undefined> {
    const [contract] = await db
      .select()
      .from(smartContracts)
      .where(and(eq(smartContracts.chainId, chainId), eq(smartContracts.isActive, true)))
      .limit(1);
    return contract;
  }

  async getSmartContractsByChain(chainId: number): Promise<SmartContract[]> {
    return await db
      .select()
      .from(smartContracts)
      .where(and(eq(smartContracts.chainId, chainId), eq(smartContracts.isActive, true)));
  }

  async updateSmartContract(id: string, contractData: Partial<SmartContract>): Promise<void> {
    await db
      .update(smartContracts)
      .set(contractData)
      .where(eq(smartContracts.id, id));
  }

  // Customer subscriptions operations
  async createCustomerSubscription(subscriptionData: InsertCustomerSubscription): Promise<CustomerSubscription> {
    const [subscription] = await db.insert(customerSubscriptions).values(subscriptionData).returning();
    return subscription;
  }

  async getCustomerSubscription(id: string): Promise<CustomerSubscription | undefined> {
    const [subscription] = await db
      .select()
      .from(customerSubscriptions)
      .where(eq(customerSubscriptions.id, id));
    return subscription;
  }

  async updateCustomerSubscription(id: string, subscriptionData: Partial<CustomerSubscription>): Promise<void> {
    await db
      .update(customerSubscriptions)
      .set(subscriptionData)
      .where(eq(customerSubscriptions.id, id));
  }

  async getSubscriptionTier(id: string): Promise<any> {
    const [tier] = await db
      .select()
      .from(subscriptionTiers)
      .where(eq(subscriptionTiers.id, id));
    return tier;
  }

  async getCustomerSubscriptionsByUser(userId: string): Promise<CustomerSubscription[]> {
    return await db
      .select()
      .from(customerSubscriptions)
      .where(eq(customerSubscriptions.customerId, userId))
      .orderBy(desc(customerSubscriptions.startDate));
  }

  async getAllSubscriptionTiers(): Promise<any[]> {
    return await db
      .select()
      .from(subscriptionTiers)
      .where(eq(subscriptionTiers.isActive, true))
      .orderBy(subscriptionTiers.monthlyPrice);
  }

  // Universal Blockchain Key Management implementations
  async createTrainingOrganization(orgData: InsertTrainingOrganization): Promise<TrainingOrganization> {
    const [organization] = await db.insert(trainingOrganizations).values(orgData).returning();
    return organization;
  }

  async getTrainingOrganization(id: string): Promise<TrainingOrganization | undefined> {
    const [organization] = await db.select().from(trainingOrganizations).where(eq(trainingOrganizations.id, id));
    return organization;
  }

  async getTrainingOrganizationByPublicKey(publicKey: string): Promise<TrainingOrganization | undefined> {
    const [organization] = await db.select().from(trainingOrganizations).where(eq(trainingOrganizations.masterPublicKey, publicKey));
    return organization;
  }

  async createProfessionalCredential(credentialData: InsertProfessionalCredential): Promise<ProfessionalCredential> {
    const [credential] = await db.insert(professionalCredentials).values(credentialData).returning();
    return credential;
  }

  async getProfessionalCredential(id: string): Promise<ProfessionalCredential | undefined> {
    const [credential] = await db.select().from(professionalCredentials).where(eq(professionalCredentials.id, id));
    return credential;
  }

  async getProfessionalCredentialByLicense(licenseNumber: string, authority: string): Promise<ProfessionalCredential | undefined> {
    const [credential] = await db.select().from(professionalCredentials)
      .where(and(
        eq(professionalCredentials.licenseNumber, licenseNumber),
        eq(professionalCredentials.regulatoryAuthority, authority)
      ));
    return credential;
  }

  async createOrganizationMember(memberData: InsertOrganizationMember): Promise<OrganizationMember> {
    const [member] = await db.insert(organizationMembers).values(memberData).returning();
    return member;
  }

  async getOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
    return await db.select().from(organizationMembers)
      .where(and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.isActive, true)
      ))
      .orderBy(organizationMembers.startDate);
  }

  async createBlockchainTrainingRecord(recordData: InsertBlockchainTrainingRecord): Promise<BlockchainTrainingRecord> {
    const [record] = await db.insert(blockchainTrainingRecords).values(recordData).returning();
    return record;
  }

  async getTrainingRecordsByCredential(credentialId: string): Promise<BlockchainTrainingRecord[]> {
    return await db.select().from(blockchainTrainingRecords)
      .where(eq(blockchainTrainingRecords.studentCredentialId, credentialId))
      .orderBy(desc(blockchainTrainingRecords.completionDate));
  }

  async createKeyRecoveryRequest(requestData: InsertKeyRecoveryRequest): Promise<KeyRecoveryRequest> {
    const [request] = await db.insert(keyRecoveryRequests).values(requestData).returning();
    return request;
  }

  async getKeyRecoveryRequest(id: string): Promise<KeyRecoveryRequest | undefined> {
    const [request] = await db.select().from(keyRecoveryRequests).where(eq(keyRecoveryRequests.id, id));
    return request;
  }

  async updateKeyRecoveryRequest(id: string, updates: Partial<KeyRecoveryRequest>): Promise<void> {
    await db.update(keyRecoveryRequests).set(updates).where(eq(keyRecoveryRequests.id, id));
  }

  async createCrossPlatformVerification(verificationData: InsertCrossPlatformVerification): Promise<CrossPlatformVerification> {
    const [verification] = await db.insert(crossPlatformVerifications).values(verificationData).returning();
    return verification;
  }

  async getVerificationHistory(credentialId: string): Promise<CrossPlatformVerification[]> {
    return await db.select().from(crossPlatformVerifications)
      .where(eq(crossPlatformVerifications.credentialId, credentialId))
      .orderBy(desc(crossPlatformVerifications.verifiedAt));
  }
}

export const storage = new DatabaseStorage();