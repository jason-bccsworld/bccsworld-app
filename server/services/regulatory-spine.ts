import { db } from "../db";
import { 
  regulatoryFrameworks, 
  organizationAuthorizations,
  faaPolicyDocuments,
  multiPartConfigurations,
  regulatoryUpdateTracking,
  regulatoryGraphLinks,
  operatorAuthorizations,
  regionalSupplements,
  InsertRegulatoryFramework,
  InsertOrganizationAuthorization,
  InsertFaaPolicyDocument,
  InsertMultiPartConfiguration,
  InsertRegulatoryUpdateTracking,
  RegulatoryFramework,
  OrganizationAuthorization,
  FaaPolicyDocument,
  MultiPartConfiguration,
  RegulatoryUpdateTracking
} from "@shared/schema";
import { eq, and, inArray, like, or, desc, isNull } from "drizzle-orm";
import crypto from "crypto";

export interface RegulatorySpineConfig {
  primarySpine: string;
  coreAttachments: string[];
  dynamicAttachments: string[];
}

export interface UniversalFARPart {
  partNumber: string;
  partName: string;
  subchapter: string;
  applicableTo: string[];
  canBeSpine: boolean;
  relatedParts: string[];
  ecfrUrl: string;
}

export interface MultiPartCompliance {
  primaryPart: RegulatoryFramework;
  secondaryParts: RegulatoryFramework[];
  policyAttachments: FaaPolicyDocument[];
  operatorAuthorizations: any[];
  regionalSupplements: any[];
}

export class RegulatorySpineService {
  private static readonly UNIVERSAL_FAR_PARTS: UniversalFARPart[] = [
    {
      partNumber: "14-CFR-21",
      partName: "14 CFR Part 21 - Certification Procedures for Products and Articles",
      subchapter: "C",
      applicableTo: ["manufacturers", "production_approval_holders"],
      canBeSpine: true,
      relatedParts: ["14-CFR-43", "14-CFR-145"],
      ecfrUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-C/part-21"
    },
    {
      partNumber: "14-CFR-43",
      partName: "14 CFR Part 43 - Maintenance, Preventive Maintenance, Rebuilding, and Alteration",
      subchapter: "C",
      applicableTo: ["maintenance_personnel", "repair_stations", "air_carriers"],
      canBeSpine: false,
      relatedParts: ["14-CFR-145", "14-CFR-121", "14-CFR-135"],
      ecfrUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-C/part-43"
    },
    {
      partNumber: "14-CFR-61",
      partName: "14 CFR Part 61 - Certification: Pilots, Flight Instructors, and Ground Instructors",
      subchapter: "D",
      applicableTo: ["pilots", "flight_instructors", "ground_instructors"],
      canBeSpine: false,
      relatedParts: ["14-CFR-141", "14-CFR-142", "14-CFR-91"],
      ecfrUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-61"
    },
    {
      partNumber: "14-CFR-63",
      partName: "14 CFR Part 63 - Certification: Flight Crewmembers Other Than Pilots",
      subchapter: "D",
      applicableTo: ["flight_engineers", "flight_navigators"],
      canBeSpine: false,
      relatedParts: ["14-CFR-121", "14-CFR-135"],
      ecfrUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-63"
    },
    {
      partNumber: "14-CFR-65",
      partName: "14 CFR Part 65 - Certification: Airmen Other Than Flight Crewmembers",
      subchapter: "D",
      applicableTo: ["mechanics", "repairmen", "dispatchers", "parachute_riggers"],
      canBeSpine: false,
      relatedParts: ["14-CFR-145", "14-CFR-121", "14-CFR-43"],
      ecfrUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-65"
    },
    {
      partNumber: "14-CFR-91",
      partName: "14 CFR Part 91 - General Operating and Flight Rules",
      subchapter: "F",
      applicableTo: ["all_pilots", "aircraft_operators"],
      canBeSpine: false,
      relatedParts: ["14-CFR-61", "14-CFR-121", "14-CFR-135"],
      ecfrUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-F/part-91"
    },
    {
      partNumber: "14-CFR-91K",
      partName: "14 CFR Part 91 Subpart K - Fractional Ownership Operations",
      subchapter: "F",
      applicableTo: ["fractional_ownership_programs"],
      canBeSpine: true,
      relatedParts: ["14-CFR-91", "14-CFR-135"],
      ecfrUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-F/part-91/subpart-K"
    },
    {
      partNumber: "14-CFR-107",
      partName: "14 CFR Part 107 - Small Unmanned Aircraft Systems",
      subchapter: "F",
      applicableTo: ["drone_operators", "uas_pilots"],
      canBeSpine: true,
      relatedParts: ["14-CFR-91", "14-CFR-61"],
      ecfrUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-F/part-107"
    },
    {
      partNumber: "14-CFR-119",
      partName: "14 CFR Part 119 - Certification: Air Carriers and Commercial Operators",
      subchapter: "G",
      applicableTo: ["air_carriers", "commercial_operators"],
      canBeSpine: true,
      relatedParts: ["14-CFR-121", "14-CFR-135"],
      ecfrUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-119"
    },
    {
      partNumber: "14-CFR-121",
      partName: "14 CFR Part 121 - Operating Requirements: Domestic, Flag, and Supplemental Operations",
      subchapter: "G",
      applicableTo: ["airlines", "scheduled_carriers", "supplemental_carriers"],
      canBeSpine: true,
      relatedParts: ["14-CFR-119", "14-CFR-142", "14-CFR-65"],
      ecfrUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-121"
    },
    {
      partNumber: "14-CFR-125",
      partName: "14 CFR Part 125 - Certification and Operations: Airplanes Having a Seating Capacity of 20 or More Passengers or a Maximum Payload Capacity of 6,000 Pounds or More",
      subchapter: "G",
      applicableTo: ["large_aircraft_operators"],
      canBeSpine: true,
      relatedParts: ["14-CFR-91", "14-CFR-119"],
      ecfrUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-125"
    },
    {
      partNumber: "14-CFR-129",
      partName: "14 CFR Part 129 - Operations: Foreign Air Carriers and Foreign Operators of U.S.-Registered Aircraft",
      subchapter: "G",
      applicableTo: ["foreign_air_carriers"],
      canBeSpine: true,
      relatedParts: ["14-CFR-119", "14-CFR-121"],
      ecfrUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-129"
    },
    {
      partNumber: "14-CFR-135",
      partName: "14 CFR Part 135 - Operating Requirements: Commuter and On Demand Operations",
      subchapter: "G",
      applicableTo: ["charter_operators", "air_taxi", "commuter_airlines"],
      canBeSpine: true,
      relatedParts: ["14-CFR-119", "14-CFR-142", "14-CFR-91"],
      ecfrUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-135"
    },
    {
      partNumber: "14-CFR-137",
      partName: "14 CFR Part 137 - Agricultural Aircraft Operations",
      subchapter: "G",
      applicableTo: ["agricultural_operators"],
      canBeSpine: true,
      relatedParts: ["14-CFR-91", "14-CFR-61"],
      ecfrUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-137"
    },
    {
      partNumber: "14-CFR-141",
      partName: "14 CFR Part 141 - Pilot Schools",
      subchapter: "H",
      applicableTo: ["pilot_schools", "flight_academies"],
      canBeSpine: true,
      relatedParts: ["14-CFR-61", "14-CFR-142"],
      ecfrUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-H/part-141"
    },
    {
      partNumber: "14-CFR-142",
      partName: "14 CFR Part 142 - Training Centers",
      subchapter: "H",
      applicableTo: ["training_centers", "simulator_operators"],
      canBeSpine: true,
      relatedParts: ["14-CFR-121", "14-CFR-135", "14-CFR-61"],
      ecfrUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-H/part-142"
    },
    {
      partNumber: "14-CFR-145",
      partName: "14 CFR Part 145 - Repair Stations",
      subchapter: "H",
      applicableTo: ["repair_stations", "maintenance_organizations"],
      canBeSpine: true,
      relatedParts: ["14-CFR-43", "14-CFR-65", "14-CFR-121"],
      ecfrUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-H/part-145"
    },
    {
      partNumber: "14-CFR-147",
      partName: "14 CFR Part 147 - Aviation Maintenance Technician Schools",
      subchapter: "H",
      applicableTo: ["amt_schools", "maintenance_training"],
      canBeSpine: true,
      relatedParts: ["14-CFR-65", "14-CFR-145", "14-CFR-43"],
      ecfrUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-H/part-147"
    }
  ];

  private static readonly FAA_ORDER_VOLUMES = [
    { code: "FAA-8900.1-VOL1", name: "FAA Order 8900.1 Volume 1 - General Inspector Guidance and Information", chapter: "General" },
    { code: "FAA-8900.1-VOL2", name: "FAA Order 8900.1 Volume 2 - Air Operator and Air Agency Certification and Application Process", chapter: "Certification" },
    { code: "FAA-8900.1-VOL3", name: "FAA Order 8900.1 Volume 3 - General Technical Administration", chapter: "Technical" },
    { code: "FAA-8900.1-VOL4", name: "FAA Order 8900.1 Volume 4 - Aircraft Equipment and Operational Authorization", chapter: "Equipment" },
    { code: "FAA-8900.1-VOL5", name: "FAA Order 8900.1 Volume 5 - Airman Certification", chapter: "Airman" },
    { code: "FAA-8900.1-VOL6", name: "FAA Order 8900.1 Volume 6 - Surveillance", chapter: "Surveillance" },
    { code: "FAA-8900.1-VOL7", name: "FAA Order 8900.1 Volume 7 - Investigation", chapter: "Investigation" },
    { code: "FAA-8900.1-VOL8", name: "FAA Order 8900.1 Volume 8 - Designees", chapter: "Designees" },
    { code: "FAA-8900.1-VOL9", name: "FAA Order 8900.1 Volume 9 - Flight Standards Programs", chapter: "Programs" },
    { code: "FAA-8900.1-VOL10", name: "FAA Order 8900.1 Volume 10 - Safety Assurance System", chapter: "Safety" },
    { code: "FAA-8900.1-VOL11", name: "FAA Order 8900.1 Volume 11 - Flight Technologies and Procedures Division Designees", chapter: "Technologies" },
    { code: "FAA-8900.1-VOL12", name: "FAA Order 8900.1 Volume 12 - International Aviation", chapter: "International" },
    { code: "FAA-8900.1-VOL13", name: "FAA Order 8900.1 Volume 13 - Commercial Space Transportation", chapter: "Space" },
    { code: "FAA-8900.1-VOL14", name: "FAA Order 8900.1 Volume 14 - Compliance and Enforcement", chapter: "Compliance" },
    { code: "FAA-8900.1-VOL15", name: "FAA Order 8900.1 Volume 15 - Designated Representative Program", chapter: "Representatives" },
    { code: "FAA-8900.1-VOL16", name: "FAA Order 8900.1 Volume 16 - Unmanned Aircraft Systems", chapter: "UAS" }
  ];

  async initializeUniversalRegulatorySpine(): Promise<void> {
    console.log("Initializing Universal Regulatory Spine framework...");
    
    for (const part of RegulatorySpineService.UNIVERSAL_FAR_PARTS) {
      await this.ensureFrameworkExists(part);
    }
    
    for (const order of RegulatorySpineService.FAA_ORDER_VOLUMES) {
      await this.ensureOrderExists(order);
    }
    
    console.log("Universal Regulatory Spine initialized with all FAR Parts and FAA Orders");
  }

  private async ensureFrameworkExists(part: UniversalFARPart): Promise<void> {
    const existing = await db.select()
      .from(regulatoryFrameworks)
      .where(eq(regulatoryFrameworks.frameworkCode, part.partNumber))
      .limit(1);
    
    if (existing.length === 0) {
      const framework: InsertRegulatoryFramework = {
        frameworkCode: part.partNumber,
        frameworkName: part.partName,
        frameworkType: part.canBeSpine ? "spine" : "attachment",
        regulatoryAuthority: "faa",
        effectiveDate: new Date(),
        version: "2024.1",
        hierarchyLevel: part.canBeSpine ? 1 : 2,
        sourceUrl: part.ecfrUrl,
        applicabilityRules: {
          applies_to: part.applicableTo,
          subchapter: part.subchapter,
          related_parts: part.relatedParts,
          can_be_primary_spine: part.canBeSpine
        },
        isActive: true
      };
      
      try {
        await db.insert(regulatoryFrameworks).values(framework);
        console.log(`Created regulatory framework: ${part.partNumber}`);
      } catch (error: any) {
        if (!error.message?.includes('duplicate')) {
          console.error(`Error creating framework ${part.partNumber}:`, error);
        }
      }
    }
  }

  private async ensureOrderExists(order: { code: string; name: string; chapter: string }): Promise<void> {
    const existing = await db.select()
      .from(regulatoryFrameworks)
      .where(eq(regulatoryFrameworks.frameworkCode, order.code))
      .limit(1);
    
    if (existing.length === 0) {
      const framework: InsertRegulatoryFramework = {
        frameworkCode: order.code,
        frameworkName: order.name,
        frameworkType: "order",
        regulatoryAuthority: "faa",
        effectiveDate: new Date(),
        version: "2024.1",
        hierarchyLevel: 2,
        sourceUrl: "https://www.faa.gov/regulations_policies/orders_notices",
        applicabilityRules: {
          applies_to: ["inspectors", "certificate_holders"],
          chapter: order.chapter,
          document_type: "faa_order"
        },
        isActive: true
      };
      
      try {
        await db.insert(regulatoryFrameworks).values(framework);
        console.log(`Created FAA Order: ${order.code}`);
      } catch (error: any) {
        if (!error.message?.includes('duplicate')) {
          console.error(`Error creating order ${order.code}:`, error);
        }
      }
    }
  }

  async getAvailableSpines(): Promise<RegulatoryFramework[]> {
    return db.select()
      .from(regulatoryFrameworks)
      .where(and(
        eq(regulatoryFrameworks.frameworkType, "spine"),
        eq(regulatoryFrameworks.isActive, true)
      ));
  }

  async getUniversalFARParts(): Promise<UniversalFARPart[]> {
    return RegulatorySpineService.UNIVERSAL_FAR_PARTS;
  }

  async selectPrimarySpine(organizationId: string, frameworkCode: string): Promise<RegulatoryFramework | null> {
    const framework = await db.select()
      .from(regulatoryFrameworks)
      .where(eq(regulatoryFrameworks.frameworkCode, frameworkCode))
      .limit(1);
    
    if (framework.length === 0) return null;
    
    await db.update(organizationAuthorizations)
      .set({ isActive: false })
      .where(and(
        eq(organizationAuthorizations.organizationId, organizationId),
        eq(organizationAuthorizations.authorizationType, "primary_spine")
      ));
    
    await db.insert(organizationAuthorizations).values({
      organizationId,
      frameworkId: framework[0].id,
      authorizationType: "primary_spine",
      grantedDate: new Date(),
      isActive: true
    });
    
    return framework[0];
  }

  async createMultiPartConfiguration(config: {
    configName: string;
    description?: string;
    primarySpineCode: string;
    secondarySpineCodes: string[];
    operationTypes: string[];
    authorizations?: any;
  }): Promise<MultiPartConfiguration> {
    const primarySpine = await db.select()
      .from(regulatoryFrameworks)
      .where(eq(regulatoryFrameworks.frameworkCode, config.primarySpineCode))
      .limit(1);
    
    if (primarySpine.length === 0) {
      throw new Error(`Primary spine ${config.primarySpineCode} not found`);
    }
    
    const secondarySpines = await db.select()
      .from(regulatoryFrameworks)
      .where(inArray(regulatoryFrameworks.frameworkCode, config.secondarySpineCodes));
    
    const multiPartConfig: InsertMultiPartConfiguration = {
      configName: config.configName,
      description: config.description,
      primarySpineId: primarySpine[0].id,
      secondarySpines: secondarySpines.map(s => s.id),
      applicableOperationTypes: config.operationTypes,
      applicableAuthorizations: config.authorizations || {},
      isActive: true
    };
    
    const result = await db.insert(multiPartConfigurations)
      .values(multiPartConfig)
      .returning();
    
    return result[0];
  }

  async getMultiPartConfiguration(configId: string): Promise<MultiPartCompliance | null> {
    const config = await db.select()
      .from(multiPartConfigurations)
      .where(eq(multiPartConfigurations.id, configId))
      .limit(1);
    
    if (config.length === 0) return null;
    
    const primaryPart = await db.select()
      .from(regulatoryFrameworks)
      .where(eq(regulatoryFrameworks.id, config[0].primarySpineId))
      .limit(1);
    
    const secondaryParts = config[0].secondarySpines && config[0].secondarySpines.length > 0
      ? await db.select()
          .from(regulatoryFrameworks)
          .where(inArray(regulatoryFrameworks.id, config[0].secondarySpines as string[]))
      : [];
    
    const policyAttachments = await db.select()
      .from(faaPolicyDocuments)
      .where(eq(faaPolicyDocuments.isActive, true));
    
    return {
      primaryPart: primaryPart[0],
      secondaryParts,
      policyAttachments,
      operatorAuthorizations: [],
      regionalSupplements: []
    };
  }

  async ingestFAAPolicyDocument(document: {
    documentType: string;
    documentNumber: string;
    title: string;
    subject?: string;
    issuanceDate: Date;
    effectiveDate?: Date;
    expirationDate?: Date;
    affectedParts: string[];
    content?: string;
    sourceUrl?: string;
  }): Promise<FaaPolicyDocument> {
    const contentHash = document.content 
      ? crypto.createHash('sha256').update(document.content).digest('hex').substring(0, 64)
      : null;
    
    const affectedFrameworks = await db.select()
      .from(regulatoryFrameworks)
      .where(inArray(regulatoryFrameworks.frameworkCode, document.affectedParts.map(p => `14-CFR-${p}`)));
    
    const policyDoc: InsertFaaPolicyDocument = {
      documentType: document.documentType,
      documentNumber: document.documentNumber,
      title: document.title,
      subject: document.subject,
      issuanceDate: document.issuanceDate,
      effectiveDate: document.effectiveDate,
      expirationDate: document.expirationDate,
      affectedParts: document.affectedParts,
      content: document.content,
      sourceUrl: document.sourceUrl,
      contentHash,
      linkedFrameworks: affectedFrameworks.map(f => f.id),
      status: "active",
      isActive: true
    };
    
    const result = await db.insert(faaPolicyDocuments)
      .values(policyDoc)
      .returning();
    
    await this.createRegulatoryUpdateRecord({
      sourceType: document.documentType,
      sourceIdentifier: document.documentNumber,
      sourceUrl: document.sourceUrl,
      currentContentHash: contentHash || undefined,
      changeType: "new",
      changeSummary: `New ${document.documentType} ingested: ${document.title}`
    });
    
    return result[0];
  }

  async createRegulatoryUpdateRecord(update: {
    sourceType: string;
    sourceIdentifier: string;
    sourceUrl?: string;
    currentContentHash?: string;
    affectedFrameworkId?: string;
    affectedPolicyDocId?: string;
    changeType?: string;
    changeSummary?: string;
  }): Promise<RegulatoryUpdateTracking> {
    const record: InsertRegulatoryUpdateTracking = {
      sourceType: update.sourceType,
      sourceIdentifier: update.sourceIdentifier,
      sourceUrl: update.sourceUrl,
      lastCheckedAt: new Date(),
      currentContentHash: update.currentContentHash,
      affectedFrameworkId: update.affectedFrameworkId,
      affectedPolicyDocId: update.affectedPolicyDocId,
      changeDetected: update.changeType !== undefined,
      changeType: update.changeType,
      changeSummary: update.changeSummary,
      notificationSent: false
    };
    
    const result = await db.insert(regulatoryUpdateTracking)
      .values(record)
      .returning();
    
    return result[0];
  }

  async getActivePolicyDocuments(filters?: {
    documentType?: string;
    affectedPart?: string;
  }): Promise<FaaPolicyDocument[]> {
    let query = db.select()
      .from(faaPolicyDocuments)
      .where(eq(faaPolicyDocuments.isActive, true));
    
    if (filters?.documentType) {
      query = db.select()
        .from(faaPolicyDocuments)
        .where(and(
          eq(faaPolicyDocuments.isActive, true),
          eq(faaPolicyDocuments.documentType, filters.documentType)
        ));
    }
    
    return query;
  }

  async getRecentRegulatoryUpdates(limit: number = 50): Promise<RegulatoryUpdateTracking[]> {
    return db.select()
      .from(regulatoryUpdateTracking)
      .orderBy(desc(regulatoryUpdateTracking.createdAt))
      .limit(limit);
  }

  async getFrameworksByPart(partNumber: string): Promise<RegulatoryFramework[]> {
    const searchPattern = partNumber.startsWith("14-CFR-") 
      ? partNumber 
      : `14-CFR-${partNumber}`;
    
    return db.select()
      .from(regulatoryFrameworks)
      .where(like(regulatoryFrameworks.frameworkCode, `${searchPattern}%`));
  }

  async getRelatedFrameworks(frameworkId: string): Promise<RegulatoryFramework[]> {
    const links = await db.select()
      .from(regulatoryGraphLinks)
      .where(or(
        eq(regulatoryGraphLinks.sourceId, frameworkId),
        eq(regulatoryGraphLinks.targetId, frameworkId)
      ));
    
    const relatedIds = links.flatMap(link => 
      link.sourceId === frameworkId ? [link.targetId] : [link.sourceId]
    );
    
    if (relatedIds.length === 0) return [];
    
    return db.select()
      .from(regulatoryFrameworks)
      .where(inArray(regulatoryFrameworks.id, relatedIds));
  }

  async generateRegulatoryImpactAssessment(frameworkCode: string): Promise<{
    framework: RegulatoryFramework | null;
    relatedPolicies: FaaPolicyDocument[];
    pendingUpdates: RegulatoryUpdateTracking[];
    impactSummary: string;
  }> {
    const framework = await db.select()
      .from(regulatoryFrameworks)
      .where(eq(regulatoryFrameworks.frameworkCode, frameworkCode))
      .limit(1);
    
    if (framework.length === 0) {
      return {
        framework: null,
        relatedPolicies: [],
        pendingUpdates: [],
        impactSummary: "Framework not found"
      };
    }
    
    const relatedPolicies = await db.select()
      .from(faaPolicyDocuments)
      .where(eq(faaPolicyDocuments.isActive, true));
    
    const pendingUpdates = await db.select()
      .from(regulatoryUpdateTracking)
      .where(and(
        eq(regulatoryUpdateTracking.affectedFrameworkId, framework[0].id),
        eq(regulatoryUpdateTracking.changeDetected, true)
      ));
    
    const impactSummary = `Framework ${frameworkCode} has ${relatedPolicies.length} related policy documents and ${pendingUpdates.length} pending regulatory updates requiring attention.`;
    
    return {
      framework: framework[0],
      relatedPolicies,
      pendingUpdates,
      impactSummary
    };
  }

  async initializeRegulatorySpine(): Promise<void> {
    return this.initializeUniversalRegulatorySpine();
  }

  async getSpineFramework(): Promise<RegulatoryFramework | null> {
    const result = await db.select()
      .from(regulatoryFrameworks)
      .where(and(
        eq(regulatoryFrameworks.frameworkType, "spine"),
        eq(regulatoryFrameworks.isActive, true)
      ))
      .limit(1);
    
    return result[0] || null;
  }

  async getAttachmentsForOrganization(organizationId: string): Promise<RegulatoryFramework[]> {
    const authorizations = await db.select()
      .from(organizationAuthorizations)
      .where(and(
        eq(organizationAuthorizations.organizationId, organizationId),
        eq(organizationAuthorizations.isActive, true)
      ));

    if (authorizations.length === 0) {
      return this.getCoreAttachments();
    }

    const frameworkIds = authorizations.map(auth => auth.frameworkId);
    
    return db.select()
      .from(regulatoryFrameworks)
      .where(inArray(regulatoryFrameworks.id, frameworkIds));
  }

  async getCoreAttachments(): Promise<RegulatoryFramework[]> {
    return db.select()
      .from(regulatoryFrameworks)
      .where(and(
        or(
          eq(regulatoryFrameworks.frameworkType, "attachment"),
          eq(regulatoryFrameworks.frameworkType, "order")
        ),
        eq(regulatoryFrameworks.isActive, true)
      ));
  }

  async getDynamicAttachmentsForOperator(operatorType: string): Promise<RegulatoryFramework[]> {
    const frameworkMap: Record<string, string> = {
      "part_121": "14-CFR-121",
      "part_135": "14-CFR-135",
      "part_91k": "14-CFR-91K",
      "part_141": "14-CFR-141",
      "part_142": "14-CFR-142",
      "part_145": "14-CFR-145",
      "part_147": "14-CFR-147",
      "general_aviation": "14-CFR-91"
    };

    const frameworkCode = frameworkMap[operatorType];
    if (!frameworkCode) return [];

    return db.select()
      .from(regulatoryFrameworks)
      .where(eq(regulatoryFrameworks.frameworkCode, frameworkCode));
  }

  async assignFrameworkToOrganization(
    organizationId: string,
    frameworkId: string,
    authorizationType: string = "supplementary",
    operatorClients: string[] = []
  ): Promise<OrganizationAuthorization> {
    const authorization: InsertOrganizationAuthorization = {
      organizationId,
      frameworkId,
      authorizationType,
      grantedDate: new Date(),
      operatorClients: operatorClients.length > 0 ? operatorClients : null,
      isActive: true
    };

    const result = await db.insert(organizationAuthorizations)
      .values(authorization)
      .returning();
    
    return result[0];
  }

  async getComplianceFrameworkHierarchy(organizationId: string): Promise<{
    spine: RegulatoryFramework | null;
    coreAttachments: RegulatoryFramework[];
    dynamicAttachments: RegulatoryFramework[];
    policyDocuments: FaaPolicyDocument[];
  }> {
    const spine = await this.getSpineFramework();
    const allAttachments = await this.getAttachmentsForOrganization(organizationId);
    const policyDocuments = await this.getActivePolicyDocuments();
    
    const orderCodes = RegulatorySpineService.FAA_ORDER_VOLUMES.map(o => o.code);
    const coreAttachments = allAttachments.filter(
      att => orderCodes.includes(att.frameworkCode) || att.frameworkType === "order"
    );
    const dynamicAttachments = allAttachments.filter(
      att => !orderCodes.includes(att.frameworkCode) && att.frameworkType !== "order"
    );

    return {
      spine,
      coreAttachments,
      dynamicAttachments,
      policyDocuments
    };
  }

  async getAllActiveFrameworks(): Promise<RegulatoryFramework[]> {
    return db.select()
      .from(regulatoryFrameworks)
      .where(eq(regulatoryFrameworks.isActive, true));
  }

  async updateFrameworkVersion(frameworkCode: string, newVersion: string): Promise<void> {
    await db.update(regulatoryFrameworks)
      .set({ 
        version: newVersion,
        updatedAt: new Date()
      })
      .where(eq(regulatoryFrameworks.frameworkCode, frameworkCode));
  }

  async getOrganizationRegulatoryProfile(organizationId: string): Promise<{
    primarySpine: RegulatoryFramework | null;
    authorizedFrameworks: RegulatoryFramework[];
    multiPartConfigs: MultiPartConfiguration[];
    recentUpdates: RegulatoryUpdateTracking[];
    complianceGaps: string[];
  }> {
    const authorizations = await db.select()
      .from(organizationAuthorizations)
      .where(and(
        eq(organizationAuthorizations.organizationId, organizationId),
        eq(organizationAuthorizations.isActive, true)
      ));
    
    const primaryAuth = authorizations.find(a => a.authorizationType === "primary_spine");
    let primarySpine: RegulatoryFramework | null = null;
    
    if (primaryAuth) {
      const spines = await db.select()
        .from(regulatoryFrameworks)
        .where(eq(regulatoryFrameworks.id, primaryAuth.frameworkId))
        .limit(1);
      primarySpine = spines[0] || null;
    }
    
    const frameworkIds = authorizations.map(a => a.frameworkId);
    const authorizedFrameworks = frameworkIds.length > 0
      ? await db.select()
          .from(regulatoryFrameworks)
          .where(inArray(regulatoryFrameworks.id, frameworkIds))
      : [];
    
    const multiPartConfigs = await db.select()
      .from(multiPartConfigurations)
      .where(eq(multiPartConfigurations.isActive, true));
    
    const recentUpdates = await this.getRecentRegulatoryUpdates(10);
    
    return {
      primarySpine,
      authorizedFrameworks,
      multiPartConfigs,
      recentUpdates,
      complianceGaps: []
    };
  }
}

export const regulatorySpineService = new RegulatorySpineService();
