import { db } from "../db";
import { 
  evidenceRecords, 
  evidenceChecklistMappings,
  evidenceRegulatoryMappings,
  checklistItems,
  regulatoryFrameworks,
  blockchainTrainingRecords,
  InsertEvidenceRecord,
  InsertEvidenceChecklistMapping,
  InsertEvidenceRegulatoryMapping,
  EvidenceRecord,
  EvidenceChecklistMapping
} from "@shared/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { createHash } from "crypto";

export interface EvidenceSearchResult {
  evidence: EvidenceRecord;
  checklistMappings: Array<{
    checklistItemId: string;
    itemNumber: string;
    description: string;
    relevance: string;
    confidence: number;
  }>;
  regulatoryMappings: Array<{
    frameworkCode: string;
    regulatoryReference: string;
    referenceType: string;
  }>;
  blockchainVerification: {
    verified: boolean;
    hash: string | null;
    trainingRecordId: string | null;
  };
}

export interface EvidenceIndexResult {
  evidenceId: string;
  checklistMappingsCreated: number;
  regulatoryMappingsCreated: number;
  blockchainVerified: boolean;
}

export class EvidenceIndexingService {

  async indexEvidence(
    organizationId: string,
    evidenceData: {
      evidenceType: string;
      evidenceTitle: string;
      evidenceDescription?: string;
      filePath?: string;
      extractedText?: string;
      metadata?: any;
      blockchainTrainingRecordId?: string;
      expirationDate?: Date;
    }
  ): Promise<EvidenceRecord> {
    const fileHash = evidenceData.extractedText 
      ? createHash('sha256').update(evidenceData.extractedText).digest('hex')
      : null;

    let blockchainVerified = false;
    let blockchainHash: string | null = null;

    if (evidenceData.blockchainTrainingRecordId) {
      const trainingRecord = await db.select()
        .from(blockchainTrainingRecords)
        .where(eq(blockchainTrainingRecords.id, evidenceData.blockchainTrainingRecordId))
        .limit(1);

      if (trainingRecord[0]) {
        blockchainVerified = true;
        blockchainHash = trainingRecord[0].blockchainHash;
      }
    }

    const record: InsertEvidenceRecord = {
      organizationId,
      evidenceType: evidenceData.evidenceType,
      evidenceTitle: evidenceData.evidenceTitle,
      evidenceDescription: evidenceData.evidenceDescription || null,
      filePath: evidenceData.filePath || null,
      fileHash,
      extractedText: evidenceData.extractedText || null,
      metadata: evidenceData.metadata || null,
      blockchainTrainingRecordId: evidenceData.blockchainTrainingRecordId || null,
      blockchainVerificationHash: blockchainHash,
      verificationStatus: blockchainVerified ? 'verified' : 'pending',
      verifiedAt: blockchainVerified ? new Date() : null,
      expirationDate: evidenceData.expirationDate || null,
      isActive: true
    };

    const [result] = await db.insert(evidenceRecords)
      .values(record)
      .returning();

    return result;
  }

  async mapEvidenceToChecklistItem(
    evidenceId: string,
    checklistItemId: string,
    mappingData: {
      confidence?: number;
      mappingSource: 'manual' | 'ai_suggested' | 'auto_matched';
      relevance: 'primary' | 'supporting' | 'contextual';
      notes?: string;
      createdBy?: string;
    }
  ): Promise<EvidenceChecklistMapping> {
    const mapping: InsertEvidenceChecklistMapping = {
      evidenceId,
      checklistItemId,
      mappingConfidence: (mappingData.confidence || 1.0).toFixed(2),
      mappingSource: mappingData.mappingSource,
      evidenceRelevance: mappingData.relevance,
      notes: mappingData.notes || null,
      createdBy: mappingData.createdBy || null
    };

    const [result] = await db.insert(evidenceChecklistMappings)
      .values(mapping)
      .returning();

    return result;
  }

  async mapEvidenceToRegulation(
    evidenceId: string,
    frameworkId: string,
    regulatoryReference: string,
    referenceType: 'direct_compliance' | 'supporting' | 'cross_reference',
    notes?: string
  ): Promise<void> {
    const mapping: InsertEvidenceRegulatoryMapping = {
      evidenceId,
      frameworkId,
      regulatoryReference,
      referenceType,
      notes: notes || null
    };

    await db.insert(evidenceRegulatoryMappings).values(mapping);
  }

  async getEvidenceByChecklistItem(checklistItemId: string): Promise<EvidenceSearchResult[]> {
    const mappings = await db.select()
      .from(evidenceChecklistMappings)
      .where(eq(evidenceChecklistMappings.checklistItemId, checklistItemId));

    if (mappings.length === 0) return [];

    const evidenceIds = mappings.map(m => m.evidenceId);
    const evidenceList = await db.select()
      .from(evidenceRecords)
      .where(and(
        inArray(evidenceRecords.id, evidenceIds),
        eq(evidenceRecords.isActive, true)
      ));

    const results: EvidenceSearchResult[] = [];

    for (const evidence of evidenceList) {
      const checklistMappings = await this.getChecklistMappingsForEvidence(evidence.id);
      const regulatoryMappings = await this.getRegulatoryMappingsForEvidence(evidence.id);

      results.push({
        evidence,
        checklistMappings,
        regulatoryMappings,
        blockchainVerification: {
          verified: evidence.verificationStatus === 'verified',
          hash: evidence.blockchainVerificationHash,
          trainingRecordId: evidence.blockchainTrainingRecordId
        }
      });
    }

    return results;
  }

  private async getChecklistMappingsForEvidence(evidenceId: string): Promise<Array<{
    checklistItemId: string;
    itemNumber: string;
    description: string;
    relevance: string;
    confidence: number;
  }>> {
    const mappings = await db.select({
      checklistItemId: evidenceChecklistMappings.checklistItemId,
      relevance: evidenceChecklistMappings.evidenceRelevance,
      confidence: evidenceChecklistMappings.mappingConfidence,
      itemNumber: checklistItems.itemNumber,
      description: checklistItems.description
    })
    .from(evidenceChecklistMappings)
    .innerJoin(checklistItems, eq(evidenceChecklistMappings.checklistItemId, checklistItems.id))
    .where(eq(evidenceChecklistMappings.evidenceId, evidenceId));

    return mappings.map(m => ({
      checklistItemId: m.checklistItemId,
      itemNumber: m.itemNumber,
      description: m.description,
      relevance: m.relevance,
      confidence: Number(m.confidence)
    }));
  }

  private async getRegulatoryMappingsForEvidence(evidenceId: string): Promise<Array<{
    frameworkCode: string;
    regulatoryReference: string;
    referenceType: string;
  }>> {
    const mappings = await db.select({
      regulatoryReference: evidenceRegulatoryMappings.regulatoryReference,
      referenceType: evidenceRegulatoryMappings.referenceType,
      frameworkCode: regulatoryFrameworks.frameworkCode
    })
    .from(evidenceRegulatoryMappings)
    .innerJoin(regulatoryFrameworks, eq(evidenceRegulatoryMappings.frameworkId, regulatoryFrameworks.id))
    .where(eq(evidenceRegulatoryMappings.evidenceId, evidenceId));

    return mappings.map(m => ({
      frameworkCode: m.frameworkCode,
      regulatoryReference: m.regulatoryReference,
      referenceType: m.referenceType
    }));
  }

  async getEvidenceByRegulatoryReference(
    frameworkCode: string,
    regulatoryReference: string
  ): Promise<EvidenceSearchResult[]> {
    const framework = await db.select()
      .from(regulatoryFrameworks)
      .where(eq(regulatoryFrameworks.frameworkCode, frameworkCode))
      .limit(1);

    if (!framework[0]) return [];

    const mappings = await db.select()
      .from(evidenceRegulatoryMappings)
      .where(and(
        eq(evidenceRegulatoryMappings.frameworkId, framework[0].id),
        eq(evidenceRegulatoryMappings.regulatoryReference, regulatoryReference)
      ));

    if (mappings.length === 0) return [];

    const evidenceIds = mappings.map(m => m.evidenceId);
    const evidenceList = await db.select()
      .from(evidenceRecords)
      .where(and(
        inArray(evidenceRecords.id, evidenceIds),
        eq(evidenceRecords.isActive, true)
      ));

    const results: EvidenceSearchResult[] = [];
    for (const evidence of evidenceList) {
      const checklistMappings = await this.getChecklistMappingsForEvidence(evidence.id);
      const regulatoryMappings = await this.getRegulatoryMappingsForEvidence(evidence.id);

      results.push({
        evidence,
        checklistMappings,
        regulatoryMappings,
        blockchainVerification: {
          verified: evidence.verificationStatus === 'verified',
          hash: evidence.blockchainVerificationHash,
          trainingRecordId: evidence.blockchainTrainingRecordId
        }
      });
    }

    return results;
  }

  async searchEvidence(
    organizationId: string,
    query: {
      evidenceType?: string;
      verificationStatus?: string;
      hasBlockchainVerification?: boolean;
    }
  ): Promise<EvidenceRecord[]> {
    let conditions = [eq(evidenceRecords.organizationId, organizationId)];

    if (query.evidenceType) {
      conditions.push(eq(evidenceRecords.evidenceType, query.evidenceType));
    }

    if (query.verificationStatus) {
      conditions.push(eq(evidenceRecords.verificationStatus, query.verificationStatus));
    }

    return db.select()
      .from(evidenceRecords)
      .where(and(...conditions));
  }

  async verifyEvidenceBlockchain(evidenceId: string): Promise<{
    verified: boolean;
    hash: string | null;
    message: string;
  }> {
    const evidence = await db.select()
      .from(evidenceRecords)
      .where(eq(evidenceRecords.id, evidenceId))
      .limit(1);

    if (!evidence[0]) {
      return { verified: false, hash: null, message: "Evidence not found" };
    }

    if (!evidence[0].blockchainTrainingRecordId) {
      return { verified: false, hash: null, message: "No blockchain record linked" };
    }

    const trainingRecord = await db.select()
      .from(blockchainTrainingRecords)
      .where(eq(blockchainTrainingRecords.id, evidence[0].blockchainTrainingRecordId))
      .limit(1);

    if (!trainingRecord[0]) {
      return { verified: false, hash: null, message: "Linked blockchain record not found" };
    }

    await db.update(evidenceRecords)
      .set({
        verificationStatus: 'verified',
        blockchainVerificationHash: trainingRecord[0].blockchainHash,
        verifiedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(evidenceRecords.id, evidenceId));

    return {
      verified: true,
      hash: trainingRecord[0].blockchainHash,
      message: "Evidence verified against blockchain record"
    };
  }

  async autoMapEvidenceToChecklists(
    evidenceId: string,
    organizationId: string
  ): Promise<EvidenceIndexResult> {
    const evidence = await db.select()
      .from(evidenceRecords)
      .where(eq(evidenceRecords.id, evidenceId))
      .limit(1);

    if (!evidence[0] || !evidence[0].extractedText) {
      return {
        evidenceId,
        checklistMappingsCreated: 0,
        regulatoryMappingsCreated: 0,
        blockchainVerified: false
      };
    }

    const text = evidence[0].extractedText.toLowerCase();
    let checklistMappingsCreated = 0;
    let regulatoryMappingsCreated = 0;

    const items = await db.select()
      .from(checklistItems)
      .limit(200);

    for (const item of items) {
      if (item.regulatoryReference && text.includes(item.regulatoryReference.toLowerCase())) {
        try {
          await this.mapEvidenceToChecklistItem(evidenceId, item.id, {
            mappingSource: 'auto_matched',
            relevance: 'supporting',
            confidence: 0.7,
            notes: `Auto-matched by regulatory reference: ${item.regulatoryReference}`
          });
          checklistMappingsCreated++;
        } catch (error) {
        }
      }
    }

    const frameworks = await db.select()
      .from(regulatoryFrameworks)
      .limit(20);

    for (const framework of frameworks) {
      const refs = this.extractRegulatoryReferences(text, framework.frameworkCode);
      for (const ref of refs) {
        try {
          await this.mapEvidenceToRegulation(
            evidenceId,
            framework.id,
            ref,
            'direct_compliance'
          );
          regulatoryMappingsCreated++;
        } catch (error) {
        }
      }
    }

    return {
      evidenceId,
      checklistMappingsCreated,
      regulatoryMappingsCreated,
      blockchainVerified: evidence[0].verificationStatus === 'verified'
    };
  }

  private extractRegulatoryReferences(text: string, frameworkCode: string): string[] {
    const refs: string[] = [];
    
    if (frameworkCode.startsWith('14-CFR-')) {
      const part = frameworkCode.replace('14-CFR-', '');
      const regex = new RegExp(`${part}\\.\\d+(?:\\([a-z]\\))?`, 'gi');
      const matches = text.match(regex) || [];
      refs.push(...matches);
    }

    return [...new Set(refs)];
  }

  async getEvidenceById(evidenceId: string): Promise<EvidenceSearchResult | null> {
    const evidence = await db.select()
      .from(evidenceRecords)
      .where(eq(evidenceRecords.id, evidenceId))
      .limit(1);

    if (!evidence[0]) return null;

    const checklistMappings = await this.getChecklistMappingsForEvidence(evidenceId);
    const regulatoryMappings = await this.getRegulatoryMappingsForEvidence(evidenceId);

    return {
      evidence: evidence[0],
      checklistMappings,
      regulatoryMappings,
      blockchainVerification: {
        verified: evidence[0].verificationStatus === 'verified',
        hash: evidence[0].blockchainVerificationHash,
        trainingRecordId: evidence[0].blockchainTrainingRecordId
      }
    };
  }
}

export const evidenceIndexingService = new EvidenceIndexingService();
