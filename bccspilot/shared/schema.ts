import { pgTable, text, integer, timestamp, decimal, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Airlines/Organizations
export const airlines = pgTable("airlines", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  iataCode: text("iata_code"),
  icaoCode: text("icao_code"),
  country: text("country").notNull(),
  fleetSize: integer("fleet_size").default(0),
  pilotCount: integer("pilot_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Pilot workforce data
export const pilots = pgTable("pilots", {
  id: text("id").primaryKey(),
  airlineId: text("airline_id").references(() => airlines.id),
  employeeId: text("employee_id"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dateOfBirth: timestamp("date_of_birth"),
  hireDate: timestamp("hire_date"),
  position: text("position"), // Captain, First Officer, etc.
  aircraftType: text("aircraft_type"), // B737, A320, etc.
  baseLocation: text("base_location"),
  seniorityNumber: integer("seniority_number"),
  totalFlightHours: integer("total_flight_hours").default(0),
  retirementEligibleDate: timestamp("retirement_eligible_date"),
  predictedRetirementDate: timestamp("predicted_retirement_date"),
  retirementRiskScore: decimal("retirement_risk_score", { precision: 5, scale: 2 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Fleet and aircraft data
export const aircraft = pgTable("aircraft", {
  id: text("id").primaryKey(),
  airlineId: text("airline_id").references(() => airlines.id),
  aircraftType: text("aircraft_type").notNull(),
  registration: text("registration"),
  deliveryDate: timestamp("delivery_date"),
  retirementDate: timestamp("retirement_date"),
  baseLocation: text("base_location"),
  seatingCapacity: integer("seating_capacity"),
  pilotRequirement: integer("pilot_requirement").default(2), // pilots needed per aircraft
  utilizationHours: integer("utilization_hours").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});

// Route network and demand forecasting
export const routes = pgTable("routes", {
  id: text("id").primaryKey(),
  airlineId: text("airline_id").references(() => airlines.id),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  aircraftType: text("aircraft_type"),
  frequency: integer("frequency").default(0), // flights per week
  seasonalPattern: text("seasonal_pattern"), // HIGH, MEDIUM, LOW
  demandForecast: jsonb("demand_forecast"), // JSON with monthly projections
  pilotRequirement: integer("pilot_requirement").default(4), // pilots needed for route
  launchDate: timestamp("launch_date"),
  sunsetDate: timestamp("sunset_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});

// Hiring forecasts and planning
export const hiringForecasts = pgTable("hiring_forecasts", {
  id: text("id").primaryKey(),
  airlineId: text("airline_id").references(() => airlines.id),
  forecastPeriod: text("forecast_period").notNull(), // 2025-Q1, 2025-Q2, etc.
  aircraftType: text("aircraft_type"),
  baseLocation: text("base_location"),
  predictedRetirements: integer("predicted_retirements").default(0),
  demandIncrease: integer("demand_increase").default(0),
  recommendedHiring: integer("recommended_hiring").default(0),
  trainingLeadTime: integer("training_lead_time").default(90), // days
  costEstimate: decimal("cost_estimate", { precision: 12, scale: 2 }),
  confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }),
  riskFactors: jsonb("risk_factors"), // JSON array of identified risks
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Training pipeline tracking
export const trainingPrograms = pgTable("training_programs", {
  id: text("id").primaryKey(),
  airlineId: text("airline_id").references(() => airlines.id),
  programName: text("program_name").notNull(),
  aircraftType: text("aircraft_type"),
  capacity: integer("capacity").default(0), // students per class
  durationDays: integer("duration_days").default(60),
  costPerStudent: decimal("cost_per_student", { precision: 10, scale: 2 }),
  graduationRate: decimal("graduation_rate", { precision: 5, scale: 2 }),
  currentEnrollment: integer("current_enrollment").default(0),
  nextClassDate: timestamp("next_class_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});

// Market intelligence and competitor tracking
export const marketIntelligence = pgTable("market_intelligence", {
  id: text("id").primaryKey(),
  dataSource: text("data_source").notNull(), // FAA, Industry Reports, etc.
  dataType: text("data_type").notNull(), // SALARY, HIRING, SHORTAGE, etc.
  region: text("region"),
  aircraftType: text("aircraft_type"),
  dataValue: jsonb("data_value"), // Flexible JSON for different data types
  reportingPeriod: text("reporting_period"),
  confidenceLevel: decimal("confidence_level", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow()
});

// Alert system for workforce changes
export const workforceAlerts = pgTable("workforce_alerts", {
  id: text("id").primaryKey(),
  airlineId: text("airline_id").references(() => airlines.id),
  alertType: text("alert_type").notNull(), // RETIREMENT, SHORTAGE, SURPLUS, etc.
  severity: text("severity").notNull(), // LOW, MEDIUM, HIGH, CRITICAL
  title: text("title").notNull(),
  description: text("description"),
  affectedCount: integer("affected_count").default(0),
  recommendedAction: text("recommended_action"),
  isRead: boolean("is_read").default(false),
  isResolved: boolean("is_resolved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at")
});

// Insert schemas for form validation
export const insertAirlineSchema = createInsertSchema(airlines).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertPilotSchema = createInsertSchema(pilots).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertHiringForecastSchema = createInsertSchema(hiringForecasts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertTrainingProgramSchema = createInsertSchema(trainingPrograms).omit({
  id: true,
  createdAt: true
});

// Type exports
export type Airline = typeof airlines.$inferSelect;
export type Pilot = typeof pilots.$inferSelect;
export type Aircraft = typeof aircraft.$inferSelect;
export type Route = typeof routes.$inferSelect;
export type HiringForecast = typeof hiringForecasts.$inferSelect;
export type TrainingProgram = typeof trainingPrograms.$inferSelect;
export type MarketIntelligence = typeof marketIntelligence.$inferSelect;
export type WorkforceAlert = typeof workforceAlerts.$inferSelect;

export type InsertAirline = z.infer<typeof insertAirlineSchema>;
export type InsertPilot = z.infer<typeof insertPilotSchema>;
export type InsertHiringForecast = z.infer<typeof insertHiringForecastSchema>;
export type InsertTrainingProgram = z.infer<typeof insertTrainingProgramSchema>;