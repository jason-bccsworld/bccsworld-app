import { Router, Request, Response } from "express";
import { regulatorySpineService } from "../services/regulatory-spine";
import { checklistHarmonizationEngine } from "../services/checklist-harmonization";
import { inspectorPreferenceEngine } from "../services/inspector-preference";
import { evidenceIndexingService } from "../services/evidence-indexing";
import { auditPacketGenerator } from "../services/audit-packet-generator";
import { isAuthenticated } from "../replitAuth";
import { generateAdaptiveComplianceTutorial } from "../generate-tutorial-doc";

const router = Router();

router.get("/frameworks", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const frameworks = await regulatorySpineService.getAllActiveFrameworks();
    res.json(frameworks);
  } catch (error: any) {
    console.error("Error fetching frameworks:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/frameworks/spine", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const spine = await regulatorySpineService.getSpineFramework();
    res.json(spine);
  } catch (error: any) {
    console.error("Error fetching spine:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/frameworks/hierarchy/:organizationId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const hierarchy = await regulatorySpineService.getComplianceFrameworkHierarchy(
      req.params.organizationId
    );
    res.json(hierarchy);
  } catch (error: any) {
    console.error("Error fetching hierarchy:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/frameworks/initialize", isAuthenticated, async (req: Request, res: Response) => {
  try {
    await regulatorySpineService.initializeRegulatorySpine();
    res.json({ message: "Regulatory spine initialized successfully" });
  } catch (error: any) {
    console.error("Error initializing spine:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/checklists", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const schemas = await checklistHarmonizationEngine.getAllSchemas();
    res.json(schemas);
  } catch (error: any) {
    console.error("Error fetching checklists:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/checklists/:schemaId/items", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const items = await checklistHarmonizationEngine.getSchemaItems(req.params.schemaId);
    res.json(items);
  } catch (error: any) {
    console.error("Error fetching checklist items:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/checklists/ingest", isAuthenticated, async (req: Request, res: Response) => {
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
  } catch (error: any) {
    console.error("Error ingesting checklist:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/checklists/harmonize", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { baseSchemaId, comparedSchemaId } = req.body;
    
    const report = await checklistHarmonizationEngine.harmonizeChecklists(
      baseSchemaId,
      comparedSchemaId
    );
    
    res.json(report);
  } catch (error: any) {
    console.error("Error harmonizing checklists:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/checklists/deltas/:baseSchemaId/:comparedSchemaId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const report = await checklistHarmonizationEngine.generateDeltaReport(
      req.params.baseSchemaId,
      req.params.comparedSchemaId
    );
    res.json(report);
  } catch (error: any) {
    console.error("Error generating delta report:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// CHECKLIST AUTOMATION ENDPOINTS (Section 7)
// ============================================================================

router.post("/checklists/auto-fetch/:farPartCode", isAuthenticated, async (req: Request, res: Response) => {
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
  } catch (error: any) {
    console.error("Error auto-fetching checklist:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/checklists/by-priority", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const schemas = await checklistHarmonizationEngine.getSchemasByPriority();
    res.json(schemas);
  } catch (error: any) {
    console.error("Error fetching checklists by priority:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/checklists/version-check", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const results = await checklistHarmonizationEngine.checkForVersionUpdates();
    res.json({
      message: "Version check completed",
      checkedAt: new Date().toISOString(),
      results
    });
  } catch (error: any) {
    console.error("Error checking versions:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/checklists/:schemaId/version-history", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const history = await checklistHarmonizationEngine.getVersionHistory(req.params.schemaId);
    res.json(history);
  } catch (error: any) {
    console.error("Error fetching version history:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/checklists/:schemaId/suppress", isAuthenticated, async (req: Request, res: Response) => {
  try {
    await checklistHarmonizationEngine.suppressOutdatedChecklist(req.params.schemaId);
    res.json({ message: "Checklist suppressed successfully" });
  } catch (error: any) {
    console.error("Error suppressing checklist:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/checklists/:schemaId/unlock", isAuthenticated, async (req: Request, res: Response) => {
  try {
    await checklistHarmonizationEngine.unlockArchivedChecklist(req.params.schemaId);
    res.json({ message: "Archived checklist unlocked successfully" });
  } catch (error: any) {
    console.error("Error unlocking checklist:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/checklists/:schemaId/evidence-stats", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const stats = await checklistHarmonizationEngine.getEvidenceMappingStats(req.params.schemaId);
    res.json(stats);
  } catch (error: any) {
    console.error("Error fetching evidence stats:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/checklists/evidence-mapping", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { evidenceId, checklistItemId, mappingStrength, notes } = req.body;
    await checklistHarmonizationEngine.mapEvidenceToChecklistItem(
      evidenceId,
      checklistItemId,
      mappingStrength,
      notes
    );
    res.json({ message: "Evidence mapped to checklist item successfully" });
  } catch (error: any) {
    console.error("Error mapping evidence:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/checklists/supported-parts", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const parts = checklistHarmonizationEngine.getSupportedFARParts();
    const definitions = parts.map(p => ({
      code: p,
      definition: checklistHarmonizationEngine.getCoreChecklistDefinition(p)
    }));
    res.json(definitions);
  } catch (error: any) {
    console.error("Error fetching supported parts:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/inspectors", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const inspectors = await inspectorPreferenceEngine.getAllInspectors();
    res.json(inspectors);
  } catch (error: any) {
    console.error("Error fetching inspectors:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/inspectors/:inspectorId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const inspector = await inspectorPreferenceEngine.getInspectorProfile(req.params.inspectorId);
    if (!inspector) {
      return res.status(404).json({ error: "Inspector not found" });
    }
    res.json(inspector);
  } catch (error: any) {
    console.error("Error fetching inspector:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/inspectors", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const profile = await inspectorPreferenceEngine.createInspectorProfile(req.body);
    res.json(profile);
  } catch (error: any) {
    console.error("Error creating inspector:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/inspectors/:inspectorId/behavior", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { organizationId, ...behaviorData } = req.body;
    
    const behavior = await inspectorPreferenceEngine.recordAuditBehavior(
      req.params.inspectorId,
      organizationId,
      behaviorData
    );
    
    res.json(behavior);
  } catch (error: any) {
    console.error("Error recording behavior:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/inspectors/:inspectorId/prediction", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const prediction = await inspectorPreferenceEngine.predictInspectorBehavior(
      req.params.inspectorId
    );
    res.json(prediction);
  } catch (error: any) {
    console.error("Error predicting behavior:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/inspectors/:inspectorId/preparation/:organizationId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const strategy = await inspectorPreferenceEngine.generateAuditPreparationStrategy(
      req.params.inspectorId,
      req.params.organizationId
    );
    res.json(strategy);
  } catch (error: any) {
    console.error("Error generating strategy:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/evidence", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { checklist_item_id, framework_code, regulatory_reference } = req.query;
    
    if (checklist_item_id) {
      const evidence = await evidenceIndexingService.getEvidenceByChecklistItem(
        checklist_item_id as string
      );
      return res.json(evidence);
    }
    
    if (framework_code && regulatory_reference) {
      const evidence = await evidenceIndexingService.getEvidenceByRegulatoryReference(
        framework_code as string,
        regulatory_reference as string
      );
      return res.json(evidence);
    }
    
    res.status(400).json({ 
      error: "Either checklist_item_id or (framework_code + regulatory_reference) required" 
    });
  } catch (error: any) {
    console.error("Error fetching evidence:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/evidence/:evidenceId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const evidence = await evidenceIndexingService.getEvidenceById(req.params.evidenceId);
    if (!evidence) {
      return res.status(404).json({ error: "Evidence not found" });
    }
    res.json(evidence);
  } catch (error: any) {
    console.error("Error fetching evidence:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/evidence", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { organizationId, ...evidenceData } = req.body;
    
    const evidence = await evidenceIndexingService.indexEvidence(organizationId, evidenceData);
    res.json(evidence);
  } catch (error: any) {
    console.error("Error indexing evidence:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/evidence/:evidenceId/map-checklist", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { checklistItemId, ...mappingData } = req.body;
    
    const mapping = await evidenceIndexingService.mapEvidenceToChecklistItem(
      req.params.evidenceId,
      checklistItemId,
      mappingData
    );
    
    res.json(mapping);
  } catch (error: any) {
    console.error("Error mapping evidence:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/evidence/:evidenceId/verify", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const result = await evidenceIndexingService.verifyEvidenceBlockchain(req.params.evidenceId);
    res.json(result);
  } catch (error: any) {
    console.error("Error verifying evidence:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/evidence/:evidenceId/auto-map", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.body;
    
    const result = await evidenceIndexingService.autoMapEvidenceToChecklists(
      req.params.evidenceId,
      organizationId
    );
    
    res.json(result);
  } catch (error: any) {
    console.error("Error auto-mapping evidence:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/audit-packets/generate", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const config = req.body;
    const packet = await auditPacketGenerator.generateAuditPacket(config);
    res.json(packet);
  } catch (error: any) {
    console.error("Error generating audit packet:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/audit-packets/:packetId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const packet = await auditPacketGenerator.getPacketById(req.params.packetId);
    if (!packet) {
      return res.status(404).json({ error: "Packet not found" });
    }
    res.json(packet);
  } catch (error: any) {
    console.error("Error fetching packet:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/audit-packets/:packetId/json", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const packetJson = await auditPacketGenerator.generatePacketJSON(req.params.packetId);
    res.json(packetJson);
  } catch (error: any) {
    console.error("Error generating packet JSON:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/audit-packets/organization/:organizationId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const packets = await auditPacketGenerator.getPacketsForOrganization(req.params.organizationId);
    res.json(packets);
  } catch (error: any) {
    console.error("Error fetching organization packets:", error);
    res.status(500).json({ error: error.message });
  }
});

router.put("/audit-packets/:packetId/status", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    await auditPacketGenerator.updatePacketStatus(req.params.packetId, status);
    res.json({ message: "Status updated successfully" });
  } catch (error: any) {
    console.error("Error updating packet status:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/coverage/:organizationId/:frameworkId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const coverage = await auditPacketGenerator.calculateRegulatoryCoverage(
      req.params.organizationId,
      req.params.frameworkId
    );
    res.json(coverage);
  } catch (error: any) {
    console.error("Error calculating coverage:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/tutorial/download", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const buffer = await generateAdaptiveComplianceTutorial();
    
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", "attachment; filename=Adaptive_Compliance_Tutorial.docx");
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (error: any) {
    console.error("Error generating tutorial document:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// UNIVERSAL FAR INGESTION ENDPOINTS
// ============================================================================

router.get("/far-parts", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const parts = await regulatorySpineService.getUniversalFARParts();
    res.json(parts);
  } catch (error: any) {
    console.error("Error fetching FAR parts:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/frameworks/spines", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const spines = await regulatorySpineService.getAvailableSpines();
    res.json(spines);
  } catch (error: any) {
    console.error("Error fetching available spines:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/frameworks/select-spine", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { organizationId, frameworkCode } = req.body;
    const spine = await regulatorySpineService.selectPrimarySpine(organizationId, frameworkCode);
    if (!spine) {
      return res.status(404).json({ error: "Framework not found" });
    }
    res.json(spine);
  } catch (error: any) {
    console.error("Error selecting spine:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/frameworks/by-part/:partNumber", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const frameworks = await regulatorySpineService.getFrameworksByPart(req.params.partNumber);
    res.json(frameworks);
  } catch (error: any) {
    console.error("Error fetching frameworks by part:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/frameworks/:frameworkId/related", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const related = await regulatorySpineService.getRelatedFrameworks(req.params.frameworkId);
    res.json(related);
  } catch (error: any) {
    console.error("Error fetching related frameworks:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/frameworks/:frameworkCode/impact", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const assessment = await regulatorySpineService.generateRegulatoryImpactAssessment(
      req.params.frameworkCode
    );
    res.json(assessment);
  } catch (error: any) {
    console.error("Error generating impact assessment:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/multi-part-config", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const config = await regulatorySpineService.createMultiPartConfiguration(req.body);
    res.json(config);
  } catch (error: any) {
    console.error("Error creating multi-part config:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/multi-part-config/:configId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const compliance = await regulatorySpineService.getMultiPartConfiguration(req.params.configId);
    if (!compliance) {
      return res.status(404).json({ error: "Configuration not found" });
    }
    res.json(compliance);
  } catch (error: any) {
    console.error("Error fetching multi-part config:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/policy-documents/ingest", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const document = await regulatorySpineService.ingestFAAPolicyDocument(req.body);
    res.json(document);
  } catch (error: any) {
    console.error("Error ingesting policy document:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/policy-documents", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { documentType, affectedPart } = req.query;
    const documents = await regulatorySpineService.getActivePolicyDocuments({
      documentType: documentType as string,
      affectedPart: affectedPart as string
    });
    res.json(documents);
  } catch (error: any) {
    console.error("Error fetching policy documents:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/regulatory-updates", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const updates = await regulatorySpineService.getRecentRegulatoryUpdates(limit);
    res.json(updates);
  } catch (error: any) {
    console.error("Error fetching regulatory updates:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/organization/:organizationId/regulatory-profile", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const profile = await regulatorySpineService.getOrganizationRegulatoryProfile(
      req.params.organizationId
    );
    res.json(profile);
  } catch (error: any) {
    console.error("Error fetching regulatory profile:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/frameworks/initialize-universal", isAuthenticated, async (req: Request, res: Response) => {
  try {
    await regulatorySpineService.initializeUniversalRegulatorySpine();
    res.json({ message: "Universal regulatory spine initialized with all FAR Parts" });
  } catch (error: any) {
    console.error("Error initializing universal spine:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
