import type { Express } from 'express';
import { z } from 'zod';
import { blockchainKeyService } from '../services/blockchain-key-management';
import { isAuthenticated } from '../localAuth';
import { storage } from '../storage';

// Validation schemas
const registerOrganizationSchema = z.object({
  organizationName: z.string().min(1),
  organizationType: z.enum(['part_142', 'part_141', 'part_121', 'part_135', 'mro', 'atc']),
  certificateNumber: z.string().min(1),
  regulatoryAuthority: z.enum(['faa', 'easa', 'transport_canada', 'casa']),
  contactInfo: z.object({}).passthrough()
});

const registerCredentialSchema = z.object({
  credentialType: z.enum(['pilot_license', 'atp', 'mechanic_license', 'controller_license']),
  licenseNumber: z.string().min(1),
  regulatoryAuthority: z.enum(['faa', 'easa', 'transport_canada', 'casa']),
  holderFirstName: z.string().min(1),
  holderLastName: z.string().min(1),
  holderEmail: z.string().email(),
  dateOfBirth: z.string().transform(date => new Date(date)),
  issueDate: z.string().transform(date => new Date(date)),
  expirationDate: z.string().transform(date => new Date(date)).optional()
});

const createTrainingRecordSchema = z.object({
  studentCredentialId: z.string().uuid(),
  organizationId: z.string().uuid(),
  instructorCredentialId: z.string().uuid(),
  trainingType: z.enum(['initial', 'recurrent', 'checkride', 'proficiency']),
  trainingDetails: z.object({}).passthrough(),
  studentPrivateKey: z.string().min(1),
  instructorPrivateKey: z.string().min(1),
  organizationPrivateKey: z.string().min(1),
  completionDate: z.string().transform(date => new Date(date))
});

const initiateKeyRecoverySchema = z.object({
  licenseNumber: z.string().min(1),
  regulatoryAuthority: z.enum(['faa', 'easa', 'transport_canada', 'casa']),
  requestType: z.enum(['lost_key', 'compromise', 'career_transfer']),
  requestReason: z.string().min(10),
  identityVerificationData: z.object({
    governmentId: z.string(),
    biometricHash: z.string().optional(),
    licenseVerification: z.boolean(),
    employmentVerification: z.boolean(),
    historicalRecordMatches: z.number()
  }),
  employmentVerificationData: z.object({}).passthrough(),
  emergencyFlag: z.boolean().optional()
});

const processKeyRecoverySchema = z.object({
  recoveryRequestId: z.string().uuid()
});

const verifyCrossPlatformSchema = z.object({
  credentialId: z.string().uuid(),
  platformType: z.enum(['bccs142', 'bccsmaint', 'bccsatc', 'bccsreg', 'bccsregistry']),
  verificationPurpose: z.string().min(1),
  verifyingOrganizationId: z.string().uuid().optional()
});

export function registerBlockchainKeyManagementRoutes(app: Express) {
  
  // Register training organization with master keys
  app.post('/api/blockchain/organizations/register', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = registerOrganizationSchema.parse(req.body);
      
      const result = await blockchainKeyService.registerTrainingOrganization(validatedData);
      
      res.json({
        success: true,
        data: {
          organization: result.organization,
          masterPrivateKey: result.masterPrivateKey // Only returned once!
        },
        warning: "Store the master private key securely. This is the only time it will be displayed."
      });
    } catch (error) {
      console.error("Organization registration error:", error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Register professional credential with master keys
  app.post('/api/blockchain/credentials/register', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = registerCredentialSchema.parse(req.body);
      
      const result = await blockchainKeyService.registerProfessionalCredential(validatedData);
      
      res.json({
        success: true,
        data: {
          credential: result.credential,
          masterPrivateKey: result.masterPrivateKey // Only returned once!
        },
        warning: "Store the master private key securely. This is the only time it will be displayed."
      });
    } catch (error) {
      console.error("Credential registration error:", error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Create multi-signature training record
  app.post('/api/blockchain/training-records', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = createTrainingRecordSchema.parse(req.body);
      
      const signatures = await blockchainKeyService.createTrainingRecord(validatedData);
      
      res.json({
        success: true,
        data: signatures
      });
    } catch (error) {
      console.error("Training record creation error:", error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get training records for a credential
  app.get('/api/blockchain/training-records/:credentialId', isAuthenticated, async (req: any, res) => {
    try {
      const credentialId = req.params.credentialId;
      
      const records = await storage.getTrainingRecordsByCredential(credentialId);
      
      res.json({
        success: true,
        data: records
      });
    } catch (error) {
      console.error("Get training records error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Initiate key recovery process
  app.post('/api/blockchain/key-recovery/initiate', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = initiateKeyRecoverySchema.parse(req.body);
      
      const result = await blockchainKeyService.initiateKeyRecovery(validatedData);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error("Key recovery initiation error:", error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Process key recovery (admin only)
  app.post('/api/blockchain/key-recovery/process', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      // Check if user has admin role for key recovery
      if (!user || user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions for key recovery processing'
        });
      }
      
      const validatedData = processKeyRecoverySchema.parse(req.body);
      
      const result = await blockchainKeyService.processKeyRecovery(
        validatedData.recoveryRequestId,
        user.id
      );
      
      res.json({
        success: true,
        data: result,
        warning: result.newMasterPrivateKey ? 
          "New master private key generated. Provide securely to credential holder." : undefined
      });
    } catch (error) {
      console.error("Key recovery processing error:", error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Cross-platform credential verification
  app.post('/api/blockchain/verify', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = verifyCrossPlatformSchema.parse(req.body);
      
      const result = await blockchainKeyService.verifyCrossPlatform(validatedData);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error("Cross-platform verification error:", error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get verification history for a credential
  app.get('/api/blockchain/verify/:credentialId/history', isAuthenticated, async (req: any, res) => {
    try {
      const credentialId = req.params.credentialId;
      
      const history = await storage.getVerificationHistory(credentialId);
      
      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error("Get verification history error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get professional credential by license
  app.get('/api/blockchain/credentials/:licenseNumber/:authority', isAuthenticated, async (req: any, res) => {
    try {
      const { licenseNumber, authority } = req.params;
      
      const credential = await storage.getProfessionalCredentialByLicense(licenseNumber, authority);
      
      if (!credential) {
        return res.status(404).json({
          success: false,
          error: 'Professional credential not found'
        });
      }
      
      // Don't return sensitive key information
      const { masterPrivateKeyHash, ...safeCredential } = credential;
      
      res.json({
        success: true,
        data: safeCredential
      });
    } catch (error) {
      console.error("Get credential error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get training organization details
  app.get('/api/blockchain/organizations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const organizationId = req.params.id;
      
      const organization = await storage.getTrainingOrganization(organizationId);
      
      if (!organization) {
        return res.status(404).json({
          success: false,
          error: 'Training organization not found'
        });
      }
      
      res.json({
        success: true,
        data: organization
      });
    } catch (error) {
      console.error("Get organization error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get organization members
  app.get('/api/blockchain/organizations/:id/members', isAuthenticated, async (req: any, res) => {
    try {
      const organizationId = req.params.id;
      
      const members = await storage.getOrganizationMembers(organizationId);
      
      res.json({
        success: true,
        data: members
      });
    } catch (error) {
      console.error("Get organization members error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}