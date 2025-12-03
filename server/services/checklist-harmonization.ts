import { db } from "../db";
import { 
  checklistSchemas, 
  checklistItems,
  checklistMappings,
  harmonizationDeltas,
  checklistVersionHistory,
  faaCoreForms,
  evidenceChecklistMappings,
  evidenceRecords,
  InsertChecklistSchema,
  InsertChecklistItem,
  InsertChecklistMapping,
  InsertHarmonizationDelta,
  ChecklistSchema,
  ChecklistItem,
  HarmonizationDelta
} from "@shared/schema";
import { eq, and, desc, asc, isNull, or } from "drizzle-orm";
import { createHash } from "crypto";

export type ChecklistSource = 
  | 'faa_standard' 
  | 'certificate_job_aid' 
  | 'inspector_supplemental' 
  | 'operator_required' 
  | 'archived_legacy';

export const CHECKLIST_PRIORITY_MAP: Record<ChecklistSource, number> = {
  'faa_standard': 1,
  'certificate_job_aid': 2,
  'inspector_supplemental': 3,
  'operator_required': 4,
  'archived_legacy': 5
};

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

export interface CoreChecklistDefinition {
  farPart: string;
  formNumber: string;
  formTitle: string;
  formType: string;
  version: string;
  sourceUrl: string;
  relatedOrderVolume: string;
  items: Array<{
    itemNumber: string;
    itemOrder: number;
    categoryName: string;
    description: string;
    regulatoryReference: string;
  }>;
}

const FAA_CORE_CHECKLISTS: Record<string, CoreChecklistDefinition> = {
  '14-CFR-142': {
    farPart: '142',
    formNumber: '8900.1-VOL3-CH19',
    formTitle: 'Part 142 Training Center Certification Checklist',
    formType: 'audit_checklist',
    version: '2024-01',
    sourceUrl: 'https://fsims.faa.gov/PICDetail.aspx?docId=8900.1,Vol.3,Ch19',
    relatedOrderVolume: '8900.1 Vol 3',
    items: [
      { itemNumber: '142.1', itemOrder: 1, categoryName: 'Applicability', description: 'Verify training center meets applicability requirements under 14 CFR 142.1', regulatoryReference: '14 CFR 142.1' },
      { itemNumber: '142.3', itemOrder: 2, categoryName: 'Definitions', description: 'Confirm understanding of definitions for training center, courseware, and FSTD', regulatoryReference: '14 CFR 142.3' },
      { itemNumber: '142.11(a)', itemOrder: 3, categoryName: 'Application', description: 'Application submitted on FAA-approved form with required documents', regulatoryReference: '14 CFR 142.11(a)' },
      { itemNumber: '142.11(b)', itemOrder: 4, categoryName: 'Application', description: 'Training specifications include all required curriculum information', regulatoryReference: '14 CFR 142.11(b)' },
      { itemNumber: '142.13', itemOrder: 5, categoryName: 'Management', description: 'Management personnel meet qualification requirements', regulatoryReference: '14 CFR 142.13' },
      { itemNumber: '142.14', itemOrder: 6, categoryName: 'Employment', description: 'Employment of former FAA employees complies with restrictions', regulatoryReference: '14 CFR 142.14' },
      { itemNumber: '142.15', itemOrder: 7, categoryName: 'Facilities', description: 'Training facilities meet environmental and equipment requirements', regulatoryReference: '14 CFR 142.15' },
      { itemNumber: '142.17', itemOrder: 8, categoryName: 'Duration', description: 'Certificate duration and renewal requirements understood', regulatoryReference: '14 CFR 142.17' },
      { itemNumber: '142.21', itemOrder: 9, categoryName: 'Advertising', description: 'Advertising limitations for FAA approval references met', regulatoryReference: '14 CFR 142.21' },
      { itemNumber: '142.27', itemOrder: 10, categoryName: 'Records', description: 'Training record retention and transfer procedures established', regulatoryReference: '14 CFR 142.27' },
      { itemNumber: '142.31', itemOrder: 11, categoryName: 'Privileges', description: 'Training center privileges and limitations documented', regulatoryReference: '14 CFR 142.31' },
      { itemNumber: '142.33', itemOrder: 12, categoryName: 'Personnel', description: 'Training center personnel qualifications verified', regulatoryReference: '14 CFR 142.33' },
      { itemNumber: '142.35', itemOrder: 13, categoryName: 'Instructors', description: 'Knowledge and skills testing for instructors completed', regulatoryReference: '14 CFR 142.35' },
      { itemNumber: '142.37', itemOrder: 14, categoryName: 'Approval', description: 'Approval of curriculum/training program obtained', regulatoryReference: '14 CFR 142.37' },
      { itemNumber: '142.45', itemOrder: 15, categoryName: 'FSTD', description: 'FSTD qualification and approval requirements met', regulatoryReference: '14 CFR 142.45' },
      { itemNumber: '142.47', itemOrder: 16, categoryName: 'Courseware', description: 'Courseware approval and validation completed', regulatoryReference: '14 CFR 142.47' },
      { itemNumber: '142.53', itemOrder: 17, categoryName: 'Training', description: 'Training syllabus approved and current', regulatoryReference: '14 CFR 142.53' },
      { itemNumber: '142.54', itemOrder: 18, categoryName: 'LOA', description: 'Letter of Authorization requirements for special operations met', regulatoryReference: '14 CFR 142.54' },
      { itemNumber: '142.55', itemOrder: 19, categoryName: 'Enrollment', description: 'Training agreements with Part 121/135 operators documented', regulatoryReference: '14 CFR 142.55' },
      { itemNumber: '142.57', itemOrder: 20, categoryName: 'Quality', description: 'Quality assurance system implemented and documented', regulatoryReference: '14 CFR 142.57' }
    ]
  },
  '14-CFR-141': {
    farPart: '141',
    formNumber: '8900.1-VOL3-CH18',
    formTitle: 'Part 141 Pilot School Certification Checklist',
    formType: 'audit_checklist',
    version: '2024-01',
    sourceUrl: 'https://fsims.faa.gov/PICDetail.aspx?docId=8900.1,Vol.3,Ch18',
    relatedOrderVolume: '8900.1 Vol 3',
    items: [
      { itemNumber: '141.1', itemOrder: 1, categoryName: 'Applicability', description: 'Verify pilot school meets Part 141 applicability requirements', regulatoryReference: '14 CFR 141.1' },
      { itemNumber: '141.5', itemOrder: 2, categoryName: 'Certificate', description: 'Requirements for issuance of certificate verified', regulatoryReference: '14 CFR 141.5' },
      { itemNumber: '141.11', itemOrder: 3, categoryName: 'Staffing', description: 'Chief instructor and assistant chief instructor qualifications verified', regulatoryReference: '14 CFR 141.11' },
      { itemNumber: '141.21', itemOrder: 4, categoryName: 'Location', description: 'Principal business office location requirements met', regulatoryReference: '14 CFR 141.21' },
      { itemNumber: '141.23', itemOrder: 5, categoryName: 'Airports', description: 'Airport and facilities meet requirements', regulatoryReference: '14 CFR 141.23' },
      { itemNumber: '141.25', itemOrder: 6, categoryName: 'Equipment', description: 'Aircraft and training equipment meet requirements', regulatoryReference: '14 CFR 141.25' },
      { itemNumber: '141.27', itemOrder: 7, categoryName: 'Curriculum', description: 'Training program and curriculum approved', regulatoryReference: '14 CFR 141.27' },
      { itemNumber: '141.31', itemOrder: 8, categoryName: 'Quality', description: 'Quality system established and maintained', regulatoryReference: '14 CFR 141.31' },
      { itemNumber: '141.33', itemOrder: 9, categoryName: 'Chief', description: 'Chief instructor requirements verified', regulatoryReference: '14 CFR 141.33' },
      { itemNumber: '141.35', itemOrder: 10, categoryName: 'Assistant', description: 'Assistant chief instructor requirements verified', regulatoryReference: '14 CFR 141.35' },
      { itemNumber: '141.36', itemOrder: 11, categoryName: 'Check', description: 'Check instructor requirements verified', regulatoryReference: '14 CFR 141.36' },
      { itemNumber: '141.37', itemOrder: 12, categoryName: 'Instructors', description: 'Flight instructor requirements verified', regulatoryReference: '14 CFR 141.37' },
      { itemNumber: '141.41', itemOrder: 13, categoryName: 'Ground', description: 'Ground instructor requirements verified', regulatoryReference: '14 CFR 141.41' },
      { itemNumber: '141.53', itemOrder: 14, categoryName: 'Ratings', description: 'Pilot school ratings meet requirements', regulatoryReference: '14 CFR 141.53' },
      { itemNumber: '141.55', itemOrder: 15, categoryName: 'TCO', description: 'Training course outline requirements met', regulatoryReference: '14 CFR 141.55' }
    ]
  },
  '14-CFR-145': {
    farPart: '145',
    formNumber: '8900.1-VOL2-CH8',
    formTitle: 'Part 145 Repair Station Certification Checklist',
    formType: 'audit_checklist',
    version: '2024-01',
    sourceUrl: 'https://fsims.faa.gov/PICDetail.aspx?docId=8900.1,Vol.2,Ch8',
    relatedOrderVolume: '8900.1 Vol 2',
    items: [
      { itemNumber: '145.1', itemOrder: 1, categoryName: 'Applicability', description: 'Verify repair station meets Part 145 applicability requirements', regulatoryReference: '14 CFR 145.1' },
      { itemNumber: '145.51', itemOrder: 2, categoryName: 'Application', description: 'Application for certificate submitted with required documents', regulatoryReference: '14 CFR 145.51' },
      { itemNumber: '145.53', itemOrder: 3, categoryName: 'Issue', description: 'Issue of certificate requirements verified', regulatoryReference: '14 CFR 145.53' },
      { itemNumber: '145.55', itemOrder: 4, categoryName: 'Duration', description: 'Certificate duration and display requirements met', regulatoryReference: '14 CFR 145.55' },
      { itemNumber: '145.57', itemOrder: 5, categoryName: 'Amendment', description: 'Amendment to certificate process understood', regulatoryReference: '14 CFR 145.57' },
      { itemNumber: '145.59', itemOrder: 6, categoryName: 'Ratings', description: 'Ratings requirements and limitations verified', regulatoryReference: '14 CFR 145.59' },
      { itemNumber: '145.101', itemOrder: 7, categoryName: 'Quality', description: 'Quality control system established', regulatoryReference: '14 CFR 145.101' },
      { itemNumber: '145.103', itemOrder: 8, categoryName: 'Housing', description: 'Housing and facilities requirements met', regulatoryReference: '14 CFR 145.103' },
      { itemNumber: '145.105', itemOrder: 9, categoryName: 'Equipment', description: 'Equipment, materials, and data requirements verified', regulatoryReference: '14 CFR 145.105' },
      { itemNumber: '145.107', itemOrder: 10, categoryName: 'Satellite', description: 'Satellite repair stations properly managed', regulatoryReference: '14 CFR 145.107' },
      { itemNumber: '145.109', itemOrder: 11, categoryName: 'Rosters', description: 'Personnel rosters and qualifications current', regulatoryReference: '14 CFR 145.109' },
      { itemNumber: '145.151', itemOrder: 12, categoryName: 'Personnel', description: 'Personnel requirements verified', regulatoryReference: '14 CFR 145.151' },
      { itemNumber: '145.153', itemOrder: 13, categoryName: 'Supervisory', description: 'Supervisory personnel requirements met', regulatoryReference: '14 CFR 145.153' },
      { itemNumber: '145.155', itemOrder: 14, categoryName: 'Inspection', description: 'Inspection personnel requirements verified', regulatoryReference: '14 CFR 145.155' },
      { itemNumber: '145.157', itemOrder: 15, categoryName: 'RII', description: 'Required inspection items procedures established', regulatoryReference: '14 CFR 145.157' }
    ]
  },
  '14-CFR-121': {
    farPart: '121',
    formNumber: '8900.1-VOL3-CH1',
    formTitle: 'Part 121 Air Carrier Training Program Checklist',
    formType: 'audit_checklist',
    version: '2024-01',
    sourceUrl: 'https://fsims.faa.gov/PICDetail.aspx?docId=8900.1,Vol.3,Ch1',
    relatedOrderVolume: '8900.1 Vol 3',
    items: [
      { itemNumber: '121.400', itemOrder: 1, categoryName: 'Applicability', description: 'Training program applicability requirements verified', regulatoryReference: '14 CFR 121.400' },
      { itemNumber: '121.401', itemOrder: 2, categoryName: 'Program', description: 'Training program requirements met', regulatoryReference: '14 CFR 121.401' },
      { itemNumber: '121.403', itemOrder: 3, categoryName: 'Curriculum', description: 'Training curriculum and revisions approved', regulatoryReference: '14 CFR 121.403' },
      { itemNumber: '121.404', itemOrder: 4, categoryName: 'Compliance', description: 'Compliance with AQP or traditional training verified', regulatoryReference: '14 CFR 121.404' },
      { itemNumber: '121.405', itemOrder: 5, categoryName: 'Instructors', description: 'Training instructor qualifications verified', regulatoryReference: '14 CFR 121.405' },
      { itemNumber: '121.409', itemOrder: 6, categoryName: 'FSTD', description: 'Training device requirements met', regulatoryReference: '14 CFR 121.409' },
      { itemNumber: '121.411', itemOrder: 7, categoryName: 'Check', description: 'Check airmen qualifications verified', regulatoryReference: '14 CFR 121.411' },
      { itemNumber: '121.413', itemOrder: 8, categoryName: 'Initial', description: 'Initial and transition ground training requirements met', regulatoryReference: '14 CFR 121.413' },
      { itemNumber: '121.415', itemOrder: 9, categoryName: 'Crewmember', description: 'Crewmember and dispatcher training requirements verified', regulatoryReference: '14 CFR 121.415' },
      { itemNumber: '121.417', itemOrder: 10, categoryName: 'Emergency', description: 'Crewmember emergency training requirements met', regulatoryReference: '14 CFR 121.417' },
      { itemNumber: '121.419', itemOrder: 11, categoryName: 'Recurrent', description: 'Recurrent training requirements verified', regulatoryReference: '14 CFR 121.419' },
      { itemNumber: '121.421', itemOrder: 12, categoryName: 'Differences', description: 'Differences training requirements met', regulatoryReference: '14 CFR 121.421' },
      { itemNumber: '121.422', itemOrder: 13, categoryName: 'Flight', description: 'Flight attendant training requirements verified', regulatoryReference: '14 CFR 121.422' },
      { itemNumber: '121.424', itemOrder: 14, categoryName: 'Pilot', description: 'Pilot training program requirements met', regulatoryReference: '14 CFR 121.424' },
      { itemNumber: '121.427', itemOrder: 15, categoryName: 'Proficiency', description: 'Proficiency check requirements verified', regulatoryReference: '14 CFR 121.427' }
    ]
  },
  '14-CFR-135': {
    farPart: '135',
    formNumber: '8900.1-VOL3-CH2',
    formTitle: 'Part 135 Commuter/On-Demand Training Program Checklist',
    formType: 'audit_checklist',
    version: '2024-01',
    sourceUrl: 'https://fsims.faa.gov/PICDetail.aspx?docId=8900.1,Vol.3,Ch2',
    relatedOrderVolume: '8900.1 Vol 3',
    items: [
      { itemNumber: '135.321', itemOrder: 1, categoryName: 'Applicability', description: 'Training program applicability requirements verified', regulatoryReference: '14 CFR 135.321' },
      { itemNumber: '135.323', itemOrder: 2, categoryName: 'Program', description: 'Training program curriculum approved', regulatoryReference: '14 CFR 135.323' },
      { itemNumber: '135.324', itemOrder: 3, categoryName: 'Pilots', description: 'Pilots in command qualifications verified', regulatoryReference: '14 CFR 135.324' },
      { itemNumber: '135.325', itemOrder: 4, categoryName: 'Aeronautical', description: 'Aeronautical experience requirements met', regulatoryReference: '14 CFR 135.325' },
      { itemNumber: '135.327', itemOrder: 5, categoryName: 'Ground', description: 'Ground training requirements verified', regulatoryReference: '14 CFR 135.327' },
      { itemNumber: '135.329', itemOrder: 6, categoryName: 'Crewmember', description: 'Crewmember training requirements met', regulatoryReference: '14 CFR 135.329' },
      { itemNumber: '135.331', itemOrder: 7, categoryName: 'Emergency', description: 'Emergency training requirements verified', regulatoryReference: '14 CFR 135.331' },
      { itemNumber: '135.335', itemOrder: 8, categoryName: 'Instruments', description: 'Instrument proficiency check requirements met', regulatoryReference: '14 CFR 135.335' },
      { itemNumber: '135.337', itemOrder: 9, categoryName: 'Approval', description: 'Training program and revisions approved', regulatoryReference: '14 CFR 135.337' },
      { itemNumber: '135.339', itemOrder: 10, categoryName: 'Initial', description: 'Initial and recurrent flight attendant training verified', regulatoryReference: '14 CFR 135.339' },
      { itemNumber: '135.340', itemOrder: 11, categoryName: 'Knowledge', description: 'Initial and recurrent ground training completed', regulatoryReference: '14 CFR 135.340' },
      { itemNumber: '135.341', itemOrder: 12, categoryName: 'Check', description: 'Check pilot qualifications verified', regulatoryReference: '14 CFR 135.341' },
      { itemNumber: '135.343', itemOrder: 13, categoryName: 'Crewmember', description: 'Crewmember initial and recurrent training requirements met', regulatoryReference: '14 CFR 135.343' },
      { itemNumber: '135.345', itemOrder: 14, categoryName: 'Pilot', description: 'Pilot training program requirements verified', regulatoryReference: '14 CFR 135.345' },
      { itemNumber: '135.351', itemOrder: 15, categoryName: 'Recurrent', description: 'Recurrent training requirements met', regulatoryReference: '14 CFR 135.351' }
    ]
  }
};

export class ChecklistHarmonizationEngine {
  
  async autoFetchCoreChecklist(farPartCode: string): Promise<ChecklistSchema | null> {
    const coreChecklist = FAA_CORE_CHECKLISTS[farPartCode];
    if (!coreChecklist) {
      console.log(`No core checklist definition found for ${farPartCode}`);
      return null;
    }

    const existing = await db.select()
      .from(checklistSchemas)
      .where(and(
        eq(checklistSchemas.schemaSource, 'faa_standard'),
        eq(checklistSchemas.autoFetched, true),
        eq(checklistSchemas.isOutdated, false)
      ))
      .limit(1);

    if (existing[0]) {
      const metadata = existing[0].metadata as any;
      if (metadata?.farPart === coreChecklist.farPart) {
        console.log(`Core checklist already exists for ${farPartCode}`);
        return existing[0];
      }
    }

    console.log(`Auto-fetching core checklist for ${farPartCode}...`);
    
    const schema = await this.ingestChecklist(
      coreChecklist.formTitle,
      'faa_standard',
      coreChecklist.items,
      undefined,
      coreChecklist.version,
      true,
      {
        autoFetched: true,
        priorityLevel: 1,
        sourceUrl: coreChecklist.sourceUrl,
        farPart: coreChecklist.farPart,
        formNumber: coreChecklist.formNumber,
        relatedOrderVolume: coreChecklist.relatedOrderVolume
      }
    );

    console.log(`Auto-fetched core checklist: ${coreChecklist.formTitle} with ${coreChecklist.items.length} items`);
    return schema;
  }

  async ingestChecklist(
    schemaName: string,
    schemaSource: ChecklistSource,
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
    isCanonical: boolean = false,
    automationOptions?: {
      autoFetched?: boolean;
      priorityLevel?: number;
      sourceUrl?: string;
      farPart?: string;
      formNumber?: string;
      relatedOrderVolume?: string;
    }
  ): Promise<ChecklistSchema> {
    const structureHash = this.generateStructureHash(items);
    const priorityLevel = automationOptions?.priorityLevel || CHECKLIST_PRIORITY_MAP[schemaSource] || 5;
    
    const schemaData: any = {
      schemaName,
      schemaSource,
      frameworkId: frameworkId || null,
      version,
      effectiveDate: new Date(),
      totalItems: items.length,
      structureHash,
      metadata: {
        source: schemaSource,
        itemCategories: Array.from(new Set(items.map(i => i.categoryName).filter(Boolean))),
        farPart: automationOptions?.farPart,
        formNumber: automationOptions?.formNumber,
        relatedOrderVolume: automationOptions?.relatedOrderVolume
      },
      isCanonical,
      priorityLevel,
      autoFetched: automationOptions?.autoFetched || false,
      sourceUrl: automationOptions?.sourceUrl || null,
      lastVersionCheck: new Date(),
      isOutdated: false,
      isHidden: schemaSource === 'archived_legacy'
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

    console.log(`Ingested checklist: ${schemaName} with ${items.length} items (priority: ${priorityLevel})`);
    return insertedSchema;
  }

  private generateStructureHash(items: any[]): string {
    const content = items.map(i => `${i.itemNumber}:${i.description}`).join('|');
    return createHash('sha256').update(content).digest('hex').substring(0, 32);
  }

  async getAllSchemas(includeHidden: boolean = false): Promise<ChecklistSchema[]> {
    if (includeHidden) {
      return db.select()
        .from(checklistSchemas)
        .orderBy(asc(checklistSchemas.priorityLevel), desc(checklistSchemas.createdAt));
    }
    
    return db.select()
      .from(checklistSchemas)
      .where(or(eq(checklistSchemas.isHidden, false), isNull(checklistSchemas.isHidden)))
      .orderBy(asc(checklistSchemas.priorityLevel), desc(checklistSchemas.createdAt));
  }

  async getSchemasByPriority(): Promise<Record<string, ChecklistSchema[]>> {
    const all = await this.getAllSchemas(true);
    
    return {
      faa_standard: all.filter(s => s.priorityLevel === 1),
      certificate_job_aid: all.filter(s => s.priorityLevel === 2),
      inspector_supplemental: all.filter(s => s.priorityLevel === 3),
      operator_required: all.filter(s => s.priorityLevel === 4),
      archived_legacy: all.filter(s => s.priorityLevel === 5)
    };
  }

  async getSchemaItems(schemaId: string): Promise<ChecklistItem[]> {
    return db.select()
      .from(checklistItems)
      .where(eq(checklistItems.schemaId, schemaId))
      .orderBy(asc(checklistItems.itemOrder));
  }

  async checkForVersionUpdates(): Promise<Array<{ schemaId: string; schemaName: string; currentVersion: string; status: string }>> {
    const results: Array<{ schemaId: string; schemaName: string; currentVersion: string; status: string }> = [];
    
    const autoFetchedSchemas = await db.select()
      .from(checklistSchemas)
      .where(eq(checklistSchemas.autoFetched, true));

    for (const schema of autoFetchedSchemas) {
      const metadata = schema.metadata as any;
      const farPart = metadata?.farPart;
      
      if (farPart && FAA_CORE_CHECKLISTS[`14-CFR-${farPart}`]) {
        const latestDef = FAA_CORE_CHECKLISTS[`14-CFR-${farPart}`];
        
        if (latestDef.version !== schema.version) {
          await db.update(checklistSchemas)
            .set({ 
              isOutdated: true,
              lastVersionCheck: new Date()
            })
            .where(eq(checklistSchemas.id, schema.id));

          await db.insert(checklistVersionHistory).values({
            schemaId: schema.id,
            previousVersion: schema.version,
            newVersion: latestDef.version,
            changeType: 'new_version',
            changeSummary: `New version ${latestDef.version} available (current: ${schema.version})`,
            sourceReference: latestDef.sourceUrl
          });

          results.push({
            schemaId: schema.id,
            schemaName: schema.schemaName,
            currentVersion: schema.version,
            status: 'outdated'
          });
        } else {
          await db.update(checklistSchemas)
            .set({ lastVersionCheck: new Date() })
            .where(eq(checklistSchemas.id, schema.id));

          results.push({
            schemaId: schema.id,
            schemaName: schema.schemaName,
            currentVersion: schema.version,
            status: 'current'
          });
        }
      }
    }

    return results;
  }

  async getVersionHistory(schemaId: string): Promise<any[]> {
    return db.select()
      .from(checklistVersionHistory)
      .where(eq(checklistVersionHistory.schemaId, schemaId))
      .orderBy(desc(checklistVersionHistory.detectedAt));
  }

  async suppressOutdatedChecklist(schemaId: string): Promise<void> {
    await db.update(checklistSchemas)
      .set({ isHidden: true, isOutdated: true })
      .where(eq(checklistSchemas.id, schemaId));
  }

  async unlockArchivedChecklist(schemaId: string): Promise<void> {
    await db.update(checklistSchemas)
      .set({ isHidden: false })
      .where(eq(checklistSchemas.id, schemaId));
  }

  async mapEvidenceToChecklistItem(
    evidenceId: string,
    checklistItemId: string,
    mappingStrength: number = 1.0,
    notes?: string
  ): Promise<void> {
    await db.insert(evidenceChecklistMappings).values({
      evidenceId,
      checklistItemId,
      mappingConfidence: mappingStrength.toString(),
      mappingSource: 'manual',
      evidenceRelevance: 'primary',
      notes: notes || null
    });
  }

  async getEvidenceForChecklistItem(checklistItemId: string): Promise<any[]> {
    const mappings = await db.select()
      .from(evidenceChecklistMappings)
      .where(eq(evidenceChecklistMappings.checklistItemId, checklistItemId));

    if (mappings.length === 0) return [];

    const evidenceIds = mappings.map(m => m.evidenceId);
    const evidence = await db.select()
      .from(evidenceRecords)
      .where(eq(evidenceRecords.id, evidenceIds[0]));

    return evidence;
  }

  async getEvidenceMappingStats(schemaId: string): Promise<{
    totalItems: number;
    mappedItems: number;
    unmappedItems: number;
    coveragePercentage: number;
  }> {
    const items = await this.getSchemaItems(schemaId);
    
    let mappedCount = 0;
    for (const item of items) {
      const mappings = await db.select()
        .from(evidenceChecklistMappings)
        .where(eq(evidenceChecklistMappings.checklistItemId, item.id))
        .limit(1);
      
      if (mappings.length > 0) mappedCount++;
    }

    return {
      totalItems: items.length,
      mappedItems: mappedCount,
      unmappedItems: items.length - mappedCount,
      coveragePercentage: items.length > 0 ? (mappedCount / items.length) * 100 : 0
    };
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

    Array.from(comparedMap.entries()).forEach(([itemNumber, comparedItem]) => {
      if (!baseMap.has(itemNumber)) {
        deltas.push({
          type: 'added',
          baseItemNumber: null,
          comparedItemNumber: itemNumber,
          description: `New item added: ${comparedItem.description.substring(0, 100)}...`,
          complianceImpact: 'minor'
        });
      }
    });

    Array.from(baseMap.entries()).forEach(([itemNumber, baseItem]) => {
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
    });

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

  getSupportedFARParts(): string[] {
    return Object.keys(FAA_CORE_CHECKLISTS);
  }

  getCoreChecklistDefinition(farPartCode: string): CoreChecklistDefinition | null {
    return FAA_CORE_CHECKLISTS[farPartCode] || null;
  }
}

export const checklistHarmonizationEngine = new ChecklistHarmonizationEngine();
