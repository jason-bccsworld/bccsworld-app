import { Router, Request, Response } from 'express';
import { auditComplianceAI } from '../services/audit-compliance-ai';
import { documentGenerator } from '../services/document-generator';

const router = Router();

// Perform comprehensive audit with automatic document generation
router.post('/api/audit-with-generation', async (req: Request, res: Response) => {
  try {
    const userId = req.session?.user?.id;
    const organizationId = req.body.organizationId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

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
router.post('/api/analyze-document-gaps', async (req: Request, res: Response) => {
  try {
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
router.post('/api/generate-documents', async (req: Request, res: Response) => {
  try {
    const userId = req.session?.user?.id;
    const { organizationId, documentTypes, existingData } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

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

export default router;