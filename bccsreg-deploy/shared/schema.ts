import { pgTable, serial, text, timestamp, boolean, integer, jsonb, uuid, real, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Organizations being monitored
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  certificateNumber: text("certificate_number").notNull().unique(),
  location: text("location").notNull(),
  country: text("country").notNull(),
  region: text("region").notNull(),
  organizationType: text("organization_type").notNull(), // Part142, Part141, EASA-ATO, etc.
  status: text("status").notNull().default("active"), // active, suspended, under_review
  contactInfo: jsonb("contact_info"),
  establishedDate: timestamp("established_date"),
  lastAuditDate: timestamp("last_audit_date"),
  nextAuditDate: timestamp("next_audit_date"),
  complianceScore: real("compliance_score").default(0),
  riskLevel: text("risk_level").default("medium"), // low, medium, high, critical
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Real-time compliance metrics
export const complianceMetrics = pgTable("compliance_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  metricType: text("metric_type").notNull(), // overall_score, training_quality, instructor_performance, etc.
  value: real("value").notNull(),
  maxValue: real("max_value").default(100),
  unit: text("unit"), // percentage, count, score, etc.
  category: text("category").notNull(), // compliance, quality, safety, efficiency
  timestamp: timestamp("timestamp").defaultNow(),
  calculatedBy: text("calculated_by").default("system"), // system, inspector, ai_analysis
  metadata: jsonb("metadata"), // Additional context and breakdown
});

// Training events from BCCS142 platforms
export const trainingEvents = pgTable("training_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  externalId: text("external_id"), // ID from source BCCS142 system
  studentId: text("student_id").notNull(),
  instructorId: text("instructor_id").notNull(),
  courseType: text("course_type").notNull(),
  lessonType: text("lesson_type").notNull(),
  aircraftType: text("aircraft_type"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  completionStatus: text("completion_status").notNull(), // completed, failed, aborted
  complianceChecks: jsonb("compliance_checks"), // Specific compliance validations
  qualityScore: real("quality_score"),
  safetyScore: real("safety_score"),
  documentationComplete: boolean("documentation_complete").default(false),
  blockchainHash: text("blockchain_hash"), // Hash from source system
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at").defaultNow()
});

// Instructor performance tracking
export const instructorMetrics = pgTable("instructor_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  instructorId: text("instructor_id").notNull(),
  instructorName: text("instructor_name").notNull(),
  certificateNumber: text("certificate_number").notNull(),
  qualifications: jsonb("qualifications"),
  totalFlightHours: integer("total_flight_hours"),
  totalInstructionHours: integer("total_instruction_hours"),
  studentsTrained: integer("students_trained"),
  averageStudentScore: real("average_student_score"),
  complianceViolations: integer("compliance_violations").default(0),
  safetyIncidents: integer("safety_incidents").default(0),
  performanceRating: real("performance_rating"),
  lastEvaluation: timestamp("last_evaluation"),
  certificationExpiry: timestamp("certification_expiry"),
  activeStatus: boolean("active_status").default(true),
  calculatedAt: timestamp("calculated_at").defaultNow()
});

// Compliance violations and incidents
export const complianceViolations = pgTable("compliance_violations", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  violationType: text("violation_type").notNull(), // documentation, procedure, safety, regulatory
  severity: text("severity").notNull(), // minor, major, critical
  description: text("description").notNull(),
  regulatoryReference: text("regulatory_reference"), // CFR section, etc.
  detectedBy: text("detected_by").notNull(), // ai_analysis, inspector, self_reported
  detectedAt: timestamp("detected_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  resolutionStatus: text("resolution_status").default("open"), // open, in_progress, resolved, escalated
  correctiveActions: jsonb("corrective_actions"),
  evidence: jsonb("evidence"), // Documents, timestamps, etc.
  inspectorNotes: text("inspector_notes"),
  followUpRequired: boolean("follow_up_required").default(false),
  followUpDate: timestamp("follow_up_date")
});

// Trend analysis data points
export const trendAnalysis = pgTable("trend_analysis", {
  id: uuid("id").primaryKey().defaultRandom(),
  analysisType: text("analysis_type").notNull(), // compliance_trend, performance_trend, risk_trend
  scope: text("scope").notNull(), // organization, region, global, instructor, course_type
  scopeId: text("scope_id"), // Specific ID for scoped analysis
  timeframe: text("timeframe").notNull(), // daily, weekly, monthly, quarterly, yearly
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  dataPoints: jsonb("data_points").notNull(), // Time series data
  trendDirection: text("trend_direction"), // improving, declining, stable, volatile
  significance: real("significance"), // Statistical significance of trend
  predictions: jsonb("predictions"), // Future projections
  insights: text("insights"), // AI-generated insights
  confidence: real("confidence"), // AI confidence in analysis
  generatedAt: timestamp("generated_at").defaultNow(),
  generatedBy: text("generated_by").default("ai_system")
});

// Regulatory alerts and notifications
export const regulatoryAlerts = pgTable("regulatory_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  alertType: text("alert_type").notNull(), // compliance_issue, trend_alert, prediction_warning, regulatory_change
  severity: text("severity").notNull(), // info, warning, critical, urgent
  title: text("title").notNull(),
  description: text("description").notNull(),
  affectedOrganizations: jsonb("affected_organizations"), // Array of organization IDs
  affectedRegions: jsonb("affected_regions"),
  recommendedActions: jsonb("recommended_actions"),
  regulatoryBasis: text("regulatory_basis"), // CFR section, EASA rule, etc.
  deadline: timestamp("deadline"),
  status: text("status").default("active"), // active, acknowledged, resolved, expired
  acknowledgedBy: jsonb("acknowledged_by"), // Inspector IDs who acknowledged
  acknowledgedAt: timestamp("acknowledged_at"),
  escalationLevel: integer("escalation_level").default(0),
  escalationHistory: jsonb("escalation_history"),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at")
});

// Data feeds from BCCS142 systems
export const dataFeeds = pgTable("data_feeds", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  sourceSystem: text("source_system").notNull(), // bccs142, manual_entry, api_import
  feedType: text("feed_type").notNull(), // training_events, compliance_data, instructor_records
  lastSyncTime: timestamp("last_sync_time"),
  syncStatus: text("sync_status").default("active"), // active, paused, error, disabled
  syncFrequency: text("sync_frequency").default("real_time"), // real_time, hourly, daily
  apiEndpoint: text("api_endpoint"),
  authenticationMethod: text("authentication_method"),
  errorCount: integer("error_count").default(0),
  lastError: text("last_error"),
  recordsProcessed: integer("records_processed").default(0),
  dataQualityScore: real("data_quality_score"),
  configurationSettings: jsonb("configuration_settings"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Audit activities and findings
export const auditActivities = pgTable("audit_activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  auditType: text("audit_type").notNull(), // scheduled, unscheduled, follow_up, desktop
  auditorId: text("auditor_id").notNull(),
  auditorName: text("auditor_name").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  status: text("status").default("planned"), // planned, in_progress, completed, cancelled
  scope: jsonb("scope"), // Areas being audited
  findings: jsonb("findings"), // Detailed audit findings
  recommendations: jsonb("recommendations"),
  correctiveActionsRequired: boolean("corrective_actions_required").default(false),
  correctiveActionDeadline: timestamp("corrective_action_deadline"),
  followUpRequired: boolean("follow_up_required").default(false),
  followUpDate: timestamp("follow_up_date"),
  overallRating: text("overall_rating"), // satisfactory, needs_improvement, unsatisfactory
  reportGenerated: boolean("report_generated").default(false),
  reportPath: text("report_path"),
  createdAt: timestamp("created_at").defaultNow()
});

// Regulatory inspectors and users
export const inspectors = pgTable("inspectors", {
  id: uuid("id").primaryKey().defaultRandom(),
  employeeId: text("employee_id").unique().notNull(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  role: text("role").notNull(), // chief_inspector, senior_inspector, inspector, analyst
  region: text("region"),
  specializations: jsonb("specializations"), // Areas of expertise
  authorizedOrganizations: jsonb("authorized_organizations"), // Organizations they can inspect
  clearanceLevel: text("clearance_level").default("standard"), // standard, elevated, administrative
  activeStatus: boolean("active_status").default(true),
  lastLogin: timestamp("last_login"),
  preferences: jsonb("preferences"), // Dashboard preferences, notification settings
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// System analytics and performance metrics
export const systemMetrics = pgTable("system_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  metricName: text("metric_name").notNull(),
  value: real("value").notNull(),
  unit: text("unit"),
  category: text("category").notNull(), // performance, usage, data_quality, compliance
  timestamp: timestamp("timestamp").defaultNow(),
  metadata: jsonb("metadata")
});

// Zod schemas for validation
export const insertOrganizationSchema = createInsertSchema(organizations);
export const insertComplianceMetricsSchema = createInsertSchema(complianceMetrics);
export const insertTrainingEventSchema = createInsertSchema(trainingEvents);
export const insertInstructorMetricsSchema = createInsertSchema(instructorMetrics);
export const insertComplianceViolationSchema = createInsertSchema(complianceViolations);
export const insertTrendAnalysisSchema = createInsertSchema(trendAnalysis);
export const insertRegulatoryAlertSchema = createInsertSchema(regulatoryAlerts);
export const insertDataFeedSchema = createInsertSchema(dataFeeds);
export const insertAuditActivitySchema = createInsertSchema(auditActivities);
export const insertInspectorSchema = createInsertSchema(inspectors);
export const insertSystemMetricsSchema = createInsertSchema(systemMetrics);

// Types for TypeScript
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = z.infer<typeof insertOrganizationSchema>;
export type ComplianceMetric = typeof complianceMetrics.$inferSelect;
export type NewComplianceMetric = z.infer<typeof insertComplianceMetricsSchema>;
export type TrainingEvent = typeof trainingEvents.$inferSelect;
export type NewTrainingEvent = z.infer<typeof insertTrainingEventSchema>;
export type InstructorMetric = typeof instructorMetrics.$inferSelect;
export type NewInstructorMetric = z.infer<typeof insertInstructorMetricsSchema>;
export type ComplianceViolation = typeof complianceViolations.$inferSelect;
export type NewComplianceViolation = z.infer<typeof insertComplianceViolationSchema>;
export type TrendAnalysis = typeof trendAnalysis.$inferSelect;
export type NewTrendAnalysis = z.infer<typeof insertTrendAnalysisSchema>;
export type RegulatoryAlert = typeof regulatoryAlerts.$inferSelect;
export type NewRegulatoryAlert = z.infer<typeof insertRegulatoryAlertSchema>;
export type DataFeed = typeof dataFeeds.$inferSelect;
export type NewDataFeed = z.infer<typeof insertDataFeedSchema>;
export type AuditActivity = typeof auditActivities.$inferSelect;
export type NewAuditActivity = z.infer<typeof insertAuditActivitySchema>;
export type Inspector = typeof inspectors.$inferSelect;
export type NewInspector = z.infer<typeof insertInspectorSchema>;
export type SystemMetric = typeof systemMetrics.$inferSelect;
export type NewSystemMetric = z.infer<typeof insertSystemMetricsSchema>;