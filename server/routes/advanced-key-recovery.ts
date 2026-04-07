import { Express } from 'express';
import { z } from 'zod';
import { isAuthenticated } from '../localAuth';
import { simplifiedKeyRecoveryService } from '../services/simplified-key-recovery';

// Validation schemas
const biometricDataSchema = z.object({
  fingerprintHash: z.string().min(64),
  faceRecognitionHash: z.string().min(64),
  voicePrintHash: z.string().min(64),
  retinaScanHash: z.string().min(64)
});

const identityDocumentSchema = z.object({
  documentType: z.enum(['passport', 'drivers_license', 'government_id', 'pilot_license']),
  documentNumber: z.string().min(1),
  issuingAuthority: z.string().min(1),
  expirationDate: z.string().transform(str => new Date(str)),
  documentImageHash: z.string().min(64),
  ocrExtractedData: z.any()
});

const employmentVerificationSchema = z.object({
  currentEmployer: z.string().min(1),
  employerVerificationCode: z.string().min(1),
  hrContactEmail: z.string().email(),
  employmentStartDate: z.string().transform(str => new Date(str)),
  positionTitle: z.string().min(1),
  managerApprovalHash: z.string().optional()
});

const emergencyProtocolSchema = z.object({
  emergencyType: z.enum(['medical', 'security_breach', 'natural_disaster', 'equipment_failure']),
  urgencyLevel: z.enum(['low', 'medium', 'high', 'critical']),
  authorizingOfficer: z.string().min(1),
  emergencyContactVerified: z.boolean(),
  medicalDocumentationHash: z.string().optional(),
  securityIncidentReport: z.string().optional()
});

const keyRecoveryRequestSchema = z.object({
  credentialId: z.string().uuid(),
  requestType: z.enum(['lost_key', 'compromise', 'career_transfer', 'emergency_recovery']),
  requestReason: z.string().min(10),
  
  // Multi-Factor Authentication
  primaryAuthMethod: z.enum(['biometric', 'knowledge_based', 'possession_based']),
  secondaryAuthMethod: z.enum(['sms', 'email', 'authenticator_app', 'hardware_token']),
  tertiaryAuthMethod: z.enum(['government_id', 'employment_verification', 'regulatory_authority']),
  
  // Optional verification data
  biometricData: biometricDataSchema.optional(),
  identityDocuments: z.array(identityDocumentSchema),
  knowledgeBasedQuestions: z.array(z.object({
    question: z.string(),
    answerHash: z.string(),
    confidenceScore: z.number().min(0).max(1)
  })),
  
  employmentVerification: employmentVerificationSchema,
  
  // Historical data
  historicalTrainingRecords: z.array(z.string()),
  previousEmployers: z.array(z.string()),
  knownAssociates: z.array(z.string()),
  flightHours: z.number().min(0),
  certificationHistory: z.array(z.any()),
  
  emergencyProtocol: emergencyProtocolSchema.optional(),
  
  // Geo-location data
  geoLocationVerification: z.object({
    requestedFrom: z.string(),
    historicalLocations: z.array(z.string()),
    travelPattern: z.string()
  }),
  
  regulatoryAuthoritiesNotified: z.array(z.string()),
  complianceChecksPassed: z.boolean()
});

const keyRecoveryApprovalSchema = z.object({
  requestId: z.string().uuid(),
  approvalLevel: z.enum(['automatic', 'supervisor', 'admin', 'regulatory_authority']),
  approvingOfficer: z.string().min(1),
  approvalReason: z.string().min(10),
  conditionsOfApproval: z.array(z.string()),
  newKeyGenerationMethod: z.enum(['standard', 'enhanced_security', 'temporary_access']),
  monitoringPeriod: z.number().min(1).max(365),
  additionalSecurityMeasures: z.array(z.string())
});

export function registerAdvancedKeyRecoveryRoutes(app: Express) {
  
  // Initiate key recovery request
  app.post('/api/advanced-key-recovery/initiate', isAuthenticated, async (req, res) => {
    try {
      const validatedData = keyRecoveryRequestSchema.parse(req.body);
      
      const result = await simplifiedKeyRecoveryService.initiateKeyRecovery(validatedData);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Key recovery initiation error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });
  
  // Process biometric verification
  app.post('/api/advanced-key-recovery/:requestId/biometric-verification', isAuthenticated, async (req, res) => {
    try {
      const { requestId } = req.params;
      const biometricData = biometricDataSchema.parse(req.body);
      
      const result = await simplifiedKeyRecoveryService.processBiometricVerification(requestId, biometricData);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Biometric verification error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });
  
  // Process identity document verification
  app.post('/api/advanced-key-recovery/:requestId/identity-verification', isAuthenticated, async (req, res) => {
    try {
      const { requestId } = req.params;
      const documents = z.array(identityDocumentSchema).parse(req.body.documents);
      
      const result = await simplifiedKeyRecoveryService.processIdentityDocumentVerification(requestId, documents);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Identity verification error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });
  
  // Process employment verification
  app.post('/api/advanced-key-recovery/:requestId/employment-verification', isAuthenticated, async (req, res) => {
    try {
      const { requestId } = req.params;
      const employmentData = employmentVerificationSchema.parse(req.body);
      
      const result = await simplifiedKeyRecoveryService.processEmploymentVerification(requestId, employmentData);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Employment verification error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });
  
  // Process emergency recovery
  app.post('/api/advanced-key-recovery/:requestId/emergency-recovery', isAuthenticated, async (req, res) => {
    try {
      const { requestId } = req.params;
      const emergencyProtocol = emergencyProtocolSchema.parse(req.body);
      
      const result = await simplifiedKeyRecoveryService.processEmergencyOverride({ requestId, ...emergencyProtocol });
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Emergency recovery error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });
  
  // Generate replacement key after approval
  app.post('/api/advanced-key-recovery/:requestId/generate-replacement-key', isAuthenticated, async (req, res) => {
    try {
      const { requestId } = req.params;
      const approvalData = keyRecoveryApprovalSchema.parse(req.body);
      
      const result = await simplifiedKeyRecoveryService.approveRecoveryRequest(requestId, approvalData);
      
      res.json({
        success: true,
        data: {
          keyDerivationPath: result.keyDerivationPath,
          securityLevel: result.securityLevel,
          monitoringPeriod: result.monitoringPeriod
          // Note: newMasterPrivateKey is intentionally not returned for security
        },
        message: 'New master private key generated successfully. Key has been securely stored and is ready for use.'
      });
    } catch (error) {
      console.error('Key generation error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });
  
  // Get recovery status
  app.get('/api/advanced-key-recovery/:requestId/status', isAuthenticated, async (req, res) => {
    try {
      const { requestId } = req.params;
      
      const status = await simplifiedKeyRecoveryService.getRecoveryStatus(requestId);
      
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('Get recovery status error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });
  
  // Get all recovery requests for admin dashboard
  app.get('/api/advanced-key-recovery/requests', isAuthenticated, async (req, res) => {
    try {
      const { status, urgency, limit = 50, offset = 0 } = req.query;
      
      const requests = await simplifiedKeyRecoveryService.getAllRecoveryRequests({
        status: status as string,
        urgency: urgency as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
      
      res.json({
        success: true,
        data: requests
      });
    } catch (error) {
      console.error('Get recovery requests error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });
  
  // Get recovery audit trail
  app.get('/api/advanced-key-recovery/:requestId/audit-trail', isAuthenticated, async (req, res) => {
    try {
      const { requestId } = req.params;
      
      const auditTrail = await simplifiedKeyRecoveryService.getRecoveryAuditTrail(requestId);
      
      res.json({
        success: true,
        data: auditTrail
      });
    } catch (error) {
      console.error('Get audit trail error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });
  
  // Admin approval endpoint
  app.post('/api/advanced-key-recovery/:requestId/approve', isAuthenticated, async (req, res) => {
    try {
      const { requestId } = req.params;
      const approvalData = keyRecoveryApprovalSchema.parse(req.body);
      
      // Check if user has admin privileges (implement role-based access control)
      const userClaims = (req as any).user?.claims;
      if (!userClaims || !userClaims.roles?.includes('admin')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient privileges to approve key recovery requests'
        });
      }
      
      const result = await simplifiedKeyRecoveryService.approveRecoveryRequest(requestId, approvalData);
      
      res.json({
        success: true,
        data: result,
        message: 'Key recovery request approved successfully'
      });
    } catch (error) {
      console.error('Recovery approval error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });
  
  // Admin rejection endpoint
  app.post('/api/advanced-key-recovery/:requestId/reject', isAuthenticated, async (req, res) => {
    try {
      const { requestId } = req.params;
      const { rejectionReason, additionalNotes } = req.body;
      
      // Check if user has admin privileges
      const userClaims = (req as any).user?.claims;
      if (!userClaims || !userClaims.roles?.includes('admin')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient privileges to reject key recovery requests'
        });
      }
      
      const result = await simplifiedKeyRecoveryService.rejectRecoveryRequest(requestId, {
        rejectionReason,
        additionalNotes,
        rejectedBy: userClaims.sub
      });
      
      res.json({
        success: true,
        data: result,
        message: 'Key recovery request rejected'
      });
    } catch (error) {
      console.error('Recovery rejection error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });
  
  // Emergency override for critical situations
  app.post('/api/advanced-key-recovery/emergency-override', isAuthenticated, async (req, res) => {
    try {
      const { credentialId, overrideReason, authorizingOfficer, emergencyCode } = req.body;
      
      // Verify emergency override authorization
      const userClaims = (req as any).user?.claims;
      if (!userClaims || !userClaims.roles?.includes('emergency_admin')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient privileges for emergency override'
        });
      }
      
      const result = await simplifiedKeyRecoveryService.processEmergencyOverride({
        credentialId,
        overrideReason,
        authorizingOfficer,
        emergencyCode,
        requestedBy: userClaims.sub
      });
      
      res.json({
        success: true,
        data: result,
        message: 'Emergency override processed successfully'
      });
    } catch (error) {
      console.error('Emergency override error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });
}