import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./localAuth";
import { 
  insertAircraftRegistrySchema, 
  insertTokenOfferingSchema, 
  insertTokenHolderSchema, 
  insertTokenTransactionSchema 
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import { registerBlockchainKeyManagementRoutes } from "./routes/blockchain-key-management";
import legacyDataTransferRoutes from "./routes/legacy-data-transfer";
import adaptiveComplianceRoutes from "./routes/adaptive-compliance";
import { registerAdvancedKeyRecoveryRoutes } from "./routes/advanced-key-recovery";
import multiPlatformIntegrationRoutes from "./routes/multi-platform-integration";
import auditGenerationRoutes from "./routes/audit-generation";
import complianceAlertsRoutes from "./routes/compliance-alerts";
import { registerCryptoSubscriptionRoutes } from "./routes/crypto-subscriptions";
import documentGenerationRoutes from "./routes/document-generation";
import maintenanceRoutes from "./routes/maintenance";
import { generateDocumentImportTutorial } from "./generate-document-import-tutorial";
import { auditComplianceAI } from "./services/audit-compliance-ai";

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
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { passwordHash: _, ...safeUser } = user as any;
      res.json(safeUser);
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

  // Subscription Tiers Route
  app.get('/api/subscription-tiers', async (req, res) => {
    try {
      const tiers = await storage.getAllSubscriptionTiers();
      res.json({ success: true, data: tiers });
    } catch (error) {
      console.error("Error fetching subscription tiers:", error);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Crypto Subscription Routes
  app.post('/api/crypto/subscriptions/setup', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { tierId, walletAddress, stableCoin, chainId, billingPeriod } = req.body;
      
      // Validate wallet address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        return res.status(400).json({ success: false, error: 'Invalid wallet address format' });
      }

      // Create crypto subscription setup
      const subscription = await storage.createCustomerSubscription({
        customerId: userId,
        tierId,
        paymentMethod: 'crypto',
        walletAddress,
        stableCoin,
        chainId,
        nextBilling: new Date(Date.now() + (billingPeriod === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000)
      });

      await storage.createAuditLog({
        eventType: 'crypto_subscription_setup',
        severity: 'info',
        message: `Crypto subscription setup for user ${userId}`,
        details: { subscriptionId: subscription.id, stableCoin, chainId },
        sourceSystem: 'crypto_service',
        userId
      });

      res.json({
        success: true,
        data: {
          subscriptionId: subscription.id,
          message: 'Crypto subscription setup successfully'
        }
      });
    } catch (error) {
      console.error("Crypto subscription setup error:", error);
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.get('/api/crypto/subscriptions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const subscriptions = await storage.getCustomerSubscriptionsByUser(userId);
      res.json({ success: true, data: subscriptions });
    } catch (error) {
      console.error("Get user subscriptions error:", error);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.get('/api/crypto/config', async (req, res) => {
    try {
      const config = {
        supportedChains: [
          { id: 1, name: 'Ethereum' },
          { id: 137, name: 'Polygon' }
        ],
        supportedStableCoins: ['USDC', 'USDT', 'DAI'],
        contractAddresses: {
          1: {
            USDC: '0xA0b86a33E6A1B6b9eC8e3b0c8eDe8cE2E15dF9cA',
            USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
          },
          137: {
            USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
            USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
            DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063'
          }
        }
      };
      res.json({ success: true, data: config });
    } catch (error) {
      console.error("Get crypto config error:", error);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Universal Blockchain Key Management Routes
  registerBlockchainKeyManagementRoutes(app);
  
  // Advanced Key Recovery Routes
  registerAdvancedKeyRecoveryRoutes(app);

  // Legacy Data Transfer Routes
  app.use('/api/legacy-data-transfer', legacyDataTransferRoutes);

  // Multi-Platform Integration Routes
  app.use('/api/multi-platform-integration', multiPlatformIntegrationRoutes);

  // Patent 4/4B: Adaptive Compliance Architecture Routes
  app.use('/api/adaptive-compliance', adaptiveComplianceRoutes);

  // ── User Profile Update ──────────────────────────────────────────────────
  app.put('/api/auth/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { firstName, lastName, email } = req.body;
      await storage.updateUserProfile(userId, { firstName, lastName, email });
      const updated = await storage.getUser(userId);
      res.json({ success: true, user: updated });
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  // ── Compliance Checklist State ───────────────────────────────────────────
  app.get('/api/checklist/state', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const row = await storage.getChecklistState(userId);
      res.json({ state: row?.state ?? null, updatedAt: row?.updatedAt ?? null });
    } catch (error) {
      console.error('Checklist state load error:', error);
      res.status(500).json({ error: 'Failed to load checklist state' });
    }
  });

  app.put('/api/checklist/state', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { state } = req.body;
      if (!state) return res.status(400).json({ error: 'state is required' });
      await storage.saveChecklistState(userId, state);
      res.json({ success: true });
    } catch (error) {
      console.error('Checklist state save error:', error);
      res.status(500).json({ error: 'Failed to save checklist state' });
    }
  });

  // ── Audit Generation Routes ──────────────────────────────────────────────
  app.use('/', auditGenerationRoutes);

  // ── Compliance Alerts Routes ─────────────────────────────────────────────
  app.use('/', complianceAlertsRoutes);

  // ── Crypto Subscription Routes (dedicated file, fixes auth) ─────────────
  registerCryptoSubscriptionRoutes(app);

  // ── Document Generation Routes ───────────────────────────────────────────
  app.use('/', documentGenerationRoutes);

  // ── Predictive Maintenance Routes ────────────────────────────────────────
  app.use('/api/maintenance', maintenanceRoutes);

  // ── Document Upload ──────────────────────────────────────────────────────
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'];
      cb(null, allowed.includes(file.mimetype));
    }
  });

  app.post('/api/documents/upload', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided or file type not supported' });
      }
      const userId = req.user?.id;
      const { documentType } = req.body;
      const docId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      await storage.createAuditLog({
        eventType: 'document_upload',
        severity: 'info',
        message: `Document uploaded: ${req.file.originalname}`,
        details: {
          documentId: docId,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          documentType: documentType || 'GENERAL'
        },
        sourceSystem: 'document_service',
        userId
      });

      res.json({
        success: true,
        document: {
          id: docId,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          documentType: documentType || 'GENERAL',
          status: 'uploaded',
          uploadedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Document upload error:', error);
      res.status(500).json({ error: 'Failed to upload document', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // ── Audit Compliance Analysis Endpoints ──────────────────────────────────
  app.get('/api/audit/document-summary', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || 'default';
      const summary = auditComplianceAI.getDocumentSummary();
      res.json({
        success: true,
        documentCount: summary.length,
        documents: summary,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Document summary error:', error);
      res.status(500).json({ error: 'Failed to fetch document summary' });
    }
  });

  app.post('/api/audit/analyze-compliance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || 'default';
      const analyses = await auditComplianceAI.performComprehensiveAudit(userId);

      const compliant = analyses.filter(a => a.complianceStatus === 'COMPLIANT').length;
      const partial = analyses.filter(a => a.complianceStatus === 'PARTIAL').length;
      const nonCompliant = analyses.filter(a => a.complianceStatus === 'NON_COMPLIANT').length;
      const insufficient = analyses.filter(a => a.complianceStatus === 'INSUFFICIENT_DATA').length;

      res.json({
        success: true,
        checklistItems: analyses.length,
        documentCount: auditComplianceAI.getDocumentSummary().length,
        analyses,
        summary: {
          compliant,
          partial,
          nonCompliant,
          insufficientData: insufficient,
          criticalIssues: analyses.filter(a => a.riskLevel === 'CRITICAL').length,
          highRiskIssues: analyses.filter(a => a.riskLevel === 'HIGH').length
        },
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Compliance analysis error:', error);
      res.status(500).json({ error: 'Failed to analyze compliance', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // ── Document Import Tutorial Download ────────────────────────────────────
  app.get('/api/document-import/tutorial/download', isAuthenticated, async (req, res) => {
    try {
      const buffer = await generateDocumentImportTutorial();
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', 'attachment; filename=AI_Document_Import_Tutorial.docx');
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    } catch (error) {
      console.error('Error generating document import tutorial:', error);
      res.status(500).json({ message: 'Failed to generate tutorial document' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}