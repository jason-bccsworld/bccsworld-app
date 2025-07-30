import {
  users,
  aircraftRegistry,
  tokenOfferings,
  tokenHolders,
  tokenTransactions,
  complianceChecks,
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
} from "../shared/schema";
import { db } from "./db";
import { eq, desc, like, and, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
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
    return await db.select().from(aircraftRegistry).orderBy(desc(aircraftRegistry.createdAt));
  }

  async updateAircraft(id: string, aircraft: Partial<AircraftRegistry>): Promise<void> {
    await db.update(aircraftRegistry).set({ ...aircraft, updatedAt: new Date() }).where(eq(aircraftRegistry.id, id));
  }

  async deleteAircraft(id: string): Promise<void> {
    await db.delete(aircraftRegistry).where(eq(aircraftRegistry.id, id));
  }

  // Token offering operations
  async createTokenOffering(offering: InsertTokenOffering): Promise<TokenOffering> {
    const [newOffering] = await db.insert(tokenOfferings).values(offering).returning();
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
    return await db.select().from(tokenOfferings).orderBy(desc(tokenOfferings.createdAt));
  }

  async updateTokenOffering(id: string, offering: Partial<TokenOffering>): Promise<void> {
    await db.update(tokenOfferings).set({ ...offering, updatedAt: new Date() }).where(eq(tokenOfferings.id, id));
  }

  // Token holder operations
  async createTokenHolder(holder: InsertTokenHolder): Promise<TokenHolder> {
    const [newHolder] = await db.insert(tokenHolders).values(holder).returning();
    return newHolder;
  }

  async getTokenHoldersByOffering(offeringId: string): Promise<TokenHolder[]> {
    return await db.select().from(tokenHolders).where(eq(tokenHolders.offeringId, offeringId));
  }

  async updateTokenHolder(id: string, holder: Partial<TokenHolder>): Promise<void> {
    await db.update(tokenHolders).set({ ...holder, lastUpdateDate: new Date() }).where(eq(tokenHolders.id, id));
  }

  // Token transaction operations
  async createTokenTransaction(transaction: InsertTokenTransaction): Promise<TokenTransaction> {
    const [newTransaction] = await db.insert(tokenTransactions).values(transaction).returning();
    return newTransaction;
  }

  async getTokenTransactionsByOffering(offeringId: string): Promise<TokenTransaction[]> {
    return await db.select().from(tokenTransactions).where(eq(tokenTransactions.offeringId, offeringId)).orderBy(desc(tokenTransactions.transactionDate));
  }

  async getAllTokenTransactions(): Promise<TokenTransaction[]> {
    return await db.select().from(tokenTransactions).orderBy(desc(tokenTransactions.transactionDate));
  }

  // Compliance operations
  async performComplianceCheck(aircraftId: string, checkType: string): Promise<ComplianceCheck> {
    const checkData = {
      aircraftId,
      checkType,
      checkDate: new Date(),
      status: "compliant" as const,
      findings: { automated: true, status: "passed" },
      performedBy: "system",
    };
    
    const [newCheck] = await db.insert(complianceChecks).values(checkData).returning();
    return newCheck;
  }

  async getComplianceChecksByAircraft(aircraftId: string): Promise<ComplianceCheck[]> {
    return await db.select().from(complianceChecks).where(eq(complianceChecks.aircraftId, aircraftId)).orderBy(desc(complianceChecks.checkDate));
  }

  // Analytics
  async getRegistryStats(): Promise<{
    totalAircraft: number;
    tokenizedAircraft: number;
    totalTokenVolume: number;
    activeInvestors: number;
  }> {
    const totalAircraftResult = await db.select({ count: count() }).from(aircraftRegistry);
    const tokenizedAircraftResult = await db.select({ count: count() }).from(aircraftRegistry).where(eq(aircraftRegistry.isTokenized, true));
    
    const totalTokenVolumeResult = await db.select({
      volume: sql<number>`COALESCE(SUM(${tokenTransactions.totalAmount}), 0)`
    }).from(tokenTransactions);
    
    const activeInvestorsResult = await db.select({
      count: sql<number>`COUNT(DISTINCT ${tokenHolders.investorId})`
    }).from(tokenHolders);

    return {
      totalAircraft: totalAircraftResult[0]?.count || 0,
      tokenizedAircraft: tokenizedAircraftResult[0]?.count || 0,
      totalTokenVolume: Number(totalTokenVolumeResult[0]?.volume || 0),
      activeInvestors: Number(activeInvestorsResult[0]?.count || 0),
    };
  }
}

export const storage = new DatabaseStorage();