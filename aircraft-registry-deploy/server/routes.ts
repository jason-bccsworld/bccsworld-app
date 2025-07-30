import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAircraftRegistrySchema, insertTokenOfferingSchema } from "../shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Aircraft Registry API routes
  app.get('/api/aircraft', async (req, res) => {
    try {
      const aircraft = await storage.getAllAircraft();
      res.json(aircraft);
    } catch (error) {
      console.error("Error fetching aircraft:", error);
      res.status(500).json({ message: "Failed to fetch aircraft" });
    }
  });

  app.get('/api/aircraft/:id', async (req, res) => {
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

  app.post('/api/aircraft', async (req, res) => {
    try {
      const validatedData = insertAircraftRegistrySchema.parse(req.body);
      const aircraft = await storage.createAircraft(validatedData);
      res.status(201).json(aircraft);
    } catch (error) {
      console.error("Error creating aircraft:", error);
      res.status(400).json({ message: "Invalid aircraft data" });
    }
  });

  // Token Offerings API routes
  app.get('/api/token-offerings', async (req, res) => {
    try {
      const offerings = await storage.getAllTokenOfferings();
      res.json(offerings);
    } catch (error) {
      console.error("Error fetching token offerings:", error);
      res.status(500).json({ message: "Failed to fetch token offerings" });
    }
  });

  app.post('/api/token-offerings', async (req, res) => {
    try {
      const validatedData = insertTokenOfferingSchema.parse(req.body);
      const offering = await storage.createTokenOffering(validatedData);
      res.status(201).json(offering);
    } catch (error) {
      console.error("Error creating token offering:", error);
      res.status(400).json({ message: "Invalid token offering data" });
    }
  });

  // Token Transactions API routes
  app.get('/api/token-transactions', async (req, res) => {
    try {
      const transactions = await storage.getAllTokenTransactions();
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching token transactions:", error);
      res.status(500).json({ message: "Failed to fetch token transactions" });
    }
  });

  // Analytics API routes
  app.get('/api/registry-stats', async (req, res) => {
    try {
      const stats = await storage.getRegistryStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching registry stats:", error);
      res.status(500).json({ message: "Failed to fetch registry stats" });
    }
  });

  // Compliance API routes
  app.post('/api/compliance-check', async (req, res) => {
    try {
      const { aircraftId, checkType } = req.body;
      const complianceCheck = await storage.performComplianceCheck(aircraftId, checkType);
      res.status(201).json(complianceCheck);
    } catch (error) {
      console.error("Error performing compliance check:", error);
      res.status(500).json({ message: "Failed to perform compliance check" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}