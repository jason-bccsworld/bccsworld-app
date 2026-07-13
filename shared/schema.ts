import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  uuid,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table - required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  passwordHash: varchar("password_hash"),
  role: varchar("role").default("viewer"), // admin, instructor, auditor, viewer
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User ↔ Organization memberships (multi-tenant foundation).
// A user may belong to multiple organizations, each with a per-org role.
export const userOrganizations = pgTable("user_organizations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  organizationId: uuid("organization_id").notNull(),
  orgRole: varchar("org_role", { length: 50 }).notNull().default("viewer"), // admin, instructor, auditor, viewer
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_user_org_user").on(table.userId),
  index("IDX_user_org_org").on(table.organizationId),
  unique("user_organizations_user_id_organization_id_key").on(table.userId, table.organizationId),
]);

export const insertUserOrganizationSchema = createInsertSchema(userOrganizations).omit({ id: true, createdAt: true });
export type UserOrganization = typeof userOrganizations.$inferSelect;
export type InsertUserOrganization = z.infer<typeof insertUserOrganizationSchema>;

// Role permissions table – one row per role, stores the list of granted permissions
export const rolePermissions = pgTable("bccs_role_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roleName: varchar("role_name", { length: 50 }).notNull().unique(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  description: text("description"),
  permissions: text("permissions").array().default(sql`ARRAY[]::text[]`),
  isSystem: boolean("is_system").default(false),
  color: varchar("color", { length: 80 }).default("bg-gray-100 text-gray-700"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Aircraft Registry Core Tables
export const aircraftRegistry = pgTable("aircraft_registry", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tailNumber: varchar("tail_number", { length: 20 }).notNull().unique(),
  manufacturer: varchar("manufacturer", { length: 100 }).notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  year: integer("year").notNull(),
  serialNumber: varchar("serial_number", { length: 100 }),
  engineType: varchar("engine_type", { length: 100 }),
  maxSeats: integer("max_seats"),
  maxWeight: decimal("max_weight", { precision: 10, scale: 2 }),
  registrationStatus: varchar("registration_status").default("active"), // active, suspended, cancelled
  registrationDate: timestamp("registration_date").defaultNow(),
  expirationDate: timestamp("expiration_date"),
  currentValuation: decimal("current_valuation", { precision: 15, scale: 2 }),
  lastValuationDate: timestamp("last_valuation_date"),
  isTokenized: boolean("is_tokenized").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const aircraftOwnership = pgTable("aircraft_ownership", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  aircraftId: uuid("aircraft_id").references(() => aircraftRegistry.id).notNull(),
  ownerName: varchar("owner_name", { length: 200 }).notNull(),
  ownerType: varchar("owner_type").notNull(), // individual, corporation, trust, government
  ownerAddress: text("owner_address"),
  ownershipPercentage: decimal("ownership_percentage", { precision: 5, scale: 2 }).default("100.00"),
  ownershipType: varchar("ownership_type").default("full"), // full, fractional, lease
  effectiveDate: timestamp("effective_date").defaultNow(),
  registeredDate: timestamp("registered_date").defaultNow(),
  isActive: boolean("is_active").default(true),
});

export const aircraftLiens = pgTable("aircraft_liens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  aircraftId: uuid("aircraft_id").references(() => aircraftRegistry.id).notNull(),
  lienholder: varchar("lienholder", { length: 200 }).notNull(),
  lienAmount: decimal("lien_amount", { precision: 15, scale: 2 }).notNull(),
  lienType: varchar("lien_type").notNull(), // mortgage, security_interest, tax_lien
  filingDate: timestamp("filing_date").defaultNow(),
  maturityDate: timestamp("maturity_date"),
  isActive: boolean("is_active").default(true),
});

export const aircraftInsurance = pgTable("aircraft_insurance", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  aircraftId: uuid("aircraft_id").references(() => aircraftRegistry.id).notNull(),
  provider: varchar("provider", { length: 200 }).notNull(),
  policyNumber: varchar("policy_number", { length: 100 }).notNull(),
  coverageAmount: decimal("coverage_amount", { precision: 15, scale: 2 }).notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  expirationDate: timestamp("expiration_date").notNull(),
  isActive: boolean("is_active").default(true),
});

// Aircraft Tokenization Tables
export const tokenOfferings = pgTable("token_offerings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  aircraftId: uuid("aircraft_id").references(() => aircraftRegistry.id).notNull(),
  contractAddress: varchar("contract_address", { length: 100 }),
  totalTokens: integer("total_tokens").notNull(),
  tokensIssued: integer("tokens_issued").default(0),
  tokensSold: integer("tokens_sold").default(0),
  initialPrice: decimal("initial_price", { precision: 10, scale: 6 }).notNull(),
  currentPrice: decimal("current_price", { precision: 10, scale: 6 }),
  launchDate: timestamp("launch_date").defaultNow(),
  status: varchar("status").default("active"), // active, paused, completed, cancelled
  prospectusUrl: text("prospectus_url"),
  minimumInvestment: decimal("minimum_investment", { precision: 10, scale: 2 }),
  isAccreditedOnly: boolean("is_accredited_only").default(false),
});

export const tokenHolders = pgTable("token_holders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  offeringId: uuid("offering_id").references(() => tokenOfferings.id).notNull(),
  investorId: varchar("investor_id").notNull(),
  walletAddress: varchar("wallet_address", { length: 100 }),
  tokensOwned: integer("tokens_owned").notNull(),
  averagePurchasePrice: decimal("average_purchase_price", { precision: 10, scale: 6 }),
  totalInvestment: decimal("total_investment", { precision: 15, scale: 2 }),
  firstPurchaseDate: timestamp("first_purchase_date").defaultNow(),
  lastTransactionDate: timestamp("last_transaction_date").defaultNow(),
  kycStatus: varchar("kyc_status").default("pending"), // pending, verified, rejected
  accreditationStatus: varchar("accreditation_status").default("unknown"), // verified, unverified, unknown
});

export const tokenTransactions = pgTable("token_transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  offeringId: uuid("offering_id").references(() => tokenOfferings.id).notNull(),
  transactionHash: varchar("transaction_hash", { length: 100 }),
  transactionType: varchar("transaction_type").notNull(), // buy, sell, transfer, dividend
  buyerId: varchar("buyer_id"),
  sellerId: varchar("seller_id"),
  tokenAmount: integer("token_amount").notNull(),
  pricePerToken: decimal("price_per_token", { precision: 10, scale: 6 }),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }),
  transactionFee: decimal("transaction_fee", { precision: 10, scale: 2 }),
  blockNumber: integer("block_number"),
  gasUsed: integer("gas_used"),
  transactionDate: timestamp("transaction_date").defaultNow(),
  status: varchar("status").default("pending"), // pending, confirmed, failed
});

export const complianceChecks = pgTable("compliance_checks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  aircraftId: uuid("aircraft_id").references(() => aircraftRegistry.id).notNull(),
  checkType: varchar("check_type").notNull(), // registration, insurance, liens, ownership
  checkResult: varchar("check_result").notNull(), // passed, failed, warning
  checkDetails: jsonb("check_details"),
  checkDate: timestamp("check_date").defaultNow(),
  nextCheckDate: timestamp("next_check_date"),
  performedBy: varchar("performed_by"),
  organizationId: uuid("organization_id"),
});

export const registryAnalytics = pgTable("registry_analytics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  registryId: varchar("registry_id").notNull(),
  metricType: varchar("metric_type").notNull(), // aircraft_count, token_volume, revenue
  metricValue: decimal("metric_value", { precision: 15, scale: 2 }).notNull(),
  period: varchar("period").notNull(), // daily, weekly, monthly, yearly
  recordDate: timestamp("record_date").defaultNow(),
});

// Audit log table for regulatory monitoring and compliance tracking
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: varchar("event_type").notNull(), // regulatory_check, link_check, compliance_alert, system_error, crypto_payment
  severity: varchar("severity").notNull(), // info, warning, error, critical
  message: text("message").notNull(),
  details: jsonb("details"),
  sourceSystem: varchar("source_system"), // regulatory_monitor, link_monitor, compliance_engine, crypto_service
  userId: varchar("user_id"),
  aircraftId: uuid("aircraft_id"),
  organizationId: uuid("organization_id"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Crypto payment transactions table
export const cryptoPayments = pgTable("crypto_payments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  subscriptionId: uuid("subscription_id").references(() => customerSubscriptions.id).notNull(),
  transactionHash: varchar("transaction_hash", { length: 100 }).unique(),
  blockNumber: integer("block_number"),
  fromAddress: varchar("from_address", { length: 50 }).notNull(),
  toAddress: varchar("to_address", { length: 50 }).notNull(),
  amount: decimal("amount", { precision: 18, scale: 6 }).notNull(),
  stableCoin: varchar("stable_coin").notNull(), // USDC, USDT, DAI
  chainId: integer("chain_id").notNull(),
  gasUsed: integer("gas_used"),
  gasFee: decimal("gas_fee", { precision: 18, scale: 6 }),
  status: varchar("status").default("pending"), // pending, confirmed, failed, cancelled
  paymentType: varchar("payment_type").notNull(), // subscription_renewal, setup_fee, upgrade
  periodCovered: varchar("period_covered"), // 2024-01, 2024-Q1, 2024
  confirmedAt: timestamp("confirmed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Smart contract subscriptions management
export const smartContracts = pgTable("smart_contracts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  contractAddress: varchar("contract_address", { length: 50 }).notNull().unique(),
  chainId: integer("chain_id").notNull(),
  contractType: varchar("contract_type").notNull(), // subscription_manager, payment_processor
  version: varchar("version").notNull(),
  deployedAt: timestamp("deployed_at").defaultNow(),
  isActive: boolean("is_active").default(true),
  supportedStableCoins: varchar("supported_stable_coins").array().notNull(),
  minimumPayment: decimal("minimum_payment", { precision: 18, scale: 6 }),
  maximumPayment: decimal("maximum_payment", { precision: 18, scale: 6 }),
  gasLimit: integer("gas_limit"),
  abi: jsonb("abi"), // Contract ABI for interaction
});

// Insurance Marketplace Tables
export const insuranceProviders = pgTable("insurance_providers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: varchar("company_name", { length: 200 }).notNull(),
  licenseNumber: varchar("license_number", { length: 100 }),
  coverageTypes: varchar("coverage_types").array().notNull(),
  ratingScore: decimal("rating_score", { precision: 3, scale: 2 }),
  isActive: boolean("is_active").default(true),
  contactInfo: jsonb("contact_info"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insuranceQuotes = pgTable("insurance_quotes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  aircraftId: uuid("aircraft_id").references(() => aircraftRegistry.id).notNull(),
  providerId: uuid("provider_id").references(() => insuranceProviders.id).notNull(),
  coverageType: varchar("coverage_type").notNull(),
  coverageAmount: decimal("coverage_amount", { precision: 15, scale: 2 }).notNull(),
  annualPremium: decimal("annual_premium", { precision: 10, scale: 2 }).notNull(),
  deductible: decimal("deductible", { precision: 10, scale: 2 }),
  quoteValidUntil: timestamp("quote_valid_until").notNull(),
  quotedAt: timestamp("quoted_at").defaultNow(),
  status: varchar("status").default("active"),
});

// Maintenance Marketplace Tables
export const maintenanceProviders = pgTable("maintenance_providers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: varchar("company_name", { length: 200 }).notNull(),
  certificationNumber: varchar("certification_number", { length: 100 }),
  serviceTypes: varchar("service_types").array().notNull(),
  location: varchar("location", { length: 200 }),
  ratingScore: decimal("rating_score", { precision: 3, scale: 2 }),
  hourlyRate: decimal("hourly_rate", { precision: 8, scale: 2 }),
  isActive: boolean("is_active").default(true),
  contactInfo: jsonb("contact_info"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const maintenanceServices = pgTable("maintenance_services", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  aircraftId: uuid("aircraft_id").references(() => aircraftRegistry.id).notNull(),
  providerId: uuid("provider_id").references(() => maintenanceProviders.id).notNull(),
  serviceType: varchar("service_type").notNull(),
  scheduledDate: timestamp("scheduled_date"),
  completedDate: timestamp("completed_date"),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  actualCost: decimal("actual_cost", { precision: 10, scale: 2 }),
  status: varchar("status").default("scheduled"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Aviation Finance Platform Tables
export const lenders = pgTable("lenders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  institutionName: varchar("institution_name", { length: 200 }).notNull(),
  lenderType: varchar("lender_type").notNull(), // bank, credit_union, private, institutional
  minimumLoan: decimal("minimum_loan", { precision: 15, scale: 2 }),
  maximumLoan: decimal("maximum_loan", { precision: 15, scale: 2 }),
  interestRateRange: varchar("interest_rate_range"),
  loanTerms: varchar("loan_terms").array(),
  aircraftTypes: varchar("aircraft_types").array(),
  ratingScore: decimal("rating_score", { precision: 3, scale: 2 }),
  isActive: boolean("is_active").default(true),
  contactInfo: jsonb("contact_info"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const financeApplications = pgTable("finance_applications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  aircraftId: uuid("aircraft_id").references(() => aircraftRegistry.id).notNull(),
  lenderId: uuid("lender_id").references(() => lenders.id).notNull(),
  applicantId: varchar("applicant_id").notNull(),
  loanAmount: decimal("loan_amount", { precision: 15, scale: 2 }).notNull(),
  loanTerm: integer("loan_term").notNull(), // months
  interestRate: decimal("interest_rate", { precision: 5, scale: 3 }),
  downPayment: decimal("down_payment", { precision: 15, scale: 2 }),
  applicationStatus: varchar("application_status").default("pending"),
  creditScore: integer("credit_score"),
  annualIncome: decimal("annual_income", { precision: 15, scale: 2 }),
  appliedAt: timestamp("applied_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
});

// Data Analytics Platform Tables
export const marketAnalytics = pgTable("market_analytics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  analysisType: varchar("analysis_type").notNull(), // valuation, demand, pricing, trends
  aircraftCategory: varchar("aircraft_category"),
  manufacturer: varchar("manufacturer"),
  model: varchar("model"),
  metricName: varchar("metric_name").notNull(),
  metricValue: decimal("metric_value", { precision: 15, scale: 4 }).notNull(),
  timeframe: varchar("timeframe").notNull(),
  confidence: decimal("confidence", { precision: 3, scale: 2 }),
  analysisDate: timestamp("analysis_date").defaultNow(),
  dataSource: varchar("data_source"),
});

// Universal Blockchain Key Management System Tables

// Training Organizations - Each training center gets master keys
export const trainingOrganizations = pgTable("training_organizations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationName: varchar("organization_name", { length: 200 }).notNull(),
  organizationType: varchar("organization_type").notNull(), // part_142, part_141, part_121, part_135, mro, atc
  certificateNumber: varchar("certificate_number", { length: 100 }),
  regulatoryAuthority: varchar("regulatory_authority").notNull(), // faa, easa, transport_canada, casa
  masterPublicKey: varchar("master_public_key", { length: 100 }).unique().notNull(),
  keyGenerationDate: timestamp("key_generation_date").defaultNow(),
  isActive: boolean("is_active").default(true),
  contactInfo: jsonb("contact_info"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Professional Credentials - Individual pilots, mechanics, controllers, etc.
export const professionalCredentials = pgTable("professional_credentials", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  credentialType: varchar("credential_type").notNull(), // pilot_license, atp, mechanic_license, controller_license
  licenseNumber: varchar("license_number", { length: 100 }).notNull(),
  regulatoryAuthority: varchar("regulatory_authority").notNull(), // faa, easa, transport_canada, casa
  masterPrivateKeyHash: varchar("master_private_key_hash", { length: 100 }).unique().notNull(),
  publicKeyDerivationPath: varchar("public_key_derivation_path", { length: 200 }),
  holderFirstName: varchar("holder_first_name", { length: 100 }).notNull(),
  holderLastName: varchar("holder_last_name", { length: 100 }).notNull(),
  holderEmail: varchar("holder_email", { length: 200 }),
  dateOfBirth: timestamp("date_of_birth"),
  issueDate: timestamp("issue_date").notNull(),
  expirationDate: timestamp("expiration_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organization Members - Links professionals to organizations with role-based keys
export const organizationMembers = pgTable("organization_members", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => trainingOrganizations.id).notNull(),
  credentialId: uuid("credential_id").references(() => professionalCredentials.id).notNull(),
  memberRole: varchar("member_role").notNull(), // instructor, admin, compliance_officer, student
  organizationPrivateKeyHash: varchar("organization_private_key_hash", { length: 100 }).notNull(),
  delegatedAuthority: jsonb("delegated_authority"), // what they can sign/approve
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Training Records - Multi-signature blockchain records
export const blockchainTrainingRecords = pgTable("blockchain_training_records", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  studentCredentialId: uuid("student_credential_id").references(() => professionalCredentials.id).notNull(),
  organizationId: uuid("organization_id").references(() => trainingOrganizations.id).notNull(),
  instructorCredentialId: uuid("instructor_credential_id").references(() => professionalCredentials.id).notNull(),
  trainingType: varchar("training_type").notNull(), // initial, recurrent, checkride, proficiency
  trainingDetails: jsonb("training_details").notNull(),
  studentSignature: varchar("student_signature", { length: 200 }).notNull(),
  instructorSignature: varchar("instructor_signature", { length: 200 }).notNull(),
  organizationSignature: varchar("organization_signature", { length: 200 }).notNull(),
  blockchainHash: varchar("blockchain_hash", { length: 100 }).unique().notNull(),
  transactionHash: varchar("transaction_hash", { length: 100 }),
  blockNumber: integer("block_number"),
  completionDate: timestamp("completion_date").notNull(),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

// Key Recovery Requests - BCCS as recovery authority
export const keyRecoveryRequests = pgTable("key_recovery_requests", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  credentialId: uuid("credential_id").references(() => professionalCredentials.id).notNull(),
  requestType: varchar("request_type").notNull(), // lost_key, compromise, career_transfer
  requestReason: text("request_reason").notNull(),
  identityVerificationData: jsonb("identity_verification_data"), // documents, biometrics
  employmentVerificationData: jsonb("employment_verification_data"), // current employer confirmation
  historicalRecordMatches: jsonb("historical_record_matches"), // cross-reference validation
  verificationStatus: varchar("verification_status").default("pending"), // pending, verified, rejected
  requestStatus: varchar("request_status").default("pending"), // pending, processing, completed, rejected
  newMasterPrivateKeyHash: varchar("new_master_private_key_hash", { length: 100 }),
  recoveryCompletedAt: timestamp("recovery_completed_at"),
  emergencyFlag: boolean("emergency_flag").default(false),
  requestedAt: timestamp("requested_at").defaultNow(),
  processedBy: varchar("processed_by"), // BCCS admin who handled recovery
});

// Cross-Platform Verification Log - Universal credential verification
export const crossPlatformVerifications = pgTable("cross_platform_verifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  credentialId: uuid("credential_id").references(() => professionalCredentials.id).notNull(),
  platformType: varchar("platform_type").notNull(), // bccs142, bccsmaint, bccsatc, bccsreg, bccsregistry
  verificationPurpose: varchar("verification_purpose").notNull(), // training_entry, maintenance_sign_off, atc_certification
  verifyingOrganizationId: uuid("verifying_organization_id").references(() => trainingOrganizations.id),
  verificationResult: varchar("verification_result").notNull(), // verified, failed, expired
  verificationData: jsonb("verification_data"),
  verifiedAt: timestamp("verified_at").defaultNow(),
});

// ============================================================================
// PATENT 4/4B: ADAPTIVE COMPLIANCE ARCHITECTURE TABLES
// ============================================================================

// REGULATORY SPINE + ATTACHMENTS MODEL
// Core regulatory frameworks that form the "spine" of compliance
export const regulatoryFrameworks = pgTable("regulatory_frameworks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  frameworkCode: varchar("framework_code", { length: 50 }).notNull().unique(), // e.g., "14-CFR-142", "FAA-8900.1-VOL3"
  frameworkName: varchar("framework_name", { length: 200 }).notNull(),
  frameworkType: varchar("framework_type").notNull(), // spine, attachment
  regulatoryAuthority: varchar("regulatory_authority").notNull(), // faa, easa, transport_canada, casa
  effectiveDate: timestamp("effective_date").notNull(),
  version: varchar("version", { length: 50 }).notNull(),
  parentFrameworkId: uuid("parent_framework_id"), // For attachments, references the spine
  hierarchyLevel: integer("hierarchy_level").default(1), // 1=spine, 2+=attachments
  applicabilityRules: jsonb("applicability_rules"), // Conditions when this framework applies
  sourceUrl: text("source_url"),
  fullText: text("full_text"), // Full regulation text for indexing
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Dynamic attachment mappings based on training center authorizations
export const organizationAuthorizations = pgTable("organization_authorizations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => trainingOrganizations.id).notNull(),
  frameworkId: uuid("framework_id").references(() => regulatoryFrameworks.id).notNull(),
  authorizationType: varchar("authorization_type").notNull(), // primary, supplementary, conditional
  authorizationNumber: varchar("authorization_number", { length: 100 }),
  grantedDate: timestamp("granted_date").notNull(),
  expirationDate: timestamp("expiration_date"),
  conditions: jsonb("conditions"), // Specific conditions or limitations
  operatorClients: jsonb("operator_clients"), // Array of operator client IDs (121, 135, 91K operators)
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// CHECKLIST HARMONIZATION ENGINE
// Master checklist schemas from different sources
export const checklistSchemas = pgTable("checklist_schemas", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  schemaName: varchar("schema_name", { length: 200 }).notNull(),
  schemaSource: varchar("schema_source").notNull(), // faa_standard, certificate_job_aid, inspector_supplemental, operator_required, archived_legacy
  frameworkId: uuid("framework_id").references(() => regulatoryFrameworks.id),
  version: varchar("version", { length: 50 }).notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  totalItems: integer("total_items").notNull(),
  structureHash: varchar("structure_hash", { length: 100 }), // Hash for change detection
  metadata: jsonb("metadata"), // Additional schema metadata
  isCanonical: boolean("is_canonical").default(false), // Is this the authoritative version?
  priorityLevel: integer("priority_level").default(5), // 1=FAA Standard, 2=Certificate Job Aid, 3=Inspector Supplemental, 4=Operator Required, 5=Archived Legacy
  autoFetched: boolean("auto_fetched").default(false), // Was this auto-fetched when spine was selected?
  sourceUrl: text("source_url"), // FAA source URL for version monitoring
  lastVersionCheck: timestamp("last_version_check"), // When was version last verified
  isOutdated: boolean("is_outdated").default(false), // Has a newer version been detected?
  supersededById: uuid("superseded_by_id"), // Reference to newer version if outdated
  isHidden: boolean("is_hidden").default(false), // Hidden from normal view (archived/legacy)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Individual checklist items within schemas
export const checklistItems = pgTable("checklist_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  schemaId: uuid("schema_id").references(() => checklistSchemas.id).notNull(),
  itemNumber: varchar("item_number", { length: 20 }).notNull(),
  itemOrder: integer("item_order").notNull(),
  categoryId: varchar("category_id", { length: 50 }),
  categoryName: varchar("category_name", { length: 200 }),
  description: text("description").notNull(),
  regulatoryReference: varchar("regulatory_reference", { length: 100 }), // e.g., "142.5(a)"
  requiredEvidence: jsonb("required_evidence"), // Types of evidence needed
  complianceCriteria: jsonb("compliance_criteria"), // What constitutes compliance
  riskWeight: decimal("risk_weight", { precision: 3, scale: 2 }).default("1.00"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Cross-mapping between different checklist schemas
export const checklistMappings = pgTable("checklist_mappings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceSchemaId: uuid("source_schema_id").references(() => checklistSchemas.id).notNull(),
  targetSchemaId: uuid("target_schema_id").references(() => checklistSchemas.id).notNull(),
  sourceItemId: uuid("source_item_id").references(() => checklistItems.id).notNull(),
  targetItemId: uuid("target_item_id").references(() => checklistItems.id),
  mappingType: varchar("mapping_type").notNull(), // exact, partial, expanded, missing
  mappingConfidence: decimal("mapping_confidence", { precision: 3, scale: 2 }),
  mappingNotes: text("mapping_notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Delta reports between checklist versions
export const harmonizationDeltas = pgTable("harmonization_deltas", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  baseSchemaId: uuid("base_schema_id").references(() => checklistSchemas.id).notNull(),
  comparedSchemaId: uuid("compared_schema_id").references(() => checklistSchemas.id).notNull(),
  deltaType: varchar("delta_type").notNull(), // added, removed, modified, reordered
  affectedItemId: uuid("affected_item_id").references(() => checklistItems.id),
  baseItemNumber: varchar("base_item_number", { length: 20 }),
  comparedItemNumber: varchar("compared_item_number", { length: 20 }),
  changeDescription: text("change_description").notNull(),
  complianceImpact: varchar("compliance_impact"), // none, minor, major, critical
  generatedAt: timestamp("generated_at").defaultNow(),
});

// CHECKLIST AUTOMATION - Version monitoring and auto-fetch tracking
export const checklistVersionHistory = pgTable("checklist_version_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  schemaId: uuid("schema_id").references(() => checklistSchemas.id).notNull(),
  previousVersion: varchar("previous_version", { length: 50 }),
  newVersion: varchar("new_version", { length: 50 }).notNull(),
  changeType: varchar("change_type").notNull(), // new_version, amendment, correction, superseded
  changeSummary: text("change_summary"),
  sourceReference: text("source_reference"), // FAA document number/reference
  detectedAt: timestamp("detected_at").defaultNow(),
  appliedAt: timestamp("applied_at"),
  appliedBy: varchar("applied_by").references(() => users.id),
  isAcknowledged: boolean("is_acknowledged").default(false),
});

// Core FAA checklists for each FAR Part (auto-fetched when spine selected)
export const faaCoreForms = pgTable("faa_core_forms", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  farPart: varchar("far_part", { length: 20 }).notNull(), // e.g., "142", "141", "145"
  formNumber: varchar("form_number", { length: 50 }).notNull(), // e.g., "8610-2", "8900.1 Vol 3"
  formTitle: varchar("form_title", { length: 300 }).notNull(),
  formType: varchar("form_type").notNull(), // audit_checklist, job_aid, inspector_guide, application
  currentVersion: varchar("current_version", { length: 50 }),
  effectiveDate: timestamp("effective_date"),
  sourceUrl: text("source_url"),
  pdfUrl: text("pdf_url"),
  relatedOrderVolume: varchar("related_order_volume", { length: 50 }), // e.g., "8900.1 Vol 3"
  isActive: boolean("is_active").default(true),
  lastCheckedAt: timestamp("last_checked_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// INSPECTOR PREFERENCE ENGINE
// Individual inspector profiles
export const inspectorProfiles = pgTable("inspector_profiles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  inspectorName: varchar("inspector_name", { length: 200 }),
  inspectorId: varchar("inspector_id", { length: 100 }), // TCPM ID or FAA identifier
  region: varchar("region", { length: 100 }),
  office: varchar("office", { length: 200 }),
  preferredChecklistId: uuid("preferred_checklist_id").references(() => checklistSchemas.id),
  preferredItemOrdering: jsonb("preferred_item_ordering"), // Custom ordering preferences
  commonExtraQuestions: jsonb("common_extra_questions"), // Questions they typically add
  focusAreas: jsonb("focus_areas"), // Categories they emphasize
  averageAuditDuration: integer("average_audit_duration"), // In hours
  strictnessScore: decimal("strictness_score", { precision: 3, scale: 2 }), // 0-1 scale
  lastAuditDate: timestamp("last_audit_date"),
  totalAuditsTracked: integer("total_audits_tracked").default(0),
  predictionConfidence: decimal("prediction_confidence", { precision: 3, scale: 2 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tracked inspector behaviors for machine learning
export const inspectorBehaviors = pgTable("inspector_behaviors", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  inspectorId: uuid("inspector_id").references(() => inspectorProfiles.id).notNull(),
  organizationId: uuid("organization_id").references(() => trainingOrganizations.id).notNull(),
  auditDate: timestamp("audit_date").notNull(),
  checklistSchemaUsed: uuid("checklist_schema_used").references(() => checklistSchemas.id),
  itemsReordered: jsonb("items_reordered"), // Which items they reordered
  additionalQuestions: jsonb("additional_questions"), // Extra questions asked
  skippedItems: jsonb("skipped_items"), // Items they skipped
  emphasisAreas: jsonb("emphasis_areas"), // Areas they spent extra time on
  findingsCount: integer("findings_count"),
  auditOutcome: varchar("audit_outcome"), // passed, conditional, failed
  auditDuration: integer("audit_duration"), // In minutes
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// MULTI-SCHEMA EVIDENCE INDEXING
// Evidence records with blockchain verification
export const evidenceRecords = pgTable("evidence_records", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => trainingOrganizations.id).notNull(),
  evidenceType: varchar("evidence_type").notNull(), // document, training_record, certificate, log, procedure
  evidenceTitle: varchar("evidence_title", { length: 300 }).notNull(),
  evidenceDescription: text("evidence_description"),
  filePath: text("file_path"),
  fileHash: varchar("file_hash", { length: 100 }), // SHA-256 hash of content
  extractedText: text("extracted_text"), // OCR/parsed text for indexing
  metadata: jsonb("metadata"), // Document metadata
  blockchainTrainingRecordId: uuid("blockchain_training_record_id").references(() => blockchainTrainingRecords.id),
  blockchainVerificationHash: varchar("blockchain_verification_hash", { length: 100 }),
  verificationStatus: varchar("verification_status").default("pending"), // pending, verified, failed
  verifiedAt: timestamp("verified_at"),
  expirationDate: timestamp("expiration_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Evidence to checklist item mappings (multi-schema)
export const evidenceChecklistMappings = pgTable("evidence_checklist_mappings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  evidenceId: uuid("evidence_id").references(() => evidenceRecords.id).notNull(),
  checklistItemId: uuid("checklist_item_id").references(() => checklistItems.id).notNull(),
  mappingConfidence: decimal("mapping_confidence", { precision: 3, scale: 2 }).default("1.00"),
  mappingSource: varchar("mapping_source").notNull(), // manual, ai_suggested, auto_matched
  evidenceRelevance: varchar("evidence_relevance").notNull(), // primary, supporting, contextual
  notes: text("notes"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Evidence to regulatory reference mappings
export const evidenceRegulatoryMappings = pgTable("evidence_regulatory_mappings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  evidenceId: uuid("evidence_id").references(() => evidenceRecords.id).notNull(),
  frameworkId: uuid("framework_id").references(() => regulatoryFrameworks.id).notNull(),
  regulatoryReference: varchar("regulatory_reference", { length: 100 }).notNull(), // e.g., "142.5(a)"
  referenceType: varchar("reference_type").notNull(), // direct_compliance, supporting, cross_reference
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// AUTOMATED AUDIT PACKET GENERATOR
// Generated audit packets
export const auditPackets = pgTable("audit_packets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => trainingOrganizations.id).notNull(),
  packetName: varchar("packet_name", { length: 300 }).notNull(),
  packetType: varchar("packet_type").notNull(), // regulation_sorted, checklist_sorted, comprehensive
  targetInspectorId: uuid("target_inspector_id").references(() => inspectorProfiles.id),
  checklistSchemaId: uuid("checklist_schema_id").references(() => checklistSchemas.id).notNull(),
  generatedBy: varchar("generated_by"),
  generatedAt: timestamp("generated_at").defaultNow(),
  totalItems: integer("total_items").notNull(),
  itemsWithEvidence: integer("items_with_evidence").notNull(),
  blockchainVerifiedCount: integer("blockchain_verified_count").notNull(),
  complianceScore: decimal("compliance_score", { precision: 5, scale: 2 }),
  filePath: text("file_path"), // Generated PDF/document path
  packetHash: varchar("packet_hash", { length: 100 }), // Hash for integrity
  status: varchar("status").default("generated"), // generated, reviewed, submitted
  metadata: jsonb("metadata"),
});

// Audit packet items with evidence links
export const auditPacketItems = pgTable("audit_packet_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  packetId: uuid("packet_id").references(() => auditPackets.id).notNull(),
  checklistItemId: uuid("checklist_item_id").references(() => checklistItems.id).notNull(),
  itemOrder: integer("item_order").notNull(),
  regulatorySection: varchar("regulatory_section", { length: 100 }), // For regulation-sorted packets
  evidenceIds: uuid("evidence_ids").array(), // Array of linked evidence
  complianceStatus: varchar("compliance_status").notNull(), // compliant, partial, non_compliant, pending
  blockchainVerified: boolean("blockchain_verified").default(false),
  verificationDetails: jsonb("verification_details"),
  notes: text("notes"),
});

// Regulatory coverage matrix
export const regulatoryCoverageMatrix = pgTable("regulatory_coverage_matrix", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => trainingOrganizations.id).notNull(),
  frameworkId: uuid("framework_id").references(() => regulatoryFrameworks.id).notNull(),
  totalRequirements: integer("total_requirements").notNull(),
  evidencedRequirements: integer("evidenced_requirements").notNull(),
  blockchainVerifiedRequirements: integer("blockchain_verified_requirements").notNull(),
  coveragePercentage: decimal("coverage_percentage", { precision: 5, scale: 2 }).notNull(),
  lastCalculatedAt: timestamp("last_calculated_at").defaultNow(),
  gapAnalysis: jsonb("gap_analysis"), // Detailed gap information
});

// ============================================================================
// UNIVERSAL FAR INGESTION SYSTEM TABLES
// ============================================================================

// FAA Policy Documents - SAFOs, InFOs, Notices, Bulletins, AFS Directives
export const faaPolicyDocuments = pgTable("faa_policy_documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  documentType: varchar("document_type").notNull(), // safo, info, notice, bulletin, afs_directive, order
  documentNumber: varchar("document_number", { length: 100 }).notNull().unique(),
  title: varchar("title", { length: 500 }).notNull(),
  subject: text("subject"),
  issuanceDate: timestamp("issuance_date").notNull(),
  effectiveDate: timestamp("effective_date"),
  expirationDate: timestamp("expiration_date"),
  affectedParts: varchar("affected_parts").array(), // Array of affected FAR Parts
  applicability: jsonb("applicability"), // Who/what this applies to
  content: text("content"), // Full document text
  sourceUrl: text("source_url"),
  contentHash: varchar("content_hash", { length: 100 }), // For change detection
  linkedFrameworks: uuid("linked_frameworks").array(), // References to regulatoryFrameworks
  supersedes: varchar("supersedes", { length: 100 }), // Previous document replaced
  supersededBy: varchar("superseded_by", { length: 100 }), // Document that replaces this
  status: varchar("status").default("active"), // active, superseded, cancelled, expired
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Multi-Part Regulatory Configurations - Simultaneous application of multiple FAR parts
export const multiPartConfigurations = pgTable("multi_part_configurations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  configName: varchar("config_name", { length: 200 }).notNull(),
  description: text("description"),
  primarySpineId: uuid("primary_spine_id").references(() => regulatoryFrameworks.id).notNull(),
  secondarySpines: uuid("secondary_spines").array(), // Additional FAR Parts for multi-domain operations
  coreAttachmentIds: uuid("core_attachment_ids").array(), // FAA Orders, etc.
  dynamicAttachmentIds: uuid("dynamic_attachment_ids").array(), // Conditional attachments
  applicableOperationTypes: varchar("applicable_operation_types").array(), // 121_training, 135_training, 145_maintenance
  applicableAuthorizations: jsonb("applicable_authorizations"), // OpSpecs, LOAs, TCOs, AQP approvals
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Regulatory Update Tracking - Automatic monitoring and change detection
export const regulatoryUpdateTracking = pgTable("regulatory_update_tracking", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceType: varchar("source_type").notNull(), // ecfr, faa_order, safo, info, notice
  sourceIdentifier: varchar("source_identifier", { length: 200 }).notNull(), // e.g., "14-CFR-142", "SAFO-24001"
  sourceUrl: text("source_url"),
  lastCheckedAt: timestamp("last_checked_at").notNull(),
  lastContentHash: varchar("last_content_hash", { length: 100 }),
  currentContentHash: varchar("current_content_hash", { length: 100 }),
  changeDetected: boolean("change_detected").default(false),
  changeType: varchar("change_type"), // new, modified, deleted, superseded
  changeSummary: text("change_summary"),
  affectedFrameworkId: uuid("affected_framework_id").references(() => regulatoryFrameworks.id),
  affectedPolicyDocId: uuid("affected_policy_doc_id").references(() => faaPolicyDocuments.id),
  notificationSent: boolean("notification_sent").default(false),
  processedAt: timestamp("processed_at"),
  impactAssessment: jsonb("impact_assessment"), // AI-generated impact analysis
  createdAt: timestamp("created_at").defaultNow(),
});

// Regulatory Graph Links - Cross-references between regulations, orders, and policies
export const regulatoryGraphLinks = pgTable("regulatory_graph_links", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceType: varchar("source_type").notNull(), // framework, policy_document, checklist_item
  sourceId: uuid("source_id").notNull(),
  targetType: varchar("target_type").notNull(),
  targetId: uuid("target_id").notNull(),
  linkType: varchar("link_type").notNull(), // references, implements, supplements, supersedes, cross_references
  linkStrength: decimal("link_strength", { precision: 3, scale: 2 }).default("1.00"), // 0-1 confidence
  description: text("description"),
  regulatorySection: varchar("regulatory_section", { length: 100 }), // Specific section reference
  isAutoGenerated: boolean("is_auto_generated").default(false),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// OpSpecs, LOAs, TCOs - Operator Specific Authorizations
export const operatorAuthorizations = pgTable("operator_authorizations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => trainingOrganizations.id).notNull(),
  authorizationType: varchar("authorization_type").notNull(), // opspecs, loa, tco, aqp, training_program
  authorizationNumber: varchar("authorization_number", { length: 100 }).notNull(),
  title: varchar("title", { length: 300 }),
  issuingAuthority: varchar("issuing_authority", { length: 100 }), // FSDO, CHDO, CMO
  issuingOffice: varchar("issuing_office", { length: 200 }),
  issuedDate: timestamp("issued_date").notNull(),
  effectiveDate: timestamp("effective_date"),
  expirationDate: timestamp("expiration_date"),
  applicableParts: varchar("applicable_parts").array(), // FAR Parts this authorization relates to
  conditions: jsonb("conditions"), // Specific conditions/limitations
  privileges: jsonb("privileges"), // What operations are authorized
  documentPath: text("document_path"),
  documentHash: varchar("document_hash", { length: 100 }),
  linkedFrameworkIds: uuid("linked_framework_ids").array(),
  status: varchar("status").default("active"), // active, amended, revoked, expired
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Regional/FSDO Supplemental Requirements
export const regionalSupplements = pgTable("regional_supplements", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  region: varchar("region", { length: 100 }).notNull(), // e.g., "Southwest", "Great Lakes"
  officeType: varchar("office_type").notNull(), // fsdo, chdo, cmo
  officeIdentifier: varchar("office_identifier", { length: 100 }),
  officeName: varchar("office_name", { length: 200 }),
  supplementType: varchar("supplement_type").notNull(), // checklist_variant, additional_requirement, interpretation
  applicableFrameworkId: uuid("applicable_framework_id").references(() => regulatoryFrameworks.id),
  supplementTitle: varchar("supplement_title", { length: 300 }).notNull(),
  supplementContent: text("supplement_content"),
  effectiveDate: timestamp("effective_date"),
  additionalRequirements: jsonb("additional_requirements"),
  modifiedChecklistItems: jsonb("modified_checklist_items"), // Items added/modified for this region
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// END PATENT 4/4B TABLES
// ============================================================================

export const subscriptionTiers = pgTable("subscription_tiers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tierName: varchar("tier_name", { length: 100 }).notNull(),
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }).notNull(),
  annualPrice: decimal("annual_price", { precision: 10, scale: 2 }),
  features: varchar("features").array().notNull(),
  analyticsAccess: varchar("analytics_access").array(),
  dataRetention: integer("data_retention"), // days
  apiCallLimit: integer("api_call_limit"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const customerSubscriptions = pgTable("customer_subscriptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  tierId: uuid("tier_id").references(() => subscriptionTiers.id).notNull(),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  status: varchar("status").default("active"), // active, paused, cancelled, expired
  paymentMethod: varchar("payment_method"), // traditional, crypto
  lastPayment: timestamp("last_payment"),
  nextBilling: timestamp("next_billing"),
  autoRenew: boolean("auto_renew").default(true),
  // Crypto payment fields
  walletAddress: varchar("wallet_address"),
  smartContractAddress: varchar("smart_contract_address"),
  stableCoin: varchar("stable_coin"), // USDC, USDT, DAI
  chainId: integer("chain_id"), // 1 for Ethereum, 137 for Polygon, etc.
  allowanceAmount: decimal("allowance_amount", { precision: 18, scale: 6 }),
  lastBlockChecked: integer("last_block_checked"),
});

// Relations
export const aircraftRegistryRelations = relations(aircraftRegistry, ({ many, one }) => ({
  ownership: many(aircraftOwnership),
  liens: many(aircraftLiens),
  insurance: many(aircraftInsurance),
  tokenOffering: one(tokenOfferings),
  complianceChecks: many(complianceChecks),
}));

export const tokenOfferingsRelations = relations(tokenOfferings, ({ one, many }) => ({
  aircraft: one(aircraftRegistry, {
    fields: [tokenOfferings.aircraftId],
    references: [aircraftRegistry.id],
  }),
  holders: many(tokenHolders),
  transactions: many(tokenTransactions),
}));

export const tokenHoldersRelations = relations(tokenHolders, ({ one }) => ({
  offering: one(tokenOfferings, {
    fields: [tokenHolders.offeringId],
    references: [tokenOfferings.id],
  }),
}));

export const tokenTransactionsRelations = relations(tokenTransactions, ({ one }) => ({
  offering: one(tokenOfferings, {
    fields: [tokenTransactions.offeringId],
    references: [tokenOfferings.id],
  }),
}));

// Zod schemas for validation
export const insertAircraftRegistrySchema = createInsertSchema(aircraftRegistry);
export const insertAircraftOwnershipSchema = createInsertSchema(aircraftOwnership);
export const insertTokenOfferingSchema = createInsertSchema(tokenOfferings);
export const insertTokenHolderSchema = createInsertSchema(tokenHolders);
export const insertTokenTransactionSchema = createInsertSchema(tokenTransactions);
export const insertAuditLogSchema = createInsertSchema(auditLogs);
export const insertCryptoPaymentSchema = createInsertSchema(cryptoPayments);
export const insertSmartContractSchema = createInsertSchema(smartContracts);
export const insertCustomerSubscriptionSchema = createInsertSchema(customerSubscriptions);

// Universal Blockchain Key Management Zod schemas
export const insertTrainingOrganizationSchema = createInsertSchema(trainingOrganizations);
export const insertProfessionalCredentialSchema = createInsertSchema(professionalCredentials);
export const insertOrganizationMemberSchema = createInsertSchema(organizationMembers);
export const insertBlockchainTrainingRecordSchema = createInsertSchema(blockchainTrainingRecords);
export const insertKeyRecoveryRequestSchema = createInsertSchema(keyRecoveryRequests);
export const insertCrossPlatformVerificationSchema = createInsertSchema(crossPlatformVerifications);

// Types
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;

// Universal Blockchain Key Management Types
export type TrainingOrganization = typeof trainingOrganizations.$inferSelect;
export type InsertTrainingOrganization = typeof trainingOrganizations.$inferInsert;

export type ProfessionalCredential = typeof professionalCredentials.$inferSelect;
export type InsertProfessionalCredential = typeof professionalCredentials.$inferInsert;

export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type InsertOrganizationMember = typeof organizationMembers.$inferInsert;

export type BlockchainTrainingRecord = typeof blockchainTrainingRecords.$inferSelect;
export type InsertBlockchainTrainingRecord = typeof blockchainTrainingRecords.$inferInsert;

export type KeyRecoveryRequest = typeof keyRecoveryRequests.$inferSelect;
export type InsertKeyRecoveryRequest = typeof keyRecoveryRequests.$inferInsert;

export type CrossPlatformVerification = typeof crossPlatformVerifications.$inferSelect;
export type InsertCrossPlatformVerification = typeof crossPlatformVerifications.$inferInsert;
export type AircraftRegistry = typeof aircraftRegistry.$inferSelect;
export type InsertAircraftRegistry = z.infer<typeof insertAircraftRegistrySchema>;
export type AircraftOwnership = typeof aircraftOwnership.$inferSelect;
export type InsertAircraftOwnership = z.infer<typeof insertAircraftOwnershipSchema>;
export type TokenOffering = typeof tokenOfferings.$inferSelect;
export type InsertTokenOffering = z.infer<typeof insertTokenOfferingSchema>;
export type TokenHolder = typeof tokenHolders.$inferSelect;
export type InsertTokenHolder = z.infer<typeof insertTokenHolderSchema>;
export type TokenTransaction = typeof tokenTransactions.$inferSelect;
export type InsertTokenTransaction = z.infer<typeof insertTokenTransactionSchema>;
export type ComplianceCheck = typeof complianceChecks.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type CryptoPayment = typeof cryptoPayments.$inferSelect;
export type InsertCryptoPayment = z.infer<typeof insertCryptoPaymentSchema>;
export type SmartContract = typeof smartContracts.$inferSelect;
export type InsertSmartContract = z.infer<typeof insertSmartContractSchema>;
export type CustomerSubscription = typeof customerSubscriptions.$inferSelect;
export type InsertCustomerSubscription = z.infer<typeof insertCustomerSubscriptionSchema>;

// ============================================================================
// PATENT 4/4B: ADAPTIVE COMPLIANCE ARCHITECTURE SCHEMAS & TYPES
// ============================================================================

// Zod schemas for validation
export const insertRegulatoryFrameworkSchema = createInsertSchema(regulatoryFrameworks);
export const insertOrganizationAuthorizationSchema = createInsertSchema(organizationAuthorizations);
export const insertChecklistSchemaSchema = createInsertSchema(checklistSchemas);
export const insertChecklistItemSchema = createInsertSchema(checklistItems);
export const insertChecklistMappingSchema = createInsertSchema(checklistMappings);
export const insertHarmonizationDeltaSchema = createInsertSchema(harmonizationDeltas);
export const insertChecklistVersionHistorySchema = createInsertSchema(checklistVersionHistory);
export const insertFaaCoreFormSchema = createInsertSchema(faaCoreForms);
export const insertInspectorProfileSchema = createInsertSchema(inspectorProfiles);
export const insertInspectorBehaviorSchema = createInsertSchema(inspectorBehaviors);
export const insertEvidenceRecordSchema = createInsertSchema(evidenceRecords);
export const insertEvidenceChecklistMappingSchema = createInsertSchema(evidenceChecklistMappings);
export const insertEvidenceRegulatoryMappingSchema = createInsertSchema(evidenceRegulatoryMappings);
export const insertAuditPacketSchema = createInsertSchema(auditPackets);
export const insertAuditPacketItemSchema = createInsertSchema(auditPacketItems);
export const insertRegulatoryCoverageMatrixSchema = createInsertSchema(regulatoryCoverageMatrix);

// Types
export type RegulatoryFramework = typeof regulatoryFrameworks.$inferSelect;
export type InsertRegulatoryFramework = z.infer<typeof insertRegulatoryFrameworkSchema>;

export type OrganizationAuthorization = typeof organizationAuthorizations.$inferSelect;
export type InsertOrganizationAuthorization = z.infer<typeof insertOrganizationAuthorizationSchema>;

export type ChecklistSchema = typeof checklistSchemas.$inferSelect;
export type InsertChecklistSchema = z.infer<typeof insertChecklistSchemaSchema>;

export type ChecklistItem = typeof checklistItems.$inferSelect;
export type InsertChecklistItem = z.infer<typeof insertChecklistItemSchema>;

export type ChecklistMapping = typeof checklistMappings.$inferSelect;
export type InsertChecklistMapping = z.infer<typeof insertChecklistMappingSchema>;

export type HarmonizationDelta = typeof harmonizationDeltas.$inferSelect;
export type InsertHarmonizationDelta = z.infer<typeof insertHarmonizationDeltaSchema>;

export type ChecklistVersionHistory = typeof checklistVersionHistory.$inferSelect;
export type InsertChecklistVersionHistory = z.infer<typeof insertChecklistVersionHistorySchema>;

export type FaaCoreForm = typeof faaCoreForms.$inferSelect;
export type InsertFaaCoreForm = z.infer<typeof insertFaaCoreFormSchema>;

export type InspectorProfile = typeof inspectorProfiles.$inferSelect;
export type InsertInspectorProfile = z.infer<typeof insertInspectorProfileSchema>;

export type InspectorBehavior = typeof inspectorBehaviors.$inferSelect;
export type InsertInspectorBehavior = z.infer<typeof insertInspectorBehaviorSchema>;

export type EvidenceRecord = typeof evidenceRecords.$inferSelect;
export type InsertEvidenceRecord = z.infer<typeof insertEvidenceRecordSchema>;

export type EvidenceChecklistMapping = typeof evidenceChecklistMappings.$inferSelect;
export type InsertEvidenceChecklistMapping = z.infer<typeof insertEvidenceChecklistMappingSchema>;

export type EvidenceRegulatoryMapping = typeof evidenceRegulatoryMappings.$inferSelect;
export type InsertEvidenceRegulatoryMapping = z.infer<typeof insertEvidenceRegulatoryMappingSchema>;

export type AuditPacket = typeof auditPackets.$inferSelect;
export type InsertAuditPacket = z.infer<typeof insertAuditPacketSchema>;

export type AuditPacketItem = typeof auditPacketItems.$inferSelect;
export type InsertAuditPacketItem = z.infer<typeof insertAuditPacketItemSchema>;

export type RegulatoryCoverageMatrix = typeof regulatoryCoverageMatrix.$inferSelect;
export type InsertRegulatoryCoverageMatrix = z.infer<typeof insertRegulatoryCoverageMatrixSchema>;

// ============================================================================
// COMPLIANCE CHECKLIST STATE
// ============================================================================

export const checklistStates = pgTable("checklist_states", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  state: jsonb("state").notNull(),
  organizationId: uuid("organization_id"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  // One checklist state per user per organization — tenant-isolated.
  unique("checklist_states_user_org_key").on(t.userId, t.organizationId),
]);

export const insertChecklistStateSchema = createInsertSchema(checklistStates).omit({ id: true, updatedAt: true });
export type ChecklistState = typeof checklistStates.$inferSelect;
export type InsertChecklistState = typeof checklistStates.$inferInsert;

// ============================================================================
// TRAINING RECORDS SYSTEM
// ============================================================================

export const trainingEvents = pgTable("bccs_training_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentName: varchar("student_name", { length: 200 }).notNull(),
  studentId: varchar("student_id", { length: 100 }),
  instructorName: varchar("instructor_name", { length: 200 }).notNull(),
  instructorId: varchar("instructor_id", { length: 100 }),
  eventType: varchar("event_type", { length: 100 }).notNull(), // ground, flight, simulator, check_ride, evaluation
  eventDate: timestamp("event_date").notNull(),
  durationHours: varchar("duration_hours", { length: 20 }),
  curriculumItem: varchar("curriculum_item", { length: 500 }),
  notes: text("notes"),
  status: varchar("status", { length: 50 }).default("completed"), // completed, pending, failed
  blockchainHash: varchar("blockchain_hash", { length: 200 }),
  userId: varchar("user_id").notNull(),
  organizationId: uuid("organization_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTrainingEventSchema = createInsertSchema(trainingEvents).omit({ id: true, createdAt: true });
export type TrainingEvent = typeof trainingEvents.$inferSelect;
export type InsertTrainingEvent = typeof trainingEvents.$inferInsert;

export const students = pgTable("students", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 200 }),
  phone: varchar("phone", { length: 50 }),
  certificateNumber: varchar("certificate_number", { length: 100 }),
  enrollmentDate: timestamp("enrollment_date").defaultNow(),
  expectedCompletion: timestamp("expected_completion"),
  status: varchar("status", { length: 50 }).default("active"), // active, completed, suspended
  notes: text("notes"),
  organizationId: uuid("organization_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertStudentSchema = createInsertSchema(students).omit({ id: true, createdAt: true });
export type Student = typeof students.$inferSelect;
export type InsertStudent = typeof students.$inferInsert;

export const instructorRecords = pgTable("bccs_instructor_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 200 }),
  certificateType: varchar("certificate_type", { length: 100 }).notNull(), // CFI, CFII, MEI, ATP, DPE
  certificateNumber: varchar("certificate_number", { length: 100 }).notNull(),
  issueDate: timestamp("issue_date"),
  expirationDate: timestamp("expiration_date"),
  currencyDate: timestamp("currency_date"),
  ratings: jsonb("ratings"),
  trainingAuthorizations: jsonb("training_authorizations"),
  status: varchar("status", { length: 50 }).default("current"), // current, expired, suspended
  organizationId: uuid("organization_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInstructorRecordSchema = createInsertSchema(instructorRecords).omit({ id: true, createdAt: true });
export type InstructorRecord = typeof instructorRecords.$inferSelect;
export type InsertInstructorRecord = typeof instructorRecords.$inferInsert;

// ============================================================================
// UNIVERSAL FAR INGESTION SYSTEM SCHEMAS & TYPES
// ============================================================================

// Zod schemas for validation
export const insertFaaPolicyDocumentSchema = createInsertSchema(faaPolicyDocuments);
export const insertMultiPartConfigurationSchema = createInsertSchema(multiPartConfigurations);
export const insertRegulatoryUpdateTrackingSchema = createInsertSchema(regulatoryUpdateTracking);
export const insertRegulatoryGraphLinkSchema = createInsertSchema(regulatoryGraphLinks);
export const insertOperatorAuthorizationSchema = createInsertSchema(operatorAuthorizations);
export const insertRegionalSupplementSchema = createInsertSchema(regionalSupplements);

// Types
export type FaaPolicyDocument = typeof faaPolicyDocuments.$inferSelect;
export type InsertFaaPolicyDocument = z.infer<typeof insertFaaPolicyDocumentSchema>;

export type MultiPartConfiguration = typeof multiPartConfigurations.$inferSelect;
export type InsertMultiPartConfiguration = z.infer<typeof insertMultiPartConfigurationSchema>;

export type RegulatoryUpdateTracking = typeof regulatoryUpdateTracking.$inferSelect;
export type InsertRegulatoryUpdateTracking = z.infer<typeof insertRegulatoryUpdateTrackingSchema>;

export type RegulatoryGraphLink = typeof regulatoryGraphLinks.$inferSelect;
export type InsertRegulatoryGraphLink = z.infer<typeof insertRegulatoryGraphLinkSchema>;

export type OperatorAuthorization = typeof operatorAuthorizations.$inferSelect;
export type InsertOperatorAuthorization = z.infer<typeof insertOperatorAuthorizationSchema>;

export type RegionalSupplement = typeof regionalSupplements.$inferSelect;
export type InsertRegionalSupplement = z.infer<typeof insertRegionalSupplementSchema>;

// ── DIGITAL FORMS SYSTEM ─────────────────────────────────────────────────────

export const digitalFormTemplates = pgTable("digital_form_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  organizationName: varchar("organization_name", { length: 300 }),
  faaSourceId: varchar("faa_source_id", { length: 100 }),
  faaDocumentTitle: varchar("faa_document_title", { length: 300 }),
  faaDocumentType: varchar("faa_document_type", { length: 50 }),
  fields: jsonb("fields").notNull().default([]),
  status: varchar("status", { length: 20 }).default("active"),
  publicToken: varchar("public_token", { length: 100 }),
  isPublic: boolean("is_public").default(true),
  // AI generation tracking
  autoGenerated: boolean("auto_generated").default(false),
  checklistVersionHash: text("checklist_version_hash"),   // content_hash from bccs_faa_repository at generation time
  regulationStatus: varchar("regulation_status", { length: 20 }).default("current"), // 'current' | 'needs_review'
  generatedFromSection: varchar("generated_from_section", { length: 200 }),           // e.g. "§142.27 Personnel"
  createdBy: varchar("created_by", { length: 200 }),
  organizationId: uuid("organization_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const digitalFormSubmissions = pgTable("digital_form_submissions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: uuid("template_id").references(() => digitalFormTemplates.id).notNull(),
  templateTitle: varchar("template_title", { length: 300 }),
  organizationName: varchar("organization_name", { length: 300 }),
  submittedBy: varchar("submitted_by", { length: 200 }),
  formData: jsonb("form_data").notNull().default({}),
  status: varchar("status", { length: 20 }).default("submitted"),
  notes: text("notes"),
  organizationId: uuid("organization_id"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDigitalFormTemplateSchema = createInsertSchema(digitalFormTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDigitalFormSubmissionSchema = createInsertSchema(digitalFormSubmissions).omit({ id: true, createdAt: true, submittedAt: true });

export type DigitalFormTemplate = typeof digitalFormTemplates.$inferSelect;
export type InsertDigitalFormTemplate = z.infer<typeof insertDigitalFormTemplateSchema>;
export type DigitalFormSubmission = typeof digitalFormSubmissions.$inferSelect;
export type InsertDigitalFormSubmission = z.infer<typeof insertDigitalFormSubmissionSchema>;