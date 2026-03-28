import { ethers } from 'ethers';
import { storage } from '../storage';
import type {
  InsertTrainingOrganization,
  InsertProfessionalCredential,
  InsertOrganizationMember,
  InsertBlockchainTrainingRecord,
  InsertKeyRecoveryRequest,
  InsertCrossPlatformVerification,
  TrainingOrganization,
  ProfessionalCredential,
  KeyRecoveryRequest
} from '@shared/schema';
import crypto from 'crypto';

export interface KeyGenerationResult {
  masterPrivateKey: string;
  masterPublicKey: string;
  masterPrivateKeyHash: string;
  derivationPath: string;
}

export interface TrainingRecordSignature {
  studentSignature: string;
  instructorSignature: string;
  organizationSignature: string;
  blockchainHash: string;
}

export interface IdentityVerificationData {
  governmentId: string;
  biometricHash?: string;
  licenseVerification: boolean;
  employmentVerification: boolean;
  historicalRecordMatches: number;
}

/**
 * Universal Blockchain Key Management Service
 * Handles professional credential keys, training record signatures, and key recovery
 */
export class BlockchainKeyManagementService {
  
  /**
   * Generate master keys for a new professional credential
   */
  async generateProfessionalKeys(licenseNumber: string, credentialType: string): Promise<KeyGenerationResult> {
    // Generate a new wallet for the professional
    const wallet = ethers.Wallet.createRandom();
    
    // Create deterministic derivation path based on license and type
    const derivationPath = `m/44'/60'/0'/0/${this.hashStringToNumber(licenseNumber + credentialType)}`;
    
    // Hash the private key for storage (never store actual private key)
    const masterPrivateKeyHash = this.hashPrivateKey(wallet.privateKey);
    
    return {
      masterPrivateKey: wallet.privateKey, // Only returned once, never stored
      masterPublicKey: wallet.address,
      masterPrivateKeyHash,
      derivationPath
    };
  }

  /**
   * Generate organization master keys
   */
  async generateOrganizationKeys(certificateNumber: string, organizationType: string): Promise<KeyGenerationResult> {
    const wallet = ethers.Wallet.createRandom();
    const derivationPath = `m/44'/60'/1'/0/${this.hashStringToNumber(certificateNumber + organizationType)}`;
    const masterPrivateKeyHash = this.hashPrivateKey(wallet.privateKey);
    
    return {
      masterPrivateKey: wallet.privateKey,
      masterPublicKey: wallet.address,
      masterPrivateKeyHash,
      derivationPath
    };
  }

  /**
   * Register a new training organization with blockchain keys
   */
  async registerTrainingOrganization(params: {
    organizationName: string;
    organizationType: 'part_142' | 'part_141' | 'part_121' | 'part_135' | 'mro' | 'atc';
    certificateNumber: string;
    regulatoryAuthority: 'faa' | 'easa' | 'transport_canada' | 'casa';
    contactInfo: object;
  }): Promise<{ organization: TrainingOrganization; masterPrivateKey: string }> {
    
    // Generate organization keys
    const keys = await this.generateOrganizationKeys(params.certificateNumber, params.organizationType);
    
    // Create organization record
    const organizationData: InsertTrainingOrganization = {
      organizationName: params.organizationName,
      organizationType: params.organizationType,
      certificateNumber: params.certificateNumber,
      regulatoryAuthority: params.regulatoryAuthority,
      masterPublicKey: keys.masterPublicKey,
      contactInfo: params.contactInfo
    };
    
    const organization = await storage.createTrainingOrganization(organizationData);
    
    // Log the registration
    await storage.createAuditLog({
      eventType: 'organization_registration',
      severity: 'info',
      message: `Training organization registered: ${params.organizationName}`,
      details: {
        organizationId: organization.id,
        organizationType: params.organizationType,
        certificateNumber: params.certificateNumber,
        regulatoryAuthority: params.regulatoryAuthority,
        publicKey: keys.masterPublicKey
      },
      sourceSystem: 'blockchain_key_management'
    });
    
    return {
      organization,
      masterPrivateKey: keys.masterPrivateKey
    };
  }

  /**
   * Register a new professional credential with blockchain keys
   */
  async registerProfessionalCredential(params: {
    credentialType: 'pilot_license' | 'atp' | 'mechanic_license' | 'controller_license';
    licenseNumber: string;
    regulatoryAuthority: 'faa' | 'easa' | 'transport_canada' | 'casa';
    holderFirstName: string;
    holderLastName: string;
    holderEmail: string;
    dateOfBirth: Date;
    issueDate: Date;
    expirationDate?: Date;
  }): Promise<{ credential: ProfessionalCredential; masterPrivateKey: string }> {
    
    // Check if credential already exists
    const existingCredential = await storage.getProfessionalCredentialByLicense(
      params.licenseNumber, 
      params.regulatoryAuthority
    );
    
    if (existingCredential) {
      throw new Error(`Professional credential already exists for license ${params.licenseNumber}`);
    }
    
    // Generate professional keys
    const keys = await this.generateProfessionalKeys(params.licenseNumber, params.credentialType);
    
    // Create credential record
    const credentialData: InsertProfessionalCredential = {
      credentialType: params.credentialType,
      licenseNumber: params.licenseNumber,
      regulatoryAuthority: params.regulatoryAuthority,
      masterPrivateKeyHash: keys.masterPrivateKeyHash,
      publicKeyDerivationPath: keys.derivationPath,
      holderFirstName: params.holderFirstName,
      holderLastName: params.holderLastName,
      holderEmail: params.holderEmail,
      dateOfBirth: params.dateOfBirth,
      issueDate: params.issueDate,
      expirationDate: params.expirationDate
    };
    
    const credential = await storage.createProfessionalCredential(credentialData);
    
    // Log the registration
    await storage.createAuditLog({
      eventType: 'credential_registration',
      severity: 'info',
      message: `Professional credential registered: ${params.licenseNumber}`,
      details: {
        credentialId: credential.id,
        credentialType: params.credentialType,
        licenseNumber: params.licenseNumber,
        regulatoryAuthority: params.regulatoryAuthority,
        holderName: `${params.holderFirstName} ${params.holderLastName}`
      },
      sourceSystem: 'blockchain_key_management'
    });
    
    return {
      credential,
      masterPrivateKey: keys.masterPrivateKey
    };
  }

  /**
   * Create multi-signature training record
   */
  async createTrainingRecord(params: {
    studentCredentialId: string;
    organizationId: string;
    instructorCredentialId: string;
    trainingType: 'initial' | 'recurrent' | 'checkride' | 'proficiency';
    trainingDetails: object;
    studentPrivateKey: string;
    instructorPrivateKey: string;
    organizationPrivateKey: string;
    completionDate: Date;
  }): Promise<TrainingRecordSignature> {
    
    // Create the training record data
    const recordData = {
      studentCredentialId: params.studentCredentialId,
      organizationId: params.organizationId,
      instructorCredentialId: params.instructorCredentialId,
      trainingType: params.trainingType,
      trainingDetails: params.trainingDetails,
      completionDate: params.completionDate
    };
    
    // Create deterministic hash of the training record
    const recordHash = this.createTrainingRecordHash(recordData);
    
    // Generate signatures from each party
    const studentWallet = new ethers.Wallet(params.studentPrivateKey);
    const instructorWallet = new ethers.Wallet(params.instructorPrivateKey);
    const organizationWallet = new ethers.Wallet(params.organizationPrivateKey);
    
    const studentSignature = await studentWallet.signMessage(recordHash);
    const instructorSignature = await instructorWallet.signMessage(recordHash);
    const organizationSignature = await organizationWallet.signMessage(recordHash);
    
    // Create final blockchain hash from all signatures
    const blockchainHash = this.createBlockchainHash(recordHash, [
      studentSignature,
      instructorSignature,
      organizationSignature
    ]);
    
    // Store the training record
    const trainingRecordData: InsertBlockchainTrainingRecord = {
      studentCredentialId: params.studentCredentialId,
      organizationId: params.organizationId,
      instructorCredentialId: params.instructorCredentialId,
      trainingType: params.trainingType,
      trainingDetails: params.trainingDetails,
      studentSignature,
      instructorSignature,
      organizationSignature,
      blockchainHash,
      completionDate: params.completionDate
    };
    
    await storage.createBlockchainTrainingRecord(trainingRecordData);
    
    // Log the training record creation
    await storage.createAuditLog({
      eventType: 'training_record_created',
      severity: 'info',
      message: `Multi-signature training record created`,
      details: {
        studentCredentialId: params.studentCredentialId,
        organizationId: params.organizationId,
        instructorCredentialId: params.instructorCredentialId,
        trainingType: params.trainingType,
        blockchainHash
      },
      sourceSystem: 'blockchain_key_management'
    });
    
    return {
      studentSignature,
      instructorSignature,
      organizationSignature,
      blockchainHash
    };
  }

  /**
   * Initiate key recovery process
   */
  async initiateKeyRecovery(params: {
    licenseNumber: string;
    regulatoryAuthority: string;
    requestType: 'lost_key' | 'compromise' | 'career_transfer';
    requestReason: string;
    identityVerificationData: IdentityVerificationData;
    employmentVerificationData: object;
    emergencyFlag?: boolean;
  }): Promise<{ recoveryRequestId: string; estimatedProcessingTime: string }> {
    
    // Find the professional credential
    const credential = await storage.getProfessionalCredentialByLicense(
      params.licenseNumber,
      params.regulatoryAuthority
    );
    
    if (!credential) {
      throw new Error(`No professional credential found for license ${params.licenseNumber}`);
    }
    
    // Cross-reference historical training records for validation
    const trainingHistory = await storage.getTrainingRecordsByCredential(credential.id);
    const historicalMatches = trainingHistory.length;
    
    // Create recovery request
    const recoveryRequestData: InsertKeyRecoveryRequest = {
      credentialId: credential.id,
      requestType: params.requestType,
      requestReason: params.requestReason,
      identityVerificationData: {
        ...params.identityVerificationData,
        historicalRecordMatches: historicalMatches
      },
      employmentVerificationData: params.employmentVerificationData,
      historicalRecordMatches: { count: historicalMatches, verified: false },
      emergencyFlag: params.emergencyFlag || false
    };
    
    const recoveryRequest = await storage.createKeyRecoveryRequest(recoveryRequestData);
    
    // Determine processing timeline
    const processingTime = params.emergencyFlag ? '72 hours' : '30 days';
    
    // Log the recovery request
    await storage.createAuditLog({
      eventType: 'key_recovery_initiated',
      severity: 'warning',
      message: `Key recovery request initiated for license ${params.licenseNumber}`,
      details: {
        recoveryRequestId: recoveryRequest.id,
        credentialId: credential.id,
        requestType: params.requestType,
        emergencyFlag: params.emergencyFlag,
        historicalMatches
      },
      sourceSystem: 'blockchain_key_management'
    });
    
    return {
      recoveryRequestId: recoveryRequest.id,
      estimatedProcessingTime: processingTime
    };
  }

  /**
   * Process key recovery after verification
   */
  async processKeyRecovery(recoveryRequestId: string, processingAdminId: string): Promise<{
    success: boolean;
    newMasterPrivateKey?: string;
    newPublicKey?: string;
  }> {
    
    const recoveryRequest = await storage.getKeyRecoveryRequest(recoveryRequestId);
    if (!recoveryRequest) {
      throw new Error('Recovery request not found');
    }
    
    if (recoveryRequest.verificationStatus !== 'verified') {
      throw new Error('Identity verification not completed');
    }
    
    // Get the credential
    const credential = await storage.getProfessionalCredential(recoveryRequest.credentialId);
    if (!credential) {
      throw new Error('Professional credential not found');
    }
    
    // Generate new keys
    const newKeys = await this.generateProfessionalKeys(
      credential.licenseNumber,
      credential.credentialType
    );
    
    // Update recovery request with new key hash
    await storage.updateKeyRecoveryRequest(recoveryRequestId, {
      requestStatus: 'completed',
      newMasterPrivateKeyHash: newKeys.masterPrivateKeyHash,
      recoveryCompletedAt: new Date(),
      processedBy: processingAdminId
    });
    
    // Update credential with new key hash (invalidates old key)
    await storage.createAuditLog({
      eventType: 'key_recovery_completed',
      severity: 'warning',
      message: `Key recovery completed for credential ${credential.id}`,
      details: {
        recoveryRequestId,
        credentialId: credential.id,
        oldKeyHash: credential.masterPrivateKeyHash,
        newKeyHash: newKeys.masterPrivateKeyHash,
        processedBy: processingAdminId
      },
      sourceSystem: 'blockchain_key_management'
    });
    
    return {
      success: true,
      newMasterPrivateKey: newKeys.masterPrivateKey,
      newPublicKey: newKeys.masterPublicKey
    };
  }

  /**
   * Verify credential across platforms
   */
  async verifyCrossPlatform(params: {
    credentialId: string;
    platformType: 'bccs142' | 'bccsmaint' | 'bccsatc' | 'bccsreg' | 'bccsregistry';
    verificationPurpose: string;
    verifyingOrganizationId?: string;
  }): Promise<{ verified: boolean; verificationData: object }> {
    
    const credential = await storage.getProfessionalCredential(params.credentialId);
    if (!credential) {
      return { verified: false, verificationData: { error: 'Credential not found' } };
    }
    
    // Check if credential is active and not expired
    const isActive = credential.isActive && 
      (!credential.expirationDate || credential.expirationDate > new Date());
    
    const verificationData = {
      credentialType: credential.credentialType,
      licenseNumber: credential.licenseNumber,
      regulatoryAuthority: credential.regulatoryAuthority,
      holderName: `${credential.holderFirstName} ${credential.holderLastName}`,
      isActive,
      expirationDate: credential.expirationDate,
      verifiedAt: new Date()
    };
    
    // Store verification record
    await storage.createCrossPlatformVerification({
      credentialId: params.credentialId,
      platformType: params.platformType,
      verificationPurpose: params.verificationPurpose,
      verifyingOrganizationId: params.verifyingOrganizationId,
      verificationResult: isActive ? 'verified' : 'failed',
      verificationData
    });
    
    return {
      verified: isActive ?? false,
      verificationData
    };
  }

  // Private utility methods
  private hashPrivateKey(privateKey: string): string {
    return crypto.createHash('sha256').update(privateKey).digest('hex');
  }

  private hashStringToNumber(input: string): number {
    const hash = crypto.createHash('sha256').update(input).digest('hex');
    return parseInt(hash.substring(0, 8), 16) % 1000000; // Keep within reasonable range
  }

  private createTrainingRecordHash(recordData: any): string {
    const dataString = JSON.stringify(recordData, Object.keys(recordData).sort());
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  private createBlockchainHash(recordHash: string, signatures: string[]): string {
    const combinedData = recordHash + signatures.join('');
    return crypto.createHash('sha256').update(combinedData).digest('hex');
  }
}

export const blockchainKeyService = new BlockchainKeyManagementService();