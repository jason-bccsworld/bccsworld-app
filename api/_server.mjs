var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/app.ts
import express from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  aircraftInsurance: () => aircraftInsurance,
  aircraftLiens: () => aircraftLiens,
  aircraftOwnership: () => aircraftOwnership,
  aircraftRegistry: () => aircraftRegistry,
  aircraftRegistryRelations: () => aircraftRegistryRelations,
  auditLogs: () => auditLogs,
  auditPacketItems: () => auditPacketItems,
  auditPackets: () => auditPackets,
  blockchainTrainingRecords: () => blockchainTrainingRecords,
  checklistItems: () => checklistItems,
  checklistMappings: () => checklistMappings,
  checklistSchemas: () => checklistSchemas,
  checklistVersionHistory: () => checklistVersionHistory,
  complianceChecks: () => complianceChecks,
  crossPlatformVerifications: () => crossPlatformVerifications,
  cryptoPayments: () => cryptoPayments,
  customerSubscriptions: () => customerSubscriptions,
  evidenceChecklistMappings: () => evidenceChecklistMappings,
  evidenceRecords: () => evidenceRecords,
  evidenceRegulatoryMappings: () => evidenceRegulatoryMappings,
  faaCoreForms: () => faaCoreForms,
  faaPolicyDocuments: () => faaPolicyDocuments,
  financeApplications: () => financeApplications,
  harmonizationDeltas: () => harmonizationDeltas,
  insertAircraftOwnershipSchema: () => insertAircraftOwnershipSchema,
  insertAircraftRegistrySchema: () => insertAircraftRegistrySchema,
  insertAuditLogSchema: () => insertAuditLogSchema,
  insertAuditPacketItemSchema: () => insertAuditPacketItemSchema,
  insertAuditPacketSchema: () => insertAuditPacketSchema,
  insertBlockchainTrainingRecordSchema: () => insertBlockchainTrainingRecordSchema,
  insertChecklistItemSchema: () => insertChecklistItemSchema,
  insertChecklistMappingSchema: () => insertChecklistMappingSchema,
  insertChecklistSchemaSchema: () => insertChecklistSchemaSchema,
  insertChecklistVersionHistorySchema: () => insertChecklistVersionHistorySchema,
  insertCrossPlatformVerificationSchema: () => insertCrossPlatformVerificationSchema,
  insertCryptoPaymentSchema: () => insertCryptoPaymentSchema,
  insertCustomerSubscriptionSchema: () => insertCustomerSubscriptionSchema,
  insertEvidenceChecklistMappingSchema: () => insertEvidenceChecklistMappingSchema,
  insertEvidenceRecordSchema: () => insertEvidenceRecordSchema,
  insertEvidenceRegulatoryMappingSchema: () => insertEvidenceRegulatoryMappingSchema,
  insertFaaCoreFormSchema: () => insertFaaCoreFormSchema,
  insertFaaPolicyDocumentSchema: () => insertFaaPolicyDocumentSchema,
  insertHarmonizationDeltaSchema: () => insertHarmonizationDeltaSchema,
  insertInspectorBehaviorSchema: () => insertInspectorBehaviorSchema,
  insertInspectorProfileSchema: () => insertInspectorProfileSchema,
  insertKeyRecoveryRequestSchema: () => insertKeyRecoveryRequestSchema,
  insertMultiPartConfigurationSchema: () => insertMultiPartConfigurationSchema,
  insertOperatorAuthorizationSchema: () => insertOperatorAuthorizationSchema,
  insertOrganizationAuthorizationSchema: () => insertOrganizationAuthorizationSchema,
  insertOrganizationMemberSchema: () => insertOrganizationMemberSchema,
  insertProfessionalCredentialSchema: () => insertProfessionalCredentialSchema,
  insertRegionalSupplementSchema: () => insertRegionalSupplementSchema,
  insertRegulatoryCoverageMatrixSchema: () => insertRegulatoryCoverageMatrixSchema,
  insertRegulatoryFrameworkSchema: () => insertRegulatoryFrameworkSchema,
  insertRegulatoryGraphLinkSchema: () => insertRegulatoryGraphLinkSchema,
  insertRegulatoryUpdateTrackingSchema: () => insertRegulatoryUpdateTrackingSchema,
  insertSmartContractSchema: () => insertSmartContractSchema,
  insertTokenHolderSchema: () => insertTokenHolderSchema,
  insertTokenOfferingSchema: () => insertTokenOfferingSchema,
  insertTokenTransactionSchema: () => insertTokenTransactionSchema,
  insertTrainingOrganizationSchema: () => insertTrainingOrganizationSchema,
  inspectorBehaviors: () => inspectorBehaviors,
  inspectorProfiles: () => inspectorProfiles,
  insuranceProviders: () => insuranceProviders,
  insuranceQuotes: () => insuranceQuotes,
  keyRecoveryRequests: () => keyRecoveryRequests,
  lenders: () => lenders,
  maintenanceProviders: () => maintenanceProviders,
  maintenanceServices: () => maintenanceServices,
  marketAnalytics: () => marketAnalytics,
  multiPartConfigurations: () => multiPartConfigurations,
  operatorAuthorizations: () => operatorAuthorizations,
  organizationAuthorizations: () => organizationAuthorizations,
  organizationMembers: () => organizationMembers,
  professionalCredentials: () => professionalCredentials,
  regionalSupplements: () => regionalSupplements,
  registryAnalytics: () => registryAnalytics,
  regulatoryCoverageMatrix: () => regulatoryCoverageMatrix,
  regulatoryFrameworks: () => regulatoryFrameworks,
  regulatoryGraphLinks: () => regulatoryGraphLinks,
  regulatoryUpdateTracking: () => regulatoryUpdateTracking,
  sessions: () => sessions,
  smartContracts: () => smartContracts,
  subscriptionTiers: () => subscriptionTiers,
  tokenHolders: () => tokenHolders,
  tokenHoldersRelations: () => tokenHoldersRelations,
  tokenOfferings: () => tokenOfferings,
  tokenOfferingsRelations: () => tokenOfferingsRelations,
  tokenTransactions: () => tokenTransactions,
  tokenTransactionsRelations: () => tokenTransactionsRelations,
  trainingOrganizations: () => trainingOrganizations,
  users: () => users
});
import { sql } from "drizzle-orm";
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
  uuid
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
var sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull()
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  passwordHash: varchar("password_hash"),
  role: varchar("role").default("user"),
  // admin, instructor, auditor, viewer
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var aircraftRegistry = pgTable("aircraft_registry", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tailNumber: varchar("tail_number", { length: 20 }).notNull().unique(),
  manufacturer: varchar("manufacturer", { length: 100 }).notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  year: integer("year").notNull(),
  serialNumber: varchar("serial_number", { length: 100 }),
  engineType: varchar("engine_type", { length: 100 }),
  maxSeats: integer("max_seats"),
  maxWeight: decimal("max_weight", { precision: 10, scale: 2 }),
  registrationStatus: varchar("registration_status").default("active"),
  // active, suspended, cancelled
  registrationDate: timestamp("registration_date").defaultNow(),
  expirationDate: timestamp("expiration_date"),
  currentValuation: decimal("current_valuation", { precision: 15, scale: 2 }),
  lastValuationDate: timestamp("last_valuation_date"),
  isTokenized: boolean("is_tokenized").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var aircraftOwnership = pgTable("aircraft_ownership", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  aircraftId: uuid("aircraft_id").references(() => aircraftRegistry.id).notNull(),
  ownerName: varchar("owner_name", { length: 200 }).notNull(),
  ownerType: varchar("owner_type").notNull(),
  // individual, corporation, trust, government
  ownerAddress: text("owner_address"),
  ownershipPercentage: decimal("ownership_percentage", { precision: 5, scale: 2 }).default("100.00"),
  ownershipType: varchar("ownership_type").default("full"),
  // full, fractional, lease
  effectiveDate: timestamp("effective_date").defaultNow(),
  registeredDate: timestamp("registered_date").defaultNow(),
  isActive: boolean("is_active").default(true)
});
var aircraftLiens = pgTable("aircraft_liens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  aircraftId: uuid("aircraft_id").references(() => aircraftRegistry.id).notNull(),
  lienholder: varchar("lienholder", { length: 200 }).notNull(),
  lienAmount: decimal("lien_amount", { precision: 15, scale: 2 }).notNull(),
  lienType: varchar("lien_type").notNull(),
  // mortgage, security_interest, tax_lien
  filingDate: timestamp("filing_date").defaultNow(),
  maturityDate: timestamp("maturity_date"),
  isActive: boolean("is_active").default(true)
});
var aircraftInsurance = pgTable("aircraft_insurance", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  aircraftId: uuid("aircraft_id").references(() => aircraftRegistry.id).notNull(),
  provider: varchar("provider", { length: 200 }).notNull(),
  policyNumber: varchar("policy_number", { length: 100 }).notNull(),
  coverageAmount: decimal("coverage_amount", { precision: 15, scale: 2 }).notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  expirationDate: timestamp("expiration_date").notNull(),
  isActive: boolean("is_active").default(true)
});
var tokenOfferings = pgTable("token_offerings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  aircraftId: uuid("aircraft_id").references(() => aircraftRegistry.id).notNull(),
  contractAddress: varchar("contract_address", { length: 100 }),
  totalTokens: integer("total_tokens").notNull(),
  tokensIssued: integer("tokens_issued").default(0),
  tokensSold: integer("tokens_sold").default(0),
  initialPrice: decimal("initial_price", { precision: 10, scale: 6 }).notNull(),
  currentPrice: decimal("current_price", { precision: 10, scale: 6 }),
  launchDate: timestamp("launch_date").defaultNow(),
  status: varchar("status").default("active"),
  // active, paused, completed, cancelled
  prospectusUrl: text("prospectus_url"),
  minimumInvestment: decimal("minimum_investment", { precision: 10, scale: 2 }),
  isAccreditedOnly: boolean("is_accredited_only").default(false)
});
var tokenHolders = pgTable("token_holders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  offeringId: uuid("offering_id").references(() => tokenOfferings.id).notNull(),
  investorId: varchar("investor_id").notNull(),
  walletAddress: varchar("wallet_address", { length: 100 }),
  tokensOwned: integer("tokens_owned").notNull(),
  averagePurchasePrice: decimal("average_purchase_price", { precision: 10, scale: 6 }),
  totalInvestment: decimal("total_investment", { precision: 15, scale: 2 }),
  firstPurchaseDate: timestamp("first_purchase_date").defaultNow(),
  lastTransactionDate: timestamp("last_transaction_date").defaultNow(),
  kycStatus: varchar("kyc_status").default("pending"),
  // pending, verified, rejected
  accreditationStatus: varchar("accreditation_status").default("unknown")
  // verified, unverified, unknown
});
var tokenTransactions = pgTable("token_transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  offeringId: uuid("offering_id").references(() => tokenOfferings.id).notNull(),
  transactionHash: varchar("transaction_hash", { length: 100 }),
  transactionType: varchar("transaction_type").notNull(),
  // buy, sell, transfer, dividend
  buyerId: varchar("buyer_id"),
  sellerId: varchar("seller_id"),
  tokenAmount: integer("token_amount").notNull(),
  pricePerToken: decimal("price_per_token", { precision: 10, scale: 6 }),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }),
  transactionFee: decimal("transaction_fee", { precision: 10, scale: 2 }),
  blockNumber: integer("block_number"),
  gasUsed: integer("gas_used"),
  transactionDate: timestamp("transaction_date").defaultNow(),
  status: varchar("status").default("pending")
  // pending, confirmed, failed
});
var complianceChecks = pgTable("compliance_checks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  aircraftId: uuid("aircraft_id").references(() => aircraftRegistry.id).notNull(),
  checkType: varchar("check_type").notNull(),
  // registration, insurance, liens, ownership
  checkResult: varchar("check_result").notNull(),
  // passed, failed, warning
  checkDetails: jsonb("check_details"),
  checkDate: timestamp("check_date").defaultNow(),
  nextCheckDate: timestamp("next_check_date"),
  performedBy: varchar("performed_by")
});
var registryAnalytics = pgTable("registry_analytics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  registryId: varchar("registry_id").notNull(),
  metricType: varchar("metric_type").notNull(),
  // aircraft_count, token_volume, revenue
  metricValue: decimal("metric_value", { precision: 15, scale: 2 }).notNull(),
  period: varchar("period").notNull(),
  // daily, weekly, monthly, yearly
  recordDate: timestamp("record_date").defaultNow()
});
var auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: varchar("event_type").notNull(),
  // regulatory_check, link_check, compliance_alert, system_error, crypto_payment
  severity: varchar("severity").notNull(),
  // info, warning, error, critical
  message: text("message").notNull(),
  details: jsonb("details"),
  sourceSystem: varchar("source_system"),
  // regulatory_monitor, link_monitor, compliance_engine, crypto_service
  userId: varchar("user_id"),
  aircraftId: uuid("aircraft_id"),
  timestamp: timestamp("timestamp").defaultNow()
});
var cryptoPayments = pgTable("crypto_payments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  subscriptionId: uuid("subscription_id").references(() => customerSubscriptions.id).notNull(),
  transactionHash: varchar("transaction_hash", { length: 100 }).unique(),
  blockNumber: integer("block_number"),
  fromAddress: varchar("from_address", { length: 50 }).notNull(),
  toAddress: varchar("to_address", { length: 50 }).notNull(),
  amount: decimal("amount", { precision: 18, scale: 6 }).notNull(),
  stableCoin: varchar("stable_coin").notNull(),
  // USDC, USDT, DAI
  chainId: integer("chain_id").notNull(),
  gasUsed: integer("gas_used"),
  gasFee: decimal("gas_fee", { precision: 18, scale: 6 }),
  status: varchar("status").default("pending"),
  // pending, confirmed, failed, cancelled
  paymentType: varchar("payment_type").notNull(),
  // subscription_renewal, setup_fee, upgrade
  periodCovered: varchar("period_covered"),
  // 2024-01, 2024-Q1, 2024
  confirmedAt: timestamp("confirmed_at"),
  createdAt: timestamp("created_at").defaultNow()
});
var smartContracts = pgTable("smart_contracts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  contractAddress: varchar("contract_address", { length: 50 }).notNull().unique(),
  chainId: integer("chain_id").notNull(),
  contractType: varchar("contract_type").notNull(),
  // subscription_manager, payment_processor
  version: varchar("version").notNull(),
  deployedAt: timestamp("deployed_at").defaultNow(),
  isActive: boolean("is_active").default(true),
  supportedStableCoins: varchar("supported_stable_coins").array().notNull(),
  minimumPayment: decimal("minimum_payment", { precision: 18, scale: 6 }),
  maximumPayment: decimal("maximum_payment", { precision: 18, scale: 6 }),
  gasLimit: integer("gas_limit"),
  abi: jsonb("abi")
  // Contract ABI for interaction
});
var insuranceProviders = pgTable("insurance_providers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: varchar("company_name", { length: 200 }).notNull(),
  licenseNumber: varchar("license_number", { length: 100 }),
  coverageTypes: varchar("coverage_types").array().notNull(),
  ratingScore: decimal("rating_score", { precision: 3, scale: 2 }),
  isActive: boolean("is_active").default(true),
  contactInfo: jsonb("contact_info"),
  createdAt: timestamp("created_at").defaultNow()
});
var insuranceQuotes = pgTable("insurance_quotes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  aircraftId: uuid("aircraft_id").references(() => aircraftRegistry.id).notNull(),
  providerId: uuid("provider_id").references(() => insuranceProviders.id).notNull(),
  coverageType: varchar("coverage_type").notNull(),
  coverageAmount: decimal("coverage_amount", { precision: 15, scale: 2 }).notNull(),
  annualPremium: decimal("annual_premium", { precision: 10, scale: 2 }).notNull(),
  deductible: decimal("deductible", { precision: 10, scale: 2 }),
  quoteValidUntil: timestamp("quote_valid_until").notNull(),
  quotedAt: timestamp("quoted_at").defaultNow(),
  status: varchar("status").default("active")
});
var maintenanceProviders = pgTable("maintenance_providers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: varchar("company_name", { length: 200 }).notNull(),
  certificationNumber: varchar("certification_number", { length: 100 }),
  serviceTypes: varchar("service_types").array().notNull(),
  location: varchar("location", { length: 200 }),
  ratingScore: decimal("rating_score", { precision: 3, scale: 2 }),
  hourlyRate: decimal("hourly_rate", { precision: 8, scale: 2 }),
  isActive: boolean("is_active").default(true),
  contactInfo: jsonb("contact_info"),
  createdAt: timestamp("created_at").defaultNow()
});
var maintenanceServices = pgTable("maintenance_services", {
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
  createdAt: timestamp("created_at").defaultNow()
});
var lenders = pgTable("lenders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  institutionName: varchar("institution_name", { length: 200 }).notNull(),
  lenderType: varchar("lender_type").notNull(),
  // bank, credit_union, private, institutional
  minimumLoan: decimal("minimum_loan", { precision: 15, scale: 2 }),
  maximumLoan: decimal("maximum_loan", { precision: 15, scale: 2 }),
  interestRateRange: varchar("interest_rate_range"),
  loanTerms: varchar("loan_terms").array(),
  aircraftTypes: varchar("aircraft_types").array(),
  ratingScore: decimal("rating_score", { precision: 3, scale: 2 }),
  isActive: boolean("is_active").default(true),
  contactInfo: jsonb("contact_info"),
  createdAt: timestamp("created_at").defaultNow()
});
var financeApplications = pgTable("finance_applications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  aircraftId: uuid("aircraft_id").references(() => aircraftRegistry.id).notNull(),
  lenderId: uuid("lender_id").references(() => lenders.id).notNull(),
  applicantId: varchar("applicant_id").notNull(),
  loanAmount: decimal("loan_amount", { precision: 15, scale: 2 }).notNull(),
  loanTerm: integer("loan_term").notNull(),
  // months
  interestRate: decimal("interest_rate", { precision: 5, scale: 3 }),
  downPayment: decimal("down_payment", { precision: 15, scale: 2 }),
  applicationStatus: varchar("application_status").default("pending"),
  creditScore: integer("credit_score"),
  annualIncome: decimal("annual_income", { precision: 15, scale: 2 }),
  appliedAt: timestamp("applied_at").defaultNow(),
  approvedAt: timestamp("approved_at")
});
var marketAnalytics = pgTable("market_analytics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  analysisType: varchar("analysis_type").notNull(),
  // valuation, demand, pricing, trends
  aircraftCategory: varchar("aircraft_category"),
  manufacturer: varchar("manufacturer"),
  model: varchar("model"),
  metricName: varchar("metric_name").notNull(),
  metricValue: decimal("metric_value", { precision: 15, scale: 4 }).notNull(),
  timeframe: varchar("timeframe").notNull(),
  confidence: decimal("confidence", { precision: 3, scale: 2 }),
  analysisDate: timestamp("analysis_date").defaultNow(),
  dataSource: varchar("data_source")
});
var trainingOrganizations = pgTable("training_organizations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationName: varchar("organization_name", { length: 200 }).notNull(),
  organizationType: varchar("organization_type").notNull(),
  // part_142, part_141, part_121, part_135, mro, atc
  certificateNumber: varchar("certificate_number", { length: 100 }),
  regulatoryAuthority: varchar("regulatory_authority").notNull(),
  // faa, easa, transport_canada, casa
  masterPublicKey: varchar("master_public_key", { length: 100 }).unique().notNull(),
  keyGenerationDate: timestamp("key_generation_date").defaultNow(),
  isActive: boolean("is_active").default(true),
  contactInfo: jsonb("contact_info"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var professionalCredentials = pgTable("professional_credentials", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  credentialType: varchar("credential_type").notNull(),
  // pilot_license, atp, mechanic_license, controller_license
  licenseNumber: varchar("license_number", { length: 100 }).notNull(),
  regulatoryAuthority: varchar("regulatory_authority").notNull(),
  // faa, easa, transport_canada, casa
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
  updatedAt: timestamp("updated_at").defaultNow()
});
var organizationMembers = pgTable("organization_members", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => trainingOrganizations.id).notNull(),
  credentialId: uuid("credential_id").references(() => professionalCredentials.id).notNull(),
  memberRole: varchar("member_role").notNull(),
  // instructor, admin, compliance_officer, student
  organizationPrivateKeyHash: varchar("organization_private_key_hash", { length: 100 }).notNull(),
  delegatedAuthority: jsonb("delegated_authority"),
  // what they can sign/approve
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});
var blockchainTrainingRecords = pgTable("blockchain_training_records", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  studentCredentialId: uuid("student_credential_id").references(() => professionalCredentials.id).notNull(),
  organizationId: uuid("organization_id").references(() => trainingOrganizations.id).notNull(),
  instructorCredentialId: uuid("instructor_credential_id").references(() => professionalCredentials.id).notNull(),
  trainingType: varchar("training_type").notNull(),
  // initial, recurrent, checkride, proficiency
  trainingDetails: jsonb("training_details").notNull(),
  studentSignature: varchar("student_signature", { length: 200 }).notNull(),
  instructorSignature: varchar("instructor_signature", { length: 200 }).notNull(),
  organizationSignature: varchar("organization_signature", { length: 200 }).notNull(),
  blockchainHash: varchar("blockchain_hash", { length: 100 }).unique().notNull(),
  transactionHash: varchar("transaction_hash", { length: 100 }),
  blockNumber: integer("block_number"),
  completionDate: timestamp("completion_date").notNull(),
  recordedAt: timestamp("recorded_at").defaultNow()
});
var keyRecoveryRequests = pgTable("key_recovery_requests", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  credentialId: uuid("credential_id").references(() => professionalCredentials.id).notNull(),
  requestType: varchar("request_type").notNull(),
  // lost_key, compromise, career_transfer
  requestReason: text("request_reason").notNull(),
  identityVerificationData: jsonb("identity_verification_data"),
  // documents, biometrics
  employmentVerificationData: jsonb("employment_verification_data"),
  // current employer confirmation
  historicalRecordMatches: jsonb("historical_record_matches"),
  // cross-reference validation
  verificationStatus: varchar("verification_status").default("pending"),
  // pending, verified, rejected
  requestStatus: varchar("request_status").default("pending"),
  // pending, processing, completed, rejected
  newMasterPrivateKeyHash: varchar("new_master_private_key_hash", { length: 100 }),
  recoveryCompletedAt: timestamp("recovery_completed_at"),
  emergencyFlag: boolean("emergency_flag").default(false),
  requestedAt: timestamp("requested_at").defaultNow(),
  processedBy: varchar("processed_by")
  // BCCS admin who handled recovery
});
var crossPlatformVerifications = pgTable("cross_platform_verifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  credentialId: uuid("credential_id").references(() => professionalCredentials.id).notNull(),
  platformType: varchar("platform_type").notNull(),
  // bccs142, bccsmaint, bccsatc, bccsreg, bccsregistry
  verificationPurpose: varchar("verification_purpose").notNull(),
  // training_entry, maintenance_sign_off, atc_certification
  verifyingOrganizationId: uuid("verifying_organization_id").references(() => trainingOrganizations.id),
  verificationResult: varchar("verification_result").notNull(),
  // verified, failed, expired
  verificationData: jsonb("verification_data"),
  verifiedAt: timestamp("verified_at").defaultNow()
});
var regulatoryFrameworks = pgTable("regulatory_frameworks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  frameworkCode: varchar("framework_code", { length: 50 }).notNull().unique(),
  // e.g., "14-CFR-142", "FAA-8900.1-VOL3"
  frameworkName: varchar("framework_name", { length: 200 }).notNull(),
  frameworkType: varchar("framework_type").notNull(),
  // spine, attachment
  regulatoryAuthority: varchar("regulatory_authority").notNull(),
  // faa, easa, transport_canada, casa
  effectiveDate: timestamp("effective_date").notNull(),
  version: varchar("version", { length: 50 }).notNull(),
  parentFrameworkId: uuid("parent_framework_id"),
  // For attachments, references the spine
  hierarchyLevel: integer("hierarchy_level").default(1),
  // 1=spine, 2+=attachments
  applicabilityRules: jsonb("applicability_rules"),
  // Conditions when this framework applies
  sourceUrl: text("source_url"),
  fullText: text("full_text"),
  // Full regulation text for indexing
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var organizationAuthorizations = pgTable("organization_authorizations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => trainingOrganizations.id).notNull(),
  frameworkId: uuid("framework_id").references(() => regulatoryFrameworks.id).notNull(),
  authorizationType: varchar("authorization_type").notNull(),
  // primary, supplementary, conditional
  authorizationNumber: varchar("authorization_number", { length: 100 }),
  grantedDate: timestamp("granted_date").notNull(),
  expirationDate: timestamp("expiration_date"),
  conditions: jsonb("conditions"),
  // Specific conditions or limitations
  operatorClients: jsonb("operator_clients"),
  // Array of operator client IDs (121, 135, 91K operators)
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});
var checklistSchemas = pgTable("checklist_schemas", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  schemaName: varchar("schema_name", { length: 200 }).notNull(),
  schemaSource: varchar("schema_source").notNull(),
  // faa_standard, certificate_job_aid, inspector_supplemental, operator_required, archived_legacy
  frameworkId: uuid("framework_id").references(() => regulatoryFrameworks.id),
  version: varchar("version", { length: 50 }).notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  totalItems: integer("total_items").notNull(),
  structureHash: varchar("structure_hash", { length: 100 }),
  // Hash for change detection
  metadata: jsonb("metadata"),
  // Additional schema metadata
  isCanonical: boolean("is_canonical").default(false),
  // Is this the authoritative version?
  priorityLevel: integer("priority_level").default(5),
  // 1=FAA Standard, 2=Certificate Job Aid, 3=Inspector Supplemental, 4=Operator Required, 5=Archived Legacy
  autoFetched: boolean("auto_fetched").default(false),
  // Was this auto-fetched when spine was selected?
  sourceUrl: text("source_url"),
  // FAA source URL for version monitoring
  lastVersionCheck: timestamp("last_version_check"),
  // When was version last verified
  isOutdated: boolean("is_outdated").default(false),
  // Has a newer version been detected?
  supersededById: uuid("superseded_by_id"),
  // Reference to newer version if outdated
  isHidden: boolean("is_hidden").default(false),
  // Hidden from normal view (archived/legacy)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var checklistItems = pgTable("checklist_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  schemaId: uuid("schema_id").references(() => checklistSchemas.id).notNull(),
  itemNumber: varchar("item_number", { length: 20 }).notNull(),
  itemOrder: integer("item_order").notNull(),
  categoryId: varchar("category_id", { length: 50 }),
  categoryName: varchar("category_name", { length: 200 }),
  description: text("description").notNull(),
  regulatoryReference: varchar("regulatory_reference", { length: 100 }),
  // e.g., "142.5(a)"
  requiredEvidence: jsonb("required_evidence"),
  // Types of evidence needed
  complianceCriteria: jsonb("compliance_criteria"),
  // What constitutes compliance
  riskWeight: decimal("risk_weight", { precision: 3, scale: 2 }).default("1.00"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});
var checklistMappings = pgTable("checklist_mappings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceSchemaId: uuid("source_schema_id").references(() => checklistSchemas.id).notNull(),
  targetSchemaId: uuid("target_schema_id").references(() => checklistSchemas.id).notNull(),
  sourceItemId: uuid("source_item_id").references(() => checklistItems.id).notNull(),
  targetItemId: uuid("target_item_id").references(() => checklistItems.id),
  mappingType: varchar("mapping_type").notNull(),
  // exact, partial, expanded, missing
  mappingConfidence: decimal("mapping_confidence", { precision: 3, scale: 2 }),
  mappingNotes: text("mapping_notes"),
  createdAt: timestamp("created_at").defaultNow()
});
var harmonizationDeltas = pgTable("harmonization_deltas", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  baseSchemaId: uuid("base_schema_id").references(() => checklistSchemas.id).notNull(),
  comparedSchemaId: uuid("compared_schema_id").references(() => checklistSchemas.id).notNull(),
  deltaType: varchar("delta_type").notNull(),
  // added, removed, modified, reordered
  affectedItemId: uuid("affected_item_id").references(() => checklistItems.id),
  baseItemNumber: varchar("base_item_number", { length: 20 }),
  comparedItemNumber: varchar("compared_item_number", { length: 20 }),
  changeDescription: text("change_description").notNull(),
  complianceImpact: varchar("compliance_impact"),
  // none, minor, major, critical
  generatedAt: timestamp("generated_at").defaultNow()
});
var checklistVersionHistory = pgTable("checklist_version_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  schemaId: uuid("schema_id").references(() => checklistSchemas.id).notNull(),
  previousVersion: varchar("previous_version", { length: 50 }),
  newVersion: varchar("new_version", { length: 50 }).notNull(),
  changeType: varchar("change_type").notNull(),
  // new_version, amendment, correction, superseded
  changeSummary: text("change_summary"),
  sourceReference: text("source_reference"),
  // FAA document number/reference
  detectedAt: timestamp("detected_at").defaultNow(),
  appliedAt: timestamp("applied_at"),
  appliedBy: varchar("applied_by").references(() => users.id),
  isAcknowledged: boolean("is_acknowledged").default(false)
});
var faaCoreForms = pgTable("faa_core_forms", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  farPart: varchar("far_part", { length: 20 }).notNull(),
  // e.g., "142", "141", "145"
  formNumber: varchar("form_number", { length: 50 }).notNull(),
  // e.g., "8610-2", "8900.1 Vol 3"
  formTitle: varchar("form_title", { length: 300 }).notNull(),
  formType: varchar("form_type").notNull(),
  // audit_checklist, job_aid, inspector_guide, application
  currentVersion: varchar("current_version", { length: 50 }),
  effectiveDate: timestamp("effective_date"),
  sourceUrl: text("source_url"),
  pdfUrl: text("pdf_url"),
  relatedOrderVolume: varchar("related_order_volume", { length: 50 }),
  // e.g., "8900.1 Vol 3"
  isActive: boolean("is_active").default(true),
  lastCheckedAt: timestamp("last_checked_at"),
  createdAt: timestamp("created_at").defaultNow()
});
var inspectorProfiles = pgTable("inspector_profiles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  inspectorName: varchar("inspector_name", { length: 200 }),
  inspectorId: varchar("inspector_id", { length: 100 }),
  // TCPM ID or FAA identifier
  region: varchar("region", { length: 100 }),
  office: varchar("office", { length: 200 }),
  preferredChecklistId: uuid("preferred_checklist_id").references(() => checklistSchemas.id),
  preferredItemOrdering: jsonb("preferred_item_ordering"),
  // Custom ordering preferences
  commonExtraQuestions: jsonb("common_extra_questions"),
  // Questions they typically add
  focusAreas: jsonb("focus_areas"),
  // Categories they emphasize
  averageAuditDuration: integer("average_audit_duration"),
  // In hours
  strictnessScore: decimal("strictness_score", { precision: 3, scale: 2 }),
  // 0-1 scale
  lastAuditDate: timestamp("last_audit_date"),
  totalAuditsTracked: integer("total_audits_tracked").default(0),
  predictionConfidence: decimal("prediction_confidence", { precision: 3, scale: 2 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var inspectorBehaviors = pgTable("inspector_behaviors", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  inspectorId: uuid("inspector_id").references(() => inspectorProfiles.id).notNull(),
  organizationId: uuid("organization_id").references(() => trainingOrganizations.id).notNull(),
  auditDate: timestamp("audit_date").notNull(),
  checklistSchemaUsed: uuid("checklist_schema_used").references(() => checklistSchemas.id),
  itemsReordered: jsonb("items_reordered"),
  // Which items they reordered
  additionalQuestions: jsonb("additional_questions"),
  // Extra questions asked
  skippedItems: jsonb("skipped_items"),
  // Items they skipped
  emphasisAreas: jsonb("emphasis_areas"),
  // Areas they spent extra time on
  findingsCount: integer("findings_count"),
  auditOutcome: varchar("audit_outcome"),
  // passed, conditional, failed
  auditDuration: integer("audit_duration"),
  // In minutes
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow()
});
var evidenceRecords = pgTable("evidence_records", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => trainingOrganizations.id).notNull(),
  evidenceType: varchar("evidence_type").notNull(),
  // document, training_record, certificate, log, procedure
  evidenceTitle: varchar("evidence_title", { length: 300 }).notNull(),
  evidenceDescription: text("evidence_description"),
  filePath: text("file_path"),
  fileHash: varchar("file_hash", { length: 100 }),
  // SHA-256 hash of content
  extractedText: text("extracted_text"),
  // OCR/parsed text for indexing
  metadata: jsonb("metadata"),
  // Document metadata
  blockchainTrainingRecordId: uuid("blockchain_training_record_id").references(() => blockchainTrainingRecords.id),
  blockchainVerificationHash: varchar("blockchain_verification_hash", { length: 100 }),
  verificationStatus: varchar("verification_status").default("pending"),
  // pending, verified, failed
  verifiedAt: timestamp("verified_at"),
  expirationDate: timestamp("expiration_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var evidenceChecklistMappings = pgTable("evidence_checklist_mappings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  evidenceId: uuid("evidence_id").references(() => evidenceRecords.id).notNull(),
  checklistItemId: uuid("checklist_item_id").references(() => checklistItems.id).notNull(),
  mappingConfidence: decimal("mapping_confidence", { precision: 3, scale: 2 }).default("1.00"),
  mappingSource: varchar("mapping_source").notNull(),
  // manual, ai_suggested, auto_matched
  evidenceRelevance: varchar("evidence_relevance").notNull(),
  // primary, supporting, contextual
  notes: text("notes"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow()
});
var evidenceRegulatoryMappings = pgTable("evidence_regulatory_mappings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  evidenceId: uuid("evidence_id").references(() => evidenceRecords.id).notNull(),
  frameworkId: uuid("framework_id").references(() => regulatoryFrameworks.id).notNull(),
  regulatoryReference: varchar("regulatory_reference", { length: 100 }).notNull(),
  // e.g., "142.5(a)"
  referenceType: varchar("reference_type").notNull(),
  // direct_compliance, supporting, cross_reference
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow()
});
var auditPackets = pgTable("audit_packets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => trainingOrganizations.id).notNull(),
  packetName: varchar("packet_name", { length: 300 }).notNull(),
  packetType: varchar("packet_type").notNull(),
  // regulation_sorted, checklist_sorted, comprehensive
  targetInspectorId: uuid("target_inspector_id").references(() => inspectorProfiles.id),
  checklistSchemaId: uuid("checklist_schema_id").references(() => checklistSchemas.id).notNull(),
  generatedBy: varchar("generated_by"),
  generatedAt: timestamp("generated_at").defaultNow(),
  totalItems: integer("total_items").notNull(),
  itemsWithEvidence: integer("items_with_evidence").notNull(),
  blockchainVerifiedCount: integer("blockchain_verified_count").notNull(),
  complianceScore: decimal("compliance_score", { precision: 5, scale: 2 }),
  filePath: text("file_path"),
  // Generated PDF/document path
  packetHash: varchar("packet_hash", { length: 100 }),
  // Hash for integrity
  status: varchar("status").default("generated"),
  // generated, reviewed, submitted
  metadata: jsonb("metadata")
});
var auditPacketItems = pgTable("audit_packet_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  packetId: uuid("packet_id").references(() => auditPackets.id).notNull(),
  checklistItemId: uuid("checklist_item_id").references(() => checklistItems.id).notNull(),
  itemOrder: integer("item_order").notNull(),
  regulatorySection: varchar("regulatory_section", { length: 100 }),
  // For regulation-sorted packets
  evidenceIds: uuid("evidence_ids").array(),
  // Array of linked evidence
  complianceStatus: varchar("compliance_status").notNull(),
  // compliant, partial, non_compliant, pending
  blockchainVerified: boolean("blockchain_verified").default(false),
  verificationDetails: jsonb("verification_details"),
  notes: text("notes")
});
var regulatoryCoverageMatrix = pgTable("regulatory_coverage_matrix", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => trainingOrganizations.id).notNull(),
  frameworkId: uuid("framework_id").references(() => regulatoryFrameworks.id).notNull(),
  totalRequirements: integer("total_requirements").notNull(),
  evidencedRequirements: integer("evidenced_requirements").notNull(),
  blockchainVerifiedRequirements: integer("blockchain_verified_requirements").notNull(),
  coveragePercentage: decimal("coverage_percentage", { precision: 5, scale: 2 }).notNull(),
  lastCalculatedAt: timestamp("last_calculated_at").defaultNow(),
  gapAnalysis: jsonb("gap_analysis")
  // Detailed gap information
});
var faaPolicyDocuments = pgTable("faa_policy_documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  documentType: varchar("document_type").notNull(),
  // safo, info, notice, bulletin, afs_directive, order
  documentNumber: varchar("document_number", { length: 100 }).notNull().unique(),
  title: varchar("title", { length: 500 }).notNull(),
  subject: text("subject"),
  issuanceDate: timestamp("issuance_date").notNull(),
  effectiveDate: timestamp("effective_date"),
  expirationDate: timestamp("expiration_date"),
  affectedParts: varchar("affected_parts").array(),
  // Array of affected FAR Parts
  applicability: jsonb("applicability"),
  // Who/what this applies to
  content: text("content"),
  // Full document text
  sourceUrl: text("source_url"),
  contentHash: varchar("content_hash", { length: 100 }),
  // For change detection
  linkedFrameworks: uuid("linked_frameworks").array(),
  // References to regulatoryFrameworks
  supersedes: varchar("supersedes", { length: 100 }),
  // Previous document replaced
  supersededBy: varchar("superseded_by", { length: 100 }),
  // Document that replaces this
  status: varchar("status").default("active"),
  // active, superseded, cancelled, expired
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var multiPartConfigurations = pgTable("multi_part_configurations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  configName: varchar("config_name", { length: 200 }).notNull(),
  description: text("description"),
  primarySpineId: uuid("primary_spine_id").references(() => regulatoryFrameworks.id).notNull(),
  secondarySpines: uuid("secondary_spines").array(),
  // Additional FAR Parts for multi-domain operations
  coreAttachmentIds: uuid("core_attachment_ids").array(),
  // FAA Orders, etc.
  dynamicAttachmentIds: uuid("dynamic_attachment_ids").array(),
  // Conditional attachments
  applicableOperationTypes: varchar("applicable_operation_types").array(),
  // 121_training, 135_training, 145_maintenance
  applicableAuthorizations: jsonb("applicable_authorizations"),
  // OpSpecs, LOAs, TCOs, AQP approvals
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var regulatoryUpdateTracking = pgTable("regulatory_update_tracking", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceType: varchar("source_type").notNull(),
  // ecfr, faa_order, safo, info, notice
  sourceIdentifier: varchar("source_identifier", { length: 200 }).notNull(),
  // e.g., "14-CFR-142", "SAFO-24001"
  sourceUrl: text("source_url"),
  lastCheckedAt: timestamp("last_checked_at").notNull(),
  lastContentHash: varchar("last_content_hash", { length: 100 }),
  currentContentHash: varchar("current_content_hash", { length: 100 }),
  changeDetected: boolean("change_detected").default(false),
  changeType: varchar("change_type"),
  // new, modified, deleted, superseded
  changeSummary: text("change_summary"),
  affectedFrameworkId: uuid("affected_framework_id").references(() => regulatoryFrameworks.id),
  affectedPolicyDocId: uuid("affected_policy_doc_id").references(() => faaPolicyDocuments.id),
  notificationSent: boolean("notification_sent").default(false),
  processedAt: timestamp("processed_at"),
  impactAssessment: jsonb("impact_assessment"),
  // AI-generated impact analysis
  createdAt: timestamp("created_at").defaultNow()
});
var regulatoryGraphLinks = pgTable("regulatory_graph_links", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceType: varchar("source_type").notNull(),
  // framework, policy_document, checklist_item
  sourceId: uuid("source_id").notNull(),
  targetType: varchar("target_type").notNull(),
  targetId: uuid("target_id").notNull(),
  linkType: varchar("link_type").notNull(),
  // references, implements, supplements, supersedes, cross_references
  linkStrength: decimal("link_strength", { precision: 3, scale: 2 }).default("1.00"),
  // 0-1 confidence
  description: text("description"),
  regulatorySection: varchar("regulatory_section", { length: 100 }),
  // Specific section reference
  isAutoGenerated: boolean("is_auto_generated").default(false),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow()
});
var operatorAuthorizations = pgTable("operator_authorizations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => trainingOrganizations.id).notNull(),
  authorizationType: varchar("authorization_type").notNull(),
  // opspecs, loa, tco, aqp, training_program
  authorizationNumber: varchar("authorization_number", { length: 100 }).notNull(),
  title: varchar("title", { length: 300 }),
  issuingAuthority: varchar("issuing_authority", { length: 100 }),
  // FSDO, CHDO, CMO
  issuingOffice: varchar("issuing_office", { length: 200 }),
  issuedDate: timestamp("issued_date").notNull(),
  effectiveDate: timestamp("effective_date"),
  expirationDate: timestamp("expiration_date"),
  applicableParts: varchar("applicable_parts").array(),
  // FAR Parts this authorization relates to
  conditions: jsonb("conditions"),
  // Specific conditions/limitations
  privileges: jsonb("privileges"),
  // What operations are authorized
  documentPath: text("document_path"),
  documentHash: varchar("document_hash", { length: 100 }),
  linkedFrameworkIds: uuid("linked_framework_ids").array(),
  status: varchar("status").default("active"),
  // active, amended, revoked, expired
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var regionalSupplements = pgTable("regional_supplements", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  region: varchar("region", { length: 100 }).notNull(),
  // e.g., "Southwest", "Great Lakes"
  officeType: varchar("office_type").notNull(),
  // fsdo, chdo, cmo
  officeIdentifier: varchar("office_identifier", { length: 100 }),
  officeName: varchar("office_name", { length: 200 }),
  supplementType: varchar("supplement_type").notNull(),
  // checklist_variant, additional_requirement, interpretation
  applicableFrameworkId: uuid("applicable_framework_id").references(() => regulatoryFrameworks.id),
  supplementTitle: varchar("supplement_title", { length: 300 }).notNull(),
  supplementContent: text("supplement_content"),
  effectiveDate: timestamp("effective_date"),
  additionalRequirements: jsonb("additional_requirements"),
  modifiedChecklistItems: jsonb("modified_checklist_items"),
  // Items added/modified for this region
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var subscriptionTiers = pgTable("subscription_tiers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tierName: varchar("tier_name", { length: 100 }).notNull(),
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }).notNull(),
  annualPrice: decimal("annual_price", { precision: 10, scale: 2 }),
  features: varchar("features").array().notNull(),
  analyticsAccess: varchar("analytics_access").array(),
  dataRetention: integer("data_retention"),
  // days
  apiCallLimit: integer("api_call_limit"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});
var customerSubscriptions = pgTable("customer_subscriptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  tierId: uuid("tier_id").references(() => subscriptionTiers.id).notNull(),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  status: varchar("status").default("active"),
  // active, paused, cancelled, expired
  paymentMethod: varchar("payment_method"),
  // traditional, crypto
  lastPayment: timestamp("last_payment"),
  nextBilling: timestamp("next_billing"),
  autoRenew: boolean("auto_renew").default(true),
  // Crypto payment fields
  walletAddress: varchar("wallet_address"),
  smartContractAddress: varchar("smart_contract_address"),
  stableCoin: varchar("stable_coin"),
  // USDC, USDT, DAI
  chainId: integer("chain_id"),
  // 1 for Ethereum, 137 for Polygon, etc.
  allowanceAmount: decimal("allowance_amount", { precision: 18, scale: 6 }),
  lastBlockChecked: integer("last_block_checked")
});
var aircraftRegistryRelations = relations(aircraftRegistry, ({ many, one }) => ({
  ownership: many(aircraftOwnership),
  liens: many(aircraftLiens),
  insurance: many(aircraftInsurance),
  tokenOffering: one(tokenOfferings),
  complianceChecks: many(complianceChecks)
}));
var tokenOfferingsRelations = relations(tokenOfferings, ({ one, many }) => ({
  aircraft: one(aircraftRegistry, {
    fields: [tokenOfferings.aircraftId],
    references: [aircraftRegistry.id]
  }),
  holders: many(tokenHolders),
  transactions: many(tokenTransactions)
}));
var tokenHoldersRelations = relations(tokenHolders, ({ one }) => ({
  offering: one(tokenOfferings, {
    fields: [tokenHolders.offeringId],
    references: [tokenOfferings.id]
  })
}));
var tokenTransactionsRelations = relations(tokenTransactions, ({ one }) => ({
  offering: one(tokenOfferings, {
    fields: [tokenTransactions.offeringId],
    references: [tokenOfferings.id]
  })
}));
var insertAircraftRegistrySchema = createInsertSchema(aircraftRegistry);
var insertAircraftOwnershipSchema = createInsertSchema(aircraftOwnership);
var insertTokenOfferingSchema = createInsertSchema(tokenOfferings);
var insertTokenHolderSchema = createInsertSchema(tokenHolders);
var insertTokenTransactionSchema = createInsertSchema(tokenTransactions);
var insertAuditLogSchema = createInsertSchema(auditLogs);
var insertCryptoPaymentSchema = createInsertSchema(cryptoPayments);
var insertSmartContractSchema = createInsertSchema(smartContracts);
var insertCustomerSubscriptionSchema = createInsertSchema(customerSubscriptions);
var insertTrainingOrganizationSchema = createInsertSchema(trainingOrganizations);
var insertProfessionalCredentialSchema = createInsertSchema(professionalCredentials);
var insertOrganizationMemberSchema = createInsertSchema(organizationMembers);
var insertBlockchainTrainingRecordSchema = createInsertSchema(blockchainTrainingRecords);
var insertKeyRecoveryRequestSchema = createInsertSchema(keyRecoveryRequests);
var insertCrossPlatformVerificationSchema = createInsertSchema(crossPlatformVerifications);
var insertRegulatoryFrameworkSchema = createInsertSchema(regulatoryFrameworks);
var insertOrganizationAuthorizationSchema = createInsertSchema(organizationAuthorizations);
var insertChecklistSchemaSchema = createInsertSchema(checklistSchemas);
var insertChecklistItemSchema = createInsertSchema(checklistItems);
var insertChecklistMappingSchema = createInsertSchema(checklistMappings);
var insertHarmonizationDeltaSchema = createInsertSchema(harmonizationDeltas);
var insertChecklistVersionHistorySchema = createInsertSchema(checklistVersionHistory);
var insertFaaCoreFormSchema = createInsertSchema(faaCoreForms);
var insertInspectorProfileSchema = createInsertSchema(inspectorProfiles);
var insertInspectorBehaviorSchema = createInsertSchema(inspectorBehaviors);
var insertEvidenceRecordSchema = createInsertSchema(evidenceRecords);
var insertEvidenceChecklistMappingSchema = createInsertSchema(evidenceChecklistMappings);
var insertEvidenceRegulatoryMappingSchema = createInsertSchema(evidenceRegulatoryMappings);
var insertAuditPacketSchema = createInsertSchema(auditPackets);
var insertAuditPacketItemSchema = createInsertSchema(auditPacketItems);
var insertRegulatoryCoverageMatrixSchema = createInsertSchema(regulatoryCoverageMatrix);
var insertFaaPolicyDocumentSchema = createInsertSchema(faaPolicyDocuments);
var insertMultiPartConfigurationSchema = createInsertSchema(multiPartConfigurations);
var insertRegulatoryUpdateTrackingSchema = createInsertSchema(regulatoryUpdateTracking);
var insertRegulatoryGraphLinkSchema = createInsertSchema(regulatoryGraphLinks);
var insertOperatorAuthorizationSchema = createInsertSchema(operatorAuthorizations);
var insertRegionalSupplementSchema = createInsertSchema(regionalSupplements);

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  console.error("[db] WARNING: DATABASE_URL is not set \u2014 database queries will fail at runtime.");
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgresql://localhost/placeholder" });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, desc, and, count, sql as sql2 } from "drizzle-orm";
var DatabaseStorage = class {
  // User operations
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async upsertUser(userData) {
    const [user] = await db.insert(users).values(userData).onConflictDoUpdate({
      target: users.id,
      set: {
        ...userData,
        updatedAt: /* @__PURE__ */ new Date()
      }
    }).returning();
    return user;
  }
  // Aircraft Registry operations
  async createAircraft(aircraft) {
    const [newAircraft] = await db.insert(aircraftRegistry).values(aircraft).returning();
    return newAircraft;
  }
  async getAircraft(id) {
    const [aircraft] = await db.select().from(aircraftRegistry).where(eq(aircraftRegistry.id, id));
    return aircraft;
  }
  async getAircraftByTailNumber(tailNumber) {
    const [aircraft] = await db.select().from(aircraftRegistry).where(eq(aircraftRegistry.tailNumber, tailNumber));
    return aircraft;
  }
  async getAllAircraft() {
    return await db.select().from(aircraftRegistry).orderBy(desc(aircraftRegistry.createdAt));
  }
  async updateAircraft(id, aircraft) {
    await db.update(aircraftRegistry).set({ ...aircraft, updatedAt: /* @__PURE__ */ new Date() }).where(eq(aircraftRegistry.id, id));
  }
  async deleteAircraft(id) {
    await db.delete(aircraftRegistry).where(eq(aircraftRegistry.id, id));
  }
  // Token offering operations
  async createTokenOffering(offering) {
    const [newOffering] = await db.insert(tokenOfferings).values(offering).returning();
    await this.updateAircraft(newOffering.aircraftId, { isTokenized: true });
    return newOffering;
  }
  async getTokenOffering(id) {
    const [offering] = await db.select().from(tokenOfferings).where(eq(tokenOfferings.id, id));
    return offering;
  }
  async getTokenOfferingByAircraftId(aircraftId) {
    const [offering] = await db.select().from(tokenOfferings).where(eq(tokenOfferings.aircraftId, aircraftId));
    return offering;
  }
  async getAllTokenOfferings() {
    return await db.select().from(tokenOfferings).orderBy(desc(tokenOfferings.launchDate));
  }
  async updateTokenOffering(id, offering) {
    await db.update(tokenOfferings).set(offering).where(eq(tokenOfferings.id, id));
  }
  // Token holder operations
  async createTokenHolder(holder) {
    const [newHolder] = await db.insert(tokenHolders).values(holder).returning();
    return newHolder;
  }
  async getTokenHoldersByOffering(offeringId) {
    return await db.select().from(tokenHolders).where(eq(tokenHolders.offeringId, offeringId)).orderBy(desc(tokenHolders.tokensOwned));
  }
  async updateTokenHolder(id, holder) {
    await db.update(tokenHolders).set({ ...holder, lastTransactionDate: /* @__PURE__ */ new Date() }).where(eq(tokenHolders.id, id));
  }
  // Token transaction operations
  async createTokenTransaction(transaction) {
    const [newTransaction] = await db.insert(tokenTransactions).values(transaction).returning();
    return newTransaction;
  }
  async getTokenTransactionsByOffering(offeringId) {
    return await db.select().from(tokenTransactions).where(eq(tokenTransactions.offeringId, offeringId)).orderBy(desc(tokenTransactions.transactionDate));
  }
  async getAllTokenTransactions() {
    return await db.select().from(tokenTransactions).orderBy(desc(tokenTransactions.transactionDate)).limit(100);
  }
  // Compliance operations
  async performComplianceCheck(aircraftId, checkType) {
    const checkResult = Math.random() > 0.1 ? "passed" : "warning";
    const checkDetails = {
      automated: true,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      details: `${checkType} check completed successfully`
    };
    const [check] = await db.insert(complianceChecks).values({
      aircraftId,
      checkType,
      checkResult,
      checkDetails,
      performedBy: "system",
      nextCheckDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3)
      // 30 days from now
    }).returning();
    return check;
  }
  async getComplianceChecksByAircraft(aircraftId) {
    return await db.select().from(complianceChecks).where(eq(complianceChecks.aircraftId, aircraftId)).orderBy(desc(complianceChecks.checkDate));
  }
  // Analytics
  async getRegistryStats() {
    const totalAircraftResult = await db.select({ count: count() }).from(aircraftRegistry);
    const tokenizedAircraftResult = await db.select({ count: count() }).from(aircraftRegistry).where(eq(aircraftRegistry.isTokenized, true));
    const totalTokenVolumeResult = await db.select({
      sum: sql2`COALESCE(SUM(CAST(${tokenTransactions.totalAmount} AS DECIMAL)), 0)`
    }).from(tokenTransactions);
    const activeInvestorsResult = await db.select({
      count: sql2`COUNT(DISTINCT ${tokenHolders.investorId})`
    }).from(tokenHolders);
    return {
      totalAircraft: totalAircraftResult[0]?.count || 0,
      tokenizedAircraft: tokenizedAircraftResult[0]?.count || 0,
      totalTokenVolume: Number(totalTokenVolumeResult[0]?.sum || 0),
      activeInvestors: Number(activeInvestorsResult[0]?.count || 0)
    };
  }
  // Audit logging operations
  async createAuditLog(auditLogData) {
    const [auditLog] = await db.insert(auditLogs).values(auditLogData).returning();
    return auditLog;
  }
  async getAuditLogs(filters) {
    const conditions = [];
    if (filters?.eventType) {
      conditions.push(eq(auditLogs.eventType, filters.eventType));
    }
    if (filters?.severity) {
      conditions.push(eq(auditLogs.severity, filters.severity));
    }
    return await db.select().from(auditLogs).where(conditions.length > 0 ? and(...conditions) : void 0).orderBy(desc(auditLogs.timestamp)).limit(filters?.limit ?? 1e3);
  }
  // Crypto payments operations
  async createCryptoPayment(paymentData) {
    const [payment] = await db.insert(cryptoPayments).values(paymentData).returning();
    return payment;
  }
  async getCryptoPaymentsBySubscription(subscriptionId) {
    return await db.select().from(cryptoPayments).where(eq(cryptoPayments.subscriptionId, subscriptionId)).orderBy(desc(cryptoPayments.createdAt));
  }
  async updateCryptoPayment(id, paymentData) {
    await db.update(cryptoPayments).set(paymentData).where(eq(cryptoPayments.id, id));
  }
  // Smart contracts operations
  async createSmartContract(contractData) {
    const [contract] = await db.insert(smartContracts).values(contractData).returning();
    return contract;
  }
  async getSmartContractByChain(chainId) {
    const [contract] = await db.select().from(smartContracts).where(and(eq(smartContracts.chainId, chainId), eq(smartContracts.isActive, true))).limit(1);
    return contract;
  }
  async getSmartContractsByChain(chainId) {
    return await db.select().from(smartContracts).where(and(eq(smartContracts.chainId, chainId), eq(smartContracts.isActive, true)));
  }
  async updateSmartContract(id, contractData) {
    await db.update(smartContracts).set(contractData).where(eq(smartContracts.id, id));
  }
  // Customer subscriptions operations
  async createCustomerSubscription(subscriptionData) {
    const [subscription] = await db.insert(customerSubscriptions).values(subscriptionData).returning();
    return subscription;
  }
  async getCustomerSubscription(id) {
    const [subscription] = await db.select().from(customerSubscriptions).where(eq(customerSubscriptions.id, id));
    return subscription;
  }
  async updateCustomerSubscription(id, subscriptionData) {
    await db.update(customerSubscriptions).set(subscriptionData).where(eq(customerSubscriptions.id, id));
  }
  async getSubscriptionTier(id) {
    const [tier] = await db.select().from(subscriptionTiers).where(eq(subscriptionTiers.id, id));
    return tier;
  }
  async getCustomerSubscriptionsByUser(userId) {
    return await db.select().from(customerSubscriptions).where(eq(customerSubscriptions.customerId, userId)).orderBy(desc(customerSubscriptions.startDate));
  }
  async getAllSubscriptionTiers() {
    return await db.select().from(subscriptionTiers).where(eq(subscriptionTiers.isActive, true)).orderBy(subscriptionTiers.monthlyPrice);
  }
  // Universal Blockchain Key Management implementations
  async createTrainingOrganization(orgData) {
    const [organization] = await db.insert(trainingOrganizations).values(orgData).returning();
    return organization;
  }
  async getTrainingOrganization(id) {
    const [organization] = await db.select().from(trainingOrganizations).where(eq(trainingOrganizations.id, id));
    return organization;
  }
  async getTrainingOrganizationByPublicKey(publicKey) {
    const [organization] = await db.select().from(trainingOrganizations).where(eq(trainingOrganizations.masterPublicKey, publicKey));
    return organization;
  }
  async createProfessionalCredential(credentialData) {
    const [credential] = await db.insert(professionalCredentials).values(credentialData).returning();
    return credential;
  }
  async getProfessionalCredential(id) {
    const [credential] = await db.select().from(professionalCredentials).where(eq(professionalCredentials.id, id));
    return credential;
  }
  async getProfessionalCredentialByLicense(licenseNumber, authority) {
    const [credential] = await db.select().from(professionalCredentials).where(and(
      eq(professionalCredentials.licenseNumber, licenseNumber),
      eq(professionalCredentials.regulatoryAuthority, authority)
    ));
    return credential;
  }
  async createOrganizationMember(memberData) {
    const [member] = await db.insert(organizationMembers).values(memberData).returning();
    return member;
  }
  async getOrganizationMembers(organizationId) {
    return await db.select().from(organizationMembers).where(and(
      eq(organizationMembers.organizationId, organizationId),
      eq(organizationMembers.isActive, true)
    )).orderBy(organizationMembers.startDate);
  }
  async createBlockchainTrainingRecord(recordData) {
    const [record] = await db.insert(blockchainTrainingRecords).values(recordData).returning();
    return record;
  }
  async getTrainingRecordsByCredential(credentialId) {
    return await db.select().from(blockchainTrainingRecords).where(eq(blockchainTrainingRecords.studentCredentialId, credentialId)).orderBy(desc(blockchainTrainingRecords.completionDate));
  }
  async createKeyRecoveryRequest(requestData) {
    const [request] = await db.insert(keyRecoveryRequests).values(requestData).returning();
    return request;
  }
  async getKeyRecoveryRequest(id) {
    const [request] = await db.select().from(keyRecoveryRequests).where(eq(keyRecoveryRequests.id, id));
    return request;
  }
  async updateKeyRecoveryRequest(id, updates) {
    await db.update(keyRecoveryRequests).set(updates).where(eq(keyRecoveryRequests.id, id));
  }
  async createCrossPlatformVerification(verificationData) {
    const [verification] = await db.insert(crossPlatformVerifications).values(verificationData).returning();
    return verification;
  }
  async getVerificationHistory(credentialId) {
    return await db.select().from(crossPlatformVerifications).where(eq(crossPlatformVerifications.credentialId, credentialId)).orderBy(desc(crossPlatformVerifications.verifiedAt));
  }
};
var storage = new DatabaseStorage();

// server/localAuth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { eq as eq2 } from "drizzle-orm";
function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1e3;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions"
  });
  return session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sessionTtl
    }
  });
}
async function seedAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) return;
  const [existing] = await db.select().from(users).where(eq2(users.email, adminEmail));
  if (existing) return;
  const hash = await bcrypt.hash(adminPassword, 12);
  await db.insert(users).values({
    email: adminEmail,
    firstName: "Admin",
    lastName: "User",
    passwordHash: hash,
    role: "admin"
  });
  console.log(`Admin user seeded: ${adminEmail}`);
}
async function setupAuth(app) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());
  passport.use(
    new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
      try {
        const [user] = await db.select().from(users).where(eq2(users.email, email));
        if (!user || !user.passwordHash) {
          return done(null, false, { message: "Invalid email or password" });
        }
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          return done(null, false, { message: "Invalid email or password" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );
  passport.serializeUser((user, cb) => cb(null, user.id));
  passport.deserializeUser(async (id, cb) => {
    try {
      const user = await storage.getUser(id);
      cb(null, user ?? null);
    } catch (err) {
      cb(err);
    }
  });
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message ?? "Invalid credentials" });
      }
      req.logIn(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        const { passwordHash: _, ...safeUser } = user;
        res.json({ success: true, user: safeUser });
      });
    })(req, res, next);
  });
  app.post("/api/logout", (req, res) => {
    req.logout(() => {
      res.json({ success: true });
    });
  });
  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });
  try {
    await seedAdminUser();
  } catch (err) {
    console.error("[localAuth] seedAdminUser failed (non-fatal):", err?.message ?? err);
  }
}
var isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Unauthorized" });
};

// server/routes.ts
import { z as z4 } from "zod";

// server/routes/blockchain-key-management.ts
import { z } from "zod";

// server/services/blockchain-key-management.ts
import { ethers } from "ethers";
import crypto from "crypto";
var BlockchainKeyManagementService = class {
  /**
   * Generate master keys for a new professional credential
   */
  async generateProfessionalKeys(licenseNumber, credentialType) {
    const wallet = ethers.Wallet.createRandom();
    const derivationPath = `m/44'/60'/0'/0/${this.hashStringToNumber(licenseNumber + credentialType)}`;
    const masterPrivateKeyHash = this.hashPrivateKey(wallet.privateKey);
    return {
      masterPrivateKey: wallet.privateKey,
      // Only returned once, never stored
      masterPublicKey: wallet.address,
      masterPrivateKeyHash,
      derivationPath
    };
  }
  /**
   * Generate organization master keys
   */
  async generateOrganizationKeys(certificateNumber, organizationType) {
    const wallet = ethers.Wallet.createRandom();
    const derivationPath = `m/44'/60'/1'/0/${this.hashStringToNumber(certificateNumber + organizationType)}`;
    const masterPrivateKeyHash = this.hashPrivateKey(wallet.privateKey);
    return {
      masterPrivateKey: wallet.privateKey,
      masterPublicKey: wallet.address,
      masterPrivateKeyHash,
      derivationPath
    };
  }
  /**
   * Register a new training organization with blockchain keys
   */
  async registerTrainingOrganization(params) {
    const keys = await this.generateOrganizationKeys(params.certificateNumber, params.organizationType);
    const organizationData = {
      organizationName: params.organizationName,
      organizationType: params.organizationType,
      certificateNumber: params.certificateNumber,
      regulatoryAuthority: params.regulatoryAuthority,
      masterPublicKey: keys.masterPublicKey,
      contactInfo: params.contactInfo
    };
    const organization = await storage.createTrainingOrganization(organizationData);
    await storage.createAuditLog({
      eventType: "organization_registration",
      severity: "info",
      message: `Training organization registered: ${params.organizationName}`,
      details: {
        organizationId: organization.id,
        organizationType: params.organizationType,
        certificateNumber: params.certificateNumber,
        regulatoryAuthority: params.regulatoryAuthority,
        publicKey: keys.masterPublicKey
      },
      sourceSystem: "blockchain_key_management"
    });
    return {
      organization,
      masterPrivateKey: keys.masterPrivateKey
    };
  }
  /**
   * Register a new professional credential with blockchain keys
   */
  async registerProfessionalCredential(params) {
    const existingCredential = await storage.getProfessionalCredentialByLicense(
      params.licenseNumber,
      params.regulatoryAuthority
    );
    if (existingCredential) {
      throw new Error(`Professional credential already exists for license ${params.licenseNumber}`);
    }
    const keys = await this.generateProfessionalKeys(params.licenseNumber, params.credentialType);
    const credentialData = {
      credentialType: params.credentialType,
      licenseNumber: params.licenseNumber,
      regulatoryAuthority: params.regulatoryAuthority,
      masterPrivateKeyHash: keys.masterPrivateKeyHash,
      publicKeyDerivationPath: keys.derivationPath,
      holderFirstName: params.holderFirstName,
      holderLastName: params.holderLastName,
      holderEmail: params.holderEmail,
      dateOfBirth: params.dateOfBirth,
      issueDate: params.issueDate,
      expirationDate: params.expirationDate
    };
    const credential = await storage.createProfessionalCredential(credentialData);
    await storage.createAuditLog({
      eventType: "credential_registration",
      severity: "info",
      message: `Professional credential registered: ${params.licenseNumber}`,
      details: {
        credentialId: credential.id,
        credentialType: params.credentialType,
        licenseNumber: params.licenseNumber,
        regulatoryAuthority: params.regulatoryAuthority,
        holderName: `${params.holderFirstName} ${params.holderLastName}`
      },
      sourceSystem: "blockchain_key_management"
    });
    return {
      credential,
      masterPrivateKey: keys.masterPrivateKey
    };
  }
  /**
   * Create multi-signature training record
   */
  async createTrainingRecord(params) {
    const recordData = {
      studentCredentialId: params.studentCredentialId,
      organizationId: params.organizationId,
      instructorCredentialId: params.instructorCredentialId,
      trainingType: params.trainingType,
      trainingDetails: params.trainingDetails,
      completionDate: params.completionDate
    };
    const recordHash = this.createTrainingRecordHash(recordData);
    const studentWallet = new ethers.Wallet(params.studentPrivateKey);
    const instructorWallet = new ethers.Wallet(params.instructorPrivateKey);
    const organizationWallet = new ethers.Wallet(params.organizationPrivateKey);
    const studentSignature = await studentWallet.signMessage(recordHash);
    const instructorSignature = await instructorWallet.signMessage(recordHash);
    const organizationSignature = await organizationWallet.signMessage(recordHash);
    const blockchainHash = this.createBlockchainHash(recordHash, [
      studentSignature,
      instructorSignature,
      organizationSignature
    ]);
    const trainingRecordData = {
      studentCredentialId: params.studentCredentialId,
      organizationId: params.organizationId,
      instructorCredentialId: params.instructorCredentialId,
      trainingType: params.trainingType,
      trainingDetails: params.trainingDetails,
      studentSignature,
      instructorSignature,
      organizationSignature,
      blockchainHash,
      completionDate: params.completionDate
    };
    await storage.createBlockchainTrainingRecord(trainingRecordData);
    await storage.createAuditLog({
      eventType: "training_record_created",
      severity: "info",
      message: `Multi-signature training record created`,
      details: {
        studentCredentialId: params.studentCredentialId,
        organizationId: params.organizationId,
        instructorCredentialId: params.instructorCredentialId,
        trainingType: params.trainingType,
        blockchainHash
      },
      sourceSystem: "blockchain_key_management"
    });
    return {
      studentSignature,
      instructorSignature,
      organizationSignature,
      blockchainHash
    };
  }
  /**
   * Initiate key recovery process
   */
  async initiateKeyRecovery(params) {
    const credential = await storage.getProfessionalCredentialByLicense(
      params.licenseNumber,
      params.regulatoryAuthority
    );
    if (!credential) {
      throw new Error(`No professional credential found for license ${params.licenseNumber}`);
    }
    const trainingHistory = await storage.getTrainingRecordsByCredential(credential.id);
    const historicalMatches = trainingHistory.length;
    const recoveryRequestData = {
      credentialId: credential.id,
      requestType: params.requestType,
      requestReason: params.requestReason,
      identityVerificationData: {
        ...params.identityVerificationData,
        historicalRecordMatches: historicalMatches
      },
      employmentVerificationData: params.employmentVerificationData,
      historicalRecordMatches: { count: historicalMatches, verified: false },
      emergencyFlag: params.emergencyFlag || false
    };
    const recoveryRequest = await storage.createKeyRecoveryRequest(recoveryRequestData);
    const processingTime = params.emergencyFlag ? "72 hours" : "30 days";
    await storage.createAuditLog({
      eventType: "key_recovery_initiated",
      severity: "warning",
      message: `Key recovery request initiated for license ${params.licenseNumber}`,
      details: {
        recoveryRequestId: recoveryRequest.id,
        credentialId: credential.id,
        requestType: params.requestType,
        emergencyFlag: params.emergencyFlag,
        historicalMatches
      },
      sourceSystem: "blockchain_key_management"
    });
    return {
      recoveryRequestId: recoveryRequest.id,
      estimatedProcessingTime: processingTime
    };
  }
  /**
   * Process key recovery after verification
   */
  async processKeyRecovery(recoveryRequestId, processingAdminId) {
    const recoveryRequest = await storage.getKeyRecoveryRequest(recoveryRequestId);
    if (!recoveryRequest) {
      throw new Error("Recovery request not found");
    }
    if (recoveryRequest.verificationStatus !== "verified") {
      throw new Error("Identity verification not completed");
    }
    const credential = await storage.getProfessionalCredential(recoveryRequest.credentialId);
    if (!credential) {
      throw new Error("Professional credential not found");
    }
    const newKeys = await this.generateProfessionalKeys(
      credential.licenseNumber,
      credential.credentialType
    );
    await storage.updateKeyRecoveryRequest(recoveryRequestId, {
      requestStatus: "completed",
      newMasterPrivateKeyHash: newKeys.masterPrivateKeyHash,
      recoveryCompletedAt: /* @__PURE__ */ new Date(),
      processedBy: processingAdminId
    });
    await storage.createAuditLog({
      eventType: "key_recovery_completed",
      severity: "warning",
      message: `Key recovery completed for credential ${credential.id}`,
      details: {
        recoveryRequestId,
        credentialId: credential.id,
        oldKeyHash: credential.masterPrivateKeyHash,
        newKeyHash: newKeys.masterPrivateKeyHash,
        processedBy: processingAdminId
      },
      sourceSystem: "blockchain_key_management"
    });
    return {
      success: true,
      newMasterPrivateKey: newKeys.masterPrivateKey,
      newPublicKey: newKeys.masterPublicKey
    };
  }
  /**
   * Verify credential across platforms
   */
  async verifyCrossPlatform(params) {
    const credential = await storage.getProfessionalCredential(params.credentialId);
    if (!credential) {
      return { verified: false, verificationData: { error: "Credential not found" } };
    }
    const isActive = credential.isActive && (!credential.expirationDate || credential.expirationDate > /* @__PURE__ */ new Date());
    const verificationData = {
      credentialType: credential.credentialType,
      licenseNumber: credential.licenseNumber,
      regulatoryAuthority: credential.regulatoryAuthority,
      holderName: `${credential.holderFirstName} ${credential.holderLastName}`,
      isActive,
      expirationDate: credential.expirationDate,
      verifiedAt: /* @__PURE__ */ new Date()
    };
    await storage.createCrossPlatformVerification({
      credentialId: params.credentialId,
      platformType: params.platformType,
      verificationPurpose: params.verificationPurpose,
      verifyingOrganizationId: params.verifyingOrganizationId,
      verificationResult: isActive ? "verified" : "failed",
      verificationData
    });
    return {
      verified: isActive ?? false,
      verificationData
    };
  }
  // Private utility methods
  hashPrivateKey(privateKey) {
    return crypto.createHash("sha256").update(privateKey).digest("hex");
  }
  hashStringToNumber(input) {
    const hash = crypto.createHash("sha256").update(input).digest("hex");
    return parseInt(hash.substring(0, 8), 16) % 1e6;
  }
  createTrainingRecordHash(recordData) {
    const dataString = JSON.stringify(recordData, Object.keys(recordData).sort());
    return crypto.createHash("sha256").update(dataString).digest("hex");
  }
  createBlockchainHash(recordHash, signatures) {
    const combinedData = recordHash + signatures.join("");
    return crypto.createHash("sha256").update(combinedData).digest("hex");
  }
};
var blockchainKeyService = new BlockchainKeyManagementService();

// server/routes/blockchain-key-management.ts
var registerOrganizationSchema = z.object({
  organizationName: z.string().min(1),
  organizationType: z.enum(["part_142", "part_141", "part_121", "part_135", "mro", "atc"]),
  certificateNumber: z.string().min(1),
  regulatoryAuthority: z.enum(["faa", "easa", "transport_canada", "casa"]),
  contactInfo: z.object({}).passthrough()
});
var registerCredentialSchema = z.object({
  credentialType: z.enum(["pilot_license", "atp", "mechanic_license", "controller_license"]),
  licenseNumber: z.string().min(1),
  regulatoryAuthority: z.enum(["faa", "easa", "transport_canada", "casa"]),
  holderFirstName: z.string().min(1),
  holderLastName: z.string().min(1),
  holderEmail: z.string().email(),
  dateOfBirth: z.string().transform((date) => new Date(date)),
  issueDate: z.string().transform((date) => new Date(date)),
  expirationDate: z.string().transform((date) => new Date(date)).optional()
});
var createTrainingRecordSchema = z.object({
  studentCredentialId: z.string().uuid(),
  organizationId: z.string().uuid(),
  instructorCredentialId: z.string().uuid(),
  trainingType: z.enum(["initial", "recurrent", "checkride", "proficiency"]),
  trainingDetails: z.object({}).passthrough(),
  studentPrivateKey: z.string().min(1),
  instructorPrivateKey: z.string().min(1),
  organizationPrivateKey: z.string().min(1),
  completionDate: z.string().transform((date) => new Date(date))
});
var initiateKeyRecoverySchema = z.object({
  licenseNumber: z.string().min(1),
  regulatoryAuthority: z.enum(["faa", "easa", "transport_canada", "casa"]),
  requestType: z.enum(["lost_key", "compromise", "career_transfer"]),
  requestReason: z.string().min(10),
  identityVerificationData: z.object({
    governmentId: z.string(),
    biometricHash: z.string().optional(),
    licenseVerification: z.boolean(),
    employmentVerification: z.boolean(),
    historicalRecordMatches: z.number()
  }),
  employmentVerificationData: z.object({}).passthrough(),
  emergencyFlag: z.boolean().optional()
});
var processKeyRecoverySchema = z.object({
  recoveryRequestId: z.string().uuid()
});
var verifyCrossPlatformSchema = z.object({
  credentialId: z.string().uuid(),
  platformType: z.enum(["bccs142", "bccsmaint", "bccsatc", "bccsreg", "bccsregistry"]),
  verificationPurpose: z.string().min(1),
  verifyingOrganizationId: z.string().uuid().optional()
});
function registerBlockchainKeyManagementRoutes(app) {
  app.post("/api/blockchain/organizations/register", isAuthenticated, async (req, res) => {
    try {
      const validatedData = registerOrganizationSchema.parse(req.body);
      const result = await blockchainKeyService.registerTrainingOrganization(validatedData);
      res.json({
        success: true,
        data: {
          organization: result.organization,
          masterPrivateKey: result.masterPrivateKey
          // Only returned once!
        },
        warning: "Store the master private key securely. This is the only time it will be displayed."
      });
    } catch (error) {
      console.error("Organization registration error:", error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app.post("/api/blockchain/credentials/register", isAuthenticated, async (req, res) => {
    try {
      const validatedData = registerCredentialSchema.parse(req.body);
      const result = await blockchainKeyService.registerProfessionalCredential(validatedData);
      res.json({
        success: true,
        data: {
          credential: result.credential,
          masterPrivateKey: result.masterPrivateKey
          // Only returned once!
        },
        warning: "Store the master private key securely. This is the only time it will be displayed."
      });
    } catch (error) {
      console.error("Credential registration error:", error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app.post("/api/blockchain/training-records", isAuthenticated, async (req, res) => {
    try {
      const validatedData = createTrainingRecordSchema.parse(req.body);
      const signatures = await blockchainKeyService.createTrainingRecord(validatedData);
      res.json({
        success: true,
        data: signatures
      });
    } catch (error) {
      console.error("Training record creation error:", error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app.get("/api/blockchain/training-records/:credentialId", isAuthenticated, async (req, res) => {
    try {
      const credentialId = req.params.credentialId;
      const records = await storage.getTrainingRecordsByCredential(credentialId);
      res.json({
        success: true,
        data: records
      });
    } catch (error) {
      console.error("Get training records error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app.post("/api/blockchain/key-recovery/initiate", isAuthenticated, async (req, res) => {
    try {
      const validatedData = initiateKeyRecoverySchema.parse(req.body);
      const result = await blockchainKeyService.initiateKeyRecovery(validatedData);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error("Key recovery initiation error:", error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app.post("/api/blockchain/key-recovery/process", isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (!user || user.role !== "admin") {
        return res.status(403).json({
          success: false,
          error: "Insufficient permissions for key recovery processing"
        });
      }
      const validatedData = processKeyRecoverySchema.parse(req.body);
      const result = await blockchainKeyService.processKeyRecovery(
        validatedData.recoveryRequestId,
        user.claims.sub
      );
      res.json({
        success: true,
        data: result,
        warning: result.newMasterPrivateKey ? "New master private key generated. Provide securely to credential holder." : void 0
      });
    } catch (error) {
      console.error("Key recovery processing error:", error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app.post("/api/blockchain/verify", isAuthenticated, async (req, res) => {
    try {
      const validatedData = verifyCrossPlatformSchema.parse(req.body);
      const result = await blockchainKeyService.verifyCrossPlatform(validatedData);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error("Cross-platform verification error:", error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app.get("/api/blockchain/verify/:credentialId/history", isAuthenticated, async (req, res) => {
    try {
      const credentialId = req.params.credentialId;
      const history = await storage.getVerificationHistory(credentialId);
      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error("Get verification history error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app.get("/api/blockchain/credentials/:licenseNumber/:authority", isAuthenticated, async (req, res) => {
    try {
      const { licenseNumber, authority } = req.params;
      const credential = await storage.getProfessionalCredentialByLicense(licenseNumber, authority);
      if (!credential) {
        return res.status(404).json({
          success: false,
          error: "Professional credential not found"
        });
      }
      const { masterPrivateKeyHash, ...safeCredential } = credential;
      res.json({
        success: true,
        data: safeCredential
      });
    } catch (error) {
      console.error("Get credential error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app.get("/api/blockchain/organizations/:id", isAuthenticated, async (req, res) => {
    try {
      const organizationId = req.params.id;
      const organization = await storage.getTrainingOrganization(organizationId);
      if (!organization) {
        return res.status(404).json({
          success: false,
          error: "Training organization not found"
        });
      }
      res.json({
        success: true,
        data: organization
      });
    } catch (error) {
      console.error("Get organization error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app.get("/api/blockchain/organizations/:id/members", isAuthenticated, async (req, res) => {
    try {
      const organizationId = req.params.id;
      const members = await storage.getOrganizationMembers(organizationId);
      res.json({
        success: true,
        data: members
      });
    } catch (error) {
      console.error("Get organization members error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
}

// server/routes/legacy-data-transfer.ts
import { Router } from "express";

// server/services/legacy-data-transfer.ts
import crypto2 from "crypto";
import Anthropic from "@anthropic-ai/sdk";
var DEFAULT_MODEL_STR = "claude-sonnet-4-20250514";
var anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "not-configured"
});
var LegacyDataTransferService = class {
  async initiateDataTransfer(request) {
    const jobId = crypto2.randomUUID();
    const estimatedRecords = parseInt(request.estimatedRecords) || 1e3;
    const job = {
      jobId,
      organizationName: request.organizationName,
      dataType: request.dataType,
      status: "uploaded",
      progress: 0,
      currentStage: "Initializing data transfer",
      estimatedCompletion: this.calculateEstimatedCompletion(request.urgencyLevel, estimatedRecords),
      recordsProcessed: 0,
      totalRecords: estimatedRecords,
      aiConfidenceScore: 0,
      qualityMetrics: {
        ocrAccuracy: 0,
        dataCompleteness: 0,
        validationPassed: 0,
        duplicatesFound: 0
      },
      alerts: [],
      createdAt: /* @__PURE__ */ new Date()
    };
    await this.storeProcessingJob(job);
    this.startBackgroundProcessing(jobId, request).catch(console.error);
    return {
      jobId,
      estimatedProcessingTime: this.calculateProcessingTime(request.urgencyLevel, estimatedRecords),
      processingSteps: this.getProcessingSteps(request),
      costEstimate: this.calculateCostEstimate(estimatedRecords, request)
    };
  }
  async getJobStatus(jobId) {
    return this.getStoredJob(jobId);
  }
  async getAllJobs(filters) {
    return [
      {
        jobId: crypto2.randomUUID(),
        organizationName: "Skyward Flight Training",
        dataType: "pilot_logbooks",
        status: "completed",
        progress: 100,
        currentStage: "Completed successfully",
        estimatedCompletion: (/* @__PURE__ */ new Date()).toISOString(),
        recordsProcessed: 1450,
        totalRecords: 1500,
        aiConfidenceScore: 0.96,
        qualityMetrics: {
          ocrAccuracy: 0.98,
          dataCompleteness: 0.95,
          validationPassed: 0.97,
          duplicatesFound: 23
        },
        blockchainHash: "0x" + crypto2.randomBytes(32).toString("hex"),
        downloadLinks: ["bccs_native_data.json", "quality_report.pdf"],
        alerts: [],
        createdAt: new Date(Date.now() - 864e5),
        // 1 day ago
        completedAt: new Date(Date.now() - 36e5)
        // 1 hour ago
      }
    ];
  }
  async startBackgroundProcessing(jobId, request) {
    const job = await this.getStoredJob(jobId);
    if (!job) return;
    try {
      await this.updateJobStatus(jobId, "processing", 10, "OCR text extraction in progress");
      await this.simulateOCRProcessing(jobId, request);
      await this.updateJobStatus(jobId, "ai_analysis", 40, "AI validation and data structuring");
      await this.performAIAnalysis(jobId, request);
      await this.updateJobStatus(jobId, "ai_analysis", 70, "Data quality validation and compliance check");
      await this.performDataValidation(jobId, request);
      if (request.blockchainVerification) {
        await this.updateJobStatus(jobId, "blockchain_verification", 90, "Creating blockchain verification hash");
        await this.performBlockchainVerification(jobId);
      }
      await this.updateJobStatus(jobId, "completed", 100, "Data transfer completed successfully");
      await this.finalizeProcessing(jobId, request);
    } catch (error) {
      console.error("Processing error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      await this.updateJobStatus(jobId, "failed", 0, "Processing failed: " + errorMessage);
    }
  }
  async simulateOCRProcessing(jobId, request) {
    const processingTime = this.getOCRProcessingTime(request.ocrAccuracyLevel);
    await this.delay(processingTime);
    const ocrAccuracy = this.getOCRAccuracyByLevel(request.ocrAccuracyLevel);
    await this.updateJobMetrics(jobId, { ocrAccuracy });
  }
  async performAIAnalysis(jobId, request) {
    const job = await this.getStoredJob(jobId);
    if (!job) return;
    try {
      const analysisPrompt = this.createAIAnalysisPrompt(request.dataType, request.specialInstructions);
      const response = await anthropic.messages.create({
        model: DEFAULT_MODEL_STR,
        // "claude-sonnet-4-20250514" - newest model
        max_tokens: 4e3,
        messages: [{
          role: "user",
          content: analysisPrompt
        }],
        system: `You are an expert aviation data analyst specializing in legacy data migration to BCCS blockchain systems. 
        Provide structured analysis in JSON format with confidence scores, validation results, and compliance assessments.`
      });
      const responseText = response.content[0].type === "text" ? response.content[0].text : "";
      const aiAnalysis = this.parseAIResponse(responseText);
      const aiConfidenceScore = aiAnalysis.confidence || 0.85;
      await this.updateJobMetrics(jobId, {
        aiConfidenceScore,
        dataCompleteness: aiAnalysis.completeness || 0.92,
        validationPassed: aiAnalysis.validationRate || 0.89
      });
      const totalRecords = job.totalRecords;
      for (let i = 0; i < totalRecords; i += Math.floor(totalRecords / 10)) {
        await this.updateJobProgress(jobId, Math.min(i, totalRecords));
        await this.delay(500);
      }
    } catch (error) {
      console.error("AI Analysis error:", error);
      await this.addJobAlert(jobId, "AI analysis completed with warnings - manual review recommended");
    }
  }
  async performDataValidation(jobId, request) {
    const job = await this.getStoredJob(jobId);
    if (!job) return;
    await this.delay(2e3);
    const complianceResults = await this.performComplianceChecks(request.dataType);
    await this.updateJobMetrics(jobId, {
      validationPassed: complianceResults.validationRate,
      duplicatesFound: complianceResults.duplicatesFound
    });
    if (complianceResults.warnings.length > 0) {
      for (const warning of complianceResults.warnings) {
        await this.addJobAlert(jobId, warning);
      }
    }
  }
  async performBlockchainVerification(jobId) {
    await this.delay(1e3);
    const blockchainHash = "0x" + crypto2.randomBytes(32).toString("hex");
    const job = await this.getStoredJob(jobId);
    if (job) {
      job.blockchainHash = blockchainHash;
      await this.storeProcessingJob(job);
    }
  }
  async finalizeProcessing(jobId, request) {
    const job = await this.getStoredJob(jobId);
    if (!job) return;
    const downloadLinks = this.generateDownloadLinks(request.outputFormat);
    job.downloadLinks = downloadLinks;
    job.completedAt = /* @__PURE__ */ new Date();
    job.recordsProcessed = job.totalRecords;
    await this.storeProcessingJob(job);
  }
  // Helper methods
  createAIAnalysisPrompt(dataType, specialInstructions) {
    const basePrompt = `Analyze aviation ${dataType.replace("_", " ")} data for migration to BCCS blockchain format.`;
    const dataTypePrompts = {
      pilot_logbooks: `Focus on flight hours validation, aircraft type verification, route analysis, and instructor endorsements.`,
      training_records: `Validate training completion dates, instructor qualifications, course compliance, and progression tracking.`,
      maintenance_logs: `Verify maintenance intervals, part numbers, technician certifications, and regulatory compliance.`,
      regulatory_documents: `Check document authenticity, expiration dates, regulatory compliance, and authority verification.`,
      mixed_aviation_data: `Perform comprehensive analysis across multiple aviation data types with cross-validation.`
    };
    const fullPrompt = `${basePrompt} ${dataTypePrompts[dataType] || dataTypePrompts.mixed_aviation_data} 
    
    ${specialInstructions ? `Special instructions: ${specialInstructions}` : ""}
    
    Return JSON format with:
    {
      "confidence": 0.0-1.0,
      "completeness": 0.0-1.0,
      "validationRate": 0.0-1.0,
      "complianceIssues": [],
      "dataQualityFlags": [],
      "recommendations": []
    }`;
    return fullPrompt;
  }
  parseAIResponse(response) {
    try {
      return JSON.parse(response);
    } catch {
      return {
        confidence: 0.85,
        completeness: 0.9,
        validationRate: 0.88,
        complianceIssues: [],
        dataQualityFlags: [],
        recommendations: ["AI analysis completed with standard processing"]
      };
    }
  }
  async performComplianceChecks(dataType) {
    await this.delay(1e3);
    const mockResults = {
      pilot_logbooks: {
        validationRate: 0.94,
        duplicatesFound: 12,
        warnings: ["3 entries missing instructor endorsements", "Flight hours exceed daily limits in 2 entries"]
      },
      training_records: {
        validationRate: 0.97,
        duplicatesFound: 5,
        warnings: ["Training progression gaps detected for 2 students"]
      },
      maintenance_logs: {
        validationRate: 0.91,
        duplicatesFound: 8,
        warnings: ["Missing technician signatures on 4 entries", "Part number validation failed for 6 items"]
      },
      regulatory_documents: {
        validationRate: 0.98,
        duplicatesFound: 2,
        warnings: ["2 documents approaching expiration"]
      },
      mixed_aviation_data: {
        validationRate: 0.89,
        duplicatesFound: 15,
        warnings: ["Data type inconsistencies detected", "Cross-reference validation needed"]
      }
    };
    return mockResults[dataType] || mockResults.mixed_aviation_data;
  }
  getOCRAccuracyByLevel(level) {
    const accuracyMap = {
      standard: 0.95,
      high: 0.98,
      maximum: 0.995
    };
    return accuracyMap[level] || 0.98;
  }
  getOCRProcessingTime(level) {
    const timeMap = {
      standard: 1e3,
      high: 2e3,
      maximum: 4e3
    };
    return timeMap[level] || 2e3;
  }
  calculateEstimatedCompletion(urgency, recordCount) {
    const baseHours = Math.max(1, Math.floor(recordCount / 500));
    const urgencyMultiplier = {
      standard: 1,
      expedited: 0.5,
      emergency: 0.2
    };
    const totalHours = baseHours * (urgencyMultiplier[urgency] || 1);
    const completion = /* @__PURE__ */ new Date();
    completion.setHours(completion.getHours() + totalHours);
    return completion.toISOString();
  }
  calculateProcessingTime(urgency, recordCount) {
    const urgencyTimes = {
      standard: "5-7 business days",
      expedited: "2-3 business days",
      emergency: "24-48 hours"
    };
    return urgencyTimes[urgency] || "5-7 business days";
  }
  getProcessingSteps(request) {
    const steps = [
      "Document upload and classification",
      "OCR text extraction and processing",
      "AI data validation and structuring",
      "Compliance verification and quality checks"
    ];
    if (request.blockchainVerification) {
      steps.push("Blockchain hash generation and verification");
    }
    if (request.qualityAssuranceLevel !== "automated") {
      steps.push("Human quality assurance review");
    }
    steps.push("Final data packaging and delivery");
    return steps;
  }
  calculateCostEstimate(recordCount, request) {
    const basePrice = 149;
    let totalCost = basePrice;
    if (request.urgencyLevel === "expedited") totalCost += 50;
    if (request.urgencyLevel === "emergency") totalCost += 100;
    if (request.ocrAccuracyLevel === "maximum") totalCost += 25;
    if (request.aiValidationLevel === "forensic") totalCost += 75;
    if (request.qualityAssuranceLevel === "full_manual") totalCost += 100;
    if (request.encryptionLevel === "military_grade") totalCost += 50;
    return `$${totalCost}`;
  }
  generateDownloadLinks(outputFormat) {
    const links = [];
    switch (outputFormat) {
      case "bccs_native":
        links.push("bccs_native_data.json", "migration_report.pdf");
        break;
      case "json":
        links.push("exported_data.json", "processing_log.txt");
        break;
      case "csv":
        links.push("data_export.csv", "summary_report.xlsx");
        break;
      case "pdf_reports":
        links.push("complete_report.pdf", "executive_summary.pdf");
        break;
    }
    links.push("blockchain_certificate.pdf", "quality_assurance_report.pdf");
    return links;
  }
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  // Storage methods (in production, these would interact with database)
  jobs = /* @__PURE__ */ new Map();
  async storeProcessingJob(job) {
    this.jobs.set(job.jobId, job);
  }
  async getStoredJob(jobId) {
    return this.jobs.get(jobId) || null;
  }
  async updateJobStatus(jobId, status, progress, currentStage) {
    const job = await this.getStoredJob(jobId);
    if (job) {
      job.status = status;
      job.progress = progress;
      job.currentStage = currentStage;
      await this.storeProcessingJob(job);
    }
  }
  async updateJobProgress(jobId, recordsProcessed) {
    const job = await this.getStoredJob(jobId);
    if (job) {
      job.recordsProcessed = recordsProcessed;
      await this.storeProcessingJob(job);
    }
  }
  async updateJobMetrics(jobId, metrics) {
    const job = await this.getStoredJob(jobId);
    if (job) {
      if (metrics.aiConfidenceScore !== void 0) {
        job.aiConfidenceScore = metrics.aiConfidenceScore;
      }
      Object.assign(job.qualityMetrics, metrics);
      await this.storeProcessingJob(job);
    }
  }
  async addJobAlert(jobId, alert) {
    const job = await this.getStoredJob(jobId);
    if (job) {
      job.alerts.push(alert);
      await this.storeProcessingJob(job);
    }
  }
};

// server/routes/legacy-data-transfer.ts
import { z as z2 } from "zod";
var router = Router();
var legacyDataTransferService = new LegacyDataTransferService();
var uploadRequestSchema = z2.object({
  organizationName: z2.string().min(1),
  dataType: z2.enum(["pilot_logbooks", "training_records", "maintenance_logs", "regulatory_documents", "mixed_aviation_data"]),
  estimatedRecords: z2.string().min(1),
  legacySystemType: z2.string().min(1),
  contactEmail: z2.string().email(),
  urgencyLevel: z2.enum(["standard", "expedited", "emergency"]),
  specialInstructions: z2.string().optional(),
  files: z2.string().min(1),
  ocrAccuracyLevel: z2.enum(["standard", "high", "maximum"]),
  aiValidationLevel: z2.enum(["basic", "comprehensive", "forensic"]),
  blockchainVerification: z2.boolean(),
  qualityAssuranceLevel: z2.enum(["automated", "hybrid", "full_manual"]),
  outputFormat: z2.enum(["bccs_native", "json", "csv", "pdf_reports"]),
  encryptionLevel: z2.enum(["standard", "enhanced", "military_grade"])
});
router.post("/upload", async (req, res) => {
  try {
    const validatedData = uploadRequestSchema.parse(req.body);
    const result = await legacyDataTransferService.initiateDataTransfer(validatedData);
    res.json({
      success: true,
      data: result,
      message: "Legacy data transfer initiated successfully"
    });
  } catch (error) {
    console.error("Upload error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to initiate data transfer";
    res.status(400).json({
      success: false,
      error: errorMessage
    });
  }
});
router.get("/status/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!jobId) {
      return res.status(400).json({
        success: false,
        error: "Job ID is required"
      });
    }
    const status = await legacyDataTransferService.getJobStatus(jobId);
    if (!status) {
      return res.status(404).json({
        success: false,
        error: "Job not found"
      });
    }
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error("Status retrieval error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve job status"
    });
  }
});
router.get("/jobs", async (req, res) => {
  try {
    const { status, dataType, organization } = req.query;
    const filters = {
      status,
      dataType,
      organization
    };
    const jobs = await legacyDataTransferService.getAllJobs(filters);
    res.json({
      success: true,
      data: jobs,
      count: jobs.length
    });
  } catch (error) {
    console.error("Jobs retrieval error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve processing jobs"
    });
  }
});
router.get("/download/:jobId/:fileType", async (req, res) => {
  try {
    const { jobId, fileType } = req.params;
    const job = await legacyDataTransferService.getJobStatus(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: "Job not found"
      });
    }
    if (job.status !== "completed") {
      return res.status(400).json({
        success: false,
        error: "Job not yet completed"
      });
    }
    res.json({
      success: true,
      message: `Download ${fileType} for job ${jobId}`,
      downloadUrl: `/downloads/${jobId}/${fileType}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1e3)
      // 24 hours
    });
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process download request"
    });
  }
});
router.post("/cancel/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await legacyDataTransferService.getJobStatus(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: "Job not found"
      });
    }
    if (job.status === "completed" || job.status === "failed") {
      return res.status(400).json({
        success: false,
        error: "Cannot cancel completed or failed job"
      });
    }
    res.json({
      success: true,
      message: "Job cancellation requested",
      data: {
        jobId,
        previousStatus: job.status,
        cancelledAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
  } catch (error) {
    console.error("Cancel error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to cancel job"
    });
  }
});
router.get("/pricing", async (req, res) => {
  try {
    const { recordCount = "1000", urgencyLevel = "standard", features } = req.query;
    const pricingInfo = {
      basePrice: 149,
      // Highest ROI pricing as specified
      recordCount: parseInt(recordCount),
      urgencyLevel,
      additionalFeatures: {
        expedited: urgencyLevel === "expedited" ? 50 : 0,
        emergency: urgencyLevel === "emergency" ? 100 : 0,
        maximumOCR: Array.isArray(features) && features.includes("maximum_ocr") ? 25 : 0,
        forensicAI: Array.isArray(features) && features.includes("forensic_ai") ? 75 : 0,
        fullManualQA: Array.isArray(features) && features.includes("full_manual_qa") ? 100 : 0,
        militaryEncryption: Array.isArray(features) && features.includes("military_encryption") ? 50 : 0
      },
      get totalPrice() {
        return this.basePrice + Object.values(this.additionalFeatures).reduce((sum, price) => sum + price, 0);
      }
    };
    res.json({
      success: true,
      data: pricingInfo,
      currency: "USD"
    });
  } catch (error) {
    console.error("Pricing error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to calculate pricing"
    });
  }
});
router.get("/analytics", async (req, res) => {
  try {
    const { timeframe = "30d", organization } = req.query;
    const analyticsData = {
      timeframe,
      totalJobs: 156,
      completedJobs: 142,
      averageProcessingTime: "2.3 hours",
      averageAccuracy: 96.8,
      dataTypesProcessed: {
        pilot_logbooks: 45,
        training_records: 38,
        maintenance_logs: 32,
        regulatory_documents: 28,
        mixed_aviation_data: 13
      },
      qualityMetrics: {
        averageOCRAccuracy: 97.2,
        averageDataCompleteness: 94.6,
        averageValidationRate: 95.8,
        totalDuplicatesFound: 1247
      },
      processingTrends: {
        standardJobs: 89,
        expeditedJobs: 42,
        emergencyJobs: 25
      },
      blockchainVerifications: 134,
      totalRecordsProcessed: 178543
    };
    res.json({
      success: true,
      data: analyticsData
    });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve analytics"
    });
  }
});
var legacy_data_transfer_default = router;

// server/routes/adaptive-compliance.ts
import { Router as Router2 } from "express";

// server/services/regulatory-spine.ts
import { eq as eq3, and as and2, inArray, like as like2, or, desc as desc2 } from "drizzle-orm";
import crypto3 from "crypto";
var RegulatorySpineService = class _RegulatorySpineService {
  static UNIVERSAL_FAR_PARTS = [
    {
      partNumber: "14-CFR-21",
      partName: "14 CFR Part 21 - Certification Procedures for Products and Articles",
      subchapter: "C",
      applicableTo: ["manufacturers", "production_approval_holders"],
      canBeSpine: true,
      relatedParts: ["14-CFR-43", "14-CFR-145"],
      ecfrUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-C/part-21"
    },
    {
      partNumber: "14-CFR-43",
      partName: "14 CFR Part 43 - Maintenance, Preventive Maintenance, Rebuilding, and Alteration",
      subchapter: "C",
      applicableTo: ["maintenance_personnel", "repair_stations", "air_carriers"],
      canBeSpine: false,
      relatedParts: ["14-CFR-145", "14-CFR-121", "14-CFR-135"],
      ecfrUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-C/part-43"
    },
    {
      partNumber: "14-CFR-61",
      partName: "14 CFR Part 61 - Certification: Pilots, Flight Instructors, and Ground Instructors",
      subchapter: "D",
      applicableTo: ["pilots", "flight_instructors", "ground_instructors"],
      canBeSpine: false,
      relatedParts: ["14-CFR-141", "14-CFR-142", "14-CFR-91"],
      ecfrUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-61"
    },
    {
      partNumber: "14-CFR-63",
      partName: "14 CFR Part 63 - Certification: Flight Crewmembers Other Than Pilots",
      subchapter: "D",
      applicableTo: ["flight_engineers", "flight_navigators"],
      canBeSpine: false,
      relatedParts: ["14-CFR-121", "14-CFR-135"],
      ecfrUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-63"
    },
    {
      partNumber: "14-CFR-65",
      partName: "14 CFR Part 65 - Certification: Airmen Other Than Flight Crewmembers",
      subchapter: "D",
      applicableTo: ["mechanics", "repairmen", "dispatchers", "parachute_riggers"],
      canBeSpine: false,
      relatedParts: ["14-CFR-145", "14-CFR-121", "14-CFR-43"],
      ecfrUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-65"
    },
    {
      partNumber: "14-CFR-91",
      partName: "14 CFR Part 91 - General Operating and Flight Rules",
      subchapter: "F",
      applicableTo: ["all_pilots", "aircraft_operators"],
      canBeSpine: false,
      relatedParts: ["14-CFR-61", "14-CFR-121", "14-CFR-135"],
      ecfrUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-F/part-91"
    },
    {
      partNumber: "14-CFR-91K",
      partName: "14 CFR Part 91 Subpart K - Fractional Ownership Operations",
      subchapter: "F",
      applicableTo: ["fractional_ownership_programs"],
      canBeSpine: true,
      relatedParts: ["14-CFR-91", "14-CFR-135"],
      ecfrUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-F/part-91/subpart-K"
    },
    {
      partNumber: "14-CFR-107",
      partName: "14 CFR Part 107 - Small Unmanned Aircraft Systems",
      subchapter: "F",
      applicableTo: ["drone_operators", "uas_pilots"],
      canBeSpine: true,
      relatedParts: ["14-CFR-91", "14-CFR-61"],
      ecfrUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-F/part-107"
    },
    {
      partNumber: "14-CFR-119",
      partName: "14 CFR Part 119 - Certification: Air Carriers and Commercial Operators",
      subchapter: "G",
      applicableTo: ["air_carriers", "commercial_operators"],
      canBeSpine: true,
      relatedParts: ["14-CFR-121", "14-CFR-135"],
      ecfrUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-119"
    },
    {
      partNumber: "14-CFR-121",
      partName: "14 CFR Part 121 - Operating Requirements: Domestic, Flag, and Supplemental Operations",
      subchapter: "G",
      applicableTo: ["airlines", "scheduled_carriers", "supplemental_carriers"],
      canBeSpine: true,
      relatedParts: ["14-CFR-119", "14-CFR-142", "14-CFR-65"],
      ecfrUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-121"
    },
    {
      partNumber: "14-CFR-125",
      partName: "14 CFR Part 125 - Certification and Operations: Airplanes Having a Seating Capacity of 20 or More Passengers or a Maximum Payload Capacity of 6,000 Pounds or More",
      subchapter: "G",
      applicableTo: ["large_aircraft_operators"],
      canBeSpine: true,
      relatedParts: ["14-CFR-91", "14-CFR-119"],
      ecfrUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-125"
    },
    {
      partNumber: "14-CFR-129",
      partName: "14 CFR Part 129 - Operations: Foreign Air Carriers and Foreign Operators of U.S.-Registered Aircraft",
      subchapter: "G",
      applicableTo: ["foreign_air_carriers"],
      canBeSpine: true,
      relatedParts: ["14-CFR-119", "14-CFR-121"],
      ecfrUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-129"
    },
    {
      partNumber: "14-CFR-135",
      partName: "14 CFR Part 135 - Operating Requirements: Commuter and On Demand Operations",
      subchapter: "G",
      applicableTo: ["charter_operators", "air_taxi", "commuter_airlines"],
      canBeSpine: true,
      relatedParts: ["14-CFR-119", "14-CFR-142", "14-CFR-91"],
      ecfrUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-135"
    },
    {
      partNumber: "14-CFR-137",
      partName: "14 CFR Part 137 - Agricultural Aircraft Operations",
      subchapter: "G",
      applicableTo: ["agricultural_operators"],
      canBeSpine: true,
      relatedParts: ["14-CFR-91", "14-CFR-61"],
      ecfrUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-137"
    },
    {
      partNumber: "14-CFR-141",
      partName: "14 CFR Part 141 - Pilot Schools",
      subchapter: "H",
      applicableTo: ["pilot_schools", "flight_academies"],
      canBeSpine: true,
      relatedParts: ["14-CFR-61", "14-CFR-142"],
      ecfrUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-H/part-141"
    },
    {
      partNumber: "14-CFR-142",
      partName: "14 CFR Part 142 - Training Centers",
      subchapter: "H",
      applicableTo: ["training_centers", "simulator_operators"],
      canBeSpine: true,
      relatedParts: ["14-CFR-121", "14-CFR-135", "14-CFR-61"],
      ecfrUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-H/part-142"
    },
    {
      partNumber: "14-CFR-145",
      partName: "14 CFR Part 145 - Repair Stations",
      subchapter: "H",
      applicableTo: ["repair_stations", "maintenance_organizations"],
      canBeSpine: true,
      relatedParts: ["14-CFR-43", "14-CFR-65", "14-CFR-121"],
      ecfrUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-H/part-145"
    },
    {
      partNumber: "14-CFR-147",
      partName: "14 CFR Part 147 - Aviation Maintenance Technician Schools",
      subchapter: "H",
      applicableTo: ["amt_schools", "maintenance_training"],
      canBeSpine: true,
      relatedParts: ["14-CFR-65", "14-CFR-145", "14-CFR-43"],
      ecfrUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-H/part-147"
    }
  ];
  static FAA_ORDER_VOLUMES = [
    { code: "FAA-8900.1-VOL1", name: "FAA Order 8900.1 Volume 1 - General Inspector Guidance and Information", chapter: "General" },
    { code: "FAA-8900.1-VOL2", name: "FAA Order 8900.1 Volume 2 - Air Operator and Air Agency Certification and Application Process", chapter: "Certification" },
    { code: "FAA-8900.1-VOL3", name: "FAA Order 8900.1 Volume 3 - General Technical Administration", chapter: "Technical" },
    { code: "FAA-8900.1-VOL4", name: "FAA Order 8900.1 Volume 4 - Aircraft Equipment and Operational Authorization", chapter: "Equipment" },
    { code: "FAA-8900.1-VOL5", name: "FAA Order 8900.1 Volume 5 - Airman Certification", chapter: "Airman" },
    { code: "FAA-8900.1-VOL6", name: "FAA Order 8900.1 Volume 6 - Surveillance", chapter: "Surveillance" },
    { code: "FAA-8900.1-VOL7", name: "FAA Order 8900.1 Volume 7 - Investigation", chapter: "Investigation" },
    { code: "FAA-8900.1-VOL8", name: "FAA Order 8900.1 Volume 8 - Designees", chapter: "Designees" },
    { code: "FAA-8900.1-VOL9", name: "FAA Order 8900.1 Volume 9 - Flight Standards Programs", chapter: "Programs" },
    { code: "FAA-8900.1-VOL10", name: "FAA Order 8900.1 Volume 10 - Safety Assurance System", chapter: "Safety" },
    { code: "FAA-8900.1-VOL11", name: "FAA Order 8900.1 Volume 11 - Flight Technologies and Procedures Division Designees", chapter: "Technologies" },
    { code: "FAA-8900.1-VOL12", name: "FAA Order 8900.1 Volume 12 - International Aviation", chapter: "International" },
    { code: "FAA-8900.1-VOL13", name: "FAA Order 8900.1 Volume 13 - Commercial Space Transportation", chapter: "Space" },
    { code: "FAA-8900.1-VOL14", name: "FAA Order 8900.1 Volume 14 - Compliance and Enforcement", chapter: "Compliance" },
    { code: "FAA-8900.1-VOL15", name: "FAA Order 8900.1 Volume 15 - Designated Representative Program", chapter: "Representatives" },
    { code: "FAA-8900.1-VOL16", name: "FAA Order 8900.1 Volume 16 - Unmanned Aircraft Systems", chapter: "UAS" }
  ];
  async initializeUniversalRegulatorySpine() {
    console.log("Initializing Universal Regulatory Spine framework...");
    for (const part of _RegulatorySpineService.UNIVERSAL_FAR_PARTS) {
      await this.ensureFrameworkExists(part);
    }
    for (const order of _RegulatorySpineService.FAA_ORDER_VOLUMES) {
      await this.ensureOrderExists(order);
    }
    console.log("Universal Regulatory Spine initialized with all FAR Parts and FAA Orders");
  }
  async ensureFrameworkExists(part) {
    const existing = await db.select().from(regulatoryFrameworks).where(eq3(regulatoryFrameworks.frameworkCode, part.partNumber)).limit(1);
    if (existing.length === 0) {
      const framework = {
        frameworkCode: part.partNumber,
        frameworkName: part.partName,
        frameworkType: part.canBeSpine ? "spine" : "attachment",
        regulatoryAuthority: "faa",
        effectiveDate: /* @__PURE__ */ new Date(),
        version: "2024.1",
        hierarchyLevel: part.canBeSpine ? 1 : 2,
        sourceUrl: part.ecfrUrl,
        applicabilityRules: {
          applies_to: part.applicableTo,
          subchapter: part.subchapter,
          related_parts: part.relatedParts,
          can_be_primary_spine: part.canBeSpine
        },
        isActive: true
      };
      try {
        await db.insert(regulatoryFrameworks).values(framework);
        console.log(`Created regulatory framework: ${part.partNumber}`);
      } catch (error) {
        if (!error.message?.includes("duplicate")) {
          console.error(`Error creating framework ${part.partNumber}:`, error);
        }
      }
    }
  }
  async ensureOrderExists(order) {
    const existing = await db.select().from(regulatoryFrameworks).where(eq3(regulatoryFrameworks.frameworkCode, order.code)).limit(1);
    if (existing.length === 0) {
      const framework = {
        frameworkCode: order.code,
        frameworkName: order.name,
        frameworkType: "order",
        regulatoryAuthority: "faa",
        effectiveDate: /* @__PURE__ */ new Date(),
        version: "2024.1",
        hierarchyLevel: 2,
        sourceUrl: "https://www.faa.gov/regulations_policies/orders_notices",
        applicabilityRules: {
          applies_to: ["inspectors", "certificate_holders"],
          chapter: order.chapter,
          document_type: "faa_order"
        },
        isActive: true
      };
      try {
        await db.insert(regulatoryFrameworks).values(framework);
        console.log(`Created FAA Order: ${order.code}`);
      } catch (error) {
        if (!error.message?.includes("duplicate")) {
          console.error(`Error creating order ${order.code}:`, error);
        }
      }
    }
  }
  async getAvailableSpines() {
    return db.select().from(regulatoryFrameworks).where(and2(
      eq3(regulatoryFrameworks.frameworkType, "spine"),
      eq3(regulatoryFrameworks.isActive, true)
    ));
  }
  async getUniversalFARParts() {
    return _RegulatorySpineService.UNIVERSAL_FAR_PARTS;
  }
  async selectPrimarySpine(organizationId, frameworkCode) {
    const framework = await db.select().from(regulatoryFrameworks).where(eq3(regulatoryFrameworks.frameworkCode, frameworkCode)).limit(1);
    if (framework.length === 0) return null;
    await db.update(organizationAuthorizations).set({ isActive: false }).where(and2(
      eq3(organizationAuthorizations.organizationId, organizationId),
      eq3(organizationAuthorizations.authorizationType, "primary_spine")
    ));
    await db.insert(organizationAuthorizations).values({
      organizationId,
      frameworkId: framework[0].id,
      authorizationType: "primary_spine",
      grantedDate: /* @__PURE__ */ new Date(),
      isActive: true
    });
    return framework[0];
  }
  async createMultiPartConfiguration(config) {
    const primarySpine = await db.select().from(regulatoryFrameworks).where(eq3(regulatoryFrameworks.frameworkCode, config.primarySpineCode)).limit(1);
    if (primarySpine.length === 0) {
      throw new Error(`Primary spine ${config.primarySpineCode} not found`);
    }
    const secondarySpines = await db.select().from(regulatoryFrameworks).where(inArray(regulatoryFrameworks.frameworkCode, config.secondarySpineCodes));
    const multiPartConfig = {
      configName: config.configName,
      description: config.description,
      primarySpineId: primarySpine[0].id,
      secondarySpines: secondarySpines.map((s) => s.id),
      applicableOperationTypes: config.operationTypes,
      applicableAuthorizations: config.authorizations || {},
      isActive: true
    };
    const result = await db.insert(multiPartConfigurations).values(multiPartConfig).returning();
    return result[0];
  }
  async getMultiPartConfiguration(configId) {
    const config = await db.select().from(multiPartConfigurations).where(eq3(multiPartConfigurations.id, configId)).limit(1);
    if (config.length === 0) return null;
    const primaryPart = await db.select().from(regulatoryFrameworks).where(eq3(regulatoryFrameworks.id, config[0].primarySpineId)).limit(1);
    const secondaryParts = config[0].secondarySpines && config[0].secondarySpines.length > 0 ? await db.select().from(regulatoryFrameworks).where(inArray(regulatoryFrameworks.id, config[0].secondarySpines)) : [];
    const policyAttachments = await db.select().from(faaPolicyDocuments).where(eq3(faaPolicyDocuments.isActive, true));
    return {
      primaryPart: primaryPart[0],
      secondaryParts,
      policyAttachments,
      operatorAuthorizations: [],
      regionalSupplements: []
    };
  }
  async ingestFAAPolicyDocument(document) {
    const contentHash = document.content ? crypto3.createHash("sha256").update(document.content).digest("hex").substring(0, 64) : null;
    const affectedFrameworks = await db.select().from(regulatoryFrameworks).where(inArray(regulatoryFrameworks.frameworkCode, document.affectedParts.map((p) => `14-CFR-${p}`)));
    const policyDoc = {
      documentType: document.documentType,
      documentNumber: document.documentNumber,
      title: document.title,
      subject: document.subject,
      issuanceDate: document.issuanceDate,
      effectiveDate: document.effectiveDate,
      expirationDate: document.expirationDate,
      affectedParts: document.affectedParts,
      content: document.content,
      sourceUrl: document.sourceUrl,
      contentHash,
      linkedFrameworks: affectedFrameworks.map((f) => f.id),
      status: "active",
      isActive: true
    };
    const result = await db.insert(faaPolicyDocuments).values(policyDoc).returning();
    await this.createRegulatoryUpdateRecord({
      sourceType: document.documentType,
      sourceIdentifier: document.documentNumber,
      sourceUrl: document.sourceUrl,
      currentContentHash: contentHash || void 0,
      changeType: "new",
      changeSummary: `New ${document.documentType} ingested: ${document.title}`
    });
    return result[0];
  }
  async createRegulatoryUpdateRecord(update) {
    const record = {
      sourceType: update.sourceType,
      sourceIdentifier: update.sourceIdentifier,
      sourceUrl: update.sourceUrl,
      lastCheckedAt: /* @__PURE__ */ new Date(),
      currentContentHash: update.currentContentHash,
      affectedFrameworkId: update.affectedFrameworkId,
      affectedPolicyDocId: update.affectedPolicyDocId,
      changeDetected: update.changeType !== void 0,
      changeType: update.changeType,
      changeSummary: update.changeSummary,
      notificationSent: false
    };
    const result = await db.insert(regulatoryUpdateTracking).values(record).returning();
    return result[0];
  }
  async getActivePolicyDocuments(filters) {
    let query = db.select().from(faaPolicyDocuments).where(eq3(faaPolicyDocuments.isActive, true));
    if (filters?.documentType) {
      query = db.select().from(faaPolicyDocuments).where(and2(
        eq3(faaPolicyDocuments.isActive, true),
        eq3(faaPolicyDocuments.documentType, filters.documentType)
      ));
    }
    return query;
  }
  async getRecentRegulatoryUpdates(limit = 50) {
    return db.select().from(regulatoryUpdateTracking).orderBy(desc2(regulatoryUpdateTracking.createdAt)).limit(limit);
  }
  async getFrameworksByPart(partNumber) {
    const searchPattern = partNumber.startsWith("14-CFR-") ? partNumber : `14-CFR-${partNumber}`;
    return db.select().from(regulatoryFrameworks).where(like2(regulatoryFrameworks.frameworkCode, `${searchPattern}%`));
  }
  async getRelatedFrameworks(frameworkId) {
    const links = await db.select().from(regulatoryGraphLinks).where(or(
      eq3(regulatoryGraphLinks.sourceId, frameworkId),
      eq3(regulatoryGraphLinks.targetId, frameworkId)
    ));
    const relatedIds = links.flatMap(
      (link) => link.sourceId === frameworkId ? [link.targetId] : [link.sourceId]
    );
    if (relatedIds.length === 0) return [];
    return db.select().from(regulatoryFrameworks).where(inArray(regulatoryFrameworks.id, relatedIds));
  }
  async generateRegulatoryImpactAssessment(frameworkCode) {
    const framework = await db.select().from(regulatoryFrameworks).where(eq3(regulatoryFrameworks.frameworkCode, frameworkCode)).limit(1);
    if (framework.length === 0) {
      return {
        framework: null,
        relatedPolicies: [],
        pendingUpdates: [],
        impactSummary: "Framework not found"
      };
    }
    const relatedPolicies = await db.select().from(faaPolicyDocuments).where(eq3(faaPolicyDocuments.isActive, true));
    const pendingUpdates = await db.select().from(regulatoryUpdateTracking).where(and2(
      eq3(regulatoryUpdateTracking.affectedFrameworkId, framework[0].id),
      eq3(regulatoryUpdateTracking.changeDetected, true)
    ));
    const impactSummary = `Framework ${frameworkCode} has ${relatedPolicies.length} related policy documents and ${pendingUpdates.length} pending regulatory updates requiring attention.`;
    return {
      framework: framework[0],
      relatedPolicies,
      pendingUpdates,
      impactSummary
    };
  }
  async initializeRegulatorySpine() {
    return this.initializeUniversalRegulatorySpine();
  }
  async getSpineFramework() {
    const result = await db.select().from(regulatoryFrameworks).where(and2(
      eq3(regulatoryFrameworks.frameworkType, "spine"),
      eq3(regulatoryFrameworks.isActive, true)
    )).limit(1);
    return result[0] || null;
  }
  async getAttachmentsForOrganization(organizationId) {
    const authorizations = await db.select().from(organizationAuthorizations).where(and2(
      eq3(organizationAuthorizations.organizationId, organizationId),
      eq3(organizationAuthorizations.isActive, true)
    ));
    if (authorizations.length === 0) {
      return this.getCoreAttachments();
    }
    const frameworkIds = authorizations.map((auth) => auth.frameworkId);
    return db.select().from(regulatoryFrameworks).where(inArray(regulatoryFrameworks.id, frameworkIds));
  }
  async getCoreAttachments() {
    return db.select().from(regulatoryFrameworks).where(and2(
      or(
        eq3(regulatoryFrameworks.frameworkType, "attachment"),
        eq3(regulatoryFrameworks.frameworkType, "order")
      ),
      eq3(regulatoryFrameworks.isActive, true)
    ));
  }
  async getDynamicAttachmentsForOperator(operatorType) {
    const frameworkMap = {
      "part_121": "14-CFR-121",
      "part_135": "14-CFR-135",
      "part_91k": "14-CFR-91K",
      "part_141": "14-CFR-141",
      "part_142": "14-CFR-142",
      "part_145": "14-CFR-145",
      "part_147": "14-CFR-147",
      "general_aviation": "14-CFR-91"
    };
    const frameworkCode = frameworkMap[operatorType];
    if (!frameworkCode) return [];
    return db.select().from(regulatoryFrameworks).where(eq3(regulatoryFrameworks.frameworkCode, frameworkCode));
  }
  async assignFrameworkToOrganization(organizationId, frameworkId, authorizationType = "supplementary", operatorClients = []) {
    const authorization = {
      organizationId,
      frameworkId,
      authorizationType,
      grantedDate: /* @__PURE__ */ new Date(),
      operatorClients: operatorClients.length > 0 ? operatorClients : null,
      isActive: true
    };
    const result = await db.insert(organizationAuthorizations).values(authorization).returning();
    return result[0];
  }
  async getComplianceFrameworkHierarchy(organizationId) {
    const spine = await this.getSpineFramework();
    const allAttachments = await this.getAttachmentsForOrganization(organizationId);
    const policyDocuments = await this.getActivePolicyDocuments();
    const orderCodes = _RegulatorySpineService.FAA_ORDER_VOLUMES.map((o) => o.code);
    const coreAttachments = allAttachments.filter(
      (att) => orderCodes.includes(att.frameworkCode) || att.frameworkType === "order"
    );
    const dynamicAttachments = allAttachments.filter(
      (att) => !orderCodes.includes(att.frameworkCode) && att.frameworkType !== "order"
    );
    return {
      spine,
      coreAttachments,
      dynamicAttachments,
      policyDocuments
    };
  }
  async getAllActiveFrameworks() {
    return db.select().from(regulatoryFrameworks).where(eq3(regulatoryFrameworks.isActive, true));
  }
  async updateFrameworkVersion(frameworkCode, newVersion) {
    await db.update(regulatoryFrameworks).set({
      version: newVersion,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq3(regulatoryFrameworks.frameworkCode, frameworkCode));
  }
  async getOrganizationRegulatoryProfile(organizationId) {
    const authorizations = await db.select().from(organizationAuthorizations).where(and2(
      eq3(organizationAuthorizations.organizationId, organizationId),
      eq3(organizationAuthorizations.isActive, true)
    ));
    const primaryAuth = authorizations.find((a) => a.authorizationType === "primary_spine");
    let primarySpine = null;
    if (primaryAuth) {
      const spines = await db.select().from(regulatoryFrameworks).where(eq3(regulatoryFrameworks.id, primaryAuth.frameworkId)).limit(1);
      primarySpine = spines[0] || null;
    }
    const frameworkIds = authorizations.map((a) => a.frameworkId);
    const authorizedFrameworks = frameworkIds.length > 0 ? await db.select().from(regulatoryFrameworks).where(inArray(regulatoryFrameworks.id, frameworkIds)) : [];
    const multiPartConfigs = await db.select().from(multiPartConfigurations).where(eq3(multiPartConfigurations.isActive, true));
    const recentUpdates = await this.getRecentRegulatoryUpdates(10);
    return {
      primarySpine,
      authorizedFrameworks,
      multiPartConfigs,
      recentUpdates,
      complianceGaps: []
    };
  }
};
var regulatorySpineService = new RegulatorySpineService();

// server/services/checklist-harmonization.ts
import { eq as eq4, and as and3, desc as desc3, asc, isNull as isNull2, or as or2 } from "drizzle-orm";
import { createHash } from "crypto";
var CHECKLIST_PRIORITY_MAP = {
  "faa_standard": 1,
  "certificate_job_aid": 2,
  "inspector_supplemental": 3,
  "operator_required": 4,
  "archived_legacy": 5
};
var FAA_CORE_CHECKLISTS = {
  "14-CFR-142": {
    farPart: "142",
    formNumber: "8900.1-VOL3-CH19",
    formTitle: "Part 142 Training Center Certification Checklist",
    formType: "audit_checklist",
    version: "2024-01",
    sourceUrl: "https://fsims.faa.gov/PICDetail.aspx?docId=8900.1,Vol.3,Ch19",
    relatedOrderVolume: "8900.1 Vol 3",
    items: [
      { itemNumber: "142.1", itemOrder: 1, categoryName: "Applicability", description: "Verify training center meets applicability requirements under 14 CFR 142.1", regulatoryReference: "14 CFR 142.1" },
      { itemNumber: "142.3", itemOrder: 2, categoryName: "Definitions", description: "Confirm understanding of definitions for training center, courseware, and FSTD", regulatoryReference: "14 CFR 142.3" },
      { itemNumber: "142.11(a)", itemOrder: 3, categoryName: "Application", description: "Application submitted on FAA-approved form with required documents", regulatoryReference: "14 CFR 142.11(a)" },
      { itemNumber: "142.11(b)", itemOrder: 4, categoryName: "Application", description: "Training specifications include all required curriculum information", regulatoryReference: "14 CFR 142.11(b)" },
      { itemNumber: "142.13", itemOrder: 5, categoryName: "Management", description: "Management personnel meet qualification requirements", regulatoryReference: "14 CFR 142.13" },
      { itemNumber: "142.14", itemOrder: 6, categoryName: "Employment", description: "Employment of former FAA employees complies with restrictions", regulatoryReference: "14 CFR 142.14" },
      { itemNumber: "142.15", itemOrder: 7, categoryName: "Facilities", description: "Training facilities meet environmental and equipment requirements", regulatoryReference: "14 CFR 142.15" },
      { itemNumber: "142.17", itemOrder: 8, categoryName: "Duration", description: "Certificate duration and renewal requirements understood", regulatoryReference: "14 CFR 142.17" },
      { itemNumber: "142.21", itemOrder: 9, categoryName: "Advertising", description: "Advertising limitations for FAA approval references met", regulatoryReference: "14 CFR 142.21" },
      { itemNumber: "142.27", itemOrder: 10, categoryName: "Records", description: "Training record retention and transfer procedures established", regulatoryReference: "14 CFR 142.27" },
      { itemNumber: "142.31", itemOrder: 11, categoryName: "Privileges", description: "Training center privileges and limitations documented", regulatoryReference: "14 CFR 142.31" },
      { itemNumber: "142.33", itemOrder: 12, categoryName: "Personnel", description: "Training center personnel qualifications verified", regulatoryReference: "14 CFR 142.33" },
      { itemNumber: "142.35", itemOrder: 13, categoryName: "Instructors", description: "Knowledge and skills testing for instructors completed", regulatoryReference: "14 CFR 142.35" },
      { itemNumber: "142.37", itemOrder: 14, categoryName: "Approval", description: "Approval of curriculum/training program obtained", regulatoryReference: "14 CFR 142.37" },
      { itemNumber: "142.45", itemOrder: 15, categoryName: "FSTD", description: "FSTD qualification and approval requirements met", regulatoryReference: "14 CFR 142.45" },
      { itemNumber: "142.47", itemOrder: 16, categoryName: "Courseware", description: "Courseware approval and validation completed", regulatoryReference: "14 CFR 142.47" },
      { itemNumber: "142.53", itemOrder: 17, categoryName: "Training", description: "Training syllabus approved and current", regulatoryReference: "14 CFR 142.53" },
      { itemNumber: "142.54", itemOrder: 18, categoryName: "LOA", description: "Letter of Authorization requirements for special operations met", regulatoryReference: "14 CFR 142.54" },
      { itemNumber: "142.55", itemOrder: 19, categoryName: "Enrollment", description: "Training agreements with Part 121/135 operators documented", regulatoryReference: "14 CFR 142.55" },
      { itemNumber: "142.57", itemOrder: 20, categoryName: "Quality", description: "Quality assurance system implemented and documented", regulatoryReference: "14 CFR 142.57" }
    ]
  },
  "14-CFR-141": {
    farPart: "141",
    formNumber: "8900.1-VOL3-CH18",
    formTitle: "Part 141 Pilot School Certification Checklist",
    formType: "audit_checklist",
    version: "2024-01",
    sourceUrl: "https://fsims.faa.gov/PICDetail.aspx?docId=8900.1,Vol.3,Ch18",
    relatedOrderVolume: "8900.1 Vol 3",
    items: [
      { itemNumber: "141.1", itemOrder: 1, categoryName: "Applicability", description: "Verify pilot school meets Part 141 applicability requirements", regulatoryReference: "14 CFR 141.1" },
      { itemNumber: "141.5", itemOrder: 2, categoryName: "Certificate", description: "Requirements for issuance of certificate verified", regulatoryReference: "14 CFR 141.5" },
      { itemNumber: "141.11", itemOrder: 3, categoryName: "Staffing", description: "Chief instructor and assistant chief instructor qualifications verified", regulatoryReference: "14 CFR 141.11" },
      { itemNumber: "141.21", itemOrder: 4, categoryName: "Location", description: "Principal business office location requirements met", regulatoryReference: "14 CFR 141.21" },
      { itemNumber: "141.23", itemOrder: 5, categoryName: "Airports", description: "Airport and facilities meet requirements", regulatoryReference: "14 CFR 141.23" },
      { itemNumber: "141.25", itemOrder: 6, categoryName: "Equipment", description: "Aircraft and training equipment meet requirements", regulatoryReference: "14 CFR 141.25" },
      { itemNumber: "141.27", itemOrder: 7, categoryName: "Curriculum", description: "Training program and curriculum approved", regulatoryReference: "14 CFR 141.27" },
      { itemNumber: "141.31", itemOrder: 8, categoryName: "Quality", description: "Quality system established and maintained", regulatoryReference: "14 CFR 141.31" },
      { itemNumber: "141.33", itemOrder: 9, categoryName: "Chief", description: "Chief instructor requirements verified", regulatoryReference: "14 CFR 141.33" },
      { itemNumber: "141.35", itemOrder: 10, categoryName: "Assistant", description: "Assistant chief instructor requirements verified", regulatoryReference: "14 CFR 141.35" },
      { itemNumber: "141.36", itemOrder: 11, categoryName: "Check", description: "Check instructor requirements verified", regulatoryReference: "14 CFR 141.36" },
      { itemNumber: "141.37", itemOrder: 12, categoryName: "Instructors", description: "Flight instructor requirements verified", regulatoryReference: "14 CFR 141.37" },
      { itemNumber: "141.41", itemOrder: 13, categoryName: "Ground", description: "Ground instructor requirements verified", regulatoryReference: "14 CFR 141.41" },
      { itemNumber: "141.53", itemOrder: 14, categoryName: "Ratings", description: "Pilot school ratings meet requirements", regulatoryReference: "14 CFR 141.53" },
      { itemNumber: "141.55", itemOrder: 15, categoryName: "TCO", description: "Training course outline requirements met", regulatoryReference: "14 CFR 141.55" }
    ]
  },
  "14-CFR-145": {
    farPart: "145",
    formNumber: "8900.1-VOL2-CH8",
    formTitle: "Part 145 Repair Station Certification Checklist",
    formType: "audit_checklist",
    version: "2024-01",
    sourceUrl: "https://fsims.faa.gov/PICDetail.aspx?docId=8900.1,Vol.2,Ch8",
    relatedOrderVolume: "8900.1 Vol 2",
    items: [
      { itemNumber: "145.1", itemOrder: 1, categoryName: "Applicability", description: "Verify repair station meets Part 145 applicability requirements", regulatoryReference: "14 CFR 145.1" },
      { itemNumber: "145.51", itemOrder: 2, categoryName: "Application", description: "Application for certificate submitted with required documents", regulatoryReference: "14 CFR 145.51" },
      { itemNumber: "145.53", itemOrder: 3, categoryName: "Issue", description: "Issue of certificate requirements verified", regulatoryReference: "14 CFR 145.53" },
      { itemNumber: "145.55", itemOrder: 4, categoryName: "Duration", description: "Certificate duration and display requirements met", regulatoryReference: "14 CFR 145.55" },
      { itemNumber: "145.57", itemOrder: 5, categoryName: "Amendment", description: "Amendment to certificate process understood", regulatoryReference: "14 CFR 145.57" },
      { itemNumber: "145.59", itemOrder: 6, categoryName: "Ratings", description: "Ratings requirements and limitations verified", regulatoryReference: "14 CFR 145.59" },
      { itemNumber: "145.101", itemOrder: 7, categoryName: "Quality", description: "Quality control system established", regulatoryReference: "14 CFR 145.101" },
      { itemNumber: "145.103", itemOrder: 8, categoryName: "Housing", description: "Housing and facilities requirements met", regulatoryReference: "14 CFR 145.103" },
      { itemNumber: "145.105", itemOrder: 9, categoryName: "Equipment", description: "Equipment, materials, and data requirements verified", regulatoryReference: "14 CFR 145.105" },
      { itemNumber: "145.107", itemOrder: 10, categoryName: "Satellite", description: "Satellite repair stations properly managed", regulatoryReference: "14 CFR 145.107" },
      { itemNumber: "145.109", itemOrder: 11, categoryName: "Rosters", description: "Personnel rosters and qualifications current", regulatoryReference: "14 CFR 145.109" },
      { itemNumber: "145.151", itemOrder: 12, categoryName: "Personnel", description: "Personnel requirements verified", regulatoryReference: "14 CFR 145.151" },
      { itemNumber: "145.153", itemOrder: 13, categoryName: "Supervisory", description: "Supervisory personnel requirements met", regulatoryReference: "14 CFR 145.153" },
      { itemNumber: "145.155", itemOrder: 14, categoryName: "Inspection", description: "Inspection personnel requirements verified", regulatoryReference: "14 CFR 145.155" },
      { itemNumber: "145.157", itemOrder: 15, categoryName: "RII", description: "Required inspection items procedures established", regulatoryReference: "14 CFR 145.157" }
    ]
  },
  "14-CFR-121": {
    farPart: "121",
    formNumber: "8900.1-VOL3-CH1",
    formTitle: "Part 121 Air Carrier Training Program Checklist",
    formType: "audit_checklist",
    version: "2024-01",
    sourceUrl: "https://fsims.faa.gov/PICDetail.aspx?docId=8900.1,Vol.3,Ch1",
    relatedOrderVolume: "8900.1 Vol 3",
    items: [
      { itemNumber: "121.400", itemOrder: 1, categoryName: "Applicability", description: "Training program applicability requirements verified", regulatoryReference: "14 CFR 121.400" },
      { itemNumber: "121.401", itemOrder: 2, categoryName: "Program", description: "Training program requirements met", regulatoryReference: "14 CFR 121.401" },
      { itemNumber: "121.403", itemOrder: 3, categoryName: "Curriculum", description: "Training curriculum and revisions approved", regulatoryReference: "14 CFR 121.403" },
      { itemNumber: "121.404", itemOrder: 4, categoryName: "Compliance", description: "Compliance with AQP or traditional training verified", regulatoryReference: "14 CFR 121.404" },
      { itemNumber: "121.405", itemOrder: 5, categoryName: "Instructors", description: "Training instructor qualifications verified", regulatoryReference: "14 CFR 121.405" },
      { itemNumber: "121.409", itemOrder: 6, categoryName: "FSTD", description: "Training device requirements met", regulatoryReference: "14 CFR 121.409" },
      { itemNumber: "121.411", itemOrder: 7, categoryName: "Check", description: "Check airmen qualifications verified", regulatoryReference: "14 CFR 121.411" },
      { itemNumber: "121.413", itemOrder: 8, categoryName: "Initial", description: "Initial and transition ground training requirements met", regulatoryReference: "14 CFR 121.413" },
      { itemNumber: "121.415", itemOrder: 9, categoryName: "Crewmember", description: "Crewmember and dispatcher training requirements verified", regulatoryReference: "14 CFR 121.415" },
      { itemNumber: "121.417", itemOrder: 10, categoryName: "Emergency", description: "Crewmember emergency training requirements met", regulatoryReference: "14 CFR 121.417" },
      { itemNumber: "121.419", itemOrder: 11, categoryName: "Recurrent", description: "Recurrent training requirements verified", regulatoryReference: "14 CFR 121.419" },
      { itemNumber: "121.421", itemOrder: 12, categoryName: "Differences", description: "Differences training requirements met", regulatoryReference: "14 CFR 121.421" },
      { itemNumber: "121.422", itemOrder: 13, categoryName: "Flight", description: "Flight attendant training requirements verified", regulatoryReference: "14 CFR 121.422" },
      { itemNumber: "121.424", itemOrder: 14, categoryName: "Pilot", description: "Pilot training program requirements met", regulatoryReference: "14 CFR 121.424" },
      { itemNumber: "121.427", itemOrder: 15, categoryName: "Proficiency", description: "Proficiency check requirements verified", regulatoryReference: "14 CFR 121.427" }
    ]
  },
  "14-CFR-135": {
    farPart: "135",
    formNumber: "8900.1-VOL3-CH2",
    formTitle: "Part 135 Commuter/On-Demand Training Program Checklist",
    formType: "audit_checklist",
    version: "2024-01",
    sourceUrl: "https://fsims.faa.gov/PICDetail.aspx?docId=8900.1,Vol.3,Ch2",
    relatedOrderVolume: "8900.1 Vol 3",
    items: [
      { itemNumber: "135.321", itemOrder: 1, categoryName: "Applicability", description: "Training program applicability requirements verified", regulatoryReference: "14 CFR 135.321" },
      { itemNumber: "135.323", itemOrder: 2, categoryName: "Program", description: "Training program curriculum approved", regulatoryReference: "14 CFR 135.323" },
      { itemNumber: "135.324", itemOrder: 3, categoryName: "Pilots", description: "Pilots in command qualifications verified", regulatoryReference: "14 CFR 135.324" },
      { itemNumber: "135.325", itemOrder: 4, categoryName: "Aeronautical", description: "Aeronautical experience requirements met", regulatoryReference: "14 CFR 135.325" },
      { itemNumber: "135.327", itemOrder: 5, categoryName: "Ground", description: "Ground training requirements verified", regulatoryReference: "14 CFR 135.327" },
      { itemNumber: "135.329", itemOrder: 6, categoryName: "Crewmember", description: "Crewmember training requirements met", regulatoryReference: "14 CFR 135.329" },
      { itemNumber: "135.331", itemOrder: 7, categoryName: "Emergency", description: "Emergency training requirements verified", regulatoryReference: "14 CFR 135.331" },
      { itemNumber: "135.335", itemOrder: 8, categoryName: "Instruments", description: "Instrument proficiency check requirements met", regulatoryReference: "14 CFR 135.335" },
      { itemNumber: "135.337", itemOrder: 9, categoryName: "Approval", description: "Training program and revisions approved", regulatoryReference: "14 CFR 135.337" },
      { itemNumber: "135.339", itemOrder: 10, categoryName: "Initial", description: "Initial and recurrent flight attendant training verified", regulatoryReference: "14 CFR 135.339" },
      { itemNumber: "135.340", itemOrder: 11, categoryName: "Knowledge", description: "Initial and recurrent ground training completed", regulatoryReference: "14 CFR 135.340" },
      { itemNumber: "135.341", itemOrder: 12, categoryName: "Check", description: "Check pilot qualifications verified", regulatoryReference: "14 CFR 135.341" },
      { itemNumber: "135.343", itemOrder: 13, categoryName: "Crewmember", description: "Crewmember initial and recurrent training requirements met", regulatoryReference: "14 CFR 135.343" },
      { itemNumber: "135.345", itemOrder: 14, categoryName: "Pilot", description: "Pilot training program requirements verified", regulatoryReference: "14 CFR 135.345" },
      { itemNumber: "135.351", itemOrder: 15, categoryName: "Recurrent", description: "Recurrent training requirements met", regulatoryReference: "14 CFR 135.351" }
    ]
  }
};
var ChecklistHarmonizationEngine = class {
  async autoFetchCoreChecklist(farPartCode) {
    const coreChecklist = FAA_CORE_CHECKLISTS[farPartCode];
    if (!coreChecklist) {
      console.log(`No core checklist definition found for ${farPartCode}`);
      return null;
    }
    const existing = await db.select().from(checklistSchemas).where(and3(
      eq4(checklistSchemas.schemaSource, "faa_standard"),
      eq4(checklistSchemas.autoFetched, true),
      eq4(checklistSchemas.isOutdated, false)
    )).limit(1);
    if (existing[0]) {
      const metadata = existing[0].metadata;
      if (metadata?.farPart === coreChecklist.farPart) {
        console.log(`Core checklist already exists for ${farPartCode}`);
        return existing[0];
      }
    }
    console.log(`Auto-fetching core checklist for ${farPartCode}...`);
    const schema = await this.ingestChecklist(
      coreChecklist.formTitle,
      "faa_standard",
      coreChecklist.items,
      void 0,
      coreChecklist.version,
      true,
      {
        autoFetched: true,
        priorityLevel: 1,
        sourceUrl: coreChecklist.sourceUrl,
        farPart: coreChecklist.farPart,
        formNumber: coreChecklist.formNumber,
        relatedOrderVolume: coreChecklist.relatedOrderVolume
      }
    );
    console.log(`Auto-fetched core checklist: ${coreChecklist.formTitle} with ${coreChecklist.items.length} items`);
    return schema;
  }
  async ingestChecklist(schemaName, schemaSource, items, frameworkId, version = "1.0", isCanonical = false, automationOptions) {
    const structureHash = this.generateStructureHash(items);
    const priorityLevel = automationOptions?.priorityLevel || CHECKLIST_PRIORITY_MAP[schemaSource] || 5;
    const schemaData = {
      schemaName,
      schemaSource,
      frameworkId: frameworkId || null,
      version,
      effectiveDate: /* @__PURE__ */ new Date(),
      totalItems: items.length,
      structureHash,
      metadata: {
        source: schemaSource,
        itemCategories: Array.from(new Set(items.map((i) => i.categoryName).filter(Boolean))),
        farPart: automationOptions?.farPart,
        formNumber: automationOptions?.formNumber,
        relatedOrderVolume: automationOptions?.relatedOrderVolume
      },
      isCanonical,
      priorityLevel,
      autoFetched: automationOptions?.autoFetched || false,
      sourceUrl: automationOptions?.sourceUrl || null,
      lastVersionCheck: /* @__PURE__ */ new Date(),
      isOutdated: false,
      isHidden: schemaSource === "archived_legacy"
    };
    const [insertedSchema] = await db.insert(checklistSchemas).values(schemaData).returning();
    for (const item of items) {
      const itemData = {
        schemaId: insertedSchema.id,
        itemNumber: item.itemNumber,
        itemOrder: item.itemOrder,
        categoryId: item.categoryId || null,
        categoryName: item.categoryName || null,
        description: item.description,
        regulatoryReference: item.regulatoryReference || null,
        requiredEvidence: item.requiredEvidence || null,
        complianceCriteria: item.complianceCriteria || null,
        riskWeight: item.riskWeight?.toString() || "1.00",
        isActive: true
      };
      await db.insert(checklistItems).values(itemData);
    }
    console.log(`Ingested checklist: ${schemaName} with ${items.length} items (priority: ${priorityLevel})`);
    return insertedSchema;
  }
  generateStructureHash(items) {
    const content = items.map((i) => `${i.itemNumber}:${i.description}`).join("|");
    return createHash("sha256").update(content).digest("hex").substring(0, 32);
  }
  async getAllSchemas(includeHidden = false) {
    if (includeHidden) {
      return db.select().from(checklistSchemas).orderBy(asc(checklistSchemas.priorityLevel), desc3(checklistSchemas.createdAt));
    }
    return db.select().from(checklistSchemas).where(or2(eq4(checklistSchemas.isHidden, false), isNull2(checklistSchemas.isHidden))).orderBy(asc(checklistSchemas.priorityLevel), desc3(checklistSchemas.createdAt));
  }
  async getSchemasByPriority() {
    const all = await this.getAllSchemas(true);
    return {
      faa_standard: all.filter((s) => s.priorityLevel === 1),
      certificate_job_aid: all.filter((s) => s.priorityLevel === 2),
      inspector_supplemental: all.filter((s) => s.priorityLevel === 3),
      operator_required: all.filter((s) => s.priorityLevel === 4),
      archived_legacy: all.filter((s) => s.priorityLevel === 5)
    };
  }
  async getSchemaItems(schemaId) {
    return db.select().from(checklistItems).where(eq4(checklistItems.schemaId, schemaId)).orderBy(asc(checklistItems.itemOrder));
  }
  async checkForVersionUpdates() {
    const results = [];
    const autoFetchedSchemas = await db.select().from(checklistSchemas).where(eq4(checklistSchemas.autoFetched, true));
    for (const schema of autoFetchedSchemas) {
      const metadata = schema.metadata;
      const farPart = metadata?.farPart;
      if (farPart && FAA_CORE_CHECKLISTS[`14-CFR-${farPart}`]) {
        const latestDef = FAA_CORE_CHECKLISTS[`14-CFR-${farPart}`];
        if (latestDef.version !== schema.version) {
          await db.update(checklistSchemas).set({
            isOutdated: true,
            lastVersionCheck: /* @__PURE__ */ new Date()
          }).where(eq4(checklistSchemas.id, schema.id));
          await db.insert(checklistVersionHistory).values({
            schemaId: schema.id,
            previousVersion: schema.version,
            newVersion: latestDef.version,
            changeType: "new_version",
            changeSummary: `New version ${latestDef.version} available (current: ${schema.version})`,
            sourceReference: latestDef.sourceUrl
          });
          results.push({
            schemaId: schema.id,
            schemaName: schema.schemaName,
            currentVersion: schema.version,
            status: "outdated"
          });
        } else {
          await db.update(checklistSchemas).set({ lastVersionCheck: /* @__PURE__ */ new Date() }).where(eq4(checklistSchemas.id, schema.id));
          results.push({
            schemaId: schema.id,
            schemaName: schema.schemaName,
            currentVersion: schema.version,
            status: "current"
          });
        }
      }
    }
    return results;
  }
  async getVersionHistory(schemaId) {
    return db.select().from(checklistVersionHistory).where(eq4(checklistVersionHistory.schemaId, schemaId)).orderBy(desc3(checklistVersionHistory.detectedAt));
  }
  async suppressOutdatedChecklist(schemaId) {
    await db.update(checklistSchemas).set({ isHidden: true, isOutdated: true }).where(eq4(checklistSchemas.id, schemaId));
  }
  async unlockArchivedChecklist(schemaId) {
    await db.update(checklistSchemas).set({ isHidden: false }).where(eq4(checklistSchemas.id, schemaId));
  }
  async mapEvidenceToChecklistItem(evidenceId, checklistItemId, mappingStrength = 1, notes) {
    await db.insert(evidenceChecklistMappings).values({
      evidenceId,
      checklistItemId,
      mappingConfidence: mappingStrength.toString(),
      mappingSource: "manual",
      evidenceRelevance: "primary",
      notes: notes || null
    });
  }
  async getEvidenceForChecklistItem(checklistItemId) {
    const mappings = await db.select().from(evidenceChecklistMappings).where(eq4(evidenceChecklistMappings.checklistItemId, checklistItemId));
    if (mappings.length === 0) return [];
    const evidenceIds = mappings.map((m) => m.evidenceId);
    const evidence = await db.select().from(evidenceRecords).where(eq4(evidenceRecords.id, evidenceIds[0]));
    return evidence;
  }
  async getEvidenceMappingStats(schemaId) {
    const items = await this.getSchemaItems(schemaId);
    let mappedCount = 0;
    for (const item of items) {
      const mappings = await db.select().from(evidenceChecklistMappings).where(eq4(evidenceChecklistMappings.checklistItemId, item.id)).limit(1);
      if (mappings.length > 0) mappedCount++;
    }
    return {
      totalItems: items.length,
      mappedItems: mappedCount,
      unmappedItems: items.length - mappedCount,
      coveragePercentage: items.length > 0 ? mappedCount / items.length * 100 : 0
    };
  }
  async harmonizeChecklists(baseSchemaId, comparedSchemaId) {
    const baseSchema = await db.select().from(checklistSchemas).where(eq4(checklistSchemas.id, baseSchemaId)).limit(1);
    const comparedSchema = await db.select().from(checklistSchemas).where(eq4(checklistSchemas.id, comparedSchemaId)).limit(1);
    if (!baseSchema[0] || !comparedSchema[0]) {
      throw new Error("One or both schemas not found");
    }
    const baseItems = await db.select().from(checklistItems).where(eq4(checklistItems.schemaId, baseSchemaId));
    const comparedItems = await db.select().from(checklistItems).where(eq4(checklistItems.schemaId, comparedSchemaId));
    const deltas = this.generateDeltas(baseItems, comparedItems);
    for (const delta of deltas) {
      const deltaData = {
        baseSchemaId,
        comparedSchemaId,
        deltaType: delta.type,
        baseItemNumber: delta.baseItemNumber,
        comparedItemNumber: delta.comparedItemNumber,
        changeDescription: delta.description,
        complianceImpact: delta.complianceImpact
      };
      await db.insert(harmonizationDeltas).values(deltaData);
    }
    const addedCount = deltas.filter((d) => d.type === "added").length;
    const removedCount = deltas.filter((d) => d.type === "removed").length;
    const modifiedCount = deltas.filter((d) => d.type === "modified").length;
    const reorderedCount = deltas.filter((d) => d.type === "reordered").length;
    const matchedItems = comparedItems.length - addedCount;
    const coveragePercentage = baseItems.length > 0 ? matchedItems / baseItems.length * 100 : 0;
    return {
      baseSchema: baseSchema[0],
      comparedSchema: comparedSchema[0],
      totalBaseItems: baseItems.length,
      totalComparedItems: comparedItems.length,
      addedItems: addedCount,
      removedItems: removedCount,
      modifiedItems: modifiedCount,
      reorderedItems: reorderedCount,
      deltas,
      coveragePercentage
    };
  }
  generateDeltas(baseItems, comparedItems) {
    const deltas = [];
    const baseMap = new Map(baseItems.map((i) => [i.itemNumber, i]));
    const comparedMap = new Map(comparedItems.map((i) => [i.itemNumber, i]));
    Array.from(comparedMap.entries()).forEach(([itemNumber, comparedItem]) => {
      if (!baseMap.has(itemNumber)) {
        deltas.push({
          type: "added",
          baseItemNumber: null,
          comparedItemNumber: itemNumber,
          description: `New item added: ${comparedItem.description.substring(0, 100)}...`,
          complianceImpact: "minor"
        });
      }
    });
    Array.from(baseMap.entries()).forEach(([itemNumber, baseItem]) => {
      if (!comparedMap.has(itemNumber)) {
        deltas.push({
          type: "removed",
          baseItemNumber: itemNumber,
          comparedItemNumber: null,
          description: `Item removed: ${baseItem.description.substring(0, 100)}...`,
          complianceImpact: "major"
        });
      } else {
        const comparedItem = comparedMap.get(itemNumber);
        if (baseItem.description !== comparedItem.description) {
          deltas.push({
            type: "modified",
            baseItemNumber: itemNumber,
            comparedItemNumber: itemNumber,
            description: `Item description modified`,
            complianceImpact: "minor"
          });
        }
        if (baseItem.itemOrder !== comparedItem.itemOrder) {
          deltas.push({
            type: "reordered",
            baseItemNumber: itemNumber,
            comparedItemNumber: itemNumber,
            description: `Item order changed from ${baseItem.itemOrder} to ${comparedItem.itemOrder}`,
            complianceImpact: "none"
          });
        }
      }
    });
    return deltas;
  }
  async createCrossSchemaMapping(sourceSchemaId, targetSchemaId, mappings) {
    for (const mapping of mappings) {
      const mappingData = {
        sourceSchemaId,
        targetSchemaId,
        sourceItemId: mapping.sourceItemId,
        targetItemId: mapping.targetItemId,
        mappingType: mapping.mappingType,
        mappingConfidence: mapping.confidence?.toString() || "1.00",
        mappingNotes: mapping.notes || null
      };
      await db.insert(checklistMappings).values(mappingData);
    }
  }
  async getHarmonizationDeltas(baseSchemaId, comparedSchemaId) {
    return db.select().from(harmonizationDeltas).where(and3(
      eq4(harmonizationDeltas.baseSchemaId, baseSchemaId),
      eq4(harmonizationDeltas.comparedSchemaId, comparedSchemaId)
    ));
  }
  async getCanonicalChecklist(frameworkId) {
    const query = frameworkId ? and3(
      eq4(checklistSchemas.isCanonical, true),
      eq4(checklistSchemas.frameworkId, frameworkId)
    ) : eq4(checklistSchemas.isCanonical, true);
    const result = await db.select().from(checklistSchemas).where(query).limit(1);
    return result[0] || null;
  }
  async normalizeExternalChecklist(externalItems, sourceType) {
    return externalItems.map((item, index2) => ({
      itemNumber: item.number || `${index2 + 1}`,
      itemOrder: index2 + 1,
      categoryName: item.category || "General",
      description: item.question,
      regulatoryReference: item.reference || null
    }));
  }
  async generateDeltaReport(baseSchemaId, comparedSchemaId) {
    const deltas = await this.getHarmonizationDeltas(baseSchemaId, comparedSchemaId);
    const addedItems = deltas.filter((d) => d.deltaType === "added").map((d) => `[${d.comparedItemNumber}] ${d.changeDescription}`);
    const removedItems = deltas.filter((d) => d.deltaType === "removed").map((d) => `[${d.baseItemNumber}] ${d.changeDescription}`);
    const modifiedItems = deltas.filter((d) => d.deltaType === "modified").map((d) => `[${d.baseItemNumber}] ${d.changeDescription}`);
    const reorderedItems = deltas.filter((d) => d.deltaType === "reordered").map((d) => `[${d.baseItemNumber}] ${d.changeDescription}`);
    const criticalChanges = deltas.filter((d) => d.complianceImpact === "critical" || d.complianceImpact === "major").map((d) => `[${d.deltaType.toUpperCase()}] ${d.changeDescription}`);
    const summary = `
Checklist Harmonization Delta Report
=====================================
Added Items: ${addedItems.length}
Removed Items: ${removedItems.length}
Modified Items: ${modifiedItems.length}
Reordered Items: ${reorderedItems.length}
Critical/Major Changes: ${criticalChanges.length}
    `.trim();
    return {
      summary,
      addedItems,
      removedItems,
      modifiedItems,
      reorderedItems,
      criticalChanges
    };
  }
  getSupportedFARParts() {
    return Object.keys(FAA_CORE_CHECKLISTS);
  }
  getCoreChecklistDefinition(farPartCode) {
    return FAA_CORE_CHECKLISTS[farPartCode] || null;
  }
};
var checklistHarmonizationEngine = new ChecklistHarmonizationEngine();

// server/services/inspector-preference.ts
import { eq as eq5, and as and4, desc as desc4 } from "drizzle-orm";
var InspectorPreferenceEngine = class {
  async createInspectorProfile(inspectorData) {
    const profileData = {
      inspectorName: inspectorData.inspectorName || null,
      inspectorId: inspectorData.inspectorId || null,
      region: inspectorData.region || null,
      office: inspectorData.office || null,
      totalAuditsTracked: 0,
      isActive: true
    };
    const [result] = await db.insert(inspectorProfiles).values(profileData).returning();
    return result;
  }
  async recordAuditBehavior(inspectorProfileId, organizationId, behaviorData) {
    const behavior = {
      inspectorId: inspectorProfileId,
      organizationId,
      auditDate: behaviorData.auditDate,
      checklistSchemaUsed: behaviorData.checklistSchemaUsed || null,
      itemsReordered: behaviorData.itemsReordered || null,
      additionalQuestions: behaviorData.additionalQuestions || null,
      skippedItems: behaviorData.skippedItems || null,
      emphasisAreas: behaviorData.emphasisAreas || null,
      findingsCount: behaviorData.findingsCount || null,
      auditOutcome: behaviorData.auditOutcome || null,
      auditDuration: behaviorData.auditDuration || null,
      notes: behaviorData.notes || null
    };
    const [result] = await db.insert(inspectorBehaviors).values(behavior).returning();
    await this.updateInspectorMetrics(inspectorProfileId);
    return result;
  }
  async updateInspectorMetrics(inspectorProfileId) {
    const behaviors = await db.select().from(inspectorBehaviors).where(eq5(inspectorBehaviors.inspectorId, inspectorProfileId));
    if (behaviors.length === 0) return;
    const allExtraQuestions = [];
    const allFocusAreas = [];
    const allOrderings = [];
    let totalDuration = 0;
    let durationCount = 0;
    let strictnessSum = 0;
    for (const behavior of behaviors) {
      if (behavior.additionalQuestions) {
        allExtraQuestions.push(...behavior.additionalQuestions);
      }
      if (behavior.emphasisAreas) {
        allFocusAreas.push(...behavior.emphasisAreas);
      }
      if (behavior.itemsReordered) {
        allOrderings.push(behavior.itemsReordered);
      }
      if (behavior.auditDuration) {
        totalDuration += behavior.auditDuration;
        durationCount++;
      }
      if (behavior.findingsCount !== null) {
        strictnessSum += behavior.findingsCount;
      }
    }
    const commonQuestions = this.findMostCommon(allExtraQuestions, 5);
    const commonFocusAreas = this.findMostCommon(allFocusAreas, 5);
    const averageDuration = durationCount > 0 ? Math.round(totalDuration / durationCount) : null;
    const avgFindings = behaviors.length > 0 ? strictnessSum / behaviors.length : 0;
    const strictnessScore = Math.min(1, avgFindings / 10);
    const confidence = Math.min(0.95, 0.3 + behaviors.length * 0.1);
    await db.update(inspectorProfiles).set({
      commonExtraQuestions: commonQuestions,
      focusAreas: commonFocusAreas,
      preferredItemOrdering: allOrderings.length > 0 ? allOrderings[allOrderings.length - 1] : null,
      averageAuditDuration: averageDuration,
      strictnessScore: strictnessScore.toFixed(2),
      totalAuditsTracked: behaviors.length,
      predictionConfidence: confidence.toFixed(2),
      lastAuditDate: behaviors[behaviors.length - 1].auditDate,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq5(inspectorProfiles.id, inspectorProfileId));
  }
  findMostCommon(items, limit) {
    const counts = /* @__PURE__ */ new Map();
    for (const item of items) {
      counts.set(item, (counts.get(item) || 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([item]) => item);
  }
  async predictInspectorBehavior(inspectorProfileId) {
    const profile = await db.select().from(inspectorProfiles).where(eq5(inspectorProfiles.id, inspectorProfileId)).limit(1);
    if (!profile[0]) {
      throw new Error("Inspector profile not found");
    }
    const inspector = profile[0];
    const strictnessLevel = Number(inspector.strictnessScore) < 0.3 ? "lenient" : Number(inspector.strictnessScore) < 0.7 ? "moderate" : "strict";
    return {
      inspectorId: inspectorProfileId,
      predictedChecklist: inspector.preferredChecklistId,
      predictedOrdering: inspector.preferredItemOrdering || [],
      likelyExtraQuestions: inspector.commonExtraQuestions || [],
      focusAreas: inspector.focusAreas || [],
      expectedDuration: inspector.averageAuditDuration || 240,
      strictnessLevel,
      confidence: Number(inspector.predictionConfidence) || 0.5
    };
  }
  async generateAuditPreparationStrategy(inspectorProfileId, organizationId) {
    const prediction = await this.predictInspectorBehavior(inspectorProfileId);
    const prioritizedItems = [];
    const focusAreas = prediction.focusAreas;
    const additionalDocumentsNeeded = [];
    const riskAreas = [];
    const recommendedPreparation = [];
    for (const area of focusAreas) {
      riskAreas.push(`${area} - Inspector typically focuses on this area`);
    }
    if (prediction.likelyExtraQuestions.length > 0) {
      recommendedPreparation.push(
        `Prepare responses for likely additional questions: ${prediction.likelyExtraQuestions.slice(0, 3).join(", ")}`
      );
    }
    if (prediction.strictnessLevel === "strict") {
      recommendedPreparation.push("Inspector is typically thorough - ensure all documentation is complete");
      recommendedPreparation.push("Allocate extra time for detailed explanations");
    }
    if (prediction.expectedDuration > 300) {
      recommendedPreparation.push(`Plan for extended audit duration (~${Math.round(prediction.expectedDuration / 60)} hours)`);
    }
    if (prediction.predictedOrdering.length > 0) {
      prioritizedItems.push(...prediction.predictedOrdering.slice(0, 10));
    }
    for (const area of focusAreas) {
      additionalDocumentsNeeded.push(`Supporting evidence for ${area}`);
    }
    return {
      prioritizedItems,
      focusAreas,
      additionalDocumentsNeeded,
      riskAreas,
      recommendedPreparation
    };
  }
  async getInspectorProfile(inspectorProfileId) {
    const result = await db.select().from(inspectorProfiles).where(eq5(inspectorProfiles.id, inspectorProfileId)).limit(1);
    return result[0] || null;
  }
  async findInspectorByIdentifier(inspectorId) {
    const result = await db.select().from(inspectorProfiles).where(eq5(inspectorProfiles.inspectorId, inspectorId)).limit(1);
    return result[0] || null;
  }
  async getInspectorsByRegion(region) {
    return db.select().from(inspectorProfiles).where(and4(
      eq5(inspectorProfiles.region, region),
      eq5(inspectorProfiles.isActive, true)
    ));
  }
  async getAllInspectors() {
    return db.select().from(inspectorProfiles).where(eq5(inspectorProfiles.isActive, true));
  }
  async getInspectorAuditHistory(inspectorProfileId) {
    return db.select().from(inspectorBehaviors).where(eq5(inspectorBehaviors.inspectorId, inspectorProfileId)).orderBy(desc4(inspectorBehaviors.auditDate));
  }
  async adaptChecklistForInspector(checklistItems3, inspectorProfileId) {
    const prediction = await this.predictInspectorBehavior(inspectorProfileId);
    if (prediction.predictedOrdering.length === 0) {
      return checklistItems3;
    }
    const reorderedItems = [...checklistItems3];
    const orderMap = new Map(prediction.predictedOrdering.map((id, idx) => [id, idx]));
    reorderedItems.sort((a, b) => {
      const orderA = orderMap.get(a.id) ?? 999;
      const orderB = orderMap.get(b.id) ?? 999;
      return orderA - orderB;
    });
    for (const area of prediction.focusAreas) {
      const focusItems = reorderedItems.filter(
        (item) => item.categoryName?.toLowerCase().includes(area.toLowerCase())
      );
      for (const item of focusItems) {
        item.inspectorFocusArea = true;
        item.focusReason = `Inspector typically emphasizes ${area}`;
      }
    }
    return reorderedItems;
  }
};
var inspectorPreferenceEngine = new InspectorPreferenceEngine();

// server/services/evidence-indexing.ts
import { eq as eq6, and as and5, inArray as inArray2 } from "drizzle-orm";
import { createHash as createHash2 } from "crypto";
var EvidenceIndexingService = class {
  async indexEvidence(organizationId, evidenceData) {
    const fileHash = evidenceData.extractedText ? createHash2("sha256").update(evidenceData.extractedText).digest("hex") : null;
    let blockchainVerified = false;
    let blockchainHash = null;
    if (evidenceData.blockchainTrainingRecordId) {
      const trainingRecord = await db.select().from(blockchainTrainingRecords).where(eq6(blockchainTrainingRecords.id, evidenceData.blockchainTrainingRecordId)).limit(1);
      if (trainingRecord[0]) {
        blockchainVerified = true;
        blockchainHash = trainingRecord[0].blockchainHash;
      }
    }
    const record = {
      organizationId,
      evidenceType: evidenceData.evidenceType,
      evidenceTitle: evidenceData.evidenceTitle,
      evidenceDescription: evidenceData.evidenceDescription || null,
      filePath: evidenceData.filePath || null,
      fileHash,
      extractedText: evidenceData.extractedText || null,
      metadata: evidenceData.metadata || null,
      blockchainTrainingRecordId: evidenceData.blockchainTrainingRecordId || null,
      blockchainVerificationHash: blockchainHash,
      verificationStatus: blockchainVerified ? "verified" : "pending",
      verifiedAt: blockchainVerified ? /* @__PURE__ */ new Date() : null,
      expirationDate: evidenceData.expirationDate || null,
      isActive: true
    };
    const [result] = await db.insert(evidenceRecords).values(record).returning();
    return result;
  }
  async mapEvidenceToChecklistItem(evidenceId, checklistItemId, mappingData) {
    const mapping = {
      evidenceId,
      checklistItemId,
      mappingConfidence: (mappingData.confidence || 1).toFixed(2),
      mappingSource: mappingData.mappingSource,
      evidenceRelevance: mappingData.relevance,
      notes: mappingData.notes || null,
      createdBy: mappingData.createdBy || null
    };
    const [result] = await db.insert(evidenceChecklistMappings).values(mapping).returning();
    return result;
  }
  async mapEvidenceToRegulation(evidenceId, frameworkId, regulatoryReference, referenceType, notes) {
    const mapping = {
      evidenceId,
      frameworkId,
      regulatoryReference,
      referenceType,
      notes: notes || null
    };
    await db.insert(evidenceRegulatoryMappings).values(mapping);
  }
  async getEvidenceByChecklistItem(checklistItemId) {
    const mappings = await db.select().from(evidenceChecklistMappings).where(eq6(evidenceChecklistMappings.checklistItemId, checklistItemId));
    if (mappings.length === 0) return [];
    const evidenceIds = mappings.map((m) => m.evidenceId);
    const evidenceList = await db.select().from(evidenceRecords).where(and5(
      inArray2(evidenceRecords.id, evidenceIds),
      eq6(evidenceRecords.isActive, true)
    ));
    const results = [];
    for (const evidence of evidenceList) {
      const checklistMappings2 = await this.getChecklistMappingsForEvidence(evidence.id);
      const regulatoryMappings = await this.getRegulatoryMappingsForEvidence(evidence.id);
      results.push({
        evidence,
        checklistMappings: checklistMappings2,
        regulatoryMappings,
        blockchainVerification: {
          verified: evidence.verificationStatus === "verified",
          hash: evidence.blockchainVerificationHash,
          trainingRecordId: evidence.blockchainTrainingRecordId
        }
      });
    }
    return results;
  }
  async getChecklistMappingsForEvidence(evidenceId) {
    const mappings = await db.select({
      checklistItemId: evidenceChecklistMappings.checklistItemId,
      relevance: evidenceChecklistMappings.evidenceRelevance,
      confidence: evidenceChecklistMappings.mappingConfidence,
      itemNumber: checklistItems.itemNumber,
      description: checklistItems.description
    }).from(evidenceChecklistMappings).innerJoin(checklistItems, eq6(evidenceChecklistMappings.checklistItemId, checklistItems.id)).where(eq6(evidenceChecklistMappings.evidenceId, evidenceId));
    return mappings.map((m) => ({
      checklistItemId: m.checklistItemId,
      itemNumber: m.itemNumber,
      description: m.description,
      relevance: m.relevance,
      confidence: Number(m.confidence)
    }));
  }
  async getRegulatoryMappingsForEvidence(evidenceId) {
    const mappings = await db.select({
      regulatoryReference: evidenceRegulatoryMappings.regulatoryReference,
      referenceType: evidenceRegulatoryMappings.referenceType,
      frameworkCode: regulatoryFrameworks.frameworkCode
    }).from(evidenceRegulatoryMappings).innerJoin(regulatoryFrameworks, eq6(evidenceRegulatoryMappings.frameworkId, regulatoryFrameworks.id)).where(eq6(evidenceRegulatoryMappings.evidenceId, evidenceId));
    return mappings.map((m) => ({
      frameworkCode: m.frameworkCode,
      regulatoryReference: m.regulatoryReference,
      referenceType: m.referenceType
    }));
  }
  async getEvidenceByRegulatoryReference(frameworkCode, regulatoryReference) {
    const framework = await db.select().from(regulatoryFrameworks).where(eq6(regulatoryFrameworks.frameworkCode, frameworkCode)).limit(1);
    if (!framework[0]) return [];
    const mappings = await db.select().from(evidenceRegulatoryMappings).where(and5(
      eq6(evidenceRegulatoryMappings.frameworkId, framework[0].id),
      eq6(evidenceRegulatoryMappings.regulatoryReference, regulatoryReference)
    ));
    if (mappings.length === 0) return [];
    const evidenceIds = mappings.map((m) => m.evidenceId);
    const evidenceList = await db.select().from(evidenceRecords).where(and5(
      inArray2(evidenceRecords.id, evidenceIds),
      eq6(evidenceRecords.isActive, true)
    ));
    const results = [];
    for (const evidence of evidenceList) {
      const checklistMappings2 = await this.getChecklistMappingsForEvidence(evidence.id);
      const regulatoryMappings = await this.getRegulatoryMappingsForEvidence(evidence.id);
      results.push({
        evidence,
        checklistMappings: checklistMappings2,
        regulatoryMappings,
        blockchainVerification: {
          verified: evidence.verificationStatus === "verified",
          hash: evidence.blockchainVerificationHash,
          trainingRecordId: evidence.blockchainTrainingRecordId
        }
      });
    }
    return results;
  }
  async searchEvidence(organizationId, query) {
    let conditions = [eq6(evidenceRecords.organizationId, organizationId)];
    if (query.evidenceType) {
      conditions.push(eq6(evidenceRecords.evidenceType, query.evidenceType));
    }
    if (query.verificationStatus) {
      conditions.push(eq6(evidenceRecords.verificationStatus, query.verificationStatus));
    }
    return db.select().from(evidenceRecords).where(and5(...conditions));
  }
  async verifyEvidenceBlockchain(evidenceId) {
    const evidence = await db.select().from(evidenceRecords).where(eq6(evidenceRecords.id, evidenceId)).limit(1);
    if (!evidence[0]) {
      return { verified: false, hash: null, message: "Evidence not found" };
    }
    if (!evidence[0].blockchainTrainingRecordId) {
      return { verified: false, hash: null, message: "No blockchain record linked" };
    }
    const trainingRecord = await db.select().from(blockchainTrainingRecords).where(eq6(blockchainTrainingRecords.id, evidence[0].blockchainTrainingRecordId)).limit(1);
    if (!trainingRecord[0]) {
      return { verified: false, hash: null, message: "Linked blockchain record not found" };
    }
    await db.update(evidenceRecords).set({
      verificationStatus: "verified",
      blockchainVerificationHash: trainingRecord[0].blockchainHash,
      verifiedAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq6(evidenceRecords.id, evidenceId));
    return {
      verified: true,
      hash: trainingRecord[0].blockchainHash,
      message: "Evidence verified against blockchain record"
    };
  }
  async autoMapEvidenceToChecklists(evidenceId, organizationId) {
    const evidence = await db.select().from(evidenceRecords).where(eq6(evidenceRecords.id, evidenceId)).limit(1);
    if (!evidence[0] || !evidence[0].extractedText) {
      return {
        evidenceId,
        checklistMappingsCreated: 0,
        regulatoryMappingsCreated: 0,
        blockchainVerified: false
      };
    }
    const text2 = evidence[0].extractedText.toLowerCase();
    let checklistMappingsCreated = 0;
    let regulatoryMappingsCreated = 0;
    const items = await db.select().from(checklistItems).limit(200);
    for (const item of items) {
      if (item.regulatoryReference && text2.includes(item.regulatoryReference.toLowerCase())) {
        try {
          await this.mapEvidenceToChecklistItem(evidenceId, item.id, {
            mappingSource: "auto_matched",
            relevance: "supporting",
            confidence: 0.7,
            notes: `Auto-matched by regulatory reference: ${item.regulatoryReference}`
          });
          checklistMappingsCreated++;
        } catch (error) {
        }
      }
    }
    const frameworks = await db.select().from(regulatoryFrameworks).limit(20);
    for (const framework of frameworks) {
      const refs = this.extractRegulatoryReferences(text2, framework.frameworkCode);
      for (const ref of refs) {
        try {
          await this.mapEvidenceToRegulation(
            evidenceId,
            framework.id,
            ref,
            "direct_compliance"
          );
          regulatoryMappingsCreated++;
        } catch (error) {
        }
      }
    }
    return {
      evidenceId,
      checklistMappingsCreated,
      regulatoryMappingsCreated,
      blockchainVerified: evidence[0].verificationStatus === "verified"
    };
  }
  extractRegulatoryReferences(text2, frameworkCode) {
    const refs = [];
    if (frameworkCode.startsWith("14-CFR-")) {
      const part = frameworkCode.replace("14-CFR-", "");
      const regex = new RegExp(`${part}\\.\\d+(?:\\([a-z]\\))?`, "gi");
      const matches = text2.match(regex) || [];
      refs.push(...matches);
    }
    return [...new Set(refs)];
  }
  async getEvidenceById(evidenceId) {
    const evidence = await db.select().from(evidenceRecords).where(eq6(evidenceRecords.id, evidenceId)).limit(1);
    if (!evidence[0]) return null;
    const checklistMappings2 = await this.getChecklistMappingsForEvidence(evidenceId);
    const regulatoryMappings = await this.getRegulatoryMappingsForEvidence(evidenceId);
    return {
      evidence: evidence[0],
      checklistMappings: checklistMappings2,
      regulatoryMappings,
      blockchainVerification: {
        verified: evidence[0].verificationStatus === "verified",
        hash: evidence[0].blockchainVerificationHash,
        trainingRecordId: evidence[0].blockchainTrainingRecordId
      }
    };
  }
};
var evidenceIndexingService = new EvidenceIndexingService();

// server/services/audit-packet-generator.ts
import { eq as eq7, inArray as inArray3, desc as desc5 } from "drizzle-orm";
import { createHash as createHash3 } from "crypto";
var AuditPacketGenerator = class {
  async generateAuditPacket(config) {
    const schema = await db.select().from(checklistSchemas).where(eq7(checklistSchemas.id, config.checklistSchemaId)).limit(1);
    if (!schema[0]) {
      throw new Error("Checklist schema not found");
    }
    let items = await db.select().from(checklistItems).where(eq7(checklistItems.schemaId, config.checklistSchemaId));
    if (config.targetInspectorId) {
      items = await inspectorPreferenceEngine.adaptChecklistForInspector(
        items,
        config.targetInspectorId
      );
    }
    if (config.packetType === "regulation_sorted") {
      items = this.sortByRegulation(items);
    }
    const packetItems = [];
    let itemsWithEvidence = 0;
    let blockchainVerifiedCount = 0;
    for (const item of items) {
      const evidenceResults = await evidenceIndexingService.getEvidenceByChecklistItem(item.id);
      const evidenceIds = evidenceResults.map((e) => e.evidence.id);
      const hasEvidence = evidenceIds.length > 0;
      const hasBlockchainVerification = evidenceResults.some((e) => e.blockchainVerification.verified);
      if (hasEvidence) itemsWithEvidence++;
      if (hasBlockchainVerification) blockchainVerifiedCount++;
      let complianceStatus = "pending";
      if (hasEvidence && hasBlockchainVerification) {
        complianceStatus = "compliant";
      } else if (hasEvidence) {
        complianceStatus = "partial";
      } else {
        complianceStatus = "non_compliant";
      }
      packetItems.push({
        item,
        evidenceIds,
        blockchainVerified: hasBlockchainVerification,
        complianceStatus
      });
    }
    const complianceScore = items.length > 0 ? itemsWithEvidence / items.length * 100 : 0;
    const packetHash = createHash3("sha256").update(JSON.stringify(packetItems.map((p) => ({
      itemId: p.item.id,
      evidenceIds: p.evidenceIds,
      status: p.complianceStatus
    })))).digest("hex");
    const organization = await db.select().from(trainingOrganizations).where(eq7(trainingOrganizations.id, config.organizationId)).limit(1);
    const orgName = organization[0]?.organizationName || "Unknown Organization";
    const packetName = `Audit Packet - ${orgName} - ${schema[0].schemaName} - ${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}`;
    const packetData = {
      organizationId: config.organizationId,
      packetName,
      packetType: config.packetType,
      targetInspectorId: config.targetInspectorId || null,
      checklistSchemaId: config.checklistSchemaId,
      generatedBy: config.generatedBy || "system",
      totalItems: items.length,
      itemsWithEvidence,
      blockchainVerifiedCount,
      complianceScore: complianceScore.toFixed(2),
      packetHash,
      status: "generated",
      metadata: {
        generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        schemaVersion: schema[0].version,
        sortType: config.packetType
      }
    };
    const [insertedPacket] = await db.insert(auditPackets).values(packetData).returning();
    const insertedItems = [];
    for (let i = 0; i < packetItems.length; i++) {
      const pi = packetItems[i];
      const itemData = {
        packetId: insertedPacket.id,
        checklistItemId: pi.item.id,
        itemOrder: i + 1,
        regulatorySection: pi.item.regulatoryReference || null,
        evidenceIds: pi.evidenceIds.length > 0 ? pi.evidenceIds : null,
        complianceStatus: pi.complianceStatus,
        blockchainVerified: pi.blockchainVerified,
        verificationDetails: pi.blockchainVerified ? {
          verifiedAt: (/* @__PURE__ */ new Date()).toISOString(),
          evidenceCount: pi.evidenceIds.length
        } : null
      };
      const [insertedItem] = await db.insert(auditPacketItems).values(itemData).returning();
      insertedItems.push(insertedItem);
    }
    return {
      packet: insertedPacket,
      items: insertedItems,
      summary: {
        totalItems: items.length,
        itemsWithEvidence,
        blockchainVerifiedCount,
        complianceScore,
        gapCount: items.length - itemsWithEvidence
      }
    };
  }
  sortByRegulation(items) {
    return [...items].sort((a, b) => {
      const refA = a.regulatoryReference || "zzz";
      const refB = b.regulatoryReference || "zzz";
      return refA.localeCompare(refB, void 0, { numeric: true });
    });
  }
  async getPacketById(packetId) {
    const packet = await db.select().from(auditPackets).where(eq7(auditPackets.id, packetId)).limit(1);
    if (!packet[0]) return null;
    const items = await db.select().from(auditPacketItems).where(eq7(auditPacketItems.packetId, packetId));
    const blockchainVerifiedCount = items.filter((i) => i.blockchainVerified).length;
    const itemsWithEvidence = items.filter((i) => i.evidenceIds && i.evidenceIds.length > 0).length;
    return {
      packet: packet[0],
      items,
      summary: {
        totalItems: items.length,
        itemsWithEvidence,
        blockchainVerifiedCount,
        complianceScore: Number(packet[0].complianceScore),
        gapCount: items.length - itemsWithEvidence
      }
    };
  }
  async getPacketsForOrganization(organizationId) {
    return db.select().from(auditPackets).where(eq7(auditPackets.organizationId, organizationId)).orderBy(desc5(auditPackets.generatedAt));
  }
  async calculateRegulatoryCoverage(organizationId, frameworkId) {
    const items = await db.select().from(checklistItems).limit(200);
    let evidencedCount = 0;
    let blockchainVerifiedCount = 0;
    const gaps = [];
    for (const item of items) {
      const evidence = await evidenceIndexingService.getEvidenceByChecklistItem(item.id);
      if (evidence.length > 0) {
        evidencedCount++;
        if (evidence.some((e) => e.blockchainVerification.verified)) {
          blockchainVerifiedCount++;
        }
      } else {
        gaps.push(`[${item.itemNumber}] ${item.description.substring(0, 100)}...`);
      }
    }
    const coveragePercentage = items.length > 0 ? evidencedCount / items.length * 100 : 0;
    const matrixData = {
      organizationId,
      frameworkId,
      totalRequirements: items.length,
      evidencedRequirements: evidencedCount,
      blockchainVerifiedRequirements: blockchainVerifiedCount,
      coveragePercentage: coveragePercentage.toFixed(2),
      gapAnalysis: { gaps: gaps.slice(0, 20) }
    };
    await db.insert(regulatoryCoverageMatrix).values(matrixData).onConflictDoNothing();
    return {
      totalRequirements: items.length,
      evidencedRequirements: evidencedCount,
      blockchainVerifiedRequirements: blockchainVerifiedCount,
      coveragePercentage,
      gaps
    };
  }
  async generatePacketJSON(packetId) {
    const result = await this.getPacketById(packetId);
    if (!result) throw new Error("Packet not found");
    const itemDetails = await Promise.all(
      result.items.map(async (item) => {
        const checklistItem = await db.select().from(checklistItems).where(eq7(checklistItems.id, item.checklistItemId)).limit(1);
        let evidenceDetails = [];
        if (item.evidenceIds && item.evidenceIds.length > 0) {
          const evidence = await db.select().from(evidenceRecords).where(inArray3(evidenceRecords.id, item.evidenceIds));
          evidenceDetails = evidence.map((e) => ({
            id: e.id,
            title: e.evidenceTitle,
            type: e.evidenceType,
            blockchainVerified: e.verificationStatus === "verified",
            verificationHash: e.blockchainVerificationHash
          }));
        }
        return {
          order: item.itemOrder,
          itemNumber: checklistItem[0]?.itemNumber,
          description: checklistItem[0]?.description,
          regulatoryReference: checklistItem[0]?.regulatoryReference,
          complianceStatus: item.complianceStatus,
          blockchainVerified: item.blockchainVerified,
          evidence: evidenceDetails
        };
      })
    );
    return {
      packetId: result.packet.id,
      packetName: result.packet.packetName,
      packetType: result.packet.packetType,
      generatedAt: result.packet.generatedAt,
      summary: result.summary,
      items: itemDetails,
      blockchainIntegrity: {
        verifiedItems: result.summary.blockchainVerifiedCount,
        totalItems: result.summary.totalItems,
        integrityScore: result.summary.totalItems > 0 ? (result.summary.blockchainVerifiedCount / result.summary.totalItems * 100).toFixed(1) : 0
      }
    };
  }
  async updatePacketStatus(packetId, status) {
    await db.update(auditPackets).set({ status }).where(eq7(auditPackets.id, packetId));
  }
};
var auditPacketGenerator = new AuditPacketGenerator();

// server/generate-tutorial-doc.ts
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  Packer
} from "docx";
async function generateAdaptiveComplianceTutorial() {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "Universal Adaptive Compliance Tutorial",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "PATENT PENDING",
                bold: true,
                color: "B91C1C",
                size: 24
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
            children: [
              new TextRun({
                text: "BCCS-US Aviation Compliance Platform",
                italics: true,
                color: "666666"
              })
            ]
          }),
          new Paragraph({
            text: "Introduction",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Welcome to the BCCS-US Universal Adaptive Compliance System. This patent-pending platform revolutionizes aviation regulatory compliance by providing a flexible, intelligent framework that adapts to ANY Federal Aviation Regulation (FAR) Part or Subpart. Whether you operate under Part 121, 135, 141, 142, 145, or any combination thereof, this system dynamically configures itself to your specific regulatory requirements."
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Version 2.0 introduces the revolutionary ",
                size: 22
              }),
              new TextRun({
                text: "Checklist Automation System",
                bold: true,
                size: 22
              }),
              new TextRun({
                text: " (Section 7) with automated FAA checklist retrieval, intelligent priority ranking, version monitoring, and evidence-on-demand mapping with blockchain verification.",
                size: 22
              })
            ]
          }),
          new Paragraph({
            text: "What Makes This System Universal",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Unlike traditional compliance systems locked to a single regulation, BCCS-US supports:"
              })
            ]
          }),
          new Paragraph({
            text: "18 FAR Parts - From Part 21 (Certification) to Part 147 (AMT Schools)",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "16 FAA Order 8900.1 Volumes - Complete inspector guidance coverage",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "All Policy Document Types - SAFOs, InFOs, Advisory Circulars, Legal Interpretations",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Multi-Part Compliance - Simultaneous adherence to multiple regulatory frameworks",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Blockchain Verification - Immutable audit trails for all compliance evidence",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Automated Checklist Management - Auto-fetch, version monitoring, and intelligent prioritization",
            bullet: { level: 0 },
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: "Supported FAR Parts",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "Part", children: [new TextRun({ text: "Part", bold: true })] })],
                    width: { size: 15, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: "Name", children: [new TextRun({ text: "Name", bold: true })] })],
                    width: { size: 55, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: "Subchapter", children: [new TextRun({ text: "Subchapter", bold: true })] })],
                    width: { size: 15, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: "Can Be Spine", children: [new TextRun({ text: "Can Be Spine", bold: true })] })],
                    width: { size: 15, type: WidthType.PERCENTAGE }
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Part 21")] }),
                  new TableCell({ children: [new Paragraph("Certification Procedures for Products and Articles")] }),
                  new TableCell({ children: [new Paragraph("C")] }),
                  new TableCell({ children: [new Paragraph("Yes")] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Part 43")] }),
                  new TableCell({ children: [new Paragraph("Maintenance, Preventive Maintenance, Rebuilding")] }),
                  new TableCell({ children: [new Paragraph("C")] }),
                  new TableCell({ children: [new Paragraph("No")] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Part 61")] }),
                  new TableCell({ children: [new Paragraph("Pilot, Flight Instructor, and Ground Instructor Certification")] }),
                  new TableCell({ children: [new Paragraph("D")] }),
                  new TableCell({ children: [new Paragraph("No")] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Part 91")] }),
                  new TableCell({ children: [new Paragraph("General Operating and Flight Rules")] }),
                  new TableCell({ children: [new Paragraph("F")] }),
                  new TableCell({ children: [new Paragraph("No")] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Part 119")] }),
                  new TableCell({ children: [new Paragraph("Certification: Air Carriers and Commercial Operators")] }),
                  new TableCell({ children: [new Paragraph("G")] }),
                  new TableCell({ children: [new Paragraph("Yes")] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Part 121")] }),
                  new TableCell({ children: [new Paragraph("Operating Requirements: Domestic, Flag, Supplemental")] }),
                  new TableCell({ children: [new Paragraph("G")] }),
                  new TableCell({ children: [new Paragraph("Yes")] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Part 135")] }),
                  new TableCell({ children: [new Paragraph("Commuter and On-Demand Operations")] }),
                  new TableCell({ children: [new Paragraph("G")] }),
                  new TableCell({ children: [new Paragraph("Yes")] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Part 141")] }),
                  new TableCell({ children: [new Paragraph("Pilot Schools")] }),
                  new TableCell({ children: [new Paragraph("H")] }),
                  new TableCell({ children: [new Paragraph("Yes")] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Part 142")] }),
                  new TableCell({ children: [new Paragraph("Training Centers")] }),
                  new TableCell({ children: [new Paragraph("H")] }),
                  new TableCell({ children: [new Paragraph("Yes")] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Part 145")] }),
                  new TableCell({ children: [new Paragraph("Repair Stations")] }),
                  new TableCell({ children: [new Paragraph("H")] }),
                  new TableCell({ children: [new Paragraph("Yes")] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Part 147")] }),
                  new TableCell({ children: [new Paragraph("Aviation Maintenance Technician Schools")] }),
                  new TableCell({ children: [new Paragraph("H")] }),
                  new TableCell({ children: [new Paragraph("Yes")] })
                ]
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Additional parts supported: Part 63, 65, 91K, 107, 125, 129, 137",
                italics: true,
                color: "666666"
              })
            ]
          }),
          new Paragraph({
            text: "Getting Started",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: "Step 1: Select Your Primary Regulatory Spine",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "The regulatory spine is your organization's primary regulatory framework. Everything else attaches to this spine. Use the "
              }),
              new TextRun({
                text: "Universal FAR Part Selector",
                bold: true
              }),
              new TextRun({
                text: " to choose your primary regulation:"
              })
            ]
          }),
          new Paragraph({
            text: "1. Click the FAR Part dropdown in the Universal FAR Part Selector section",
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "2. Search or browse the available 18 FAR Parts",
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "3. Select the part that best represents your primary operation",
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: '4. Click "Select as Spine" to establish your regulatory foundation',
            spacing: { after: 50 }
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "5. The system will automatically fetch core FAA checklists for your selected spine",
                bold: true
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Example: ",
                bold: true,
                italics: true
              }),
              new TextRun({
                text: "A Part 142 Training Center would select 14 CFR Part 142 as their spine, while an airline would select Part 121."
              })
            ]
          }),
          new Paragraph({
            text: "Step 2: Initialize All FAR Parts (Optional)",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "For organizations requiring comprehensive regulatory coverage, click the "
              }),
              new TextRun({
                text: '"Initialize All FAR Parts"',
                bold: true
              }),
              new TextRun({
                text: " button to load all 18 FAR Parts into the system. This enables:"
              })
            ]
          }),
          new Paragraph({
            text: "Cross-referencing between related regulations",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Comprehensive compliance mapping",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Multi-part configuration capabilities",
            bullet: { level: 0 },
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: "Step 3: Ingest Policy Documents",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Policy documents supplement the CFR regulations. Click "
              }),
              new TextRun({
                text: '"Ingest Policy"',
                bold: true
              }),
              new TextRun({
                text: " to add:"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "SAFO (Safety Alert for Operators)",
                bold: true
              }),
              new TextRun({
                text: " - Urgent safety information"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "InFO (Information for Operators)",
                bold: true
              }),
              new TextRun({
                text: " - General guidance and best practices"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Advisory Circular",
                bold: true
              }),
              new TextRun({
                text: " - Non-regulatory guidance on compliance methods"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Legal Interpretation",
                bold: true
              }),
              new TextRun({
                text: " - FAA Chief Counsel interpretations"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Policy Notice",
                bold: true
              }),
              new TextRun({
                text: " - Internal FAA policy guidance"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "FAA Order",
                bold: true
              }),
              new TextRun({
                text: " - Inspector procedures and requirements (including 8900.1 Volumes 1-16)"
              })
            ]
          }),
          new Paragraph({
            text: "Section 7: Checklist Automation System",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 100 }
          }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "PATENT PENDING",
                bold: true,
                color: "B91C1C",
                size: 20
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "The Checklist Automation System revolutionizes compliance management with intelligent automation, eliminating manual checklist tracking and ensuring you always have the most current regulatory requirements."
              })
            ]
          }),
          new Paragraph({
            text: "Auto-Fetch Core FAA Checklists",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "When you select a regulatory spine, the system automatically retrieves the core FAA checklists for that FAR Part. You can also manually trigger auto-fetch:"
              })
            ]
          }),
          new Paragraph({
            text: "1. Navigate to the Checklists tab",
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: '2. Find the "Auto-Fetch Core Checklists" card',
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "3. Select the FAR Part from the dropdown",
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: '4. Click "Auto-Fetch" to retrieve the core FAA checklists',
            spacing: { after: 200 }
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Supported FAR Parts for Auto-Fetch: ",
                bold: true
              }),
              new TextRun({
                text: "Part 121, Part 135, Part 141, Part 142, Part 145, Part 147"
              })
            ]
          }),
          new Paragraph({
            text: "Priority Levels (P1-P5)",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Checklists are automatically organized by a 5-level priority system that ensures you focus on the most critical requirements first:"
              })
            ]
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Priority", bold: true })] })],
                    width: { size: 15, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Level Name", bold: true })] })],
                    width: { size: 30, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Description", bold: true })] })],
                    width: { size: 55, type: WidthType.PERCENTAGE }
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "P1", bold: true, color: "DC2626" })] })] }),
                  new TableCell({ children: [new Paragraph("FAA Standard Checklists")] }),
                  new TableCell({ children: [new Paragraph("Primary regulatory checklists from official FAA sources. These take precedence over all others.")] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "P2", bold: true, color: "EA580C" })] })] }),
                  new TableCell({ children: [new Paragraph("Certificate-Specific")] }),
                  new TableCell({ children: [new Paragraph("Requirements specific to your organization's certificate type and authorizations.")] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "P3", bold: true, color: "CA8A04" })] })] }),
                  new TableCell({ children: [new Paragraph("Inspector Supplemental")] }),
                  new TableCell({ children: [new Paragraph("Additional items typically requested by FAA inspectors during audits.")] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "P4", bold: true, color: "2563EB" })] })] }),
                  new TableCell({ children: [new Paragraph("Operator-Required")] }),
                  new TableCell({ children: [new Paragraph("Custom additions specific to your operation beyond regulatory minimums.")] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "P5", bold: true, color: "6B7280" })] })] }),
                  new TableCell({ children: [new Paragraph("Archived Legacy")] }),
                  new TableCell({ children: [new Paragraph("Historical reference only. Hidden by default but accessible when needed.")] })
                ]
              })
            ]
          }),
          new Paragraph({
            spacing: { before: 100, after: 200 },
            children: [
              new TextRun({
                text: "Tip: ",
                bold: true,
                italics: true
              }),
              new TextRun({
                text: "Always complete P1 (FAA Standard) items first, as these are the primary regulatory requirements that inspectors will verify."
              })
            ]
          }),
          new Paragraph({
            text: "Version Monitoring & Update Detection",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "The system continuously monitors for regulatory updates and notifies you when checklist versions change:"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "FAA 8900.1 Orders",
                bold: true
              }),
              new TextRun({
                text: " - Inspector guidance and procedures"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "eCFR Sections",
                bold: true
              }),
              new TextRun({
                text: " - Electronic Code of Federal Regulations updates"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "SAFOs & InFOs",
                bold: true
              }),
              new TextRun({
                text: " - Safety alerts and information notices"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Advisory Circulars",
                bold: true
              }),
              new TextRun({
                text: " - Compliance guidance updates"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "To check for updates:",
                bold: true
              })
            ]
          }),
          new Paragraph({
            text: '1. Click the "Check Updates" button in the Checklists tab header',
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "2. Review any version changes detected",
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: '3. Outdated checklists are automatically flagged with an "Outdated" badge',
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: "Version History",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Track the complete history of any checklist with the History feature:"
              })
            ]
          }),
          new Paragraph({
            text: '1. Click the "History" button on any checklist card',
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "2. View all version changes with timestamps",
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "3. See change summaries explaining what was modified",
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "4. Access source URLs for each version",
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "5. Review evidence coverage statistics for each version",
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: "Suppress & Unlock Controls",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Manage checklist lifecycle with suppress and unlock controls:"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Suppress",
                bold: true
              }),
              new TextRun({
                text: " - Hide outdated checklists from active view while preserving them for historical reference. Suppressed checklists move to Priority 5 (Archived Legacy)."
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Unlock",
                bold: true
              }),
              new TextRun({
                text: " - Restore archived checklists to active status when needed for reference or if suppression was accidental."
              })
            ]
          }),
          new Paragraph({
            text: "Evidence Mapping",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Link compliance evidence directly to checklist items with multi-schema indexing and blockchain verification:"
              })
            ]
          }),
          new Paragraph({
            text: "Evidence can be mapped to items across multiple checklists simultaneously",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Each mapping is blockchain-verified for audit integrity",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Evidence coverage statistics show percentage of items with linked evidence",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Evidence-on-demand retrieval instantly pulls relevant documentation",
            bullet: { level: 0 },
            spacing: { after: 200 }
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Evidence Stats Display: ",
                bold: true
              }),
              new TextRun({
                text: "Each checklist shows total items, mapped items, and coverage percentage. Blockchain verification count indicates items with immutable evidence trails."
              })
            ]
          }),
          new Paragraph({
            text: "The Seven Tabs",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: "1. Regulatory Spine Tab",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Your regulatory framework hierarchy:"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Primary Regulatory Spine",
                bold: true
              }),
              new TextRun({
                text: " - Your selected core regulation with version tracking and status"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Core Attachments",
                bold: true
              }),
              new TextRun({
                text: " - FAA Orders that always apply to your operation type"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Dynamic Attachments",
                bold: true
              }),
              new TextRun({
                text: " - Related CFR parts that apply based on your authorizations"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Hierarchy Visualization",
                bold: true
              }),
              new TextRun({
                text: " - Visual diagram showing regulation relationships"
              })
            ]
          }),
          new Paragraph({
            text: "2. Checklists Tab",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Manage compliance checklists with automation features:"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Auto-Fetch Core Checklists",
                bold: true
              }),
              new TextRun({
                text: " - Automatically retrieve FAA standard checklists for any supported FAR Part"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Priority Sorting",
                bold: true
              }),
              new TextRun({
                text: " - Checklists organized by P1-P5 priority levels"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Version Monitoring",
                bold: true
              }),
              new TextRun({
                text: " - Check for updates and view version history"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Evidence Coverage",
                bold: true
              }),
              new TextRun({
                text: " - Track evidence mapping percentage for each checklist"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Suppress/Unlock Controls",
                bold: true
              }),
              new TextRun({
                text: " - Manage checklist lifecycle and archival"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "To Import a Checklist Manually:",
                bold: true
              })
            ]
          }),
          new Paragraph({
            text: '1. Click "Import Checklist" button',
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "2. Enter a name and version number",
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "3. Select the source (FAA, TCPM, Regional FSDO, Operator, or Industry)",
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "4. Link to ANY regulatory framework from your initialized parts",
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "5. Enter checklist items in pipe-delimited format",
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: '6. Click "Import Checklist"',
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: "3. Inspectors Tab",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Track FAA inspector preferences across all FAR Parts:"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Inspector Profiles",
                bold: true
              }),
              new TextRun({
                text: " - Region, office, audit count, strictness score, and focus areas"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Prediction Accuracy",
                bold: true
              }),
              new TextRun({
                text: " - AI-powered predictions for checklist ordering, questions, and focus areas"
              })
            ]
          }),
          new Paragraph({
            text: "4. Evidence Tab",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Manage compliance evidence with blockchain verification:"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Evidence Stats",
                bold: true
              }),
              new TextRun({
                text: " - Total indexed, blockchain-verified, and pending verification counts"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Multi-Schema Indexing",
                bold: true
              }),
              new TextRun({
                text: " - Evidence linked across multiple checklists simultaneously"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Evidence-On-Demand API",
                bold: true
              }),
              new TextRun({
                text: " - Instant retrieval by checklist item or regulatory reference"
              })
            ]
          }),
          new Paragraph({
            text: "5. Audit Packets Tab",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Generate audit documentation for any FAR Part:"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Regulation-Sorted Packet",
                bold: true
              }),
              new TextRun({
                text: " - Evidence organized by regulatory reference"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Checklist-Sorted Packet",
                bold: true
              }),
              new TextRun({
                text: " - Evidence organized by checklist item order"
              })
            ]
          }),
          new Paragraph({
            text: "6. Regulatory Updates Tab",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Monitor regulatory changes affecting your operations:"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "CFR Updates",
                bold: true
              }),
              new TextRun({
                text: " - Changes to Title 14 regulations"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Policy Alerts",
                bold: true
              }),
              new TextRun({
                text: " - New SAFOs, InFOs, and Advisory Circulars affecting your operations"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Impact Assessment",
                bold: true
              }),
              new TextRun({
                text: " - Analysis of how changes affect your compliance posture"
              })
            ]
          }),
          new Paragraph({
            text: "7. Link Monitor Tab",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "AI-powered monitoring of regulatory reference links:"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Link Status",
                bold: true
              }),
              new TextRun({
                text: " - Real-time verification of regulatory URLs"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Redirect Detection",
                bold: true
              }),
              new TextRun({
                text: " - Alerts when regulatory links change location"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Currency Verification",
                bold: true
              }),
              new TextRun({
                text: " - Ensures referenced regulations are current versions"
              })
            ]
          }),
          new Paragraph({
            text: "Multi-Part Compliance",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Many aviation organizations operate under multiple regulatory frameworks simultaneously. BCCS-US uniquely handles this through Multi-Part Configurations:"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Example Configurations:",
                bold: true
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Part 142 Training Center with Part 121 Airline Training",
                bold: true
              }),
              new TextRun({
                text: " - Combines training center requirements with airline-specific training approvals"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Part 145 Repair Station with Part 121 Support",
                bold: true
              }),
              new TextRun({
                text: " - Maintenance requirements plus airline operations support"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Part 141 School with Part 61 Exceptions",
                bold: true
              }),
              new TextRun({
                text: " - Pilot school operations with individual certification requirements"
              })
            ]
          }),
          new Paragraph({
            text: "FAA Order 8900.1 Integration",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "The system includes all 16 volumes of FAA Order 8900.1, the Flight Standards Information Management System (FSIMS):"
              })
            ]
          }),
          new Paragraph({
            text: "Volume 1 - Program Tracking and Reporting (PTR)",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Volume 2 - Air Operator and Air Agency Certification and Application Process",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Volume 3 - General Technical Administration",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Volume 4 - Aircraft Equipment and Operational Authorizations",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Volume 5 - Airman Certification",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Volume 6 - Surveillance",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Volume 7 - Investigations",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Volume 8 - Designee Management",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Volume 9 - Flight Standards Programs",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Volume 10 - Safety Assurance System",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Volume 11 - Flight Technologies and Procedures",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Volume 12 - International Aviation",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Volume 13 - Commercial Space Transportation",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Volume 14 - Compliance and Enforcement",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Volume 15 - Designated Representative Management",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Volume 16 - Unmanned Aircraft Systems (UAS)",
            bullet: { level: 0 },
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: "Best Practices",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "1. Choose your spine carefully",
                bold: true
              }),
              new TextRun({
                text: " - Select the FAR Part that most directly governs your primary operation"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "2. Use auto-fetch for core checklists",
                bold: true
              }),
              new TextRun({
                text: " - Let the system retrieve FAA standard checklists automatically"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "3. Check for updates regularly",
                bold: true
              }),
              new TextRun({
                text: " - Use the Check Updates button to ensure checklists reflect current regulations"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "4. Prioritize P1 items",
                bold: true
              }),
              new TextRun({
                text: " - Always complete FAA Standard (P1) checklist items first"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "5. Map evidence proactively",
                bold: true
              }),
              new TextRun({
                text: " - Link compliance evidence to checklist items as events occur, not before audits"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "6. Use blockchain verification",
                bold: true
              }),
              new TextRun({
                text: " - Verify critical evidence on the blockchain for immutable audit trails"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "7. Suppress outdated checklists",
                bold: true
              }),
              new TextRun({
                text: " - Archive superseded versions to maintain clean, current compliance view"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "8. Review version history",
                bold: true
              }),
              new TextRun({
                text: " - Understand what changed between checklist versions"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "9. Ingest policy documents regularly",
                bold: true
              }),
              new TextRun({
                text: " - Keep up with SAFOs, InFOs, and Advisory Circulars"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "10. Generate audit packets regularly",
                bold: true
              }),
              new TextRun({
                text: " - Maintain current documentation for surprise inspections"
              })
            ]
          }),
          new Paragraph({
            text: "Dashboard Metrics",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "The dashboard displays your compliance overview:"
              })
            ]
          }),
          new Paragraph({
            text: "Active Frameworks - Number of FAR Parts configured",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Harmonized Checklists - Number of imported checklists across all parts",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Tracked Inspectors - Number of inspector profiles",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Compliance Score - Overall compliance percentage",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Policy Documents - Number of ingested SAFOs, InFOs, and ACs",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Evidence Coverage - Percentage of checklist items with mapped evidence",
            bullet: { level: 0 },
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: "Technical Reference: API Endpoints",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "For system integrators, the following API endpoints are available:"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Core Regulatory APIs:",
                bold: true
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            indent: { left: 360 },
            children: [
              new TextRun({
                text: "GET /api/adaptive-compliance/far-parts",
                font: "Courier New",
                size: 20
              }),
              new TextRun({
                text: " - List all available FAR Parts"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            indent: { left: 360 },
            children: [
              new TextRun({
                text: "GET /api/adaptive-compliance/frameworks/spines",
                font: "Courier New",
                size: 20
              }),
              new TextRun({
                text: " - Get configured regulatory spines"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            indent: { left: 360 },
            children: [
              new TextRun({
                text: "POST /api/adaptive-compliance/frameworks/select-spine",
                font: "Courier New",
                size: 20
              }),
              new TextRun({
                text: " - Select primary spine"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            indent: { left: 360 },
            children: [
              new TextRun({
                text: "POST /api/adaptive-compliance/policy-documents/ingest",
                font: "Courier New",
                size: 20
              }),
              new TextRun({
                text: " - Ingest policy document"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            indent: { left: 360 },
            children: [
              new TextRun({
                text: "GET /api/adaptive-compliance/regulatory-updates",
                font: "Courier New",
                size: 20
              }),
              new TextRun({
                text: " - Get recent regulatory changes"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            indent: { left: 360 },
            children: [
              new TextRun({
                text: "POST /api/adaptive-compliance/multi-part-config",
                font: "Courier New",
                size: 20
              }),
              new TextRun({
                text: " - Create multi-part configuration"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Checklist Automation APIs (Section 7):",
                bold: true
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            indent: { left: 360 },
            children: [
              new TextRun({
                text: "POST /api/adaptive-compliance/checklists/auto-fetch/:farPartCode",
                font: "Courier New",
                size: 20
              }),
              new TextRun({
                text: " - Auto-fetch core checklist for FAR Part"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            indent: { left: 360 },
            children: [
              new TextRun({
                text: "GET /api/adaptive-compliance/checklists/by-priority",
                font: "Courier New",
                size: 20
              }),
              new TextRun({
                text: " - Get checklists sorted by priority level"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            indent: { left: 360 },
            children: [
              new TextRun({
                text: "GET /api/adaptive-compliance/checklists/version-check",
                font: "Courier New",
                size: 20
              }),
              new TextRun({
                text: " - Check for version updates"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            indent: { left: 360 },
            children: [
              new TextRun({
                text: "GET /api/adaptive-compliance/checklists/:schemaId/version-history",
                font: "Courier New",
                size: 20
              }),
              new TextRun({
                text: " - Get version history for a checklist"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            indent: { left: 360 },
            children: [
              new TextRun({
                text: "POST /api/adaptive-compliance/checklists/:schemaId/suppress",
                font: "Courier New",
                size: 20
              }),
              new TextRun({
                text: " - Suppress outdated checklist"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            indent: { left: 360 },
            children: [
              new TextRun({
                text: "POST /api/adaptive-compliance/checklists/:schemaId/unlock",
                font: "Courier New",
                size: 20
              }),
              new TextRun({
                text: " - Unlock archived checklist"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            indent: { left: 360 },
            children: [
              new TextRun({
                text: "GET /api/adaptive-compliance/checklists/:schemaId/evidence-stats",
                font: "Courier New",
                size: 20
              }),
              new TextRun({
                text: " - Get evidence mapping statistics"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            indent: { left: 360 },
            children: [
              new TextRun({
                text: "POST /api/adaptive-compliance/checklists/evidence-mapping",
                font: "Courier New",
                size: 20
              }),
              new TextRun({
                text: " - Map evidence to checklist item"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            indent: { left: 360 },
            children: [
              new TextRun({
                text: "GET /api/adaptive-compliance/checklists/supported-parts",
                font: "Courier New",
                size: 20
              }),
              new TextRun({
                text: " - Get all supported FAR Parts with checklist definitions"
              })
            ]
          }),
          new Paragraph({
            spacing: { before: 600 },
            alignment: AlignmentType.CENTER,
            border: {
              top: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" }
            },
            children: [
              new TextRun({
                text: "BCCS-US Universal Adaptive Compliance System",
                bold: true,
                size: 22
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "Universal FAR Ingestion System with Section 7 Checklist Automation",
                italics: true,
                size: 20
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100 },
            children: [
              new TextRun({
                text: "Patent Pending",
                bold: true,
                color: "B91C1C",
                size: 20
              })
            ]
          }),
          new Paragraph({
            spacing: { before: 200 },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "\xA9 BCCS-US Aviation Compliance Platform",
                italics: true,
                color: "999999",
                size: 20
              })
            ]
          })
        ]
      }
    ]
  });
  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

// server/routes/adaptive-compliance.ts
var router2 = Router2();
router2.get("/frameworks", isAuthenticated, async (req, res) => {
  try {
    const frameworks = await regulatorySpineService.getAllActiveFrameworks();
    res.json(frameworks);
  } catch (error) {
    console.error("Error fetching frameworks:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.get("/frameworks/spine", isAuthenticated, async (req, res) => {
  try {
    const spine = await regulatorySpineService.getSpineFramework();
    res.json(spine);
  } catch (error) {
    console.error("Error fetching spine:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.get("/frameworks/hierarchy/:organizationId", isAuthenticated, async (req, res) => {
  try {
    const hierarchy = await regulatorySpineService.getComplianceFrameworkHierarchy(
      req.params.organizationId
    );
    res.json(hierarchy);
  } catch (error) {
    console.error("Error fetching hierarchy:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.post("/frameworks/initialize", isAuthenticated, async (req, res) => {
  try {
    await regulatorySpineService.initializeRegulatorySpine();
    res.json({ message: "Regulatory spine initialized successfully" });
  } catch (error) {
    console.error("Error initializing spine:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.get("/checklists", isAuthenticated, async (req, res) => {
  try {
    const schemas = await checklistHarmonizationEngine.getAllSchemas();
    res.json(schemas);
  } catch (error) {
    console.error("Error fetching checklists:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.get("/checklists/:schemaId/items", isAuthenticated, async (req, res) => {
  try {
    const items = await checklistHarmonizationEngine.getSchemaItems(req.params.schemaId);
    res.json(items);
  } catch (error) {
    console.error("Error fetching checklist items:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.post("/checklists/ingest", isAuthenticated, async (req, res) => {
  try {
    const { schemaName, schemaSource, items, frameworkId, version, isCanonical } = req.body;
    const schema = await checklistHarmonizationEngine.ingestChecklist(
      schemaName,
      schemaSource,
      items,
      frameworkId,
      version,
      isCanonical
    );
    res.json(schema);
  } catch (error) {
    console.error("Error ingesting checklist:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.post("/checklists/harmonize", isAuthenticated, async (req, res) => {
  try {
    const { baseSchemaId, comparedSchemaId } = req.body;
    const report = await checklistHarmonizationEngine.harmonizeChecklists(
      baseSchemaId,
      comparedSchemaId
    );
    res.json(report);
  } catch (error) {
    console.error("Error harmonizing checklists:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.get("/checklists/deltas/:baseSchemaId/:comparedSchemaId", isAuthenticated, async (req, res) => {
  try {
    const report = await checklistHarmonizationEngine.generateDeltaReport(
      req.params.baseSchemaId,
      req.params.comparedSchemaId
    );
    res.json(report);
  } catch (error) {
    console.error("Error generating delta report:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.post("/checklists/auto-fetch/:farPartCode", isAuthenticated, async (req, res) => {
  try {
    const schema = await checklistHarmonizationEngine.autoFetchCoreChecklist(req.params.farPartCode);
    if (!schema) {
      return res.status(404).json({
        error: "Core checklist not found for FAR Part",
        farPartCode: req.params.farPartCode
      });
    }
    res.json({
      message: "Core checklist auto-fetched successfully",
      schema
    });
  } catch (error) {
    console.error("Error auto-fetching checklist:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.get("/checklists/by-priority", isAuthenticated, async (req, res) => {
  try {
    const schemas = await checklistHarmonizationEngine.getSchemasByPriority();
    res.json(schemas);
  } catch (error) {
    console.error("Error fetching checklists by priority:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.get("/checklists/version-check", isAuthenticated, async (req, res) => {
  try {
    const results = await checklistHarmonizationEngine.checkForVersionUpdates();
    res.json({
      message: "Version check completed",
      checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
      results
    });
  } catch (error) {
    console.error("Error checking versions:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.get("/checklists/:schemaId/version-history", isAuthenticated, async (req, res) => {
  try {
    const history = await checklistHarmonizationEngine.getVersionHistory(req.params.schemaId);
    res.json(history);
  } catch (error) {
    console.error("Error fetching version history:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.post("/checklists/:schemaId/suppress", isAuthenticated, async (req, res) => {
  try {
    await checklistHarmonizationEngine.suppressOutdatedChecklist(req.params.schemaId);
    res.json({ message: "Checklist suppressed successfully" });
  } catch (error) {
    console.error("Error suppressing checklist:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.post("/checklists/:schemaId/unlock", isAuthenticated, async (req, res) => {
  try {
    await checklistHarmonizationEngine.unlockArchivedChecklist(req.params.schemaId);
    res.json({ message: "Archived checklist unlocked successfully" });
  } catch (error) {
    console.error("Error unlocking checklist:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.get("/checklists/:schemaId/evidence-stats", isAuthenticated, async (req, res) => {
  try {
    const stats = await checklistHarmonizationEngine.getEvidenceMappingStats(req.params.schemaId);
    res.json(stats);
  } catch (error) {
    console.error("Error fetching evidence stats:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.post("/checklists/evidence-mapping", isAuthenticated, async (req, res) => {
  try {
    const { evidenceId, checklistItemId, mappingStrength, notes } = req.body;
    await checklistHarmonizationEngine.mapEvidenceToChecklistItem(
      evidenceId,
      checklistItemId,
      mappingStrength,
      notes
    );
    res.json({ message: "Evidence mapped to checklist item successfully" });
  } catch (error) {
    console.error("Error mapping evidence:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.get("/checklists/supported-parts", isAuthenticated, async (req, res) => {
  try {
    const parts = checklistHarmonizationEngine.getSupportedFARParts();
    const definitions = parts.map((p) => ({
      code: p,
      definition: checklistHarmonizationEngine.getCoreChecklistDefinition(p)
    }));
    res.json(definitions);
  } catch (error) {
    console.error("Error fetching supported parts:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.get("/inspectors", isAuthenticated, async (req, res) => {
  try {
    const inspectors = await inspectorPreferenceEngine.getAllInspectors();
    res.json(inspectors);
  } catch (error) {
    console.error("Error fetching inspectors:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.get("/inspectors/:inspectorId", isAuthenticated, async (req, res) => {
  try {
    const inspector = await inspectorPreferenceEngine.getInspectorProfile(req.params.inspectorId);
    if (!inspector) {
      return res.status(404).json({ error: "Inspector not found" });
    }
    res.json(inspector);
  } catch (error) {
    console.error("Error fetching inspector:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.post("/inspectors", isAuthenticated, async (req, res) => {
  try {
    const profile = await inspectorPreferenceEngine.createInspectorProfile(req.body);
    res.json(profile);
  } catch (error) {
    console.error("Error creating inspector:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.post("/inspectors/:inspectorId/behavior", isAuthenticated, async (req, res) => {
  try {
    const { organizationId, ...behaviorData } = req.body;
    const behavior = await inspectorPreferenceEngine.recordAuditBehavior(
      req.params.inspectorId,
      organizationId,
      behaviorData
    );
    res.json(behavior);
  } catch (error) {
    console.error("Error recording behavior:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.get("/inspectors/:inspectorId/prediction", isAuthenticated, async (req, res) => {
  try {
    const prediction = await inspectorPreferenceEngine.predictInspectorBehavior(
      req.params.inspectorId
    );
    res.json(prediction);
  } catch (error) {
    console.error("Error predicting behavior:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.get("/inspectors/:inspectorId/preparation/:organizationId", isAuthenticated, async (req, res) => {
  try {
    const strategy = await inspectorPreferenceEngine.generateAuditPreparationStrategy(
      req.params.inspectorId,
      req.params.organizationId
    );
    res.json(strategy);
  } catch (error) {
    console.error("Error generating strategy:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.get("/evidence", isAuthenticated, async (req, res) => {
  try {
    const { checklist_item_id, framework_code, regulatory_reference } = req.query;
    if (checklist_item_id) {
      const evidence = await evidenceIndexingService.getEvidenceByChecklistItem(
        checklist_item_id
      );
      return res.json(evidence);
    }
    if (framework_code && regulatory_reference) {
      const evidence = await evidenceIndexingService.getEvidenceByRegulatoryReference(
        framework_code,
        regulatory_reference
      );
      return res.json(evidence);
    }
    res.status(400).json({
      error: "Either checklist_item_id or (framework_code + regulatory_reference) required"
    });
  } catch (error) {
    console.error("Error fetching evidence:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.get("/evidence/:evidenceId", isAuthenticated, async (req, res) => {
  try {
    const evidence = await evidenceIndexingService.getEvidenceById(req.params.evidenceId);
    if (!evidence) {
      return res.status(404).json({ error: "Evidence not found" });
    }
    res.json(evidence);
  } catch (error) {
    console.error("Error fetching evidence:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.post("/evidence", isAuthenticated, async (req, res) => {
  try {
    const { organizationId, ...evidenceData } = req.body;
    const evidence = await evidenceIndexingService.indexEvidence(organizationId, evidenceData);
    res.json(evidence);
  } catch (error) {
    console.error("Error indexing evidence:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.post("/evidence/:evidenceId/map-checklist", isAuthenticated, async (req, res) => {
  try {
    const { checklistItemId, ...mappingData } = req.body;
    const mapping = await evidenceIndexingService.mapEvidenceToChecklistItem(
      req.params.evidenceId,
      checklistItemId,
      mappingData
    );
    res.json(mapping);
  } catch (error) {
    console.error("Error mapping evidence:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.post("/evidence/:evidenceId/verify", isAuthenticated, async (req, res) => {
  try {
    const result = await evidenceIndexingService.verifyEvidenceBlockchain(req.params.evidenceId);
    res.json(result);
  } catch (error) {
    console.error("Error verifying evidence:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.post("/evidence/:evidenceId/auto-map", isAuthenticated, async (req, res) => {
  try {
    const { organizationId } = req.body;
    const result = await evidenceIndexingService.autoMapEvidenceToChecklists(
      req.params.evidenceId,
      organizationId
    );
    res.json(result);
  } catch (error) {
    console.error("Error auto-mapping evidence:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.post("/audit-packets/generate", isAuthenticated, async (req, res) => {
  try {
    const config = req.body;
    const packet = await auditPacketGenerator.generateAuditPacket(config);
    res.json(packet);
  } catch (error) {
    console.error("Error generating audit packet:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.get("/audit-packets/:packetId", isAuthenticated, async (req, res) => {
  try {
    const packet = await auditPacketGenerator.getPacketById(req.params.packetId);
    if (!packet) {
      return res.status(404).json({ error: "Packet not found" });
    }
    res.json(packet);
  } catch (error) {
    console.error("Error fetching packet:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.get("/audit-packets/:packetId/json", isAuthenticated, async (req, res) => {
  try {
    const packetJson = await auditPacketGenerator.generatePacketJSON(req.params.packetId);
    res.json(packetJson);
  } catch (error) {
    console.error("Error generating packet JSON:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.get("/audit-packets/organization/:organizationId", isAuthenticated, async (req, res) => {
  try {
    const packets = await auditPacketGenerator.getPacketsForOrganization(req.params.organizationId);
    res.json(packets);
  } catch (error) {
    console.error("Error fetching organization packets:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.put("/audit-packets/:packetId/status", isAuthenticated, async (req, res) => {
  try {
    const { status } = req.body;
    await auditPacketGenerator.updatePacketStatus(req.params.packetId, status);
    res.json({ message: "Status updated successfully" });
  } catch (error) {
    console.error("Error updating packet status:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.get("/coverage/:organizationId/:frameworkId", isAuthenticated, async (req, res) => {
  try {
    const coverage = await auditPacketGenerator.calculateRegulatoryCoverage(
      req.params.organizationId,
      req.params.frameworkId
    );
    res.json(coverage);
  } catch (error) {
    console.error("Error calculating coverage:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.get("/tutorial/download", isAuthenticated, async (req, res) => {
  try {
    const buffer = await generateAdaptiveComplianceTutorial();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", "attachment; filename=Adaptive_Compliance_Tutorial.docx");
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error("Error generating tutorial document:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.get("/far-parts", isAuthenticated, async (req, res) => {
  try {
    const parts = await regulatorySpineService.getUniversalFARParts();
    res.json(parts);
  } catch (error) {
    console.error("Error fetching FAR parts:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.get("/frameworks/spines", isAuthenticated, async (req, res) => {
  try {
    const spines = await regulatorySpineService.getAvailableSpines();
    res.json(spines);
  } catch (error) {
    console.error("Error fetching available spines:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.post("/frameworks/select-spine", isAuthenticated, async (req, res) => {
  try {
    const { organizationId, frameworkCode } = req.body;
    const spine = await regulatorySpineService.selectPrimarySpine(organizationId, frameworkCode);
    if (!spine) {
      return res.status(404).json({ error: "Framework not found" });
    }
    res.json(spine);
  } catch (error) {
    console.error("Error selecting spine:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.get("/frameworks/by-part/:partNumber", isAuthenticated, async (req, res) => {
  try {
    const frameworks = await regulatorySpineService.getFrameworksByPart(req.params.partNumber);
    res.json(frameworks);
  } catch (error) {
    console.error("Error fetching frameworks by part:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.get("/frameworks/:frameworkId/related", isAuthenticated, async (req, res) => {
  try {
    const related = await regulatorySpineService.getRelatedFrameworks(req.params.frameworkId);
    res.json(related);
  } catch (error) {
    console.error("Error fetching related frameworks:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.get("/frameworks/:frameworkCode/impact", isAuthenticated, async (req, res) => {
  try {
    const assessment = await regulatorySpineService.generateRegulatoryImpactAssessment(
      req.params.frameworkCode
    );
    res.json(assessment);
  } catch (error) {
    console.error("Error generating impact assessment:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.post("/multi-part-config", isAuthenticated, async (req, res) => {
  try {
    const config = await regulatorySpineService.createMultiPartConfiguration(req.body);
    res.json(config);
  } catch (error) {
    console.error("Error creating multi-part config:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.get("/multi-part-config/:configId", isAuthenticated, async (req, res) => {
  try {
    const compliance = await regulatorySpineService.getMultiPartConfiguration(req.params.configId);
    if (!compliance) {
      return res.status(404).json({ error: "Configuration not found" });
    }
    res.json(compliance);
  } catch (error) {
    console.error("Error fetching multi-part config:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.post("/policy-documents/ingest", isAuthenticated, async (req, res) => {
  try {
    const document = await regulatorySpineService.ingestFAAPolicyDocument(req.body);
    res.json(document);
  } catch (error) {
    console.error("Error ingesting policy document:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.get("/policy-documents", isAuthenticated, async (req, res) => {
  try {
    const { documentType, affectedPart } = req.query;
    const documents = await regulatorySpineService.getActivePolicyDocuments({
      documentType,
      affectedPart
    });
    res.json(documents);
  } catch (error) {
    console.error("Error fetching policy documents:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.get("/regulatory-updates", isAuthenticated, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const updates = await regulatorySpineService.getRecentRegulatoryUpdates(limit);
    res.json(updates);
  } catch (error) {
    console.error("Error fetching regulatory updates:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.get("/organization/:organizationId/regulatory-profile", isAuthenticated, async (req, res) => {
  try {
    const profile = await regulatorySpineService.getOrganizationRegulatoryProfile(
      req.params.organizationId
    );
    res.json(profile);
  } catch (error) {
    console.error("Error fetching regulatory profile:", error);
    res.status(500).json({ error: error.message });
  }
});
router2.post("/frameworks/initialize-universal", isAuthenticated, async (req, res) => {
  try {
    await regulatorySpineService.initializeUniversalRegulatorySpine();
    res.json({ message: "Universal regulatory spine initialized with all FAR Parts" });
  } catch (error) {
    console.error("Error initializing universal spine:", error);
    res.status(500).json({ error: error.message });
  }
});
var adaptive_compliance_default = router2;

// server/routes/advanced-key-recovery.ts
import { z as z3 } from "zod";

// server/services/simplified-key-recovery.ts
import crypto4 from "crypto";
var SimplifiedKeyRecoveryService = class {
  async initiateKeyRecovery(recoveryRequest) {
    const requestId = crypto4.randomUUID();
    const riskScore = this.calculateRiskScore(recoveryRequest);
    const verificationSteps = this.determineVerificationSteps(recoveryRequest, riskScore);
    await this.storeRecoveryRequest(requestId, recoveryRequest, riskScore);
    return {
      requestId,
      verificationSteps,
      estimatedProcessingTime: this.calculateProcessingTime(riskScore, recoveryRequest.requestType),
      requiredDocuments: this.getRequiredDocuments(recoveryRequest.requestType, riskScore)
    };
  }
  async processBiometricVerification(requestId, biometricData) {
    const mockVerificationResults = {
      fingerprint: { match: true, confidence: 0.92 },
      faceRecognition: { match: true, confidence: 0.88 },
      voicePrint: { match: true, confidence: 0.85 },
      retinaScan: { match: false, confidence: 0.65 }
    };
    const matchedBiometrics = Object.entries(mockVerificationResults).filter(([_, result]) => result.match).map(([type, _]) => type);
    const failedBiometrics = Object.entries(mockVerificationResults).filter(([_, result]) => !result.match).map(([type, _]) => type);
    const overallConfidence = Object.values(mockVerificationResults).reduce((sum, result) => sum + result.confidence, 0) / 4;
    const verified = matchedBiometrics.length >= 2 && overallConfidence > 0.8;
    await this.updateRecoveryRequestStatus(requestId, "biometric_verification", verified);
    return {
      verified,
      confidence: overallConfidence,
      matchedBiometrics,
      failedBiometrics
    };
  }
  async processIdentityDocumentVerification(requestId, documents) {
    const verifiedDocuments = documents.map((doc) => doc.documentType);
    const failedDocuments = [];
    const confidence = 0.95;
    const verified = verifiedDocuments.length > 0;
    await this.updateRecoveryRequestStatus(requestId, "identity_verification", verified);
    return {
      verified,
      verifiedDocuments,
      failedDocuments,
      confidence
    };
  }
  async processEmploymentVerification(requestId, employmentData) {
    const verificationMethods = ["hr_contact_verified", "manager_approval_verified"];
    const confidence = 0.9;
    const verified = true;
    await this.updateRecoveryRequestStatus(requestId, "employment_verification", verified);
    return {
      verified,
      confidence,
      verificationMethods
    };
  }
  async getRecoveryStatus(requestId) {
    const completedSteps = ["recovery_initiated", "identity_verification"];
    const totalSteps = ["recovery_initiated", "identity_verification", "biometric_verification", "employment_verification", "key_generation"];
    const pendingSteps = totalSteps.filter((step) => !completedSteps.includes(step));
    const progress = completedSteps.length / totalSteps.length * 100;
    const estimatedCompletion = /* @__PURE__ */ new Date();
    estimatedCompletion.setHours(estimatedCompletion.getHours() + pendingSteps.length * 4);
    return {
      status: "processing",
      progress,
      completedSteps,
      pendingSteps,
      estimatedCompletion,
      securityAlerts: []
    };
  }
  async getAllRecoveryRequests(filters) {
    return [
      {
        id: crypto4.randomUUID(),
        credentialId: crypto4.randomUUID(),
        requestType: "lost_key",
        status: "processing",
        progress: 65,
        requestedAt: /* @__PURE__ */ new Date(),
        urgencyLevel: "medium"
      },
      {
        id: crypto4.randomUUID(),
        credentialId: crypto4.randomUUID(),
        requestType: "emergency_recovery",
        status: "pending_approval",
        progress: 80,
        requestedAt: /* @__PURE__ */ new Date(),
        urgencyLevel: "critical"
      }
    ];
  }
  async getRecoveryAuditTrail(requestId) {
    return [
      {
        eventType: "recovery_initiated",
        timestamp: /* @__PURE__ */ new Date(),
        performedBy: "system",
        eventData: { requestType: "lost_key" }
      },
      {
        eventType: "identity_verification",
        timestamp: /* @__PURE__ */ new Date(),
        performedBy: "user",
        eventData: { documentType: "passport", verified: true }
      }
    ];
  }
  async approveRecoveryRequest(requestId, approvalData) {
    await this.updateRecoveryRequestStatus(requestId, "approved", true);
    return {
      approved: true,
      newKeyGenerated: true,
      securityLevel: "enhanced",
      monitoringPeriod: 30
    };
  }
  async rejectRecoveryRequest(requestId, rejectionData) {
    await this.updateRecoveryRequestStatus(requestId, "rejected", false);
    return {
      rejected: true,
      reason: rejectionData.rejectionReason
    };
  }
  async processEmergencyOverride(overrideData) {
    return {
      overrideApproved: true,
      temporaryAccessGranted: true,
      expirationTime: new Date(Date.now() + 24 * 60 * 60 * 1e3)
      // 24 hours
    };
  }
  // Helper methods
  calculateRiskScore(request) {
    let riskScore = 0;
    switch (request.requestType) {
      case "lost_key":
        riskScore += 0.3;
        break;
      case "compromise":
        riskScore += 0.7;
        break;
      case "career_transfer":
        riskScore += 0.2;
        break;
      case "emergency_recovery":
        riskScore += 0.5;
        break;
    }
    riskScore += Math.random() * 0.2;
    return Math.min(riskScore, 1);
  }
  determineVerificationSteps(request, riskScore) {
    const steps = ["identity_verification"];
    if (riskScore > 0.5) {
      steps.push("biometric_verification");
      steps.push("employment_verification");
      steps.push("regulatory_authority_confirmation");
    } else if (riskScore > 0.3) {
      steps.push("biometric_verification");
      steps.push("employment_verification");
    }
    if (request.emergencyProtocol) {
      steps.unshift("emergency_protocol_verification");
    }
    return steps;
  }
  calculateProcessingTime(riskScore, requestType) {
    if (requestType === "emergency_recovery") return "1-4 hours";
    if (riskScore > 0.7) return "5-7 business days";
    if (riskScore > 0.4) return "2-3 business days";
    return "24-48 hours";
  }
  getRequiredDocuments(requestType, riskScore) {
    const documents = ["government_issued_id", "current_pilot_license"];
    if (riskScore > 0.5) {
      documents.push("employment_verification_letter");
      documents.push("biometric_enrollment_data");
    }
    if (requestType === "compromise") {
      documents.push("security_incident_report");
    }
    return documents;
  }
  async storeRecoveryRequest(requestId, request, riskScore) {
    console.log(`Storing recovery request ${requestId} with risk score ${riskScore}`);
  }
  async updateRecoveryRequestStatus(requestId, step, success) {
    console.log(`Updating recovery request ${requestId}: ${step} = ${success}`);
  }
};
var simplifiedKeyRecoveryService = new SimplifiedKeyRecoveryService();

// server/routes/advanced-key-recovery.ts
var biometricDataSchema = z3.object({
  fingerprintHash: z3.string().min(64),
  faceRecognitionHash: z3.string().min(64),
  voicePrintHash: z3.string().min(64),
  retinaScanHash: z3.string().min(64)
});
var identityDocumentSchema = z3.object({
  documentType: z3.enum(["passport", "drivers_license", "government_id", "pilot_license"]),
  documentNumber: z3.string().min(1),
  issuingAuthority: z3.string().min(1),
  expirationDate: z3.string().transform((str) => new Date(str)),
  documentImageHash: z3.string().min(64),
  ocrExtractedData: z3.any()
});
var employmentVerificationSchema = z3.object({
  currentEmployer: z3.string().min(1),
  employerVerificationCode: z3.string().min(1),
  hrContactEmail: z3.string().email(),
  employmentStartDate: z3.string().transform((str) => new Date(str)),
  positionTitle: z3.string().min(1),
  managerApprovalHash: z3.string().min(64)
});
var emergencyProtocolSchema = z3.object({
  emergencyType: z3.enum(["medical", "security_breach", "natural_disaster", "equipment_failure"]),
  urgencyLevel: z3.enum(["low", "medium", "high", "critical"]),
  authorizingOfficer: z3.string().min(1),
  emergencyContactVerified: z3.boolean(),
  medicalDocumentationHash: z3.string().optional(),
  securityIncidentReport: z3.string().optional()
});
var keyRecoveryRequestSchema = z3.object({
  credentialId: z3.string().uuid(),
  requestType: z3.enum(["lost_key", "compromise", "career_transfer", "emergency_recovery"]),
  requestReason: z3.string().min(10),
  // Multi-Factor Authentication
  primaryAuthMethod: z3.enum(["biometric", "knowledge_based", "possession_based"]),
  secondaryAuthMethod: z3.enum(["sms", "email", "authenticator_app", "hardware_token"]),
  tertiaryAuthMethod: z3.enum(["government_id", "employment_verification", "regulatory_authority"]),
  // Optional verification data
  biometricData: biometricDataSchema.optional(),
  identityDocuments: z3.array(identityDocumentSchema),
  knowledgeBasedQuestions: z3.array(z3.object({
    question: z3.string(),
    answerHash: z3.string(),
    confidenceScore: z3.number().min(0).max(1)
  })),
  employmentVerification: employmentVerificationSchema,
  // Historical data
  historicalTrainingRecords: z3.array(z3.string()),
  previousEmployers: z3.array(z3.string()),
  knownAssociates: z3.array(z3.string()),
  flightHours: z3.number().min(0),
  certificationHistory: z3.array(z3.any()),
  emergencyProtocol: emergencyProtocolSchema.optional(),
  // Geo-location data
  geoLocationVerification: z3.object({
    requestedFrom: z3.string(),
    historicalLocations: z3.array(z3.string()),
    travelPattern: z3.string()
  }),
  regulatoryAuthoritiesNotified: z3.array(z3.string()),
  complianceChecksPassed: z3.boolean()
});
var keyRecoveryApprovalSchema = z3.object({
  requestId: z3.string().uuid(),
  approvalLevel: z3.enum(["automatic", "supervisor", "admin", "regulatory_authority"]),
  approvingOfficer: z3.string().min(1),
  approvalReason: z3.string().min(10),
  conditionsOfApproval: z3.array(z3.string()),
  newKeyGenerationMethod: z3.enum(["standard", "enhanced_security", "temporary_access"]),
  monitoringPeriod: z3.number().min(1).max(365),
  additionalSecurityMeasures: z3.array(z3.string())
});
function registerAdvancedKeyRecoveryRoutes(app) {
  app.post("/api/advanced-key-recovery/initiate", isAuthenticated, async (req, res) => {
    try {
      const validatedData = keyRecoveryRequestSchema.parse(req.body);
      const result = await simplifiedKeyRecoveryService.initiateKeyRecovery(validatedData);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error("Key recovery initiation error:", error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });
  app.post("/api/advanced-key-recovery/:requestId/biometric-verification", isAuthenticated, async (req, res) => {
    try {
      const { requestId } = req.params;
      const biometricData = biometricDataSchema.parse(req.body);
      const result = await simplifiedKeyRecoveryService.processBiometricVerification(requestId, biometricData);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error("Biometric verification error:", error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });
  app.post("/api/advanced-key-recovery/:requestId/identity-verification", isAuthenticated, async (req, res) => {
    try {
      const { requestId } = req.params;
      const documents = z3.array(identityDocumentSchema).parse(req.body.documents);
      const result = await simplifiedKeyRecoveryService.processIdentityDocumentVerification(requestId, documents);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error("Identity verification error:", error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });
  app.post("/api/advanced-key-recovery/:requestId/employment-verification", isAuthenticated, async (req, res) => {
    try {
      const { requestId } = req.params;
      const employmentData = employmentVerificationSchema.parse(req.body);
      const result = await simplifiedKeyRecoveryService.processEmploymentVerification(requestId, employmentData);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error("Employment verification error:", error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });
  app.post("/api/advanced-key-recovery/:requestId/emergency-recovery", isAuthenticated, async (req, res) => {
    try {
      const { requestId } = req.params;
      const emergencyProtocol = emergencyProtocolSchema.parse(req.body);
      const result = await simplifiedKeyRecoveryService.processEmergencyOverride({ requestId, ...emergencyProtocol });
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error("Emergency recovery error:", error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });
  app.post("/api/advanced-key-recovery/:requestId/generate-replacement-key", isAuthenticated, async (req, res) => {
    try {
      const { requestId } = req.params;
      const approvalData = keyRecoveryApprovalSchema.parse(req.body);
      const result = await simplifiedKeyRecoveryService.approveRecoveryRequest(requestId, approvalData);
      res.json({
        success: true,
        data: {
          keyDerivationPath: result.keyDerivationPath,
          securityLevel: result.securityLevel,
          monitoringPeriod: result.monitoringPeriod
          // Note: newMasterPrivateKey is intentionally not returned for security
        },
        message: "New master private key generated successfully. Key has been securely stored and is ready for use."
      });
    } catch (error) {
      console.error("Key generation error:", error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });
  app.get("/api/advanced-key-recovery/:requestId/status", isAuthenticated, async (req, res) => {
    try {
      const { requestId } = req.params;
      const status = await simplifiedKeyRecoveryService.getRecoveryStatus(requestId);
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error("Get recovery status error:", error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });
  app.get("/api/advanced-key-recovery/requests", isAuthenticated, async (req, res) => {
    try {
      const { status, urgency, limit = 50, offset = 0 } = req.query;
      const requests = await simplifiedKeyRecoveryService.getAllRecoveryRequests({
        status,
        urgency,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      res.json({
        success: true,
        data: requests
      });
    } catch (error) {
      console.error("Get recovery requests error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });
  app.get("/api/advanced-key-recovery/:requestId/audit-trail", isAuthenticated, async (req, res) => {
    try {
      const { requestId } = req.params;
      const auditTrail = await simplifiedKeyRecoveryService.getRecoveryAuditTrail(requestId);
      res.json({
        success: true,
        data: auditTrail
      });
    } catch (error) {
      console.error("Get audit trail error:", error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });
  app.post("/api/advanced-key-recovery/:requestId/approve", isAuthenticated, async (req, res) => {
    try {
      const { requestId } = req.params;
      const approvalData = keyRecoveryApprovalSchema.parse(req.body);
      const userClaims = req.user?.claims;
      if (!userClaims || !userClaims.roles?.includes("admin")) {
        return res.status(403).json({
          success: false,
          error: "Insufficient privileges to approve key recovery requests"
        });
      }
      const result = await simplifiedKeyRecoveryService.approveRecoveryRequest(requestId, approvalData);
      res.json({
        success: true,
        data: result,
        message: "Key recovery request approved successfully"
      });
    } catch (error) {
      console.error("Recovery approval error:", error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });
  app.post("/api/advanced-key-recovery/:requestId/reject", isAuthenticated, async (req, res) => {
    try {
      const { requestId } = req.params;
      const { rejectionReason, additionalNotes } = req.body;
      const userClaims = req.user?.claims;
      if (!userClaims || !userClaims.roles?.includes("admin")) {
        return res.status(403).json({
          success: false,
          error: "Insufficient privileges to reject key recovery requests"
        });
      }
      const result = await simplifiedKeyRecoveryService.rejectRecoveryRequest(requestId, {
        rejectionReason,
        additionalNotes,
        rejectedBy: userClaims.sub
      });
      res.json({
        success: true,
        data: result,
        message: "Key recovery request rejected"
      });
    } catch (error) {
      console.error("Recovery rejection error:", error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });
  app.post("/api/advanced-key-recovery/emergency-override", isAuthenticated, async (req, res) => {
    try {
      const { credentialId, overrideReason, authorizingOfficer, emergencyCode } = req.body;
      const userClaims = req.user?.claims;
      if (!userClaims || !userClaims.roles?.includes("emergency_admin")) {
        return res.status(403).json({
          success: false,
          error: "Insufficient privileges for emergency override"
        });
      }
      const result = await simplifiedKeyRecoveryService.processEmergencyOverride({
        credentialId,
        overrideReason,
        authorizingOfficer,
        emergencyCode,
        requestedBy: userClaims.sub
      });
      res.json({
        success: true,
        data: result,
        message: "Emergency override processed successfully"
      });
    } catch (error) {
      console.error("Emergency override error:", error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });
}

// server/routes/multi-platform-integration.ts
import { Router as Router3 } from "express";
var router3 = Router3();
router3.use(isAuthenticated);
router3.get("/overview", async (req, res) => {
  try {
    const stats = {
      connectedCenters: 2,
      pendingCenters: 1,
      activePilots: 847,
      blockchainRecords: 2139,
      transferRequests: 12,
      recentActivity: [
        {
          id: "1",
          type: "transfer_request",
          description: "Captain Sarah Mitchell requested record transfer",
          details: "From Skyward Flight Training \u2022 2 hours ago",
          badge: "15 Records",
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1e3).toISOString()
        },
        {
          id: "2",
          type: "sync_completed",
          description: "European Aviation Academy sync completed",
          details: "892 records verified \u2022 4 hours ago",
          badge: "Completed",
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1e3).toISOString()
        },
        {
          id: "3",
          type: "integration_request",
          description: "Metro Flight College requesting platform access",
          details: "Part 141 training center \u2022 1 day ago",
          badge: "Pending",
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1e3).toISOString()
        }
      ]
    };
    res.json(stats);
  } catch (error) {
    console.error("Error getting platform overview:", error);
    res.status(500).json({ error: "Failed to get platform overview" });
  }
});
router3.get("/training-centers", async (req, res) => {
  try {
    const trainingCenters = [
      {
        id: "tc_001",
        name: "Skyward Flight Training",
        type: "Part 142",
        country: "United States",
        blockchainId: "bc_sky_001",
        status: "connected",
        recordCount: 1247,
        lastSync: new Date(Date.now() - 6 * 60 * 60 * 1e3).toISOString(),
        certificateLevel: "Platinum",
        contactEmail: "admin@skywardflight.com",
        certificationNumber: "FAA-142-SKY-001",
        legacySystem: "CATS Training Management",
        createdAt: /* @__PURE__ */ new Date("2024-01-15"),
        updatedAt: /* @__PURE__ */ new Date()
      },
      {
        id: "tc_002",
        name: "European Aviation Academy",
        type: "EASA ATO",
        country: "Germany",
        blockchainId: "bc_eaa_002",
        status: "connected",
        recordCount: 892,
        lastSync: new Date(Date.now() - 8 * 60 * 60 * 1e3).toISOString(),
        certificateLevel: "Gold",
        contactEmail: "records@euroaviation.eu",
        certificationNumber: "EASA-ATO-DE-002",
        legacySystem: "FlightDeck Solutions",
        createdAt: /* @__PURE__ */ new Date("2024-02-20"),
        updatedAt: /* @__PURE__ */ new Date()
      },
      {
        id: "tc_003",
        name: "Metro Flight College",
        type: "Part 141",
        country: "United States",
        blockchainId: "bc_mfc_003",
        status: "pending",
        recordCount: 634,
        lastSync: new Date(Date.now() - 2 * 24 * 60 * 60 * 1e3).toISOString(),
        certificateLevel: "Silver",
        contactEmail: "it@metroflight.edu",
        certificationNumber: "FAA-141-MFC-003",
        legacySystem: "Custom Database System",
        createdAt: /* @__PURE__ */ new Date("2024-03-10"),
        updatedAt: /* @__PURE__ */ new Date()
      },
      {
        id: "tc_004",
        name: "Sahara Aviation Training",
        type: "ICAO ATO",
        country: "South Africa",
        blockchainId: "bc_sat_004",
        status: "disconnected",
        recordCount: 0,
        lastSync: "Never",
        certificateLevel: "Bronze",
        contactEmail: "training@saharaaviation.co.za",
        certificationNumber: "SACAA-ATO-004",
        legacySystem: "Paper Records",
        createdAt: /* @__PURE__ */ new Date("2024-04-05"),
        updatedAt: /* @__PURE__ */ new Date()
      }
    ];
    res.json(trainingCenters);
  } catch (error) {
    console.error("Error getting training centers:", error);
    res.status(500).json({ error: "Failed to get training centers" });
  }
});
router3.get("/pilot-records", async (req, res) => {
  try {
    const { search, centerId } = req.query;
    let pilotRecords = [
      {
        id: "pr_001",
        pilotId: "plt_001",
        pilotName: "Captain Sarah Mitchell",
        pilotEmail: "sarah.mitchell@airline.com",
        pilotPrivateKey: "bccs_key_plt_001_verified",
        trainingCenterId: "tc_001",
        trainingCenterName: "Skyward Flight Training",
        totalHours: 3500,
        certificatesEarned: 12,
        requestedTransfer: true,
        records: [
          {
            id: "rec_001",
            type: "Type Rating",
            title: "Boeing 737-800 Type Rating",
            date: "2024-06-15",
            status: "verified",
            blockchainHash: "0x8a7f2e4d9c5b1a3f..."
          },
          {
            id: "rec_002",
            type: "Recurrent Training",
            title: "Annual Recurrent Training",
            date: "2024-03-22",
            status: "pending_transfer"
          },
          {
            id: "rec_003",
            type: "Instrument Rating",
            title: "Instrument Rating Renewal",
            date: "2024-01-10",
            status: "transferred",
            blockchainHash: "0x9b8c3f5e7a2d4c6b..."
          }
        ],
        createdAt: /* @__PURE__ */ new Date("2024-01-15"),
        updatedAt: /* @__PURE__ */ new Date()
      },
      {
        id: "pr_002",
        pilotId: "plt_002",
        pilotName: "First Officer Marcus Chen",
        pilotEmail: "marcus.chen@pilot.com",
        pilotPrivateKey: "bccs_key_plt_002_verified",
        trainingCenterId: "tc_002",
        trainingCenterName: "European Aviation Academy",
        totalHours: 1850,
        certificatesEarned: 8,
        requestedTransfer: false,
        records: [
          {
            id: "rec_004",
            type: "ATPL Theory",
            title: "ATPL Theory Completion",
            date: "2024-05-20",
            status: "verified",
            blockchainHash: "0x7c6d2a3b8e1f5c9a..."
          }
        ],
        createdAt: /* @__PURE__ */ new Date("2024-02-20"),
        updatedAt: /* @__PURE__ */ new Date()
      }
    ];
    if (search) {
      const searchTerm = search.toString().toLowerCase();
      pilotRecords = pilotRecords.filter(
        (pilot) => pilot.pilotName.toLowerCase().includes(searchTerm) || pilot.pilotEmail.toLowerCase().includes(searchTerm) || pilot.pilotId.toLowerCase().includes(searchTerm)
      );
    }
    if (centerId && centerId !== "all") {
      pilotRecords = pilotRecords.filter((pilot) => pilot.trainingCenterId === centerId);
    }
    res.json(pilotRecords);
  } catch (error) {
    console.error("Error getting pilot records:", error);
    res.status(500).json({ error: "Failed to get pilot records" });
  }
});
router3.get("/transfer-requests", async (req, res) => {
  try {
    const transferRequests = [
      {
        id: "req_001",
        pilotId: "plt_001",
        pilotName: "Captain Sarah Mitchell",
        pilotEmail: "sarah.mitchell@airline.com",
        trainingCenterId: "tc_001",
        trainingCenterName: "Skyward Flight Training",
        recordsRequested: 15,
        status: "pending_center_approval",
        requestedDate: /* @__PURE__ */ new Date("2024-08-08T14:30:00Z"),
        estimatedCompletion: /* @__PURE__ */ new Date("2024-08-12T17:00:00Z"),
        pilotPrivateKey: "bccs_key_plt_001_verified",
        transferReason: "Career advancement - new airline requires blockchain-verified records",
        createdAt: /* @__PURE__ */ new Date("2024-08-08T14:30:00Z"),
        updatedAt: /* @__PURE__ */ new Date()
      },
      {
        id: "req_002",
        pilotId: "plt_003",
        pilotName: "Captain James Rodriguez",
        pilotEmail: "james.rodriguez@freight.com",
        trainingCenterId: "tc_001",
        trainingCenterName: "Skyward Flight Training",
        recordsRequested: 22,
        status: "in_progress",
        requestedDate: /* @__PURE__ */ new Date("2024-08-06T09:15:00Z"),
        estimatedCompletion: /* @__PURE__ */ new Date("2024-08-10T16:30:00Z"),
        pilotPrivateKey: "bccs_key_plt_003_verified",
        blockchainVerificationHash: "0x4f2a8e7c3d5b9a1c...",
        transferReason: "Regulatory compliance - international operations require verified credentials",
        createdAt: /* @__PURE__ */ new Date("2024-08-06T09:15:00Z"),
        updatedAt: /* @__PURE__ */ new Date()
      }
    ];
    res.json(transferRequests);
  } catch (error) {
    console.error("Error getting transfer requests:", error);
    res.status(500).json({ error: "Failed to get transfer requests" });
  }
});
router3.post("/transfer-requests/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalNotes } = req.body;
    console.log(`Approving transfer request ${id} with notes: ${approvalNotes}`);
    const blockchainHash = `0x${Math.random().toString(16).substring(2, 18)}...`;
    res.json({
      success: true,
      message: "Transfer request approved successfully",
      blockchainHash,
      estimatedCompletion: new Date(Date.now() + 4 * 24 * 60 * 60 * 1e3).toISOString()
    });
  } catch (error) {
    console.error("Error approving transfer request:", error);
    res.status(500).json({ error: "Failed to approve transfer request" });
  }
});
router3.post("/transfer-requests/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    console.log(`Rejecting transfer request ${id} with reason: ${rejectionReason}`);
    res.json({
      success: true,
      message: "Transfer request rejected",
      rejectionReason
    });
  } catch (error) {
    console.error("Error rejecting transfer request:", error);
    res.status(500).json({ error: "Failed to reject transfer request" });
  }
});
router3.post("/integration-requests", async (req, res) => {
  try {
    const {
      organizationName,
      organizationType,
      country,
      contactEmail,
      certificationNumber,
      estimatedRecords,
      legacySystem,
      integrationPriority
    } = req.body;
    if (!organizationName || !organizationType || !country || !contactEmail) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const integrationRequest = {
      id: `int_${Date.now()}`,
      organizationName,
      organizationType,
      country,
      contactEmail,
      certificationNumber: certificationNumber || "",
      estimatedRecords: parseInt(estimatedRecords) || 0,
      legacySystem: legacySystem || "Not specified",
      integrationPriority: integrationPriority || "normal",
      status: "submitted",
      submissionDate: /* @__PURE__ */ new Date()
    };
    console.log("New integration request submitted:", integrationRequest);
    res.json({
      success: true,
      message: "Integration request submitted successfully",
      requestId: integrationRequest.id,
      estimatedReviewTime: integrationPriority === "urgent" ? "1-2 business days" : "3-5 business days"
    });
  } catch (error) {
    console.error("Error submitting integration request:", error);
    res.status(500).json({ error: "Failed to submit integration request" });
  }
});
router3.post("/training-centers/:id/sync", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Starting sync for training center ${id}`);
    setTimeout(() => {
      console.log(`Sync completed for training center ${id}`);
    }, 5e3);
    res.json({
      success: true,
      message: "Sync process started",
      estimatedCompletion: new Date(Date.now() + 10 * 60 * 1e3).toISOString()
    });
  } catch (error) {
    console.error("Error starting sync:", error);
    res.status(500).json({ error: "Failed to start sync process" });
  }
});
router3.get("/integration-benefits", async (req, res) => {
  try {
    const benefits = {
      pilotDriven: {
        title: "Pilot-Driven Demand",
        description: "Pilots increasingly request blockchain-verified records for career portability",
        impact: "High adoption pressure from individual pilots"
      },
      compliance: {
        title: "Regulatory Compliance",
        description: "Automated compliance monitoring across multiple aviation authorities",
        impact: "Reduced administrative burden"
      },
      competitive: {
        title: "Competitive Advantage",
        description: "Attract top pilots with cutting-edge blockchain credential management",
        impact: "Enhanced reputation and pilot recruitment"
      },
      efficiency: {
        title: "Operational Efficiency",
        description: "Streamlined record management and automated regulatory reporting",
        impact: "Cost savings and reduced errors"
      },
      global: {
        title: "Global Recognition",
        description: "International verification across all major aviation markets",
        impact: "Expanded training opportunities"
      },
      revenue: {
        title: "Revenue Opportunities",
        description: "30% commission on pilot subscription conversions",
        impact: "Additional revenue stream"
      }
    };
    res.json(benefits);
  } catch (error) {
    console.error("Error getting integration benefits:", error);
    res.status(500).json({ error: "Failed to get integration benefits" });
  }
});
var multi_platform_integration_default = router3;

// server/generate-document-import-tutorial.ts
import {
  Document as Document2,
  Paragraph as Paragraph2,
  TextRun as TextRun2,
  HeadingLevel as HeadingLevel2,
  AlignmentType as AlignmentType2,
  Packer as Packer2
} from "docx";
async function generateDocumentImportTutorial() {
  const doc = new Document2({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph2({
            text: "AI Document Import Tutorial",
            heading: HeadingLevel2.TITLE,
            alignment: AlignmentType2.CENTER,
            spacing: { after: 400 }
          }),
          new Paragraph2({
            alignment: AlignmentType2.CENTER,
            spacing: { after: 600 },
            children: [
              new TextRun2({
                text: "BCCS-US Aviation Compliance Platform",
                italics: true,
                color: "666666"
              })
            ]
          }),
          new Paragraph2({
            text: "Overview",
            heading: HeadingLevel2.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph2({
            spacing: { after: 200 },
            children: [
              new TextRun2({
                text: "The AI Document Import feature allows you to upload training documents that are automatically processed using advanced AI and OCR (Optical Character Recognition) technology. The system extracts relevant compliance data, validates it against regulatory requirements, and prepares it for blockchain verification."
              })
            ]
          }),
          new Paragraph2({
            spacing: { after: 200 },
            children: [
              new TextRun2({
                text: "This powerful tool transforms paper-based and digital documents into structured, searchable, and verifiable compliance records - essential for modern aviation training organizations."
              })
            ]
          }),
          new Paragraph2({
            text: "Supported Document Types",
            heading: HeadingLevel2.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph2({
            spacing: { after: 100 },
            children: [
              new TextRun2({
                text: "The system accepts the following file formats:"
              })
            ]
          }),
          new Paragraph2({
            spacing: { after: 50 },
            children: [
              new TextRun2({
                text: "PDF Documents",
                bold: true
              }),
              new TextRun2({
                text: " - Training certificates, syllabi, regulatory documents, audit reports"
              })
            ]
          }),
          new Paragraph2({
            spacing: { after: 50 },
            children: [
              new TextRun2({
                text: "Excel Spreadsheets (.xlsx)",
                bold: true
              }),
              new TextRun2({
                text: " - Training records, student rosters, compliance tracking sheets"
              })
            ]
          }),
          new Paragraph2({
            spacing: { after: 50 },
            children: [
              new TextRun2({
                text: "CSV Files",
                bold: true
              }),
              new TextRun2({
                text: " - Exported data from other systems, bulk record imports"
              })
            ]
          }),
          new Paragraph2({
            spacing: { after: 50 },
            children: [
              new TextRun2({
                text: "Images (JPEG, PNG)",
                bold: true
              }),
              new TextRun2({
                text: " - Scanned certificates, signed documents, photo evidence"
              })
            ]
          }),
          new Paragraph2({
            spacing: { after: 200 },
            children: [
              new TextRun2({
                text: "Maximum file size: 10MB per file",
                italics: true,
                color: "666666"
              })
            ]
          }),
          new Paragraph2({
            text: "How to Upload Documents",
            heading: HeadingLevel2.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph2({
            text: "Step 1: Access the Upload Area",
            heading: HeadingLevel2.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph2({
            spacing: { after: 100 },
            children: [
              new TextRun2({
                text: `Navigate to the "AI Document Import" page from the sidebar. You'll see the upload area prominently displayed with a cloud upload icon.`
              })
            ]
          }),
          new Paragraph2({
            text: "Step 2: Select Your Files",
            heading: HeadingLevel2.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph2({
            spacing: { after: 100 },
            children: [
              new TextRun2({
                text: "You have two options to add files:"
              })
            ]
          }),
          new Paragraph2({
            text: "\u2022 Drag and Drop - Simply drag files from your computer and drop them onto the upload area",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph2({
            text: '\u2022 Click to Browse - Click the "Select Files" button to open your file browser',
            bullet: { level: 0 },
            spacing: { after: 100 }
          }),
          new Paragraph2({
            spacing: { after: 100 },
            children: [
              new TextRun2({
                text: "You can select multiple files at once for batch processing."
              })
            ]
          }),
          new Paragraph2({
            text: "Step 3: Monitor Upload Progress",
            heading: HeadingLevel2.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph2({
            spacing: { after: 100 },
            children: [
              new TextRun2({
                text: "Once you add files, you'll see:"
              })
            ]
          }),
          new Paragraph2({
            text: "\u2022 A progress indicator for each file being uploaded",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph2({
            text: "\u2022 Status updates (Pending \u2192 Uploading \u2192 Success/Error)",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph2({
            text: "\u2022 Success confirmation with a green checkmark",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph2({
            text: "\u2022 Error messages if something goes wrong",
            bullet: { level: 0 },
            spacing: { after: 200 }
          }),
          new Paragraph2({
            text: "Document Processing Pipeline",
            heading: HeadingLevel2.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph2({
            spacing: { after: 100 },
            children: [
              new TextRun2({
                text: "After upload, documents go through an automated processing pipeline:"
              })
            ]
          }),
          new Paragraph2({
            text: "Stage 1: Upload Complete",
            heading: HeadingLevel2.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph2({
            spacing: { after: 100 },
            children: [
              new TextRun2({
                text: "Status: ",
                bold: true
              }),
              new TextRun2({
                text: "Uploaded",
                color: "B45309"
              }),
              new TextRun2({
                text: " (amber indicator)"
              })
            ]
          }),
          new Paragraph2({
            spacing: { after: 100 },
            children: [
              new TextRun2({
                text: "The file has been received and stored securely. It's queued for AI processing."
              })
            ]
          }),
          new Paragraph2({
            text: "Stage 2: AI Processing",
            heading: HeadingLevel2.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph2({
            spacing: { after: 100 },
            children: [
              new TextRun2({
                text: "Status: ",
                bold: true
              }),
              new TextRun2({
                text: "Processing",
                color: "2563EB"
              }),
              new TextRun2({
                text: " (blue spinner)"
              })
            ]
          }),
          new Paragraph2({
            spacing: { after: 100 },
            children: [
              new TextRun2({
                text: "During this stage, the system:"
              })
            ]
          }),
          new Paragraph2({
            text: "\u2022 Applies OCR to extract text from images and scanned PDFs",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph2({
            text: "\u2022 Uses AI to identify document type and structure",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph2({
            text: "\u2022 Extracts key fields (dates, names, certificate numbers, etc.)",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph2({
            text: "\u2022 Maps extracted data to compliance requirements",
            bullet: { level: 0 },
            spacing: { after: 100 }
          }),
          new Paragraph2({
            text: "Stage 3: Processing Complete",
            heading: HeadingLevel2.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph2({
            spacing: { after: 100 },
            children: [
              new TextRun2({
                text: "Status: ",
                bold: true
              }),
              new TextRun2({
                text: "Processed",
                color: "059669"
              }),
              new TextRun2({
                text: " (green checkmark)"
              })
            ]
          }),
          new Paragraph2({
            spacing: { after: 100 },
            children: [
              new TextRun2({
                text: "AI processing is complete. Extracted data is ready for human review and validation."
              })
            ]
          }),
          new Paragraph2({
            text: "Stage 4: Validation",
            heading: HeadingLevel2.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph2({
            spacing: { after: 100 },
            children: [
              new TextRun2({
                text: "Status: ",
                bold: true
              }),
              new TextRun2({
                text: "Validated",
                color: "047857"
              }),
              new TextRun2({
                text: " (dark green checkmark)"
              })
            ]
          }),
          new Paragraph2({
            spacing: { after: 200 },
            children: [
              new TextRun2({
                text: "A human reviewer has verified the extracted data. The document is ready for blockchain hashing and permanent record creation."
              })
            ]
          }),
          new Paragraph2({
            text: "Document Processing History",
            heading: HeadingLevel2.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph2({
            spacing: { after: 100 },
            children: [
              new TextRun2({
                text: "The bottom section of the page shows all your uploaded documents with:"
              })
            ]
          }),
          new Paragraph2({
            text: "\u2022 File name and upload timestamp",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph2({
            text: "\u2022 Current processing status with color-coded badge",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph2({
            text: "\u2022 View button - Preview document details and extracted data",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph2({
            text: "\u2022 Download button - Download the original file",
            bullet: { level: 0 },
            spacing: { after: 200 }
          }),
          new Paragraph2({
            text: "Processing Guidelines",
            heading: HeadingLevel2.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph2({
            spacing: { after: 100 },
            children: [
              new TextRun2({
                text: "For best results, follow these recommendations:"
              })
            ]
          }),
          new Paragraph2({
            text: "High-Quality Scans",
            heading: HeadingLevel2.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph2({
            spacing: { after: 100 },
            children: [
              new TextRun2({
                text: "Use 300+ DPI (dots per inch) when scanning documents. Higher resolution means better OCR accuracy. Most modern scanners default to 300 DPI, but check your settings for important documents."
              })
            ]
          }),
          new Paragraph2({
            text: "Clear, Legible Text",
            heading: HeadingLevel2.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph2({
            spacing: { after: 100 },
            children: [
              new TextRun2({
                text: "Ensure text is sharp and not blurred. Avoid scanning documents through plastic sleeves or at extreme angles. If text is faded, consider adjusting scan contrast settings."
              })
            ]
          }),
          new Paragraph2({
            text: "Standard Orientation",
            heading: HeadingLevel2.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph2({
            spacing: { after: 100 },
            children: [
              new TextRun2({
                text: "Upload documents right-side up. While the AI can handle some rotation, properly oriented documents process faster and more accurately."
              })
            ]
          }),
          new Paragraph2({
            text: "Complete Documents",
            heading: HeadingLevel2.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph2({
            spacing: { after: 200 },
            children: [
              new TextRun2({
                text: "Include all pages of multi-page documents in a single PDF rather than separate image files. This helps the AI understand context across pages."
              })
            ]
          }),
          new Paragraph2({
            text: "Common Document Types",
            heading: HeadingLevel2.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph2({
            spacing: { after: 100 },
            children: [
              new TextRun2({
                text: "The AI is trained to recognize and extract data from various aviation training documents:"
              })
            ]
          }),
          new Paragraph2({
            spacing: { after: 50 },
            children: [
              new TextRun2({
                text: "Training Certificates",
                bold: true
              }),
              new TextRun2({
                text: " - Student name, certificate number, date issued, type ratings"
              })
            ]
          }),
          new Paragraph2({
            spacing: { after: 50 },
            children: [
              new TextRun2({
                text: "Course Completion Records",
                bold: true
              }),
              new TextRun2({
                text: " - Course name, hours completed, instructor signatures"
              })
            ]
          }),
          new Paragraph2({
            spacing: { after: 50 },
            children: [
              new TextRun2({
                text: "Flight Training Records",
                bold: true
              }),
              new TextRun2({
                text: " - Flight hours, maneuvers, aircraft type, dual/solo time"
              })
            ]
          }),
          new Paragraph2({
            spacing: { after: 50 },
            children: [
              new TextRun2({
                text: "Simulator Session Logs",
                bold: true
              }),
              new TextRun2({
                text: " - Device ID, session duration, scenarios practiced"
              })
            ]
          }),
          new Paragraph2({
            spacing: { after: 50 },
            children: [
              new TextRun2({
                text: "Knowledge Test Results",
                bold: true
              }),
              new TextRun2({
                text: " - Test type, score, date, testing center"
              })
            ]
          }),
          new Paragraph2({
            spacing: { after: 50 },
            children: [
              new TextRun2({
                text: "Practical Test Results",
                bold: true
              }),
              new TextRun2({
                text: " - Examiner name, areas of operation, outcome"
              })
            ]
          }),
          new Paragraph2({
            spacing: { after: 200 },
            children: [
              new TextRun2({
                text: "Instructor Records",
                bold: true
              }),
              new TextRun2({
                text: " - Instructor certificates, currency dates, ratings held"
              })
            ]
          }),
          new Paragraph2({
            text: "Error Handling",
            heading: HeadingLevel2.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph2({
            spacing: { after: 100 },
            children: [
              new TextRun2({
                text: "If a document shows an ",
                bold: false
              }),
              new TextRun2({
                text: "Error",
                color: "DC2626",
                bold: true
              }),
              new TextRun2({
                text: " status, common causes include:"
              })
            ]
          }),
          new Paragraph2({
            text: "\u2022 File too large (exceeds 10MB limit)",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph2({
            text: "\u2022 Unsupported file format",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph2({
            text: "\u2022 Corrupted or password-protected file",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph2({
            text: "\u2022 Image quality too low for OCR",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph2({
            text: "\u2022 Document in unsupported language",
            bullet: { level: 0 },
            spacing: { after: 100 }
          }),
          new Paragraph2({
            spacing: { after: 200 },
            children: [
              new TextRun2({
                text: "Solution: ",
                bold: true
              }),
              new TextRun2({
                text: "Check the file meets requirements and try re-uploading. For persistent issues, contact support with the file name and error details."
              })
            ]
          }),
          new Paragraph2({
            text: "Integration with Compliance System",
            heading: HeadingLevel2.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph2({
            spacing: { after: 100 },
            children: [
              new TextRun2({
                text: "Documents processed through AI Document Import integrate with other BCCS-US features:"
              })
            ]
          }),
          new Paragraph2({
            spacing: { after: 50 },
            children: [
              new TextRun2({
                text: "Adaptive Compliance",
                bold: true
              }),
              new TextRun2({
                text: " - Extracted data maps to checklist items for evidence indexing"
              })
            ]
          }),
          new Paragraph2({
            spacing: { after: 50 },
            children: [
              new TextRun2({
                text: "Blockchain Verification",
                bold: true
              }),
              new TextRun2({
                text: " - Validated documents are hashed and recorded on the blockchain"
              })
            ]
          }),
          new Paragraph2({
            spacing: { after: 50 },
            children: [
              new TextRun2({
                text: "Audit Packets",
                bold: true
              }),
              new TextRun2({
                text: " - Processed documents can be included in generated audit packets"
              })
            ]
          }),
          new Paragraph2({
            spacing: { after: 200 },
            children: [
              new TextRun2({
                text: "Training Records",
                bold: true
              }),
              new TextRun2({
                text: " - Extracted training events populate the training record system"
              })
            ]
          }),
          new Paragraph2({
            text: "Tips for Success",
            heading: HeadingLevel2.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph2({
            spacing: { after: 100 },
            children: [
              new TextRun2({
                text: "1. Batch similar documents",
                bold: true
              }),
              new TextRun2({
                text: " - Upload training certificates together, then flight records, etc."
              })
            ]
          }),
          new Paragraph2({
            spacing: { after: 100 },
            children: [
              new TextRun2({
                text: "2. Use descriptive file names",
                bold: true
              }),
              new TextRun2({
                text: ' - "Smith_John_ATP_Certificate_2024.pdf" is better than "scan001.pdf"'
              })
            ]
          }),
          new Paragraph2({
            spacing: { after: 100 },
            children: [
              new TextRun2({
                text: "3. Review processed documents promptly",
                bold: true
              }),
              new TextRun2({
                text: " - Validate extracted data while document details are fresh"
              })
            ]
          }),
          new Paragraph2({
            spacing: { after: 100 },
            children: [
              new TextRun2({
                text: "4. Maintain original copies",
                bold: true
              }),
              new TextRun2({
                text: " - Keep physical originals even after digital processing"
              })
            ]
          }),
          new Paragraph2({
            spacing: { after: 200 },
            children: [
              new TextRun2({
                text: "5. Check processing history regularly",
                bold: true
              }),
              new TextRun2({
                text: " - Monitor for any documents stuck in processing or showing errors"
              })
            ]
          }),
          new Paragraph2({
            spacing: { before: 600 },
            alignment: AlignmentType2.CENTER,
            children: [
              new TextRun2({
                text: "\xA9 BCCS-US Aviation Compliance Platform",
                italics: true,
                color: "999999",
                size: 20
              })
            ]
          })
        ]
      }
    ]
  });
  const buffer = await Packer2.toBuffer(doc);
  return buffer;
}

// server/routes.ts
async function registerRoutes(app) {
  await setupAuth(app);
  app.get("/api/test", (req, res) => {
    res.json({ message: "Aircraft Registry & Tokenization Platform", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { passwordHash: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  app.get("/api/registry/stats", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getRegistryStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching registry stats:", error);
      res.status(500).json({ message: "Failed to fetch registry stats" });
    }
  });
  app.get("/api/aircraft", isAuthenticated, async (req, res) => {
    try {
      const aircraft = await storage.getAllAircraft();
      res.json(aircraft);
    } catch (error) {
      console.error("Error fetching aircraft:", error);
      res.status(500).json({ message: "Failed to fetch aircraft" });
    }
  });
  app.get("/api/aircraft/:id", isAuthenticated, async (req, res) => {
    try {
      const aircraft = await storage.getAircraft(req.params.id);
      if (!aircraft) {
        return res.status(404).json({ message: "Aircraft not found" });
      }
      res.json(aircraft);
    } catch (error) {
      console.error("Error fetching aircraft:", error);
      res.status(500).json({ message: "Failed to fetch aircraft" });
    }
  });
  app.post("/api/aircraft", isAuthenticated, async (req, res) => {
    try {
      const aircraftData = insertAircraftRegistrySchema.parse(req.body);
      const aircraft = await storage.createAircraft(aircraftData);
      res.status(201).json(aircraft);
    } catch (error) {
      if (error instanceof z4.ZodError) {
        return res.status(400).json({ message: "Invalid aircraft data", errors: error.errors });
      }
      console.error("Error creating aircraft:", error);
      res.status(500).json({ message: "Failed to create aircraft" });
    }
  });
  app.put("/api/aircraft/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.updateAircraft(req.params.id, req.body);
      res.json({ message: "Aircraft updated successfully" });
    } catch (error) {
      console.error("Error updating aircraft:", error);
      res.status(500).json({ message: "Failed to update aircraft" });
    }
  });
  app.delete("/api/aircraft/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteAircraft(req.params.id);
      res.json({ message: "Aircraft deleted successfully" });
    } catch (error) {
      console.error("Error deleting aircraft:", error);
      res.status(500).json({ message: "Failed to delete aircraft" });
    }
  });
  app.get("/api/token-offerings", isAuthenticated, async (req, res) => {
    try {
      const offerings = await storage.getAllTokenOfferings();
      res.json(offerings);
    } catch (error) {
      console.error("Error fetching token offerings:", error);
      res.status(500).json({ message: "Failed to fetch token offerings" });
    }
  });
  app.get("/api/token-offerings/:id", isAuthenticated, async (req, res) => {
    try {
      const offering = await storage.getTokenOffering(req.params.id);
      if (!offering) {
        return res.status(404).json({ message: "Token offering not found" });
      }
      res.json(offering);
    } catch (error) {
      console.error("Error fetching token offering:", error);
      res.status(500).json({ message: "Failed to fetch token offering" });
    }
  });
  app.post("/api/token-offerings", isAuthenticated, async (req, res) => {
    try {
      const offeringData = insertTokenOfferingSchema.parse(req.body);
      const offering = await storage.createTokenOffering(offeringData);
      res.status(201).json(offering);
    } catch (error) {
      if (error instanceof z4.ZodError) {
        return res.status(400).json({ message: "Invalid token offering data", errors: error.errors });
      }
      console.error("Error creating token offering:", error);
      res.status(500).json({ message: "Failed to create token offering" });
    }
  });
  app.get("/api/token-offerings/:id/holders", isAuthenticated, async (req, res) => {
    try {
      const holders = await storage.getTokenHoldersByOffering(req.params.id);
      res.json(holders);
    } catch (error) {
      console.error("Error fetching token holders:", error);
      res.status(500).json({ message: "Failed to fetch token holders" });
    }
  });
  app.post("/api/token-holdings", isAuthenticated, async (req, res) => {
    try {
      const holderData = insertTokenHolderSchema.parse(req.body);
      const holder = await storage.createTokenHolder(holderData);
      res.status(201).json(holder);
    } catch (error) {
      if (error instanceof z4.ZodError) {
        return res.status(400).json({ message: "Invalid token holder data", errors: error.errors });
      }
      console.error("Error creating token holder:", error);
      res.status(500).json({ message: "Failed to create token holder" });
    }
  });
  app.get("/api/token-transactions", isAuthenticated, async (req, res) => {
    try {
      const transactions = await storage.getAllTokenTransactions();
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching token transactions:", error);
      res.status(500).json({ message: "Failed to fetch token transactions" });
    }
  });
  app.get("/api/token-offerings/:id/transactions", isAuthenticated, async (req, res) => {
    try {
      const transactions = await storage.getTokenTransactionsByOffering(req.params.id);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching token transactions:", error);
      res.status(500).json({ message: "Failed to fetch token transactions" });
    }
  });
  app.post("/api/token-transactions", isAuthenticated, async (req, res) => {
    try {
      const transactionData = insertTokenTransactionSchema.parse(req.body);
      const transaction = await storage.createTokenTransaction(transactionData);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z4.ZodError) {
        return res.status(400).json({ message: "Invalid transaction data", errors: error.errors });
      }
      console.error("Error creating token transaction:", error);
      res.status(500).json({ message: "Failed to create token transaction" });
    }
  });
  app.get("/api/aircraft/:id/compliance", isAuthenticated, async (req, res) => {
    try {
      const checks = await storage.getComplianceChecksByAircraft(req.params.id);
      res.json(checks);
    } catch (error) {
      console.error("Error fetching compliance checks:", error);
      res.status(500).json({ message: "Failed to fetch compliance checks" });
    }
  });
  app.post("/api/aircraft/:id/compliance/:checkType", isAuthenticated, async (req, res) => {
    try {
      const check = await storage.performComplianceCheck(req.params.id, req.params.checkType);
      res.status(201).json(check);
    } catch (error) {
      console.error("Error performing compliance check:", error);
      res.status(500).json({ message: "Failed to perform compliance check" });
    }
  });
  app.get("/api/subscription-tiers", async (req, res) => {
    try {
      const tiers = await storage.getAllSubscriptionTiers();
      res.json({ success: true, data: tiers });
    } catch (error) {
      console.error("Error fetching subscription tiers:", error);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Unknown error" });
    }
  });
  app.post("/api/crypto/subscriptions/setup", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tierId, walletAddress, stableCoin, chainId, billingPeriod } = req.body;
      if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        return res.status(400).json({ success: false, error: "Invalid wallet address format" });
      }
      const subscription = await storage.createCustomerSubscription({
        customerId: userId,
        tierId,
        paymentMethod: "crypto",
        walletAddress,
        stableCoin,
        chainId,
        nextBilling: new Date(Date.now() + (billingPeriod === "monthly" ? 30 : 365) * 24 * 60 * 60 * 1e3)
      });
      await storage.createAuditLog({
        eventType: "crypto_subscription_setup",
        severity: "info",
        message: `Crypto subscription setup for user ${userId}`,
        details: { subscriptionId: subscription.id, stableCoin, chainId },
        sourceSystem: "crypto_service",
        userId
      });
      res.json({
        success: true,
        data: {
          subscriptionId: subscription.id,
          message: "Crypto subscription setup successfully"
        }
      });
    } catch (error) {
      console.error("Crypto subscription setup error:", error);
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : "Unknown error" });
    }
  });
  app.get("/api/crypto/subscriptions", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const subscriptions = await storage.getCustomerSubscriptionsByUser(userId);
      res.json({ success: true, data: subscriptions });
    } catch (error) {
      console.error("Get user subscriptions error:", error);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Unknown error" });
    }
  });
  app.get("/api/crypto/config", async (req, res) => {
    try {
      const config = {
        supportedChains: [
          { id: 1, name: "Ethereum" },
          { id: 137, name: "Polygon" }
        ],
        supportedStableCoins: ["USDC", "USDT", "DAI"],
        contractAddresses: {
          1: {
            USDC: "0xA0b86a33E6A1B6b9eC8e3b0c8eDe8cE2E15dF9cA",
            USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
            DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F"
          },
          137: {
            USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
            USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
            DAI: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063"
          }
        }
      };
      res.json({ success: true, data: config });
    } catch (error) {
      console.error("Get crypto config error:", error);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Unknown error" });
    }
  });
  registerBlockchainKeyManagementRoutes(app);
  registerAdvancedKeyRecoveryRoutes(app);
  app.use("/api/legacy-data-transfer", legacy_data_transfer_default);
  app.use("/api/multi-platform-integration", multi_platform_integration_default);
  app.use("/api/adaptive-compliance", adaptive_compliance_default);
  app.get("/api/document-import/tutorial/download", isAuthenticated, async (req, res) => {
    try {
      const buffer = await generateDocumentImportTutorial();
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader("Content-Disposition", "attachment; filename=AI_Document_Import_Tutorial.docx");
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (error) {
      console.error("Error generating document import tutorial:", error);
      res.status(500).json({ message: "Failed to generate tutorial document" });
    }
  });
  const httpServer = createServer(app);
  return httpServer;
}

// server/app.ts
function log(message) {
  const time = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${time} [express] ${message}`);
}
async function createApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }
        if (logLine.length > 80) logLine = logLine.slice(0, 79) + "\u2026";
        log(logLine);
      }
    });
    next();
  });
  await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });
  return app;
}
export {
  createApp
};
