import { Router, Response } from 'express';
import { isAuthenticated } from '../localAuth';
import { requireOrg } from '../middleware/tenant';
import { auditComplianceAI } from '../services/audit-compliance-ai';
import { documentGenerator } from '../services/document-generator';
import { storage } from '../storage';

const router = Router();

// Perform comprehensive audit with automatic document generation
router.post('/api/audit-with-generation', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const organizationId = requireOrg(req, res);
    if (!organizationId) return;

    const result = await auditComplianceAI.performComprehensiveAuditWithDocumentGeneration(
      userId,
      organizationId
    );

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Error performing audit with document generation:', error);
    res.status(500).json({ 
      error: 'Failed to perform audit with document generation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Analyze document gaps only (without generation)
router.post('/api/analyze-document-gaps', isAuthenticated, async (req: any, res: Response) => {
  try {
    const organizationId = requireOrg(req, res);
    if (!organizationId) return;

    const { checklistItems, existingDocuments, organizationData } = req.body;

    const gaps = await documentGenerator.analyzeDocumentGaps(
      checklistItems,
      existingDocuments,
      organizationData
    );

    res.json({
      success: true,
      gaps
    });

  } catch (error) {
    console.error('Error analyzing document gaps:', error);
    res.status(500).json({ 
      error: 'Failed to analyze document gaps',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate specific document types
router.post('/api/generate-documents', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const organizationId = requireOrg(req, res);
    if (!organizationId) return;

    const { documentTypes, existingData } = req.body;

    const generatedDocuments = await documentGenerator.autoGenerateComplianceDocuments(
      userId,
      organizationId,
      documentTypes,
      existingData
    );

    res.json({
      success: true,
      generatedDocuments
    });

  } catch (error) {
    console.error('Error generating documents:', error);
    res.status(500).json({ 
      error: 'Failed to generate documents',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// List persisted generated documents for the caller's organization.
// The org is derived exclusively from the authenticated tenant context
// (req.orgId via requireOrg); no client-supplied organizationId is honored,
// and storage is never queried without an org filter.
router.get('/api/generated-documents', isAuthenticated, async (req: any, res: Response) => {
  try {
    const organizationId = requireOrg(req, res);
    if (!organizationId) return;

    const documents = await storage.getGeneratedDocuments(organizationId);

    res.json({
      success: true,
      documents
    });

  } catch (error) {
    console.error('Error fetching generated documents:', error);
    res.status(500).json({
      error: 'Failed to fetch generated documents',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
