import { db } from "../db";
import { 
  auditPackets, 
  auditPacketItems,
  regulatoryCoverageMatrix,
  checklistItems,
  checklistSchemas,
  evidenceRecords,
  evidenceChecklistMappings,
  trainingOrganizations,
  inspectorProfiles,
  InsertAuditPacket,
  InsertAuditPacketItem,
  InsertRegulatoryCoverageMatrix,
  AuditPacket,
  AuditPacketItem
} from "@shared/schema";
import { eq, and, inArray, sql, desc } from "drizzle-orm";
import { createHash } from "crypto";
import { evidenceIndexingService } from "./evidence-indexing";
import { inspectorPreferenceEngine } from "./inspector-preference";

export interface AuditPacketConfig {
  organizationId: string;
  checklistSchemaId: string;
  packetType: 'regulation_sorted' | 'checklist_sorted' | 'comprehensive';
  targetInspectorId?: string;
  generatedBy?: string;
}

export interface GeneratedPacket {
  packet: AuditPacket;
  items: AuditPacketItem[];
  summary: {
    totalItems: number;
    itemsWithEvidence: number;
    blockchainVerifiedCount: number;
    complianceScore: number;
    gapCount: number;
  };
}

export class AuditPacketGenerator {

  async generateAuditPacket(config: AuditPacketConfig): Promise<GeneratedPacket> {
    const schema = await db.select()
      .from(checklistSchemas)
      .where(eq(checklistSchemas.id, config.checklistSchemaId))
      .limit(1);

    if (!schema[0]) {
      throw new Error("Checklist schema not found");
    }

    let items = await db.select()
      .from(checklistItems)
      .where(eq(checklistItems.schemaId, config.checklistSchemaId));

    if (config.targetInspectorId) {
      items = await inspectorPreferenceEngine.adaptChecklistForInspector(
        items,
        config.targetInspectorId
      );
    }

    if (config.packetType === 'regulation_sorted') {
      items = this.sortByRegulation(items);
    }

    const packetItems: Array<{
      item: typeof items[0];
      evidenceIds: string[];
      blockchainVerified: boolean;
      complianceStatus: string;
    }> = [];

    let itemsWithEvidence = 0;
    let blockchainVerifiedCount = 0;

    for (const item of items) {
      const evidenceResults = await evidenceIndexingService.getEvidenceByChecklistItem(item.id);
      
      const evidenceIds = evidenceResults.map(e => e.evidence.id);
      const hasEvidence = evidenceIds.length > 0;
      const hasBlockchainVerification = evidenceResults.some(e => e.blockchainVerification.verified);

      if (hasEvidence) itemsWithEvidence++;
      if (hasBlockchainVerification) blockchainVerifiedCount++;

      let complianceStatus = 'pending';
      if (hasEvidence && hasBlockchainVerification) {
        complianceStatus = 'compliant';
      } else if (hasEvidence) {
        complianceStatus = 'partial';
      } else {
        complianceStatus = 'non_compliant';
      }

      packetItems.push({
        item,
        evidenceIds,
        blockchainVerified: hasBlockchainVerification,
        complianceStatus
      });
    }

    const complianceScore = items.length > 0 
      ? (itemsWithEvidence / items.length) * 100 
      : 0;

    const packetHash = createHash('sha256')
      .update(JSON.stringify(packetItems.map(p => ({
        itemId: p.item.id,
        evidenceIds: p.evidenceIds,
        status: p.complianceStatus
      }))))
      .digest('hex');

    const organization = await db.select()
      .from(trainingOrganizations)
      .where(eq(trainingOrganizations.id, config.organizationId))
      .limit(1);

    const orgName = organization[0]?.organizationName || 'Unknown Organization';
    const packetName = `Audit Packet - ${orgName} - ${schema[0].schemaName} - ${new Date().toISOString().split('T')[0]}`;

    const packetData: InsertAuditPacket = {
      organizationId: config.organizationId,
      packetName,
      packetType: config.packetType,
      targetInspectorId: config.targetInspectorId || null,
      checklistSchemaId: config.checklistSchemaId,
      generatedBy: config.generatedBy || 'system',
      totalItems: items.length,
      itemsWithEvidence,
      blockchainVerifiedCount,
      complianceScore: complianceScore.toFixed(2),
      packetHash,
      status: 'generated',
      metadata: {
        generatedAt: new Date().toISOString(),
        schemaVersion: schema[0].version,
        sortType: config.packetType
      }
    };

    const [insertedPacket] = await db.insert(auditPackets)
      .values(packetData)
      .returning();

    const insertedItems: AuditPacketItem[] = [];

    for (let i = 0; i < packetItems.length; i++) {
      const pi = packetItems[i];
      
      const itemData: InsertAuditPacketItem = {
        packetId: insertedPacket.id,
        checklistItemId: pi.item.id,
        itemOrder: i + 1,
        regulatorySection: pi.item.regulatoryReference || null,
        evidenceIds: pi.evidenceIds.length > 0 ? pi.evidenceIds : null,
        complianceStatus: pi.complianceStatus,
        blockchainVerified: pi.blockchainVerified,
        verificationDetails: pi.blockchainVerified ? {
          verifiedAt: new Date().toISOString(),
          evidenceCount: pi.evidenceIds.length
        } : null
      };

      const [insertedItem] = await db.insert(auditPacketItems)
        .values(itemData)
        .returning();

      insertedItems.push(insertedItem);
    }

    return {
      packet: insertedPacket,
      items: insertedItems,
      summary: {
        totalItems: items.length,
        itemsWithEvidence,
        blockchainVerifiedCount,
        complianceScore,
        gapCount: items.length - itemsWithEvidence
      }
    };
  }

  private sortByRegulation(items: any[]): any[] {
    return [...items].sort((a, b) => {
      const refA = a.regulatoryReference || 'zzz';
      const refB = b.regulatoryReference || 'zzz';
      return refA.localeCompare(refB, undefined, { numeric: true });
    });
  }

  async getPacketById(packetId: string): Promise<GeneratedPacket | null> {
    const packet = await db.select()
      .from(auditPackets)
      .where(eq(auditPackets.id, packetId))
      .limit(1);

    if (!packet[0]) return null;

    const items = await db.select()
      .from(auditPacketItems)
      .where(eq(auditPacketItems.packetId, packetId));

    const blockchainVerifiedCount = items.filter(i => i.blockchainVerified).length;
    const itemsWithEvidence = items.filter(i => i.evidenceIds && i.evidenceIds.length > 0).length;

    return {
      packet: packet[0],
      items,
      summary: {
        totalItems: items.length,
        itemsWithEvidence,
        blockchainVerifiedCount,
        complianceScore: Number(packet[0].complianceScore),
        gapCount: items.length - itemsWithEvidence
      }
    };
  }

  async getPacketsForOrganization(organizationId: string): Promise<AuditPacket[]> {
    return db.select()
      .from(auditPackets)
      .where(eq(auditPackets.organizationId, organizationId))
      .orderBy(desc(auditPackets.generatedAt));
  }

  async calculateRegulatoryCoverage(
    organizationId: string,
    frameworkId: string
  ): Promise<{
    totalRequirements: number;
    evidencedRequirements: number;
    blockchainVerifiedRequirements: number;
    coveragePercentage: number;
    gaps: string[];
  }> {
    const items = await db.select()
      .from(checklistItems)
      .limit(200);

    let evidencedCount = 0;
    let blockchainVerifiedCount = 0;
    const gaps: string[] = [];

    for (const item of items) {
      const evidence = await evidenceIndexingService.getEvidenceByChecklistItem(item.id);
      
      if (evidence.length > 0) {
        evidencedCount++;
        if (evidence.some(e => e.blockchainVerification.verified)) {
          blockchainVerifiedCount++;
        }
      } else {
        gaps.push(`[${item.itemNumber}] ${item.description.substring(0, 100)}...`);
      }
    }

    const coveragePercentage = items.length > 0 
      ? (evidencedCount / items.length) * 100 
      : 0;

    const matrixData: InsertRegulatoryCoverageMatrix = {
      organizationId,
      frameworkId,
      totalRequirements: items.length,
      evidencedRequirements: evidencedCount,
      blockchainVerifiedRequirements: blockchainVerifiedCount,
      coveragePercentage: coveragePercentage.toFixed(2),
      gapAnalysis: { gaps: gaps.slice(0, 20) }
    };

    await db.insert(regulatoryCoverageMatrix)
      .values(matrixData)
      .onConflictDoNothing();

    return {
      totalRequirements: items.length,
      evidencedRequirements: evidencedCount,
      blockchainVerifiedRequirements: blockchainVerifiedCount,
      coveragePercentage,
      gaps
    };
  }

  async generatePacketJSON(packetId: string): Promise<object> {
    const result = await this.getPacketById(packetId);
    if (!result) throw new Error("Packet not found");

    const itemDetails = await Promise.all(
      result.items.map(async (item) => {
        const checklistItem = await db.select()
          .from(checklistItems)
          .where(eq(checklistItems.id, item.checklistItemId))
          .limit(1);

        let evidenceDetails: any[] = [];
        if (item.evidenceIds && item.evidenceIds.length > 0) {
          const evidence = await db.select()
            .from(evidenceRecords)
            .where(inArray(evidenceRecords.id, item.evidenceIds));
          
          evidenceDetails = evidence.map(e => ({
            id: e.id,
            title: e.evidenceTitle,
            type: e.evidenceType,
            blockchainVerified: e.verificationStatus === 'verified',
            verificationHash: e.blockchainVerificationHash
          }));
        }

        return {
          order: item.itemOrder,
          itemNumber: checklistItem[0]?.itemNumber,
          description: checklistItem[0]?.description,
          regulatoryReference: checklistItem[0]?.regulatoryReference,
          complianceStatus: item.complianceStatus,
          blockchainVerified: item.blockchainVerified,
          evidence: evidenceDetails
        };
      })
    );

    return {
      packetId: result.packet.id,
      packetName: result.packet.packetName,
      packetType: result.packet.packetType,
      generatedAt: result.packet.generatedAt,
      summary: result.summary,
      items: itemDetails,
      blockchainIntegrity: {
        verifiedItems: result.summary.blockchainVerifiedCount,
        totalItems: result.summary.totalItems,
        integrityScore: result.summary.totalItems > 0 
          ? ((result.summary.blockchainVerifiedCount / result.summary.totalItems) * 100).toFixed(1)
          : 0
      }
    };
  }

  async updatePacketStatus(
    packetId: string,
    status: 'generated' | 'reviewed' | 'submitted'
  ): Promise<void> {
    await db.update(auditPackets)
      .set({ status })
      .where(eq(auditPackets.id, packetId));
  }
}

export const auditPacketGenerator = new AuditPacketGenerator();
