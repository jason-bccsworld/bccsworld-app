import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../shared/schema.js";
import type { 
  Airline, 
  Pilot, 
  Aircraft, 
  Route, 
  HiringForecast, 
  TrainingProgram, 
  MarketIntelligence,
  WorkforceAlert,
  InsertAirline,
  InsertPilot,
  InsertHiringForecast,
  InsertTrainingProgram
} from "../shared/schema.js";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";

// Database connection
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

export interface IPilotStorage {
  // Airlines
  createAirline(data: InsertAirline): Promise<Airline>;
  getAirlineById(id: string): Promise<Airline | null>;
  getAllAirlines(): Promise<Airline[]>;
  updateAirline(id: string, data: Partial<InsertAirline>): Promise<Airline>;

  // Pilots
  createPilot(data: InsertPilot): Promise<Pilot>;
  getPilotById(id: string): Promise<Pilot | null>;
  getPilotsByAirline(airlineId: string): Promise<Pilot[]>;
  updatePilot(id: string, data: Partial<InsertPilot>): Promise<Pilot>;
  getPilotsNearRetirement(airlineId: string, months: number): Promise<Pilot[]>;

  // Aircraft
  getAircraftByAirline(airlineId: string): Promise<Aircraft[]>;
  createAircraft(data: Omit<Aircraft, 'id' | 'createdAt'>): Promise<Aircraft>;

  // Routes
  getRoutesByAirline(airlineId: string): Promise<Route[]>;
  createRoute(data: Omit<Route, 'id' | 'createdAt'>): Promise<Route>;

  // Hiring Forecasts
  createHiringForecast(data: InsertHiringForecast): Promise<HiringForecast>;
  getHiringForecastsByAirline(airlineId: string): Promise<HiringForecast[]>;
  getHiringForecastsByPeriod(period: string): Promise<HiringForecast[]>;

  // Training Programs
  createTrainingProgram(data: InsertTrainingProgram): Promise<TrainingProgram>;
  getTrainingProgramsByAirline(airlineId: string): Promise<TrainingProgram[]>;

  // Market Intelligence
  getMarketIntelligence(filters?: { 
    dataType?: string; 
    region?: string; 
    aircraftType?: string; 
  }): Promise<MarketIntelligence[]>;
  createMarketIntelligence(data: Omit<MarketIntelligence, 'id' | 'createdAt'>): Promise<MarketIntelligence>;

  // Workforce Alerts
  getWorkforceAlerts(airlineId: string, unreadOnly?: boolean): Promise<WorkforceAlert[]>;
  createWorkforceAlert(data: Omit<WorkforceAlert, 'id' | 'createdAt'>): Promise<WorkforceAlert>;
  markAlertAsRead(id: string): Promise<void>;
  markAlertAsResolved(id: string): Promise<void>;
}

export function createStorage(): IPilotStorage {
  return {
    // Airlines
    async createAirline(data: InsertAirline): Promise<Airline> {
      const id = `airline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const [airline] = await db.insert(schema.airlines)
        .values({ ...data, id })
        .returning();
      return airline;
    },

    async getAirlineById(id: string): Promise<Airline | null> {
      const [airline] = await db.select()
        .from(schema.airlines)
        .where(eq(schema.airlines.id, id));
      return airline || null;
    },

    async getAllAirlines(): Promise<Airline[]> {
      return await db.select().from(schema.airlines).orderBy(asc(schema.airlines.name));
    },

    async updateAirline(id: string, data: Partial<InsertAirline>): Promise<Airline> {
      const [airline] = await db.update(schema.airlines)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.airlines.id, id))
        .returning();
      return airline;
    },

    // Pilots
    async createPilot(data: InsertPilot): Promise<Pilot> {
      const id = `pilot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const [pilot] = await db.insert(schema.pilots)
        .values({ ...data, id })
        .returning();
      return pilot;
    },

    async getPilotById(id: string): Promise<Pilot | null> {
      const [pilot] = await db.select()
        .from(schema.pilots)
        .where(eq(schema.pilots.id, id));
      return pilot || null;
    },

    async getPilotsByAirline(airlineId: string): Promise<Pilot[]> {
      return await db.select()
        .from(schema.pilots)
        .where(and(
          eq(schema.pilots.airlineId, airlineId),
          eq(schema.pilots.isActive, true)
        ))
        .orderBy(asc(schema.pilots.seniorityNumber));
    },

    async updatePilot(id: string, data: Partial<InsertPilot>): Promise<Pilot> {
      const [pilot] = await db.update(schema.pilots)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.pilots.id, id))
        .returning();
      return pilot;
    },

    async getPilotsNearRetirement(airlineId: string, months: number): Promise<Pilot[]> {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + months);
      
      return await db.select()
        .from(schema.pilots)
        .where(and(
          eq(schema.pilots.airlineId, airlineId),
          eq(schema.pilots.isActive, true),
          lte(schema.pilots.predictedRetirementDate, futureDate)
        ))
        .orderBy(asc(schema.pilots.predictedRetirementDate));
    },

    // Aircraft
    async getAircraftByAirline(airlineId: string): Promise<Aircraft[]> {
      return await db.select()
        .from(schema.aircraft)
        .where(and(
          eq(schema.aircraft.airlineId, airlineId),
          eq(schema.aircraft.isActive, true)
        ))
        .orderBy(asc(schema.aircraft.aircraftType));
    },

    async createAircraft(data: Omit<Aircraft, 'id' | 'createdAt'>): Promise<Aircraft> {
      const id = `aircraft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const [aircraft] = await db.insert(schema.aircraft)
        .values({ ...data, id })
        .returning();
      return aircraft;
    },

    // Routes
    async getRoutesByAirline(airlineId: string): Promise<Route[]> {
      return await db.select()
        .from(schema.routes)
        .where(and(
          eq(schema.routes.airlineId, airlineId),
          eq(schema.routes.isActive, true)
        ))
        .orderBy(asc(schema.routes.origin));
    },

    async createRoute(data: Omit<Route, 'id' | 'createdAt'>): Promise<Route> {
      const id = `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const [route] = await db.insert(schema.routes)
        .values({ ...data, id })
        .returning();
      return route;
    },

    // Hiring Forecasts
    async createHiringForecast(data: InsertHiringForecast): Promise<HiringForecast> {
      const id = `forecast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const [forecast] = await db.insert(schema.hiringForecasts)
        .values({ ...data, id })
        .returning();
      return forecast;
    },

    async getHiringForecastsByAirline(airlineId: string): Promise<HiringForecast[]> {
      return await db.select()
        .from(schema.hiringForecasts)
        .where(eq(schema.hiringForecasts.airlineId, airlineId))
        .orderBy(desc(schema.hiringForecasts.createdAt));
    },

    async getHiringForecastsByPeriod(period: string): Promise<HiringForecast[]> {
      return await db.select()
        .from(schema.hiringForecasts)
        .where(eq(schema.hiringForecasts.forecastPeriod, period))
        .orderBy(desc(schema.hiringForecasts.createdAt));
    },

    // Training Programs
    async createTrainingProgram(data: InsertTrainingProgram): Promise<TrainingProgram> {
      const id = `training_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const [program] = await db.insert(schema.trainingPrograms)
        .values({ ...data, id })
        .returning();
      return program;
    },

    async getTrainingProgramsByAirline(airlineId: string): Promise<TrainingProgram[]> {
      return await db.select()
        .from(schema.trainingPrograms)
        .where(and(
          eq(schema.trainingPrograms.airlineId, airlineId),
          eq(schema.trainingPrograms.isActive, true)
        ))
        .orderBy(asc(schema.trainingPrograms.programName));
    },

    // Market Intelligence
    async getMarketIntelligence(filters?: { 
      dataType?: string; 
      region?: string; 
      aircraftType?: string; 
    }): Promise<MarketIntelligence[]> {
      if (!filters || Object.keys(filters).length === 0) {
        return await db.select()
          .from(schema.marketIntelligence)
          .orderBy(desc(schema.marketIntelligence.createdAt));
      }
      
      const conditions = [];
      if (filters.dataType) conditions.push(eq(schema.marketIntelligence.dataType, filters.dataType));
      if (filters.region) conditions.push(eq(schema.marketIntelligence.region, filters.region));
      if (filters.aircraftType) conditions.push(eq(schema.marketIntelligence.aircraftType, filters.aircraftType));
      
      return await db.select()
        .from(schema.marketIntelligence)
        .where(and(...conditions))
        .orderBy(desc(schema.marketIntelligence.createdAt));
    },

    async createMarketIntelligence(data: Omit<MarketIntelligence, 'id' | 'createdAt'>): Promise<MarketIntelligence> {
      const id = `market_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const [intelligence] = await db.insert(schema.marketIntelligence)
        .values({ ...data, id })
        .returning();
      return intelligence;
    },

    // Workforce Alerts
    async getWorkforceAlerts(airlineId: string, unreadOnly = false): Promise<WorkforceAlert[]> {
      const conditions = [eq(schema.workforceAlerts.airlineId, airlineId)];
      if (unreadOnly) {
        conditions.push(eq(schema.workforceAlerts.isRead, false));
      }
      
      return await db.select()
        .from(schema.workforceAlerts)
        .where(and(...conditions))
        .orderBy(desc(schema.workforceAlerts.createdAt));
    },

    async createWorkforceAlert(data: Omit<WorkforceAlert, 'id' | 'createdAt'>): Promise<WorkforceAlert> {
      const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const [alert] = await db.insert(schema.workforceAlerts)
        .values({ ...data, id })
        .returning();
      return alert;
    },

    async markAlertAsRead(id: string): Promise<void> {
      await db.update(schema.workforceAlerts)
        .set({ isRead: true })
        .where(eq(schema.workforceAlerts.id, id));
    },

    async markAlertAsResolved(id: string): Promise<void> {
      await db.update(schema.workforceAlerts)
        .set({ isResolved: true, resolvedAt: new Date() })
        .where(eq(schema.workforceAlerts.id, id));
    }
  };
}