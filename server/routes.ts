import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { processDocumentOCR } from "./services/ocr";
import { extractFieldsWithNLP } from "./services/nlp";
import { generateBlockchainHash } from "./services/blockchain";
import { mlTrainingService } from "./services/ml-training";
import { analyticsService } from "./services/analytics";
import { insertDocumentSchema, insertTrainingEventSchema, insertAuditLogSchema } from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import * as schema from "@shared/schema";
import { eq, desc } from "drizzle-orm";

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
      // Generate unique filename with original extension
      const ext = path.extname(file.originalname);
      const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
      cb(null, uniqueName);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
      "image/jpeg",
      "image/png",
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard statistics
  app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const stats = await storage.getComplianceStats(user?.organizationId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Document upload and processing
  app.post("/api/documents/upload", isAuthenticated, upload.single("file"), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Create document record
      const document = await storage.createDocument({
        filename: req.file.filename,
        originalName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        uploadedBy: userId,
        organizationId: user?.organizationId,
      });

      // Log audit trail
      await storage.createAuditLog({
        action: "upload_document",
        entityType: "document",
        entityId: document.id,
        userId: userId,
        userEmail: user?.email,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        details: {
          filename: req.file.originalname,
          fileType: req.file.mimetype,
          fileSize: req.file.size,
        },
      });

      res.json({ document, message: "File uploaded successfully" });

      // Process document asynchronously
      processDocumentAsync(document.id, req.file.path);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  // Get documents for user
  app.get("/api/documents", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const documents = await storage.getDocumentsByUser(userId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // Get extracted data for document
  app.get("/api/documents/:id/extracted-data", isAuthenticated, async (req: any, res) => {
    try {
      const documentId = req.params.id;
      const extractedData = await storage.getExtractedDataByDocument(documentId);
      res.json(extractedData);
    } catch (error) {
      console.error("Error fetching extracted data:", error);
      res.status(500).json({ message: "Failed to fetch extracted data" });
    }
  });

  // Validate extracted data
  app.post("/api/extracted-data/:id/validate", isAuthenticated, async (req: any, res) => {
    try {
      const dataId = req.params.id;
      const { validatedValue } = req.body;
      const userId = req.user.claims.sub;

      const validatedData = await storage.validateExtractedData(dataId, validatedValue, userId);

      // Log audit trail
      await storage.createAuditLog({
        action: "validate_data",
        entityType: "extracted_data",
        entityId: dataId,
        userId: userId,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        details: {
          validatedValue,
        },
      });

      res.json(validatedData);
    } catch (error) {
      console.error("Error validating data:", error);
      res.status(500).json({ message: "Failed to validate data" });
    }
  });

  // Training events
  app.post("/api/training-events", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Validate request body
      const eventData = insertTrainingEventSchema.parse({
        ...req.body,
        createdBy: userId,
        organizationId: user?.organizationId,
      });

      const event = await storage.createTrainingEvent(eventData);

      // Generate blockchain hash
      const blockchainHash = generateBlockchainHash(event);
      await storage.updateTrainingEvent(event.id, { blockchainHash });

      // Log audit trail
      await storage.createAuditLog({
        action: "create_training_event",
        entityType: "training_event",
        entityId: event.id,
        userId: userId,
        userEmail: user?.email,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        details: {
          studentName: event.studentName,
          eventType: event.eventType,
          blockchainHash,
        },
      });

      res.json({ ...event, blockchainHash });
    } catch (error) {
      console.error("Error creating training event:", error);
      res.status(500).json({ message: "Failed to create training event" });
    }
  });

  // Get training events
  app.get("/api/training-events", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const events = await storage.getTrainingEvents(user?.organizationId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching training events:", error);
      res.status(500).json({ message: "Failed to fetch training events" });
    }
  });

  // Audit logs
  app.get("/api/audit-logs", isAuthenticated, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getAuditLogs(limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // Reprocess stuck documents
  app.post('/api/documents/:id/reprocess', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const document = await storage.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }

      if (document.status === 'processing') {
        // Reset status and reprocess
        await storage.updateDocumentStatus(id, 'uploaded');
        
        // Trigger reprocessing
        const filePath = path.join(process.cwd(), 'uploads', document.filename);
        if (fs.existsSync(filePath)) {
          processDocumentAsync(id, filePath);
          res.json({ message: 'Document reprocessing started' });
        } else {
          res.status(400).json({ message: 'Original file not found' });
        }
      } else {
        res.json({ message: 'Document already processed', status: document.status });
      }
    } catch (error) {
      console.error('Error reprocessing document:', error);
      res.status(500).json({ message: 'Failed to reprocess document' });
    }
  });

  // ML Training Routes
  app.post('/api/ml/feedback', isAuthenticated, async (req: any, res) => {
    try {
      const { documentId, fieldName, originalValue, correctedValue, confidenceScore, documentType, correctionReason } = req.body;
      const userId = req.user.claims.sub;

      await mlTrainingService.recordUserFeedback({
        documentId,
        fieldName,
        originalValue,
        correctedValue,
        confidenceScore,
        userId,
        documentType,
        correctionReason
      });

      res.json({ message: "Feedback recorded successfully" });
    } catch (error) {
      console.error("Error recording ML feedback:", error);
      res.status(500).json({ message: "Failed to record feedback" });
    }
  });

  app.get('/api/ml/metrics', isAuthenticated, async (req, res) => {
    try {
      const metrics = await mlTrainingService.getTrainingMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching ML metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  app.post('/api/ml/train', isAuthenticated, async (req, res) => {
    try {
      await mlTrainingService.performIncrementalTraining();
      res.json({ message: "Training completed successfully" });
    } catch (error) {
      console.error("Error performing training:", error);
      res.status(500).json({ message: "Failed to perform training" });
    }
  });

  app.get('/api/ml/export-data', isAuthenticated, async (req, res) => {
    try {
      const trainingData = await mlTrainingService.exportTrainingData();
      res.json(trainingData);
    } catch (error) {
      console.error("Error exporting training data:", error);
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  // Analytics Routes
  app.get('/api/analytics/compliance-metrics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const organizationId = req.query.organizationId || user?.organizationId;
      
      const metrics = await analyticsService.generateComplianceMetrics(organizationId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching compliance metrics:", error);
      res.status(500).json({ message: "Failed to fetch compliance metrics" });
    }
  });

  app.get('/api/analytics/forecast', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const organizationId = req.query.organizationId || user?.organizationId;
      
      const forecast = await analyticsService.generateDetailedForecast(organizationId);
      res.json(forecast);
    } catch (error) {
      console.error("Error generating forecast:", error);
      res.status(500).json({ message: "Failed to generate forecast" });
    }
  });

  app.get('/api/analytics/report', isAuthenticated, async (req, res) => {
    try {
      const period = (req.query.period as "week" | "month" | "quarter") || "month";
      const report = await analyticsService.generateAnalyticsReport(period);
      res.json(report);
    } catch (error) {
      console.error("Error generating analytics report:", error);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  // Integration management routes
  app.get("/api/integrations/:organizationId", isAuthenticated, async (req: any, res) => {
    try {
      const { organizationId } = req.params;
      const integrations = await db.select()
        .from(schema.integrations)
        .where(eq(schema.integrations.organizationId, organizationId));
      
      res.json(integrations);
    } catch (error) {
      console.error("Error fetching integrations:", error);
      res.status(500).json({ message: "Failed to fetch integrations" });
    }
  });

  app.post("/api/integrations", isAuthenticated, async (req: any, res) => {
    try {
      const integration = await db.insert(schema.integrations)
        .values(req.body)
        .returning();
      
      res.json(integration[0]);
    } catch (error) {
      console.error("Error creating integration:", error);
      res.status(500).json({ message: "Failed to create integration" });
    }
  });

  app.post("/api/integrations/:integrationId/sync", isAuthenticated, async (req: any, res) => {
    try {
      const { integrationId } = req.params;
      
      // Get integration config
      const [integration] = await db.select()
        .from(schema.integrations)
        .where(eq(schema.integrations.id, integrationId));
      
      if (!integration || !integration.isActive) {
        return res.status(404).json({ message: "Integration not found or inactive" });
      }

      // Import the integration service
      const { trainingIntegrationManager } = await import("./services/training-integrations");
      
      // Configure the integration
      trainingIntegrationManager.addIntegration({
        systemType: integration.systemType as any,
        apiUrl: integration.apiUrl,
        apiKey: integration.apiKey,
        organizationId: integration.organizationId,
        syncInterval: integration.syncInterval || 24,
        lastSync: integration.lastSync || undefined,
        isActive: integration.isActive
      });

      // Perform sync
      const result = await trainingIntegrationManager.syncOrganization(integration.organizationId);
      
      // Log sync result
      await db.insert(schema.syncLogs).values({
        integrationId: integration.id,
        syncType: 'manual',
        status: result.success ? 'success' : 'error',
        recordsImported: result.recordsImported,
        recordsErrors: result.errors.length,
        errorDetails: result.errors.length > 0 ? { errors: result.errors } : null,
        endTime: new Date(),
        duration: 0
      });

      // Update last sync time
      await db.update(schema.integrations)
        .set({ lastSync: new Date() })
        .where(eq(schema.integrations.id, integrationId));

      res.json(result);
    } catch (error) {
      console.error("Error syncing integration:", error);
      res.status(500).json({ message: "Failed to sync integration" });
    }
  });

  app.post("/api/integrations/webhook/:organizationId", async (req, res) => {
    try {
      const { organizationId } = req.params;
      const payload = req.body;

      // Import the integration service
      const { trainingIntegrationManager } = await import("./services/training-integrations");
      
      // Process webhook
      await trainingIntegrationManager.handleWebhook(organizationId, payload);
      
      res.json({ success: true, message: "Webhook processed successfully" });
    } catch (error) {
      console.error("Error processing webhook:", error);
      res.status(500).json({ message: "Failed to process webhook" });
    }
  });

  app.get("/api/integrations/:integrationId/logs", isAuthenticated, async (req: any, res) => {
    try {
      const { integrationId } = req.params;
      const logs = await db.select()
        .from(schema.syncLogs)
        .where(eq(schema.syncLogs.integrationId, integrationId))
        .orderBy(desc(schema.syncLogs.startTime))
        .limit(50);
      
      res.json(logs);
    } catch (error) {
      console.error("Error fetching sync logs:", error);
      res.status(500).json({ message: "Failed to fetch sync logs" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Async document processing
async function processDocumentAsync(documentId: string, filePath: string) {
  try {
    // Update status to processing
    await storage.updateDocumentStatus(documentId, "processing");

    // Extract text using OCR
    const extractedText = await processDocumentOCR(filePath);

    // Extract fields using NLP
    const extractedFields = await extractFieldsWithNLP(extractedText);

    // Save extracted data
    for (const field of extractedFields) {
      await storage.createExtractedData({
        documentId,
        fieldName: field.fieldName,
        extractedValue: field.extractedValue,
        confidenceScore: field.confidenceScore,
      });
    }

    // Update status to processed
    await storage.updateDocumentStatus(documentId, "processed");
  } catch (error) {
    console.error("Error processing document:", error);
    await storage.updateDocumentStatus(documentId, "error");
  }
}
