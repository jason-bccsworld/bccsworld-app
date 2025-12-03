import { db } from "../db";
import { 
  regulatoryFrameworks, 
  organizationAuthorizations,
  InsertRegulatoryFramework,
  InsertOrganizationAuthorization,
  RegulatoryFramework,
  OrganizationAuthorization
} from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";

export interface RegulatorySpineConfig {
  primarySpine: string;
  coreAttachments: string[];
  dynamicAttachments: string[];
}

export class RegulatorySpineService {
  private static readonly DEFAULT_SPINE_CONFIG: RegulatorySpineConfig = {
    primarySpine: "14-CFR-142",
    coreAttachments: ["FAA-8900.1-VOL3", "FAA-8900.1-VOL6"],
    dynamicAttachments: ["14-CFR-61", "14-CFR-91", "14-CFR-91K", "14-CFR-121", "14-CFR-135"]
  };

  async initializeRegulatorySpine(): Promise<void> {
    console.log("Initializing regulatory spine framework...");
    
    const existingSpine = await db.select()
      .from(regulatoryFrameworks)
      .where(eq(regulatoryFrameworks.frameworkCode, "14-CFR-142"))
      .limit(1);
    
    if (existingSpine.length === 0) {
      await this.seedCoreFrameworks();
    }
  }

  private async seedCoreFrameworks(): Promise<void> {
    const coreFrameworks: InsertRegulatoryFramework[] = [
      {
        frameworkCode: "14-CFR-142",
        frameworkName: "14 CFR Part 142 - Training Centers",
        frameworkType: "spine",
        regulatoryAuthority: "faa",
        effectiveDate: new Date("2024-01-01"),
        version: "2024.1",
        hierarchyLevel: 1,
        sourceUrl: "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-H/part-142",
        applicabilityRules: {
          applies_to: ["training_centers", "simulator_operators"],
          requires_certificate: true,
          certification_type: "part_142_certificate"
        },
        isActive: true
      },
      {
        frameworkCode: "FAA-8900.1-VOL3",
        frameworkName: "FAA Order 8900.1 Volume 3 - General Technical Administration",
        frameworkType: "attachment",
        regulatoryAuthority: "faa",
        effectiveDate: new Date("2024-01-01"),
        version: "2024.1",
        parentFrameworkId: null,
        hierarchyLevel: 2,
        sourceUrl: "https://www.faa.gov/regulations_policies/orders_notices/index.cfm/go/document.information/documentID/1034161",
        applicabilityRules: {
          applies_to: ["all_certificate_holders"],
          chapter_references: ["Chapter 1", "Chapter 2", "Chapter 3"]
        },
        isActive: true
      },
      {
        frameworkCode: "FAA-8900.1-VOL6",
        frameworkName: "FAA Order 8900.1 Volume 6 - Surveillance",
        frameworkType: "attachment",
        regulatoryAuthority: "faa",
        effectiveDate: new Date("2024-01-01"),
        version: "2024.1",
        parentFrameworkId: null,
        hierarchyLevel: 2,
        sourceUrl: "https://www.faa.gov/regulations_policies/orders_notices",
        applicabilityRules: {
          applies_to: ["inspectors", "surveillance_activities"],
          chapter_references: ["Chapter 1", "Chapter 2"]
        },
        isActive: true
      },
      {
        frameworkCode: "14-CFR-61",
        frameworkName: "14 CFR Part 61 - Certification: Pilots, Flight Instructors, and Ground Instructors",
        frameworkType: "attachment",
        regulatoryAuthority: "faa",
        effectiveDate: new Date("2024-01-01"),
        version: "2024.1",
        parentFrameworkId: null,
        hierarchyLevel: 2,
        applicabilityRules: {
          applies_to: ["pilot_certification", "instructor_certification"],
          dynamic_attachment: true,
          attachment_conditions: ["training_for_pilot_certificates"]
        },
        isActive: true
      },
      {
        frameworkCode: "14-CFR-91",
        frameworkName: "14 CFR Part 91 - General Operating and Flight Rules",
        frameworkType: "attachment",
        regulatoryAuthority: "faa",
        effectiveDate: new Date("2024-01-01"),
        version: "2024.1",
        parentFrameworkId: null,
        hierarchyLevel: 2,
        applicabilityRules: {
          applies_to: ["general_aviation", "flight_operations"],
          dynamic_attachment: true,
          attachment_conditions: ["general_aviation_training"]
        },
        isActive: true
      },
      {
        frameworkCode: "14-CFR-91K",
        frameworkName: "14 CFR Part 91 Subpart K - Fractional Ownership Operations",
        frameworkType: "attachment",
        regulatoryAuthority: "faa",
        effectiveDate: new Date("2024-01-01"),
        version: "2024.1",
        parentFrameworkId: null,
        hierarchyLevel: 2,
        applicabilityRules: {
          applies_to: ["fractional_ownership_operators"],
          dynamic_attachment: true,
          attachment_conditions: ["fractional_ownership_training"]
        },
        isActive: true
      },
      {
        frameworkCode: "14-CFR-121",
        frameworkName: "14 CFR Part 121 - Operating Requirements: Domestic, Flag, and Supplemental Operations",
        frameworkType: "attachment",
        regulatoryAuthority: "faa",
        effectiveDate: new Date("2024-01-01"),
        version: "2024.1",
        parentFrameworkId: null,
        hierarchyLevel: 2,
        applicabilityRules: {
          applies_to: ["air_carriers", "commercial_operations"],
          dynamic_attachment: true,
          attachment_conditions: ["part_121_operator_clients"]
        },
        isActive: true
      },
      {
        frameworkCode: "14-CFR-135",
        frameworkName: "14 CFR Part 135 - Operating Requirements: Commuter and On Demand Operations",
        frameworkType: "attachment",
        regulatoryAuthority: "faa",
        effectiveDate: new Date("2024-01-01"),
        version: "2024.1",
        parentFrameworkId: null,
        hierarchyLevel: 2,
        applicabilityRules: {
          applies_to: ["commuter_operations", "on_demand_operations"],
          dynamic_attachment: true,
          attachment_conditions: ["part_135_operator_clients"]
        },
        isActive: true
      }
    ];

    for (const framework of coreFrameworks) {
      try {
        await db.insert(regulatoryFrameworks).values(framework);
        console.log(`Seeded regulatory framework: ${framework.frameworkCode}`);
      } catch (error: any) {
        if (!error.message?.includes('duplicate')) {
          console.error(`Error seeding framework ${framework.frameworkCode}:`, error);
        }
      }
    }

    const spine = await db.select()
      .from(regulatoryFrameworks)
      .where(eq(regulatoryFrameworks.frameworkCode, "14-CFR-142"))
      .limit(1);

    if (spine.length > 0) {
      await db.update(regulatoryFrameworks)
        .set({ parentFrameworkId: spine[0].id })
        .where(eq(regulatoryFrameworks.frameworkType, "attachment"));
    }
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
        eq(regulatoryFrameworks.frameworkType, "attachment"),
        eq(regulatoryFrameworks.isActive, true)
      ));
  }

  async getDynamicAttachmentsForOperator(operatorType: string): Promise<RegulatoryFramework[]> {
    const frameworkMap: Record<string, string> = {
      "part_121": "14-CFR-121",
      "part_135": "14-CFR-135",
      "part_91k": "14-CFR-91K",
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
  }> {
    const spine = await this.getSpineFramework();
    const allAttachments = await this.getAttachmentsForOrganization(organizationId);
    
    const coreAttachmentCodes = ["FAA-8900.1-VOL3", "FAA-8900.1-VOL6"];
    const coreAttachments = allAttachments.filter(
      att => coreAttachmentCodes.includes(att.frameworkCode)
    );
    const dynamicAttachments = allAttachments.filter(
      att => !coreAttachmentCodes.includes(att.frameworkCode)
    );

    return {
      spine,
      coreAttachments,
      dynamicAttachments
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
}

export const regulatorySpineService = new RegulatorySpineService();
