import { storage } from "../storage";

export interface ChecklistChange {
  type: 'addition' | 'modification' | 'deletion';
  area: string;
  itemNumber: string;
  description: string;
  newRequirement?: string;
  oldRequirement?: string;
  effectiveDate: string;
  reference: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  actionRequired: string;
}

export interface RegulatoryUpdate {
  id: string;
  source: 'FAA' | 'EASA' | 'Transport Canada' | 'CASA Australia';
  regulation: string;
  title: string;
  description: string;
  effectiveDate: string;
  publishDate: string;
  category: 'training-center' | 'instructor-qualification' | 'equipment' | 'operations' | 'audit-checklist';
  priority: 'low' | 'medium' | 'high' | 'critical';
  checklistChanges: ChecklistChange[];
  complianceDeadline: string;
  organizationsAffected: string[];
  documentLink: string;
  processedAt: Date;
}

export interface MonitoringAlert {
  id: string;
  type: 'checklist-update' | 'compliance-deadline' | 'new-requirement' | 'equipment-standard';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  organizationId?: string;
  checklistItems?: string[];
  dueDate?: string;
  actionItems: string[];
  createdAt: Date;
  acknowledged: boolean;
}

export class RegulatoryMonitoringService {
  private lastCheckDate: Date = new Date();
  private monitoredSources = [
    { 
      name: 'FAA eCFR',
      url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-142',
      regulation: '14-CFR-142',
      checklistSource: 'https://www.faa.gov/documentlibrary/media/order/8900.1/volume2/2_010_00.pdf'
    },
    {
      name: 'FAA Order 8900.1',
      url: 'https://www.faa.gov/documentlibrary/media/order/8900.1/',
      regulation: 'FAA-8900.1',
      checklistSource: 'https://www.faa.gov/documentlibrary/media/order/8900.1/volume3/3_054_00.pdf'
    },
    {
      name: 'EASA Part-FCL',
      url: 'https://www.easa.europa.eu/domains/air-operations/flight-crew-licensing',
      regulation: 'EASA-FCL',
      checklistSource: 'https://www.easa.europa.eu/document-library/certification-specifications'
    }
  ];

  async monitorRegulatoryChanges(): Promise<RegulatoryUpdate[]> {
    console.log('Starting regulatory monitoring service...');
    const updates: RegulatoryUpdate[] = [];

    for (const source of this.monitoredSources) {
      try {
        const sourceUpdates = await this.checkSource(source);
        updates.push(...sourceUpdates);
        
        // Create audit log entry
        await storage.createAuditLog({
          id: `monitor-${Date.now()}`,
          userId: 'system',
          eventType: 'regulatory_check',
          severity: 'info',
          message: `Checked ${source.name} for updates`,
          details: {
            resourceType: 'regulation',
            resourceId: source.regulation,
            ipAddress: '127.0.0.1'
          },
          timestamp: new Date()
        });
        
        console.log(`Checked ${source.regulation} for updates from ${source.name}`);
      } catch (error) {
        console.error(`Error monitoring ${source.name}:`, error);
      }
    }

    // Process checklist-specific updates
    const checklistUpdates = await this.processChecklistUpdates(updates);
    
    return checklistUpdates;
  }

  private async checkSource(source: any): Promise<RegulatoryUpdate[]> {
    // Simulate regulatory monitoring - in production, this would:
    // 1. Fetch from actual regulatory APIs
    // 2. Parse regulatory documents
    // 3. Compare against previous versions
    // 4. Extract checklist-specific changes
    
    const updates: RegulatoryUpdate[] = [];
    
    // Mock example of a checklist update
    if (source.regulation === '14-CFR-142') {
      const mockUpdate: RegulatoryUpdate = {
        id: `update-${Date.now()}`,
        source: 'FAA',
        regulation: '14-CFR-142',
        title: 'Part 142 Training Center Inspection Checklist Update',
        description: 'Updated inspection checklist to include new quality management requirements',
        effectiveDate: '2025-09-01',
        publishDate: '2025-07-06',
        category: 'audit-checklist',
        priority: 'high',
        checklistChanges: [
          {
            type: 'addition',
            area: 'Area 10 - Quality Control Measures',
            itemNumber: '10-03',
            description: 'Does the center maintain a risk management system for quality control?',
            newRequirement: 'Training centers must implement and maintain a documented risk management system as part of their quality control program, including risk assessment procedures, mitigation strategies, and regular review processes.',
            effectiveDate: '2025-09-01',
            reference: '142.11(f), V2 C10 S1 P2-1155',
            impact: 'high',
            actionRequired: 'Implement risk management system documentation and procedures'
          },
          {
            type: 'modification',
            area: 'Area 1 - Management and Administration',
            itemNumber: '1-05',
            description: 'English proficiency requirements updated',
            oldRequirement: 'Does each management representative, and all personnel who conduct direct student training, understand, read, write, and fluently speak English?',
            newRequirement: 'Does each management representative, and all personnel who conduct direct student training, demonstrate English proficiency meeting ICAO Level 4 standards in reading, writing, speaking, and listening comprehension?',
            effectiveDate: '2025-09-01',
            reference: '142.13(d), V3 C54 S2 P3-4354',
            impact: 'medium',
            actionRequired: 'Update English proficiency testing and documentation procedures'
          }
        ],
        complianceDeadline: '2025-12-31',
        organizationsAffected: ['all-part-142'],
        documentLink: 'https://www.faa.gov/documentlibrary/media/order/8900.1/volume3/3_054_00.pdf',
        processedAt: new Date()
      };
      
      updates.push(mockUpdate);
    }

    return updates;
  }

  private async processChecklistUpdates(updates: RegulatoryUpdate[]): Promise<RegulatoryUpdate[]> {
    const checklistUpdates = updates.filter(update => 
      update.category === 'audit-checklist' || update.checklistChanges.length > 0
    );

    for (const update of checklistUpdates) {
      // Create alerts for organizations
      await this.createComplianceAlerts(update);
      
      // Update regulatory changes table
      await this.recordRegulatoryChange(update);
    }

    return updates;
  }

  private async createComplianceAlerts(update: RegulatoryUpdate): Promise<void> {
    for (const checklistChange of update.checklistChanges) {
      const alert: MonitoringAlert = {
        id: `alert-${Date.now()}-${Math.random()}`,
        type: 'checklist-update',
        title: `Part 142 Checklist Update: ${checklistChange.area}`,
        description: `${checklistChange.type.toUpperCase()}: ${checklistChange.description}`,
        severity: this.getSeverityFromImpact(checklistChange.impact),
        checklistItems: [checklistChange.itemNumber],
        dueDate: update.complianceDeadline,
        actionItems: [
          checklistChange.actionRequired,
          'Review updated checklist item',
          'Update internal procedures',
          'Train staff on new requirements'
        ],
        createdAt: new Date(),
        acknowledged: false
      };

      // In production, send notifications to affected organizations
      console.log(`Created alert for checklist update: ${alert.title}`);
    }
  }

  private async recordRegulatoryChange(update: RegulatoryUpdate): Promise<void> {
    // regulatoryChanges is not part of the current schema; keep as a plain object.
    const changeRecord = {
      id: update.id,
      source: update.source,
      regulation: update.regulation,
      title: update.title,
      description: update.description,
      effectiveDate: new Date(update.effectiveDate),
      publishDate: new Date(update.publishDate),
      category: update.category,
      priority: update.priority,
      complianceDeadline: new Date(update.complianceDeadline),
      documentLink: update.documentLink,
      checklistChanges: JSON.stringify(update.checklistChanges),
      organizationsAffected: update.organizationsAffected,
      processedAt: update.processedAt,
      complianceStatus: 'pending'
    };

    // Store in database (would be implemented in storage service)
    console.log(`Recorded regulatory change: ${changeRecord.title}`);
  }

  private getSeverityFromImpact(impact: string): 'info' | 'warning' | 'critical' {
    switch (impact) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'critical';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'info';
    }
  }

  async getActiveAlerts(organizationId?: string): Promise<MonitoringAlert[]> {
    // Return unacknowledged alerts for the organization
    const mockAlerts: MonitoringAlert[] = [
      {
        id: 'alert-1',
        type: 'checklist-update',
        title: 'Part 142 Checklist Update: Quality Control Measures',
        description: 'ADDITION: New risk management system requirement',
        severity: 'critical',
        organizationId: organizationId,
        checklistItems: ['10-03'],
        dueDate: '2025-12-31',
        actionItems: [
          'Implement risk management system documentation',
          'Update quality control procedures',
          'Train quality control personnel'
        ],
        createdAt: new Date(),
        acknowledged: false
      }
    ];

    return mockAlerts;
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    // Mark alert as acknowledged
    await storage.createAuditLog({
      id: `ack-${Date.now()}`,
      userId: userId,
      eventType: 'alert_acknowledged',
      severity: 'info',
      message: `Acknowledged regulatory alert: ${alertId}`,
      details: {
        resourceType: 'regulatory_alert',
        resourceId: alertId,
        ipAddress: '127.0.0.1'
      },
      timestamp: new Date()
    });
  }

  async getChecklistVersionHistory(): Promise<Array<{
    version: string;
    releaseDate: string;
    changes: ChecklistChange[];
    source: string;
  }>> {
    return [
      {
        version: '2025.1',
        releaseDate: '2025-07-06',
        changes: [
          {
            type: 'addition',
            area: 'Area 10 - Quality Control Measures',
            itemNumber: '10-03',
            description: 'Risk management system requirement',
            newRequirement: 'Training centers must implement and maintain a documented risk management system',
            effectiveDate: '2025-09-01',
            reference: '142.11(f)',
            impact: 'high',
            actionRequired: 'Implement risk management system'
          }
        ],
        source: 'FAA Order 8900.1'
      }
    ];
  }
}

export const regulatoryMonitoringService = new RegulatoryMonitoringService();