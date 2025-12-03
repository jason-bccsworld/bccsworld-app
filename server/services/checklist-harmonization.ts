import { db } from "../db";
import { 
  checklistSchemas, 
  checklistItems,
  checklistMappings,
  harmonizationDeltas,
  InsertChecklistSchema,
  InsertChecklistItem,
  InsertChecklistMapping,
  InsertHarmonizationDelta,
  ChecklistSchema,
  ChecklistItem,
  HarmonizationDelta
} from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import { createHash } from "crypto";

export interface ChecklistDelta {
  type: 'added' | 'removed' | 'modified' | 'reordered';
  baseItemNumber: string | null;
  comparedItemNumber: string | null;
  description: string;
  complianceImpact: 'none' | 'minor' | 'major' | 'critical';
}

export interface HarmonizationReport {
  baseSchema: ChecklistSchema;
  comparedSchema: ChecklistSchema;
  totalBaseItems: number;
  totalComparedItems: number;
  addedItems: number;
  removedItems: number;
  modifiedItems: number;
  reorderedItems: number;
  deltas: ChecklistDelta[];
  coveragePercentage: number;
}

export class ChecklistHarmonizationEngine {
  
  async ingestChecklist(
    schemaName: string,
    schemaSource: 'faa_official' | 'tcpm_custom' | 'regional' | 'operator',
    items: Array<{
      itemNumber: string;
      itemOrder: number;
      categoryId?: string;
      categoryName?: string;
      description: string;
      regulatoryReference?: string;
      requiredEvidence?: any;
      complianceCriteria?: any;
      riskWeight?: number;
    }>,
    frameworkId?: string,
    version: string = "1.0",
    isCanonical: boolean = false
  ): Promise<ChecklistSchema> {
    const structureHash = this.generateStructureHash(items);
    
    const schemaData: InsertChecklistSchema = {
      schemaName,
      schemaSource,
      frameworkId: frameworkId || null,
      version,
      effectiveDate: new Date(),
      totalItems: items.length,
      structureHash,
      metadata: {
        source: schemaSource,
        itemCategories: [...new Set(items.map(i => i.categoryName).filter(Boolean))]
      },
      isCanonical
    };

    const [insertedSchema] = await db.insert(checklistSchemas)
      .values(schemaData)
      .returning();

    for (const item of items) {
      const itemData: InsertChecklistItem = {
        schemaId: insertedSchema.id,
        itemNumber: item.itemNumber,
        itemOrder: item.itemOrder,
        categoryId: item.categoryId || null,
        categoryName: item.categoryName || null,
        description: item.description,
        regulatoryReference: item.regulatoryReference || null,
        requiredEvidence: item.requiredEvidence || null,
        complianceCriteria: item.complianceCriteria || null,
        riskWeight: item.riskWeight?.toString() || "1.00",
        isActive: true
      };

      await db.insert(checklistItems).values(itemData);
    }

    console.log(`Ingested checklist: ${schemaName} with ${items.length} items`);
    return insertedSchema;
  }

  private generateStructureHash(items: any[]): string {
    const content = items.map(i => `${i.itemNumber}:${i.description}`).join('|');
    return createHash('sha256').update(content).digest('hex').substring(0, 32);
  }

  async harmonizeChecklists(
    baseSchemaId: string,
    comparedSchemaId: string
  ): Promise<HarmonizationReport> {
    const baseSchema = await db.select()
      .from(checklistSchemas)
      .where(eq(checklistSchemas.id, baseSchemaId))
      .limit(1);

    const comparedSchema = await db.select()
      .from(checklistSchemas)
      .where(eq(checklistSchemas.id, comparedSchemaId))
      .limit(1);

    if (!baseSchema[0] || !comparedSchema[0]) {
      throw new Error("One or both schemas not found");
    }

    const baseItems = await db.select()
      .from(checklistItems)
      .where(eq(checklistItems.schemaId, baseSchemaId));

    const comparedItems = await db.select()
      .from(checklistItems)
      .where(eq(checklistItems.schemaId, comparedSchemaId));

    const deltas = this.generateDeltas(baseItems, comparedItems);

    for (const delta of deltas) {
      const deltaData: InsertHarmonizationDelta = {
        baseSchemaId,
        comparedSchemaId,
        deltaType: delta.type,
        baseItemNumber: delta.baseItemNumber,
        comparedItemNumber: delta.comparedItemNumber,
        changeDescription: delta.description,
        complianceImpact: delta.complianceImpact
      };

      await db.insert(harmonizationDeltas).values(deltaData);
    }

    const addedCount = deltas.filter(d => d.type === 'added').length;
    const removedCount = deltas.filter(d => d.type === 'removed').length;
    const modifiedCount = deltas.filter(d => d.type === 'modified').length;
    const reorderedCount = deltas.filter(d => d.type === 'reordered').length;

    const matchedItems = comparedItems.length - addedCount;
    const coveragePercentage = baseItems.length > 0 
      ? (matchedItems / baseItems.length) * 100 
      : 0;

    return {
      baseSchema: baseSchema[0],
      comparedSchema: comparedSchema[0],
      totalBaseItems: baseItems.length,
      totalComparedItems: comparedItems.length,
      addedItems: addedCount,
      removedItems: removedCount,
      modifiedItems: modifiedCount,
      reorderedItems: reorderedCount,
      deltas,
      coveragePercentage
    };
  }

  private generateDeltas(
    baseItems: ChecklistItem[],
    comparedItems: ChecklistItem[]
  ): ChecklistDelta[] {
    const deltas: ChecklistDelta[] = [];
    const baseMap = new Map(baseItems.map(i => [i.itemNumber, i]));
    const comparedMap = new Map(comparedItems.map(i => [i.itemNumber, i]));

    for (const [itemNumber, comparedItem] of comparedMap) {
      if (!baseMap.has(itemNumber)) {
        deltas.push({
          type: 'added',
          baseItemNumber: null,
          comparedItemNumber: itemNumber,
          description: `New item added: ${comparedItem.description.substring(0, 100)}...`,
          complianceImpact: 'minor'
        });
      }
    }

    for (const [itemNumber, baseItem] of baseMap) {
      if (!comparedMap.has(itemNumber)) {
        deltas.push({
          type: 'removed',
          baseItemNumber: itemNumber,
          comparedItemNumber: null,
          description: `Item removed: ${baseItem.description.substring(0, 100)}...`,
          complianceImpact: 'major'
        });
      } else {
        const comparedItem = comparedMap.get(itemNumber)!;
        
        if (baseItem.description !== comparedItem.description) {
          deltas.push({
            type: 'modified',
            baseItemNumber: itemNumber,
            comparedItemNumber: itemNumber,
            description: `Item description modified`,
            complianceImpact: 'minor'
          });
        }

        if (baseItem.itemOrder !== comparedItem.itemOrder) {
          deltas.push({
            type: 'reordered',
            baseItemNumber: itemNumber,
            comparedItemNumber: itemNumber,
            description: `Item order changed from ${baseItem.itemOrder} to ${comparedItem.itemOrder}`,
            complianceImpact: 'none'
          });
        }
      }
    }

    return deltas;
  }

  async createCrossSchemaMapping(
    sourceSchemaId: string,
    targetSchemaId: string,
    mappings: Array<{
      sourceItemId: string;
      targetItemId: string | null;
      mappingType: 'exact' | 'partial' | 'expanded' | 'missing';
      confidence?: number;
      notes?: string;
    }>
  ): Promise<void> {
    for (const mapping of mappings) {
      const mappingData: InsertChecklistMapping = {
        sourceSchemaId,
        targetSchemaId,
        sourceItemId: mapping.sourceItemId,
        targetItemId: mapping.targetItemId,
        mappingType: mapping.mappingType,
        mappingConfidence: mapping.confidence?.toString() || "1.00",
        mappingNotes: mapping.notes || null
      };

      await db.insert(checklistMappings).values(mappingData);
    }
  }

  async getHarmonizationDeltas(
    baseSchemaId: string,
    comparedSchemaId: string
  ): Promise<HarmonizationDelta[]> {
    return db.select()
      .from(harmonizationDeltas)
      .where(and(
        eq(harmonizationDeltas.baseSchemaId, baseSchemaId),
        eq(harmonizationDeltas.comparedSchemaId, comparedSchemaId)
      ));
  }

  async getCanonicalChecklist(frameworkId?: string): Promise<ChecklistSchema | null> {
    const query = frameworkId
      ? and(
          eq(checklistSchemas.isCanonical, true),
          eq(checklistSchemas.frameworkId, frameworkId)
        )
      : eq(checklistSchemas.isCanonical, true);

    const result = await db.select()
      .from(checklistSchemas)
      .where(query)
      .limit(1);

    return result[0] || null;
  }

  async getAllSchemas(): Promise<ChecklistSchema[]> {
    return db.select().from(checklistSchemas);
  }

  async getSchemaItems(schemaId: string): Promise<ChecklistItem[]> {
    return db.select()
      .from(checklistItems)
      .where(eq(checklistItems.schemaId, schemaId));
  }

  async normalizeExternalChecklist(
    externalItems: Array<{
      number: string;
      question: string;
      reference?: string;
      category?: string;
    }>,
    sourceType: string
  ): Promise<Array<{
    itemNumber: string;
    itemOrder: number;
    categoryName: string;
    description: string;
    regulatoryReference: string | null;
  }>> {
    return externalItems.map((item, index) => ({
      itemNumber: item.number || `${index + 1}`,
      itemOrder: index + 1,
      categoryName: item.category || 'General',
      description: item.question,
      regulatoryReference: item.reference || null
    }));
  }

  async generateDeltaReport(
    baseSchemaId: string,
    comparedSchemaId: string
  ): Promise<{
    summary: string;
    addedItems: string[];
    removedItems: string[];
    modifiedItems: string[];
    reorderedItems: string[];
    criticalChanges: string[];
  }> {
    const deltas = await this.getHarmonizationDeltas(baseSchemaId, comparedSchemaId);

    const addedItems = deltas
      .filter(d => d.deltaType === 'added')
      .map(d => `[${d.comparedItemNumber}] ${d.changeDescription}`);
    
    const removedItems = deltas
      .filter(d => d.deltaType === 'removed')
      .map(d => `[${d.baseItemNumber}] ${d.changeDescription}`);
    
    const modifiedItems = deltas
      .filter(d => d.deltaType === 'modified')
      .map(d => `[${d.baseItemNumber}] ${d.changeDescription}`);
    
    const reorderedItems = deltas
      .filter(d => d.deltaType === 'reordered')
      .map(d => `[${d.baseItemNumber}] ${d.changeDescription}`);
    
    const criticalChanges = deltas
      .filter(d => d.complianceImpact === 'critical' || d.complianceImpact === 'major')
      .map(d => `[${d.deltaType.toUpperCase()}] ${d.changeDescription}`);

    const summary = `
Checklist Harmonization Delta Report
=====================================
Added Items: ${addedItems.length}
Removed Items: ${removedItems.length}
Modified Items: ${modifiedItems.length}
Reordered Items: ${reorderedItems.length}
Critical/Major Changes: ${criticalChanges.length}
    `.trim();

    return {
      summary,
      addedItems,
      removedItems,
      modifiedItems,
      reorderedItems,
      criticalChanges
    };
  }
}

export const checklistHarmonizationEngine = new ChecklistHarmonizationEngine();
