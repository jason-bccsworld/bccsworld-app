import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  decimal,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Aircraft Registry
export const aircraftRegistry = pgTable("aircraft_registry", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tailNumber: varchar("tail_number").notNull().unique(),
  manufacturer: varchar("manufacturer").notNull(),
  model: varchar("model").notNull(),
  yearOfManufacture: integer("year_of_manufacture").notNull(),
  serialNumber: varchar("serial_number").notNull(),
  registrationCountry: varchar("registration_country").notNull(),
  ownerName: varchar("owner_name").notNull(),
  ownerAddress: varchar("owner_address"),
  operatorName: varchar("operator_name"),
  aircraftType: varchar("aircraft_type").notNull(),
  engineType: varchar("engine_type"),
  maxTakeoffWeight: decimal("max_takeoff_weight", { precision: 10, scale: 2 }),
  passengerCapacity: integer("passenger_capacity"),
  registrationDate: timestamp("registration_date").notNull(),
  expirationDate: timestamp("expiration_date"),
  status: varchar("status").notNull().default("active"),
  isTokenized: boolean("is_tokenized").default(false),
  marketValue: decimal("market_value", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Aircraft Ownership (for tokenization)
export const aircraftOwnership = pgTable("aircraft_ownership", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  aircraftId: varchar("aircraft_id").notNull().references(() => aircraftRegistry.id),
  ownershipPercentage: decimal("ownership_percentage", { precision: 5, scale: 2 }).notNull(),
  ownerType: varchar("owner_type").notNull(), // individual, corporation, fund
  ownerDetails: jsonb("owner_details"),
  acquisitionDate: timestamp("acquisition_date").notNull(),
  acquisitionPrice: decimal("acquisition_price", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Token Offerings
export const tokenOfferings = pgTable("token_offerings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  aircraftId: varchar("aircraft_id").notNull().references(() => aircraftRegistry.id),
  totalTokens: integer("total_tokens").notNull(),
  availableTokens: integer("available_tokens").notNull(),
  pricePerToken: decimal("price_per_token", { precision: 8, scale: 2 }).notNull(),
  minimumInvestment: decimal("minimum_investment", { precision: 10, scale: 2 }),
  expectedReturn: decimal("expected_return", { precision: 5, scale: 2 }),
  offeringStartDate: timestamp("offering_start_date").notNull(),
  offeringEndDate: timestamp("offering_end_date"),
  status: varchar("status").notNull().default("active"), // active, closed, suspended
  prospectusUrl: varchar("prospectus_url"),
  regulatoryApproval: boolean("regulatory_approval").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Token Holders
export const tokenHolders = pgTable("token_holders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offeringId: varchar("offering_id").notNull().references(() => tokenOfferings.id),
  investorId: varchar("investor_id").notNull(),
  tokensOwned: integer("tokens_owned").notNull(),
  totalInvestment: decimal("total_investment", { precision: 10, scale: 2 }).notNull(),
  acquisitionDate: timestamp("acquisition_date").notNull(),
  lastUpdateDate: timestamp("last_update_date").defaultNow(),
});

// Token Transactions
export const tokenTransactions = pgTable("token_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offeringId: varchar("offering_id").notNull().references(() => tokenOfferings.id),
  buyerId: varchar("buyer_id"),
  sellerId: varchar("seller_id"),
  tokensTransferred: integer("tokens_transferred").notNull(),
  pricePerToken: decimal("price_per_token", { precision: 8, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  transactionType: varchar("transaction_type").notNull(), // purchase, sale, transfer
  transactionDate: timestamp("transaction_date").defaultNow(),
  transactionHash: varchar("transaction_hash"), // blockchain hash
  status: varchar("status").notNull().default("completed"),
});

// Compliance Checks
export const complianceChecks = pgTable("compliance_checks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  aircraftId: varchar("aircraft_id").notNull().references(() => aircraftRegistry.id),
  checkType: varchar("check_type").notNull(),
  checkDate: timestamp("check_date").notNull(),
  status: varchar("status").notNull(), // compliant, non_compliant, pending
  findings: jsonb("findings"),
  nextCheckDate: timestamp("next_check_date"),
  performedBy: varchar("performed_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Type exports
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertAircraftRegistry = typeof aircraftRegistry.$inferInsert;
export type AircraftRegistry = typeof aircraftRegistry.$inferSelect;

export type InsertTokenOffering = typeof tokenOfferings.$inferInsert;
export type TokenOffering = typeof tokenOfferings.$inferSelect;

export type InsertTokenHolder = typeof tokenHolders.$inferInsert;
export type TokenHolder = typeof tokenHolders.$inferSelect;

export type InsertTokenTransaction = typeof tokenTransactions.$inferInsert;
export type TokenTransaction = typeof tokenTransactions.$inferSelect;

export type ComplianceCheck = typeof complianceChecks.$inferSelect;

// Zod schemas
export const insertAircraftRegistrySchema = createInsertSchema(aircraftRegistry);
export const insertTokenOfferingSchema = createInsertSchema(tokenOfferings);
export const insertTokenHolderSchema = createInsertSchema(tokenHolders);
export const insertTokenTransactionSchema = createInsertSchema(tokenTransactions);