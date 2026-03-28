import { Router } from 'express';
import { LegacyDataTransferService, type LegacyDataTransferRequest } from '../services/legacy-data-transfer';
import { z } from 'zod';

const router = Router();
const legacyDataTransferService = new LegacyDataTransferService();

// Validation schemas
const uploadRequestSchema = z.object({
  organizationName: z.string().min(1),
  dataType: z.enum(['pilot_logbooks', 'training_records', 'maintenance_logs', 'regulatory_documents', 'mixed_aviation_data']),
  estimatedRecords: z.string().min(1),
  legacySystemType: z.string().min(1),
  contactEmail: z.string().email(),
  urgencyLevel: z.enum(['standard', 'expedited', 'emergency']),
  specialInstructions: z.string().optional(),
  files: z.string().min(1),
  ocrAccuracyLevel: z.enum(['standard', 'high', 'maximum']),
  aiValidationLevel: z.enum(['basic', 'comprehensive', 'forensic']),
  blockchainVerification: z.boolean(),
  qualityAssuranceLevel: z.enum(['automated', 'hybrid', 'full_manual']),
  outputFormat: z.enum(['bccs_native', 'json', 'csv', 'pdf_reports']),
  encryptionLevel: z.enum(['standard', 'enhanced', 'military_grade'])
});

// POST /api/legacy-data-transfer/upload - Initiate data transfer
router.post('/upload', async (req, res) => {
  try {
    const validatedData = uploadRequestSchema.parse(req.body);
    
    const result = await legacyDataTransferService.initiateDataTransfer(validatedData as LegacyDataTransferRequest);
    
    res.json({
      success: true,
      data: result,
      message: 'Legacy data transfer initiated successfully'
    });
  } catch (error) {
    console.error('Upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to initiate data transfer';
    res.status(400).json({
      success: false,
      error: errorMessage
    });
  }
});

// GET /api/legacy-data-transfer/status/:jobId - Get processing status
router.get('/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    if (!jobId) {
      return res.status(400).json({
        success: false,
        error: 'Job ID is required'
      });
    }
    
    const status = await legacyDataTransferService.getJobStatus(jobId);
    
    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Status retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve job status'
    });
  }
});

// GET /api/legacy-data-transfer/jobs - Get all processing jobs
router.get('/jobs', async (req, res) => {
  try {
    const { status, dataType, organization } = req.query;
    
    const filters = {
      status: status as string,
      dataType: dataType as string,
      organization: organization as string
    };
    
    const jobs = await legacyDataTransferService.getAllJobs(filters);
    
    res.json({
      success: true,
      data: jobs,
      count: jobs.length
    });
  } catch (error) {
    console.error('Jobs retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve processing jobs'
    });
  }
});

// GET /api/legacy-data-transfer/download/:jobId/:fileType - Download processed files
router.get('/download/:jobId/:fileType', async (req, res) => {
  try {
    const { jobId, fileType } = req.params;
    
    const job = await legacyDataTransferService.getJobStatus(jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }
    
    if (job.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Job not yet completed'
      });
    }
    
    // In production, this would stream the actual file
    res.json({
      success: true,
      message: `Download ${fileType} for job ${jobId}`,
      downloadUrl: `/downloads/${jobId}/${fileType}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });
    
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process download request'
    });
  }
});

// POST /api/legacy-data-transfer/cancel/:jobId - Cancel processing job
router.post('/cancel/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const job = await legacyDataTransferService.getJobStatus(jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }
    
    if (job.status === 'completed' || job.status === 'failed') {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel completed or failed job'
      });
    }
    
    // In production, this would actually cancel the processing
    res.json({
      success: true,
      message: 'Job cancellation requested',
      data: {
        jobId,
        previousStatus: job.status,
        cancelledAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Cancel error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel job'
    });
  }
});

// GET /api/legacy-data-transfer/pricing - Get pricing information
router.get('/pricing', async (req, res) => {
  try {
    const { recordCount = '1000', urgencyLevel = 'standard', features } = req.query;
    
    const pricingInfo = {
      basePrice: 149, // Highest ROI pricing as specified
      recordCount: parseInt(recordCount as string),
      urgencyLevel: urgencyLevel as string,
      additionalFeatures: {
        expedited: urgencyLevel === 'expedited' ? 50 : 0,
        emergency: urgencyLevel === 'emergency' ? 100 : 0,
        maximumOCR: Array.isArray(features) && (features as string[]).includes('maximum_ocr') ? 25 : 0,
        forensicAI: Array.isArray(features) && (features as string[]).includes('forensic_ai') ? 75 : 0,
        fullManualQA: Array.isArray(features) && (features as string[]).includes('full_manual_qa') ? 100 : 0,
        militaryEncryption: Array.isArray(features) && (features as string[]).includes('military_encryption') ? 50 : 0
      },
      get totalPrice() {
        return this.basePrice + Object.values(this.additionalFeatures).reduce((sum, price) => sum + price, 0);
      }
    };
    
    res.json({
      success: true,
      data: pricingInfo,
      currency: 'USD'
    });
    
  } catch (error) {
    console.error('Pricing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate pricing'
    });
  }
});

// GET /api/legacy-data-transfer/analytics - Get processing analytics
router.get('/analytics', async (req, res) => {
  try {
    const { timeframe = '30d', organization } = req.query;
    
    // Mock analytics data
    const analyticsData = {
      timeframe,
      totalJobs: 156,
      completedJobs: 142,
      averageProcessingTime: '2.3 hours',
      averageAccuracy: 96.8,
      dataTypesProcessed: {
        pilot_logbooks: 45,
        training_records: 38,
        maintenance_logs: 32,
        regulatory_documents: 28,
        mixed_aviation_data: 13
      },
      qualityMetrics: {
        averageOCRAccuracy: 97.2,
        averageDataCompleteness: 94.6,
        averageValidationRate: 95.8,
        totalDuplicatesFound: 1247
      },
      processingTrends: {
        standardJobs: 89,
        expeditedJobs: 42,
        emergencyJobs: 25
      },
      blockchainVerifications: 134,
      totalRecordsProcessed: 178543
    };
    
    res.json({
      success: true,
      data: analyticsData
    });
    
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve analytics'
    });
  }
});

export default router;