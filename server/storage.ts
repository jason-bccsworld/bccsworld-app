import {
  users,
  documents,
  extractedData,
  trainingEvents,
  auditLogs,
  organizations,
  type User,
  type UpsertUser,
  type Document,
  type InsertDocument,
  type ExtractedData,
  type InsertExtractedData,
  type TrainingEvent,
  type InsertTrainingEvent,
  type AuditLog,
  type InsertAuditLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, like, and, gte, lte, count } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Document operations
  createDocument(document: InsertDocument): Promise<Document>;
  getDocument(id: string): Promise<Document | undefined>;
  getDocumentsByUser(userId: string): Promise<Document[]>;
  updateDocumentStatus(id: string, status: string): Promise<Document>;

  // Extracted data operations
  createExtractedData(data: InsertExtractedData): Promise<ExtractedData>;
  getExtractedDataByDocument(documentId: string): Promise<ExtractedData[]>;
  validateExtractedData(id: string, validatedValue: string, validatedBy: string): Promise<ExtractedData>;

  // Training event operations
  createTrainingEvent(event: InsertTrainingEvent): Promise<TrainingEvent>;
  getTrainingEvent(id: string): Promise<TrainingEvent | undefined>;
  getTrainingEvents(organizationId?: string | null): Promise<TrainingEvent[]>;
  updateTrainingEvent(id: string, updates: Partial<InsertTrainingEvent>): Promise<TrainingEvent>;

  // Audit log operations
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(limit?: number): Promise<AuditLog[]>;

  // Statistics
  getComplianceStats(organizationId?: string | null): Promise<{
    totalRecords: number;
    complianceRate: number;
    pendingReviews: number;
    aiAccuracy: number;
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

  // Document operations
  async createDocument(document: InsertDocument): Promise<Document> {
    const [doc] = await db.insert(documents).values(document).returning();
    return doc;
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  }

  async getDocumentsByUser(userId: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.uploadedBy, userId))
      .orderBy(desc(documents.createdAt));
  }

  async updateDocumentStatus(id: string, status: string): Promise<Document> {
    const [doc] = await db
      .update(documents)
      .set({ status, processedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return doc;
  }

  // Extracted data operations
  async createExtractedData(data: InsertExtractedData): Promise<ExtractedData> {
    const [extracted] = await db.insert(extractedData).values(data).returning();
    return extracted;
  }

  async getExtractedDataByDocument(documentId: string): Promise<ExtractedData[]> {
    return await db
      .select()
      .from(extractedData)
      .where(eq(extractedData.documentId, documentId));
  }

  async validateExtractedData(id: string, validatedValue: string, validatedBy: string): Promise<ExtractedData> {
    const [data] = await db
      .update(extractedData)
      .set({
        validatedValue,
        validatedBy,
        validatedAt: new Date(),
        isValidated: true,
      })
      .where(eq(extractedData.id, id))
      .returning();
    return data;
  }

  // Training event operations
  async createTrainingEvent(event: InsertTrainingEvent): Promise<TrainingEvent> {
    const [trainingEvent] = await db.insert(trainingEvents).values(event).returning();
    return trainingEvent;
  }

  async getTrainingEvent(id: string): Promise<TrainingEvent | undefined> {
    const [event] = await db.select().from(trainingEvents).where(eq(trainingEvents.id, id));
    return event;
  }

  async getTrainingEvents(organizationId?: string | null): Promise<TrainingEvent[]> {
    if (organizationId) {
      return await db
        .select()
        .from(trainingEvents)
        .where(eq(trainingEvents.organizationId, organizationId))
        .orderBy(desc(trainingEvents.createdAt));
    }
    
    return await db
      .select()
      .from(trainingEvents)
      .orderBy(desc(trainingEvents.createdAt));
  }

  async updateTrainingEvent(id: string, updates: Partial<InsertTrainingEvent>): Promise<TrainingEvent> {
    const [event] = await db
      .update(trainingEvents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(trainingEvents.id, id))
      .returning();
    return event;
  }

  // Audit log operations
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [auditLog] = await db.insert(auditLogs).values(log).returning();
    return auditLog as AuditLog;
  }

  async getAuditLogs(limit = 50): Promise<AuditLog[]> {
    const logs = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);
    return logs as AuditLog[];
  }

  // Statistics
  async getComplianceStats(organizationId?: string | null): Promise<{
    totalRecords: number;
    complianceRate: number;
    pendingReviews: number;
    aiAccuracy: number;
  }> {
    // Get total records
    const totalRecords = organizationId 
      ? await db.select({ count: count() }).from(trainingEvents).where(eq(trainingEvents.organizationId, organizationId))
      : await db.select({ count: count() }).from(trainingEvents);

    // Get completed records
    const completedRecords = organizationId
      ? await db
          .select({ count: count() })
          .from(trainingEvents)
          .where(and(eq(trainingEvents.status, "completed"), eq(trainingEvents.organizationId, organizationId)))
      : await db
          .select({ count: count() })
          .from(trainingEvents)
          .where(eq(trainingEvents.status, "completed"));

    // Get pending reviews
    const pendingReviews = organizationId
      ? await db
          .select({ count: count() })
          .from(documents)
          .where(and(eq(documents.status, "processed"), eq(documents.organizationId, organizationId)))
      : await db
          .select({ count: count() })
          .from(documents)
          .where(eq(documents.status, "processed"));

    const total = totalRecords[0]?.count || 0;
    const completed = completedRecords[0]?.count || 0;
    const pending = pendingReviews[0]?.count || 0;

    return {
      totalRecords: total,
      complianceRate: total > 0 ? (completed / total) * 100 : 0,
      pendingReviews: pending,
      aiAccuracy: 92.8, // Mock accuracy for now
    };
  }
}

export const storage = new DatabaseStorage();
