import { db } from "../db";
import { 
  inspectorProfiles, 
  inspectorBehaviors,
  checklistSchemas,
  checklistItems,
  InsertInspectorProfile,
  InsertInspectorBehavior,
  InspectorProfile,
  InspectorBehavior
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export interface InspectorPrediction {
  inspectorId: string;
  predictedChecklist: string | null;
  predictedOrdering: string[];
  likelyExtraQuestions: string[];
  focusAreas: string[];
  expectedDuration: number;
  strictnessLevel: 'lenient' | 'moderate' | 'strict';
  confidence: number;
}

export interface AuditPreparationStrategy {
  prioritizedItems: string[];
  focusAreas: string[];
  additionalDocumentsNeeded: string[];
  riskAreas: string[];
  recommendedPreparation: string[];
}

export class InspectorPreferenceEngine {

  async createInspectorProfile(
    inspectorData: {
      inspectorName?: string;
      inspectorId?: string;
      region?: string;
      office?: string;
    }
  ): Promise<InspectorProfile> {
    const profileData: InsertInspectorProfile = {
      inspectorName: inspectorData.inspectorName || null,
      inspectorId: inspectorData.inspectorId || null,
      region: inspectorData.region || null,
      office: inspectorData.office || null,
      totalAuditsTracked: 0,
      isActive: true
    };

    const [result] = await db.insert(inspectorProfiles)
      .values(profileData)
      .returning();

    return result;
  }

  async recordAuditBehavior(
    inspectorProfileId: string,
    organizationId: string,
    behaviorData: {
      auditDate: Date;
      checklistSchemaUsed?: string;
      itemsReordered?: string[];
      additionalQuestions?: string[];
      skippedItems?: string[];
      emphasisAreas?: string[];
      findingsCount?: number;
      auditOutcome?: 'passed' | 'conditional' | 'failed';
      auditDuration?: number;
      notes?: string;
    }
  ): Promise<InspectorBehavior> {
    const behavior: InsertInspectorBehavior = {
      inspectorId: inspectorProfileId,
      organizationId,
      auditDate: behaviorData.auditDate,
      checklistSchemaUsed: behaviorData.checklistSchemaUsed || null,
      itemsReordered: behaviorData.itemsReordered || null,
      additionalQuestions: behaviorData.additionalQuestions || null,
      skippedItems: behaviorData.skippedItems || null,
      emphasisAreas: behaviorData.emphasisAreas || null,
      findingsCount: behaviorData.findingsCount || null,
      auditOutcome: behaviorData.auditOutcome || null,
      auditDuration: behaviorData.auditDuration || null,
      notes: behaviorData.notes || null
    };

    const [result] = await db.insert(inspectorBehaviors)
      .values(behavior)
      .returning();

    await this.updateInspectorMetrics(inspectorProfileId);

    return result;
  }

  private async updateInspectorMetrics(inspectorProfileId: string): Promise<void> {
    const behaviors = await db.select()
      .from(inspectorBehaviors)
      .where(eq(inspectorBehaviors.inspectorId, inspectorProfileId));

    if (behaviors.length === 0) return;

    const allExtraQuestions: string[] = [];
    const allFocusAreas: string[] = [];
    const allOrderings: string[][] = [];
    let totalDuration = 0;
    let durationCount = 0;
    let strictnessSum = 0;

    for (const behavior of behaviors) {
      if (behavior.additionalQuestions) {
        allExtraQuestions.push(...(behavior.additionalQuestions as string[]));
      }
      if (behavior.emphasisAreas) {
        allFocusAreas.push(...(behavior.emphasisAreas as string[]));
      }
      if (behavior.itemsReordered) {
        allOrderings.push(behavior.itemsReordered as string[]);
      }
      if (behavior.auditDuration) {
        totalDuration += behavior.auditDuration;
        durationCount++;
      }
      if (behavior.findingsCount !== null) {
        strictnessSum += behavior.findingsCount;
      }
    }

    const commonQuestions = this.findMostCommon(allExtraQuestions, 5);
    const commonFocusAreas = this.findMostCommon(allFocusAreas, 5);
    const averageDuration = durationCount > 0 ? Math.round(totalDuration / durationCount) : null;
    const avgFindings = behaviors.length > 0 ? strictnessSum / behaviors.length : 0;
    const strictnessScore = Math.min(1, avgFindings / 10);

    const confidence = Math.min(0.95, 0.3 + (behaviors.length * 0.1));

    await db.update(inspectorProfiles)
      .set({
        commonExtraQuestions: commonQuestions,
        focusAreas: commonFocusAreas,
        preferredItemOrdering: allOrderings.length > 0 ? allOrderings[allOrderings.length - 1] : null,
        averageAuditDuration: averageDuration,
        strictnessScore: strictnessScore.toFixed(2),
        totalAuditsTracked: behaviors.length,
        predictionConfidence: confidence.toFixed(2),
        lastAuditDate: behaviors[behaviors.length - 1].auditDate,
        updatedAt: new Date()
      })
      .where(eq(inspectorProfiles.id, inspectorProfileId));
  }

  private findMostCommon(items: string[], limit: number): string[] {
    const counts = new Map<string, number>();
    for (const item of items) {
      counts.set(item, (counts.get(item) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([item]) => item);
  }

  async predictInspectorBehavior(inspectorProfileId: string): Promise<InspectorPrediction> {
    const profile = await db.select()
      .from(inspectorProfiles)
      .where(eq(inspectorProfiles.id, inspectorProfileId))
      .limit(1);

    if (!profile[0]) {
      throw new Error("Inspector profile not found");
    }

    const inspector = profile[0];

    const strictnessLevel: 'lenient' | 'moderate' | 'strict' = 
      Number(inspector.strictnessScore) < 0.3 ? 'lenient' :
      Number(inspector.strictnessScore) < 0.7 ? 'moderate' : 'strict';

    return {
      inspectorId: inspectorProfileId,
      predictedChecklist: inspector.preferredChecklistId,
      predictedOrdering: (inspector.preferredItemOrdering as string[]) || [],
      likelyExtraQuestions: (inspector.commonExtraQuestions as string[]) || [],
      focusAreas: (inspector.focusAreas as string[]) || [],
      expectedDuration: inspector.averageAuditDuration || 240,
      strictnessLevel,
      confidence: Number(inspector.predictionConfidence) || 0.5
    };
  }

  async generateAuditPreparationStrategy(
    inspectorProfileId: string,
    organizationId: string
  ): Promise<AuditPreparationStrategy> {
    const prediction = await this.predictInspectorBehavior(inspectorProfileId);

    const prioritizedItems: string[] = [];
    const focusAreas = prediction.focusAreas;
    const additionalDocumentsNeeded: string[] = [];
    const riskAreas: string[] = [];
    const recommendedPreparation: string[] = [];

    for (const area of focusAreas) {
      riskAreas.push(`${area} - Inspector typically focuses on this area`);
    }

    if (prediction.likelyExtraQuestions.length > 0) {
      recommendedPreparation.push(
        `Prepare responses for likely additional questions: ${prediction.likelyExtraQuestions.slice(0, 3).join(', ')}`
      );
    }

    if (prediction.strictnessLevel === 'strict') {
      recommendedPreparation.push("Inspector is typically thorough - ensure all documentation is complete");
      recommendedPreparation.push("Allocate extra time for detailed explanations");
    }

    if (prediction.expectedDuration > 300) {
      recommendedPreparation.push(`Plan for extended audit duration (~${Math.round(prediction.expectedDuration / 60)} hours)`);
    }

    if (prediction.predictedOrdering.length > 0) {
      prioritizedItems.push(...prediction.predictedOrdering.slice(0, 10));
    }

    for (const area of focusAreas) {
      additionalDocumentsNeeded.push(`Supporting evidence for ${area}`);
    }

    return {
      prioritizedItems,
      focusAreas,
      additionalDocumentsNeeded,
      riskAreas,
      recommendedPreparation
    };
  }

  async getInspectorProfile(inspectorProfileId: string): Promise<InspectorProfile | null> {
    const result = await db.select()
      .from(inspectorProfiles)
      .where(eq(inspectorProfiles.id, inspectorProfileId))
      .limit(1);

    return result[0] || null;
  }

  async findInspectorByIdentifier(inspectorId: string): Promise<InspectorProfile | null> {
    const result = await db.select()
      .from(inspectorProfiles)
      .where(eq(inspectorProfiles.inspectorId, inspectorId))
      .limit(1);

    return result[0] || null;
  }

  async getInspectorsByRegion(region: string): Promise<InspectorProfile[]> {
    return db.select()
      .from(inspectorProfiles)
      .where(and(
        eq(inspectorProfiles.region, region),
        eq(inspectorProfiles.isActive, true)
      ));
  }

  async getAllInspectors(): Promise<InspectorProfile[]> {
    return db.select()
      .from(inspectorProfiles)
      .where(eq(inspectorProfiles.isActive, true));
  }

  async getInspectorAuditHistory(inspectorProfileId: string): Promise<InspectorBehavior[]> {
    return db.select()
      .from(inspectorBehaviors)
      .where(eq(inspectorBehaviors.inspectorId, inspectorProfileId))
      .orderBy(desc(inspectorBehaviors.auditDate));
  }

  async adaptChecklistForInspector(
    checklistItems: any[],
    inspectorProfileId: string
  ): Promise<any[]> {
    const prediction = await this.predictInspectorBehavior(inspectorProfileId);

    if (prediction.predictedOrdering.length === 0) {
      return checklistItems;
    }

    const reorderedItems = [...checklistItems];
    const orderMap = new Map(prediction.predictedOrdering.map((id, idx) => [id, idx]));

    reorderedItems.sort((a, b) => {
      const orderA = orderMap.get(a.id) ?? 999;
      const orderB = orderMap.get(b.id) ?? 999;
      return orderA - orderB;
    });

    for (const area of prediction.focusAreas) {
      const focusItems = reorderedItems.filter(item => 
        item.categoryName?.toLowerCase().includes(area.toLowerCase())
      );
      for (const item of focusItems) {
        item.inspectorFocusArea = true;
        item.focusReason = `Inspector typically emphasizes ${area}`;
      }
    }

    return reorderedItems;
  }
}

export const inspectorPreferenceEngine = new InspectorPreferenceEngine();
