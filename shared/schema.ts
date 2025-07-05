import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  real,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("viewer"), // admin, instructor, auditor, viewer
  organizationId: uuid("organization_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organizations/Training Schools
export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // ATO, TRTO, etc.
  regulatoryId: varchar("regulatory_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Document uploads and processing
export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  filename: varchar("filename").notNull(),
  originalName: varchar("original_name").notNull(),
  fileType: varchar("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  status: varchar("status").notNull().default("uploaded"), // uploaded, processing, processed, validated, error
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  organizationId: uuid("organization_id").references(() => organizations.id),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// OCR and NLP extracted data
export const extractedData = pgTable("extracted_data", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id").references(() => documents.id),
  fieldName: varchar("field_name").notNull(),
  extractedValue: text("extracted_value"),
  confidenceScore: real("confidence_score"),
  isValidated: boolean("is_validated").default(false),
  validatedValue: text("validated_value"),
  validatedBy: varchar("validated_by").references(() => users.id),
  validatedAt: timestamp("validated_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Training events and compliance records
export const trainingEvents = pgTable("training_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentName: varchar("student_name").notNull(),
  licenseNumber: varchar("license_number"),
  eventType: varchar("event_type").notNull(),
  eventDate: timestamp("event_date").notNull(),
  instructorName: varchar("instructor_name"),
  status: varchar("status").notNull().default("pending"), // pending, completed, failed
  certificateUrl: varchar("certificate_url"),
  blockchainHash: varchar("blockchain_hash"),
  organizationId: uuid("organization_id").references(() => organizations.id),
  createdBy: varchar("created_by").references(() => users.id),
  // New fields for integrations
  courseType: varchar("course_type"),
  completionDate: timestamp("completion_date"),
  certificateNumber: varchar("certificate_number"),
  flightHours: integer("flight_hours").default(0),
  groundHours: integer("ground_hours").default(0),
  checkride: boolean("checkride").default(false),
  grade: varchar("grade").default("Pass"),
  expirationDate: timestamp("expiration_date"),
  source: varchar("source").default("manual"), // manual, flightschedulepro, flightcircle, tafs, webhook
  externalId: varchar("external_id"), // ID from external system
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Integration configurations
export const integrations = pgTable("integrations", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  systemType: varchar("system_type").notNull(), // flightschedulepro, flightcircle, tafs, custom
  systemName: varchar("system_name").notNull(),
  apiUrl: varchar("api_url").notNull(),
  apiKey: varchar("api_key").notNull(),
  webhookUrl: varchar("webhook_url"),
  syncInterval: integer("sync_interval").default(24), // hours
  lastSync: timestamp("last_sync"),
  isActive: boolean("is_active").default(true),
  config: jsonb("config"), // Additional configuration options
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sync logs for tracking integration activity
export const syncLogs = pgTable("sync_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  integrationId: uuid("integration_id").references(() => integrations.id).notNull(),
  syncType: varchar("sync_type").notNull(), // scheduled, webhook, manual
  status: varchar("status").notNull(), // success, error, partial
  recordsImported: integer("records_imported").default(0),
  recordsSkipped: integer("records_skipped").default(0),
  recordsErrors: integer("records_errors").default(0),
  errorDetails: jsonb("error_details"),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // seconds
});

// Audit trail
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  action: varchar("action").notNull(), // create, update, delete, view, validate, etc.
  entityType: varchar("entity_type").notNull(), // document, training_event, user, etc.
  entityId: varchar("entity_id").notNull(),
  userId: varchar("user_id").references(() => users.id),
  userEmail: varchar("user_email"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  details: jsonb("details"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Relations
export const userRelations = relations(users, ({ many }) => ({
  documents: many(documents),
  trainingEvents: many(trainingEvents),
  auditLogs: many(auditLogs),
}));

export const documentRelations = relations(documents, ({ one, many }) => ({
  uploadedBy: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [documents.organizationId],
    references: [organizations.id],
  }),
  extractedData: many(extractedData),
}));

export const extractedDataRelations = relations(extractedData, ({ one }) => ({
  document: one(documents, {
    fields: [extractedData.documentId],
    references: [documents.id],
  }),
  validatedBy: one(users, {
    fields: [extractedData.validatedBy],
    references: [users.id],
  }),
}));

export const trainingEventRelations = relations(trainingEvents, ({ one }) => ({
  organization: one(organizations, {
    fields: [trainingEvents.organizationId],
    references: [organizations.id],
  }),
  createdBy: one(users, {
    fields: [trainingEvents.createdBy],
    references: [users.id],
  }),
}));

export const auditLogRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const integrationRelations = relations(integrations, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [integrations.organizationId],
    references: [organizations.id],
  }),
  syncLogs: many(syncLogs),
}));

export const syncLogRelations = relations(syncLogs, ({ one }) => ({
  integration: one(integrations, {
    fields: [syncLogs.integrationId],
    references: [integrations.id],
  }),
}));

export const organizationRelations = relations(organizations, ({ many }) => ({
  documents: many(documents),
  trainingEvents: many(trainingEvents),
  integrations: many(integrations),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertDocumentSchema = createInsertSchema(documents);
export const selectDocumentSchema = createSelectSchema(documents);
export const insertExtractedDataSchema = createInsertSchema(extractedData);
export const selectExtractedDataSchema = createSelectSchema(extractedData);
export const insertTrainingEventSchema = createInsertSchema(trainingEvents);
export const selectTrainingEventSchema = createSelectSchema(trainingEvents);
export const insertAuditLogSchema = createInsertSchema(auditLogs);
export const selectAuditLogSchema = createSelectSchema(auditLogs);
export const insertIntegrationSchema = createInsertSchema(integrations);
export const selectIntegrationSchema = createSelectSchema(integrations);
export const insertSyncLogSchema = createInsertSchema(syncLogs);
export const selectSyncLogSchema = createSelectSchema(syncLogs);

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = z.infer<typeof selectUserSchema>;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = z.infer<typeof selectDocumentSchema>;
export type InsertExtractedData = z.infer<typeof insertExtractedDataSchema>;
export type ExtractedData = z.infer<typeof selectExtractedDataSchema>;
export type InsertTrainingEvent = z.infer<typeof insertTrainingEventSchema>;
export type TrainingEvent = z.infer<typeof selectTrainingEventSchema>;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = z.infer<typeof selectAuditLogSchema>;
export type InsertIntegration = z.infer<typeof insertIntegrationSchema>;
export type Integration = z.infer<typeof selectIntegrationSchema>;
export type InsertSyncLog = z.infer<typeof insertSyncLogSchema>;
export type SyncLog = z.infer<typeof selectSyncLogSchema>;
