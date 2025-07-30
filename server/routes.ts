import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertAircraftRegistrySchema, 
  insertTokenOfferingSchema, 
  insertTokenHolderSchema, 
  insertTokenTransactionSchema 
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Test route
  app.get("/api/test", (req, res) => {
    res.json({ message: "Aircraft Registry & Tokenization Platform", timestamp: new Date().toISOString() });
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Registry Analytics
  app.get('/api/registry/stats', isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getRegistryStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching registry stats:", error);
      res.status(500).json({ message: "Failed to fetch registry stats" });
    }
  });

  // Aircraft Registry Routes
  app.get('/api/aircraft', isAuthenticated, async (req, res) => {
    try {
      const aircraft = await storage.getAllAircraft();
      res.json(aircraft);
    } catch (error) {
      console.error("Error fetching aircraft:", error);
      res.status(500).json({ message: "Failed to fetch aircraft" });
    }
  });

  app.get('/api/aircraft/:id', isAuthenticated, async (req, res) => {
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

  app.post('/api/aircraft', isAuthenticated, async (req, res) => {
    try {
      const aircraftData = insertAircraftRegistrySchema.parse(req.body);
      const aircraft = await storage.createAircraft(aircraftData);
      res.status(201).json(aircraft);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid aircraft data", errors: error.errors });
      }
      console.error("Error creating aircraft:", error);
      res.status(500).json({ message: "Failed to create aircraft" });
    }
  });

  app.put('/api/aircraft/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.updateAircraft(req.params.id, req.body);
      res.json({ message: "Aircraft updated successfully" });
    } catch (error) {
      console.error("Error updating aircraft:", error);
      res.status(500).json({ message: "Failed to update aircraft" });
    }
  });

  app.delete('/api/aircraft/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteAircraft(req.params.id);
      res.json({ message: "Aircraft deleted successfully" });
    } catch (error) {
      console.error("Error deleting aircraft:", error);
      res.status(500).json({ message: "Failed to delete aircraft" });
    }
  });

  // Token Offering Routes
  app.get('/api/token-offerings', isAuthenticated, async (req, res) => {
    try {
      const offerings = await storage.getAllTokenOfferings();
      res.json(offerings);
    } catch (error) {
      console.error("Error fetching token offerings:", error);
      res.status(500).json({ message: "Failed to fetch token offerings" });
    }
  });

  app.get('/api/token-offerings/:id', isAuthenticated, async (req, res) => {
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

  app.post('/api/token-offerings', isAuthenticated, async (req, res) => {
    try {
      const offeringData = insertTokenOfferingSchema.parse(req.body);
      const offering = await storage.createTokenOffering(offeringData);
      res.status(201).json(offering);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid token offering data", errors: error.errors });
      }
      console.error("Error creating token offering:", error);
      res.status(500).json({ message: "Failed to create token offering" });
    }
  });

  // Token Holder Routes
  app.get('/api/token-offerings/:id/holders', isAuthenticated, async (req, res) => {
    try {
      const holders = await storage.getTokenHoldersByOffering(req.params.id);
      res.json(holders);
    } catch (error) {
      console.error("Error fetching token holders:", error);
      res.status(500).json({ message: "Failed to fetch token holders" });
    }
  });

  app.post('/api/token-holdings', isAuthenticated, async (req, res) => {
    try {
      const holderData = insertTokenHolderSchema.parse(req.body);
      const holder = await storage.createTokenHolder(holderData);
      res.status(201).json(holder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid token holder data", errors: error.errors });
      }
      console.error("Error creating token holder:", error);
      res.status(500).json({ message: "Failed to create token holder" });
    }
  });

  // Token Transaction Routes
  app.get('/api/token-transactions', isAuthenticated, async (req, res) => {
    try {
      const transactions = await storage.getAllTokenTransactions();
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching token transactions:", error);
      res.status(500).json({ message: "Failed to fetch token transactions" });
    }
  });

  app.get('/api/token-offerings/:id/transactions', isAuthenticated, async (req, res) => {
    try {
      const transactions = await storage.getTokenTransactionsByOffering(req.params.id);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching token transactions:", error);
      res.status(500).json({ message: "Failed to fetch token transactions" });
    }
  });

  app.post('/api/token-transactions', isAuthenticated, async (req, res) => {
    try {
      const transactionData = insertTokenTransactionSchema.parse(req.body);
      const transaction = await storage.createTokenTransaction(transactionData);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid transaction data", errors: error.errors });
      }
      console.error("Error creating token transaction:", error);
      res.status(500).json({ message: "Failed to create token transaction" });
    }
  });

  // Compliance Routes
  app.get('/api/aircraft/:id/compliance', isAuthenticated, async (req, res) => {
    try {
      const checks = await storage.getComplianceChecksByAircraft(req.params.id);
      res.json(checks);
    } catch (error) {
      console.error("Error fetching compliance checks:", error);
      res.status(500).json({ message: "Failed to fetch compliance checks" });
    }
  });

  app.post('/api/aircraft/:id/compliance/:checkType', isAuthenticated, async (req, res) => {
    try {
      const check = await storage.performComplianceCheck(req.params.id, req.params.checkType);
      res.status(201).json(check);
    } catch (error) {
      console.error("Error performing compliance check:", error);
      res.status(500).json({ message: "Failed to perform compliance check" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}