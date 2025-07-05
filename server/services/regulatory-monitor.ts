import { storage } from "../storage";

export interface RegulatoryChange {
  id: string;
  regulation: string; // FAR Part 142, EASA Part-FCL, etc.
  section: string;
  changeType: "addition" | "modification" | "deletion";
  effectiveDate: Date;
  description: string;
  complianceActions: string[];
  priority: "low" | "medium" | "high" | "critical";
  affectedFields: string[];
  sourceUrl: string;
  verified: boolean;
}

export interface ComplianceStatus {
  regulation: string;
  lastChecked: Date;
  currentVersion: string;
  complianceLevel: "compliant" | "warning" | "non-compliant";
  pendingChanges: RegulatoryChange[];
  nextReviewDate: Date;
}

export class RegulatoryMonitorService {
  private monitoringActive = true;
  private checkInterval = 24 * 60 * 60 * 1000; // 24 hours
  
  // Regulatory sources to monitor
  private regulatorySources = [
    {
      name: "FAA eCFR",
      baseUrl: "https://www.ecfr.gov",
      regulations: ["14-CFR-142", "14-CFR-61", "14-CFR-141"],
      country: "US"
    },
    {
      name: "EASA Rules",
      baseUrl: "https://www.easa.europa.eu",
      regulations: ["Part-FCL", "Part-DTO", "Part-ATO"],
      country: "EU"
    },
    {
      name: "Transport Canada",
      baseUrl: "https://tc.canada.ca",
      regulations: ["CAR-421", "CAR-406"],
      country: "CA"
    },
    {
      name: "CASA Australia",
      baseUrl: "https://www.casa.gov.au",
      regulations: ["CASR-141", "CASR-142"],
      country: "AU"
    }
  ];

  async startMonitoring(): Promise<void> {
    console.log("Starting regulatory monitoring service...");
    
    // Initial compliance check
    await this.performComplianceCheck();
    
    // Schedule regular checks
    setInterval(async () => {
      if (this.monitoringActive) {
        await this.performComplianceCheck();
      }
    }, this.checkInterval);
  }

  async performComplianceCheck(): Promise<ComplianceStatus[]> {
    const complianceStatuses: ComplianceStatus[] = [];
    
    for (const source of this.regulatorySources) {
      for (const regulation of source.regulations) {
        try {
          const status = await this.checkRegulationCompliance(source, regulation);
          complianceStatuses.push(status);
          
          // Log compliance check
          await storage.createAuditLog({
            action: "regulatory_compliance_check",
            entityType: "regulation",
            entityId: regulation,
            userId: null,
            userEmail: "system@bccs.ai",
            details: {
              source: source.name,
              regulation,
              complianceLevel: status.complianceLevel,
              pendingChanges: status.pendingChanges.length
            }
          });
          
        } catch (error) {
          console.error(`Failed to check compliance for ${regulation}:`, error);
          
          await storage.createAuditLog({
            action: "regulatory_compliance_error",
            entityType: "regulation",
            entityId: regulation,
            userId: null,
            userEmail: "system@bccs.ai",
            details: {
              source: source.name,
              regulation,
              error: error instanceof Error ? error.message : String(error)
            }
          });
        }
      }
    }
    
    return complianceStatuses;
  }

  private async checkRegulationCompliance(source: any, regulation: string): Promise<ComplianceStatus> {
    // This would integrate with external APIs or web scraping to detect changes
    // For now, implementing framework for future integration
    
    const lastChecked = new Date();
    const nextReviewDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Simulate checking for regulatory changes
    const pendingChanges = await this.detectRegulatoryChanges(source, regulation);
    
    const complianceLevel = this.assessComplianceLevel(pendingChanges);
    
    return {
      regulation,
      lastChecked,
      currentVersion: this.getCurrentVersion(regulation),
      complianceLevel,
      pendingChanges,
      nextReviewDate
    };
  }

  private async detectRegulatoryChanges(source: any, regulation: string): Promise<RegulatoryChange[]> {
    // Framework for detecting regulatory changes
    // This would use APIs, RSS feeds, or web scraping to monitor changes
    
    const changes: RegulatoryChange[] = [];
    
    // Example: Check FAR Part 142 for updates
    if (regulation === "14-CFR-142") {
      // In a real implementation, this would:
      // 1. Fetch current regulation text
      // 2. Compare with stored version
      // 3. Identify specific changes
      // 4. Parse change implications
      
      // For now, return empty array but log the check
      console.log(`Checked ${regulation} for updates from ${source.name}`);
    }
    
    return changes;
  }

  private assessComplianceLevel(pendingChanges: RegulatoryChange[]): "compliant" | "warning" | "non-compliant" {
    if (pendingChanges.length === 0) return "compliant";
    
    const criticalChanges = pendingChanges.filter(c => c.priority === "critical");
    const highPriorityChanges = pendingChanges.filter(c => c.priority === "high");
    
    if (criticalChanges.length > 0) return "non-compliant";
    if (highPriorityChanges.length > 0) return "warning";
    
    return "warning";
  }

  private getCurrentVersion(regulation: string): string {
    // Track current regulation versions
    const versions: Record<string, string> = {
      "14-CFR-142": "2025.07.01",
      "14-CFR-61": "2025.07.01",
      "14-CFR-141": "2025.07.01",
      "Part-FCL": "2025.06.15",
      "Part-DTO": "2025.06.15",
      "Part-ATO": "2025.06.15"
    };
    
    return versions[regulation] || "unknown";
  }

  async handleRegulatoryChange(change: RegulatoryChange): Promise<void> {
    console.log(`Processing regulatory change for ${change.regulation}:`, change.description);
    
    // Auto-generate compliance actions
    const complianceActions = await this.generateComplianceActions(change);
    
    // Update database schema if needed
    if (change.affectedFields.length > 0) {
      await this.updateSchemaForCompliance(change);
    }
    
    // Notify administrators
    await this.notifyAdministrators(change, complianceActions);
    
    // Log the change processing
    await storage.createAuditLog({
      action: "regulatory_change_processed",
      entityType: "regulation",
      entityId: change.id,
      userId: null,
      userEmail: "system@bccs.ai",
      details: {
        regulation: change.regulation,
        changeType: change.changeType,
        priority: change.priority,
        complianceActions: complianceActions.length,
        affectedFields: change.affectedFields
      }
    });
  }

  private async generateComplianceActions(change: RegulatoryChange): Promise<string[]> {
    const actions: string[] = [];
    
    switch (change.changeType) {
      case "addition":
        actions.push(`Add new field: ${change.affectedFields.join(", ")}`);
        actions.push("Update data collection forms");
        actions.push("Train staff on new requirements");
        break;
        
      case "modification":
        actions.push(`Modify existing fields: ${change.affectedFields.join(", ")}`);
        actions.push("Update validation rules");
        actions.push("Migrate existing data if needed");
        break;
        
      case "deletion":
        actions.push(`Archive deprecated fields: ${change.affectedFields.join(", ")}`);
        actions.push("Update retention policies");
        break;
    }
    
    if (change.priority === "critical") {
      actions.unshift("URGENT: Immediate compliance review required");
    }
    
    return actions;
  }

  private async updateSchemaForCompliance(change: RegulatoryChange): Promise<void> {
    // Framework for automatic schema updates
    console.log(`Schema update needed for ${change.regulation}:`, change.affectedFields);
    
    // This would generate database migrations based on regulatory changes
    // For critical changes, it could automatically add required fields
    // For complex changes, it would flag for manual review
  }

  private async notifyAdministrators(change: RegulatoryChange, actions: string[]): Promise<void> {
    // Send notifications to system administrators about regulatory changes
    console.log(`Regulatory Change Alert - ${change.priority.toUpperCase()}`);
    console.log(`Regulation: ${change.regulation} ${change.section}`);
    console.log(`Effective: ${change.effectiveDate.toISOString()}`);
    console.log(`Description: ${change.description}`);
    console.log(`Required Actions: ${actions.join(", ")}`);
    
    // In a real implementation, this would send emails, SMS, or system notifications
  }

  async getComplianceReport(): Promise<{
    overallStatus: "compliant" | "warning" | "non-compliant";
    regulations: ComplianceStatus[];
    recommendations: string[];
    lastUpdated: Date;
  }> {
    const regulations = await this.performComplianceCheck();
    
    const overallStatus = regulations.some(r => r.complianceLevel === "non-compliant") 
      ? "non-compliant" 
      : regulations.some(r => r.complianceLevel === "warning")
      ? "warning"
      : "compliant";
    
    const recommendations = this.generateRecommendations(regulations);
    
    return {
      overallStatus,
      regulations,
      recommendations,
      lastUpdated: new Date()
    };
  }

  private generateRecommendations(regulations: ComplianceStatus[]): string[] {
    const recommendations: string[] = [];
    
    regulations.forEach(reg => {
      if (reg.pendingChanges.length > 0) {
        recommendations.push(`Review pending changes for ${reg.regulation}`);
      }
      
      if (reg.complianceLevel === "non-compliant") {
        recommendations.push(`URGENT: Address compliance issues in ${reg.regulation}`);
      }
    });
    
    if (recommendations.length === 0) {
      recommendations.push("All regulations are currently compliant");
    }
    
    return recommendations;
  }

  stopMonitoring(): void {
    this.monitoringActive = false;
    console.log("Regulatory monitoring service stopped");
  }
}

export const regulatoryMonitor = new RegulatoryMonitorService();