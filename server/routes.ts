import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { processDocumentOCR } from "./services/ocr";
import { extractFieldsWithNLP } from "./services/nlp";
import { generateBlockchainHash } from "./services/blockchain";
import { insertDocumentSchema, insertTrainingEventSchema, insertAuditLogSchema } from "@shared/schema";
import { z } from "zod";

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
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
