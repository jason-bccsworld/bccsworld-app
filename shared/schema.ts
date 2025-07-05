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

// FAR Part 142 Compliant Training Records
export const trainingEvents = pgTable("training_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  
  // FAR 142.73(a)(1) - Name of the trainee
  studentName: varchar("student_name").notNull(),
  
  // FAR 142.73(a)(2) - Copy of trainee's pilot certificate and medical certificate
  pilotCertificateNumber: varchar("pilot_certificate_number"),
  pilotCertificateType: varchar("pilot_certificate_type"), // student, recreational, private, commercial, atp
  pilotCertificateIssueDate: timestamp("pilot_certificate_issue_date"),
  pilotCertificateExpirationDate: timestamp("pilot_certificate_expiration_date"),
  medicalCertificateClass: varchar("medical_certificate_class"), // first, second, third, basicmed
  medicalCertificateNumber: varchar("medical_certificate_number"),
  medicalCertificateIssueDate: timestamp("medical_certificate_issue_date"),
  medicalCertificateExpirationDate: timestamp("medical_certificate_expiration_date"),
  
  // FAR 142.73(a)(3) - Course name and make/model of flight training equipment
  courseName: varchar("course_name").notNull(),
  courseType: varchar("course_type").notNull(), // initial, recurrent, upgrade, differences
  aircraftMake: varchar("aircraft_make"),
  aircraftModel: varchar("aircraft_model"),
  flightTrainingDeviceType: varchar("flight_training_device_type"), // simulator, ftd, aircraft
  flightTrainingDeviceMake: varchar("flight_training_device_make"),
  flightTrainingDeviceModel: varchar("flight_training_device_model"),
  
  // FAR 142.73(a)(4) - Prerequisite experience and course time completed
  prerequisiteExperience: text("prerequisite_experience"),
  totalCourseHours: integer("total_course_hours").default(0),
  flightHours: integer("flight_hours").default(0),
  groundHours: integer("ground_hours").default(0),
  simulatorHours: integer("simulator_hours").default(0),
  
  // FAR 142.73(a)(5) - Performance on each lesson and instructor name
  lessonPerformance: jsonb("lesson_performance"), // Array of lesson records
  primaryInstructorName: varchar("primary_instructor_name"),
  primaryInstructorId: varchar("primary_instructor_id"),
  
  // FAR 142.73(a)(6) - Date and result of end-of-course practical test and evaluator name
  practicalTestDate: timestamp("practical_test_date"),
  practicalTestResult: varchar("practical_test_result"), // pass, fail, discontinue
  evaluatorName: varchar("evaluator_name"),
  evaluatorId: varchar("evaluator_id"),
  
  // FAR 142.73(a)(7) - Additional training hours after unsatisfactory test
  additionalTrainingHours: integer("additional_training_hours").default(0),
  additionalTrainingReason: text("additional_training_reason"),
  
  // Legacy fields for backwards compatibility
  licenseNumber: varchar("license_number"), // Deprecated - use pilotCertificateNumber
  eventType: varchar("event_type").notNull(),
  eventDate: timestamp("event_date").notNull(),
  instructorName: varchar("instructor_name"), // Deprecated - use primaryInstructorName
  status: varchar("status").notNull().default("pending"), // pending, completed, failed
  certificateUrl: varchar("certificate_url"),
  blockchainHash: varchar("blockchain_hash"),
  organizationId: uuid("organization_id").references(() => organizations.id),
  createdBy: varchar("created_by").references(() => users.id),
  
  // Integration fields
  completionDate: timestamp("completion_date"),
  certificateNumber: varchar("certificate_number"),
  checkride: boolean("checkride").default(false),
  grade: varchar("grade").default("Pass"),
  expirationDate: timestamp("expiration_date"),
  source: varchar("source").default("manual"), // manual, flightschedulepro, flightcircle, tafs, webhook
  externalId: varchar("external_id"), // ID from external system
  
  // Record retention compliance
  recordRetentionDate: timestamp("record_retention_date"), // FAR 142.73(c)(1) - 1 year minimum
  
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

// FAR Part 142 Compliant Instructor/Evaluator Records
export const instructorRecords = pgTable("instructor_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  
  // Instructor identification
  instructorName: varchar("instructor_name").notNull(),
  instructorId: varchar("instructor_id").notNull(),
  certificateNumber: varchar("certificate_number"),
  certificateType: varchar("certificate_type"), // CFI, CFII, MEI, ATP, etc.
  
  // FAR 142.73(b) - Compliance with requirements
  managementRequirementsCompliance: boolean("management_requirements_compliance").default(false), // 142.13
  eligibilityRequirementsCompliance: boolean("eligibility_requirements_compliance").default(false), // 142.47
  privilegesLimitationsCompliance: boolean("privileges_limitations_compliance").default(false), // 142.49
  trainingTestingCompliance: boolean("training_testing_compliance").default(false), // 142.53
  
  // Qualification records
  qualificationDate: timestamp("qualification_date"),
  qualificationExpiration: timestamp("qualification_expiration"),
  
  // Recurrent proficiency demonstrations
  lastProficiencyCheck: timestamp("last_proficiency_check"),
  nextProficiencyDue: timestamp("next_proficiency_due"),
  proficiencyHistory: jsonb("proficiency_history"), // Array of proficiency records
  
  // Employment tracking
  organizationId: uuid("organization_id").references(() => organizations.id),
  employmentStartDate: timestamp("employment_start_date"),
  employmentEndDate: timestamp("employment_end_date"),
  isActive: boolean("is_active").default(true),
  
  // Record retention compliance - FAR 142.73(c)(2) & (c)(3)
  recordRetentionDate: timestamp("record_retention_date"), // While employed + 1 year thereafter
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Individual lesson performance records for detailed tracking
export const lessonRecords = pgTable("lesson_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  trainingEventId: uuid("training_event_id").references(() => trainingEvents.id),
  
  // Lesson details
  lessonNumber: integer("lesson_number").notNull(),
  lessonTitle: varchar("lesson_title").notNull(),
  lessonDate: timestamp("lesson_date").notNull(),
  lessonDuration: integer("lesson_duration"), // minutes
  
  // Performance tracking
  performanceGrade: varchar("performance_grade"), // satisfactory, unsatisfactory, incomplete
  performanceNotes: text("performance_notes"),
  objectivesMet: jsonb("objectives_met"), // Array of learning objectives
  
  // Instructor information
  instructorName: varchar("instructor_name").notNull(),
  instructorId: varchar("instructor_id"),
  instructorSignature: varchar("instructor_signature"),
  
  // Equipment used
  equipmentType: varchar("equipment_type"), // aircraft, simulator, ftd
  equipmentIdentifier: varchar("equipment_identifier"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Regulatory compliance tracking
export const regulatoryCompliance = pgTable("regulatory_compliance", {
  id: uuid("id").defaultRandom().primaryKey(),
  
  // Regulation identification
  regulation: varchar("regulation").notNull(), // FAR-142, EASA-FCL, etc.
  section: varchar("section"),
  country: varchar("country").notNull(), // US, EU, CA, AU, etc.
  
  // Version tracking
  currentVersion: varchar("current_version").notNull(),
  lastCheckedVersion: varchar("last_checked_version"),
  lastChecked: timestamp("last_checked").defaultNow(),
  nextReviewDate: timestamp("next_review_date"),
  
  // Compliance status
  complianceLevel: varchar("compliance_level").notNull(), // compliant, warning, non-compliant
  pendingChanges: jsonb("pending_changes"), // Array of regulatory changes
  
  // Monitoring configuration
  sourceUrl: varchar("source_url"),
  monitoringActive: boolean("monitoring_active").default(true),
  checkFrequency: integer("check_frequency").default(24), // hours
  
  // Compliance actions
  requiredActions: jsonb("required_actions"), // Array of compliance actions
  actionDeadline: timestamp("action_deadline"),
  actionStatus: varchar("action_status").default("pending"), // pending, in-progress, completed
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Regulatory change history
export const regulatoryChanges = pgTable("regulatory_changes", {
  id: uuid("id").defaultRandom().primaryKey(),
  complianceId: uuid("compliance_id").references(() => regulatoryCompliance.id),
  
  // Change details
  changeType: varchar("change_type").notNull(), // addition, modification, deletion
  section: varchar("section").notNull(),
  description: text("description").notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  
  // Impact assessment
  priority: varchar("priority").notNull(), // low, medium, high, critical
  affectedFields: jsonb("affected_fields"), // Array of database fields affected
  complianceActions: jsonb("compliance_actions"), // Array of required actions
  
  // Processing status
  detected: timestamp("detected").defaultNow(),
  processed: timestamp("processed"),
  verified: boolean("verified").default(false),
  
  // Source information
  sourceUrl: varchar("source_url"),
  sourceDocument: varchar("source_document"),
  
  createdAt: timestamp("created_at").defaultNow(),
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

export const trainingEventRelations = relations(trainingEvents, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [trainingEvents.organizationId],
    references: [organizations.id],
  }),
  createdBy: one(users, {
    fields: [trainingEvents.createdBy],
    references: [users.id],
  }),
  lessonRecords: many(lessonRecords),
}));

export const instructorRecordRelations = relations(instructorRecords, ({ one }) => ({
  organization: one(organizations, {
    fields: [instructorRecords.organizationId],
    references: [organizations.id],
  }),
}));

export const lessonRecordRelations = relations(lessonRecords, ({ one }) => ({
  trainingEvent: one(trainingEvents, {
    fields: [lessonRecords.trainingEventId],
    references: [trainingEvents.id],
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

export const regulatoryComplianceRelations = relations(regulatoryCompliance, ({ many }) => ({
  changes: many(regulatoryChanges),
}));

export const regulatoryChangeRelations = relations(regulatoryChanges, ({ one }) => ({
  compliance: one(regulatoryCompliance, {
    fields: [regulatoryChanges.complianceId],
    references: [regulatoryCompliance.id],
  }),
}));

export const organizationRelations = relations(organizations, ({ many }) => ({
  documents: many(documents),
  trainingEvents: many(trainingEvents),
  integrations: many(integrations),
  instructorRecords: many(instructorRecords),
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertDocumentSchema = createInsertSchema(documents);
export const selectDocumentSchema = createSelectSchema(documents);
export const insertExtractedDataSchema = createInsertSchema(extractedData);
export const selectExtractedDataSchema = createSelectSchema(extractedData);
export const insertTrainingEventSchema = createInsertSchema(trainingEvents);
export const selectTrainingEventSchema = createSelectSchema(trainingEvents);
export const insertInstructorRecordSchema = createInsertSchema(instructorRecords);
export const selectInstructorRecordSchema = createSelectSchema(instructorRecords);
export const insertLessonRecordSchema = createInsertSchema(lessonRecords);
export const selectLessonRecordSchema = createSelectSchema(lessonRecords);
export const insertAuditLogSchema = createInsertSchema(auditLogs);
export const selectAuditLogSchema = createSelectSchema(auditLogs);
export const insertIntegrationSchema = createInsertSchema(integrations);
export const selectIntegrationSchema = createSelectSchema(integrations);
export const insertSyncLogSchema = createInsertSchema(syncLogs);
export const selectSyncLogSchema = createSelectSchema(syncLogs);
export const insertRegulatoryComplianceSchema = createInsertSchema(regulatoryCompliance);
export const selectRegulatoryComplianceSchema = createSelectSchema(regulatoryCompliance);
export const insertRegulatoryChangeSchema = createInsertSchema(regulatoryChanges);
export const selectRegulatoryChangeSchema = createSelectSchema(regulatoryChanges);

// TypeScript types for FAR Part 142 compliance and regulatory monitoring
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = z.infer<typeof selectUserSchema>;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = z.infer<typeof selectDocumentSchema>;
export type InsertExtractedData = z.infer<typeof insertExtractedDataSchema>;
export type ExtractedData = z.infer<typeof selectExtractedDataSchema>;
export type InsertTrainingEvent = z.infer<typeof insertTrainingEventSchema>;
export type TrainingEvent = z.infer<typeof selectTrainingEventSchema>;
export type InsertInstructorRecord = z.infer<typeof insertInstructorRecordSchema>;
export type InstructorRecord = z.infer<typeof selectInstructorRecordSchema>;
export type InsertLessonRecord = z.infer<typeof insertLessonRecordSchema>;
export type LessonRecord = z.infer<typeof selectLessonRecordSchema>;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = z.infer<typeof selectAuditLogSchema>;
export type InsertIntegration = z.infer<typeof insertIntegrationSchema>;
export type Integration = z.infer<typeof selectIntegrationSchema>;
export type InsertSyncLog = z.infer<typeof insertSyncLogSchema>;
export type SyncLog = z.infer<typeof selectSyncLogSchema>;
export type InsertRegulatoryCompliance = z.infer<typeof insertRegulatoryComplianceSchema>;
export type RegulatoryCompliance = z.infer<typeof selectRegulatoryComplianceSchema>;
export type InsertRegulatoryChange = z.infer<typeof insertRegulatoryChangeSchema>;
export type RegulatoryChange = z.infer<typeof selectRegulatoryChangeSchema>;
