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

// User storage table - required for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("user"), // registry_admin, investor, viewer
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
});

export const registryAnalytics = pgTable("registry_analytics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  registryId: varchar("registry_id").notNull(),
  metricType: varchar("metric_type").notNull(), // aircraft_count, token_volume, revenue
  metricValue: decimal("metric_value", { precision: 15, scale: 2 }).notNull(),
  period: varchar("period").notNull(), // daily, weekly, monthly, yearly
  recordDate: timestamp("record_date").defaultNow(),
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

// Types
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
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