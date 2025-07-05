import { db } from "../db";
import { documents, extractedData, trainingEvents } from "@shared/schema";
import { storage } from "../storage";
import { eq } from "drizzle-orm";

// Common training management system interfaces
export interface TrainingRecord {
  studentId: string;
  studentName: string;
  courseId: string;
  courseName: string;
  completionDate: string;
  certificateNumber: string;
  instructorId: string;
  instructorName: string;
  flightHours?: number;
  groundHours?: number;
  checkride?: boolean;
  grade?: string;
  expirationDate?: string;
}

export interface IntegrationConfig {
  systemType: 'flightschedulepro' | 'flightcircle' | 'tafs' | 'flight-training-manager' | 'custom';
  apiUrl: string;
  apiKey: string;
  organizationId: string;
  syncInterval: number; // hours
  lastSync?: Date;
  isActive: boolean;
}

export interface SyncResult {
  success: boolean;
  recordsImported: number;
  errors: string[];
  lastSyncTime: Date;
}

// Flight Schedule Pro integration
export class FlightScheduleProIntegration {
  private config: IntegrationConfig;

  constructor(config: IntegrationConfig) {
    this.config = config;
  }

  async syncTrainingRecords(): Promise<SyncResult> {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/training-records`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const records: TrainingRecord[] = await response.json();
      let importedCount = 0;
      const errors: string[] = [];

      for (const record of records) {
        try {
          await this.importTrainingRecord(record);
          importedCount++;
        } catch (error) {
          errors.push(`Failed to import record ${record.certificateNumber}: ${error}`);
        }
      }

      return {
        success: true,
        recordsImported: importedCount,
        errors,
        lastSyncTime: new Date()
      };
    } catch (error) {
      return {
        success: false,
        recordsImported: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        lastSyncTime: new Date()
      };
    }
  }

  private async importTrainingRecord(record: TrainingRecord): Promise<void> {
    // Create training event from external record
    const trainingEvent = await storage.createTrainingEvent({
      studentName: record.studentName,
      eventType: record.courseName,
      eventDate: new Date(record.completionDate),
      instructorName: record.instructorName,
      organizationId: this.config.organizationId,
      courseType: record.courseName,
      completionDate: new Date(record.completionDate),
      certificateNumber: record.certificateNumber,
      flightHours: record.flightHours || 0,
      groundHours: record.groundHours || 0,
      checkride: record.checkride || false,
      grade: record.grade || 'Pass',
      expirationDate: record.expirationDate ? new Date(record.expirationDate) : null,
      blockchainHash: this.generateBlockchainHash(record),
      source: 'flightschedulepro',
      externalId: record.studentId,
      status: 'completed'
    });

    // Log the import
    await storage.createAuditLog({
      userId: 'system',
      action: 'RECORD_IMPORTED',
      entityType: 'training_event',
      entityId: trainingEvent.id,
      details: `Imported from Flight Schedule Pro: ${record.certificateNumber}`,
      timestamp: new Date()
    });
  }

  private generateBlockchainHash(record: TrainingRecord): string {
    const data = JSON.stringify({
      studentName: record.studentName,
      courseId: record.courseId,
      completionDate: record.completionDate,
      certificateNumber: record.certificateNumber,
      instructorId: record.instructorId
    });
    
    // Simple hash generation for blockchain integrity
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

// Flight Circle integration
export class FlightCircleIntegration {
  private config: IntegrationConfig;

  constructor(config: IntegrationConfig) {
    this.config = config;
  }

  async syncTrainingRecords(): Promise<SyncResult> {
    try {
      const response = await fetch(`${this.config.apiUrl}/v1/training-completions`, {
        headers: {
          'X-API-Key': this.config.apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Flight Circle API Error: ${response.status}`);
      }

      const data = await response.json();
      const records: TrainingRecord[] = data.completions || [];
      let importedCount = 0;
      const errors: string[] = [];

      for (const record of records) {
        try {
          await this.importTrainingRecord(record);
          importedCount++;
        } catch (error) {
          errors.push(`Failed to import Flight Circle record ${record.certificateNumber}: ${error}`);
        }
      }

      return {
        success: true,
        recordsImported: importedCount,
        errors,
        lastSyncTime: new Date()
      };
    } catch (error) {
      return {
        success: false,
        recordsImported: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        lastSyncTime: new Date()
      };
    }
  }

  private async importTrainingRecord(record: TrainingRecord): Promise<void> {
    const trainingEvent = await storage.createTrainingEvent({
      studentName: record.studentName,
      eventType: record.courseName,
      eventDate: new Date(record.completionDate),
      instructorName: record.instructorName,
      organizationId: this.config.organizationId,
      courseType: record.courseName,
      completionDate: new Date(record.completionDate),
      certificateNumber: record.certificateNumber,
      flightHours: record.flightHours || 0,
      groundHours: record.groundHours || 0,
      checkride: record.checkride || false,
      grade: record.grade || 'Pass',
      expirationDate: record.expirationDate ? new Date(record.expirationDate) : null,
      blockchainHash: this.generateBlockchainHash(record),
      source: 'flightcircle',
      externalId: record.studentId,
      status: 'completed'
    });

    await storage.createAuditLog({
      userId: 'system',
      action: 'RECORD_IMPORTED',
      entityType: 'training_event',
      entityId: trainingEvent.id,
      details: `Imported from Flight Circle: ${record.certificateNumber}`,
      timestamp: new Date()
    });
  }

  private generateBlockchainHash(record: TrainingRecord): string {
    const data = JSON.stringify({
      studentName: record.studentName,
      courseId: record.courseId,
      completionDate: record.completionDate,
      certificateNumber: record.certificateNumber,
      instructorId: record.instructorId
    });
    
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}

// TAFS (Training Aircraft Flight Scheduler) integration
export class TAFSIntegration {
  private config: IntegrationConfig;

  constructor(config: IntegrationConfig) {
    this.config = config;
  }

  async syncTrainingRecords(): Promise<SyncResult> {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/v2/training-records`, {
        headers: {
          'Authorization': `Token ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`TAFS API Error: ${response.status}`);
      }

      const data = await response.json();
      const records: TrainingRecord[] = data.training_records || [];
      let importedCount = 0;
      const errors: string[] = [];

      for (const record of records) {
        try {
          await this.importTrainingRecord(record);
          importedCount++;
        } catch (error) {
          errors.push(`Failed to import TAFS record ${record.certificateNumber}: ${error}`);
        }
      }

      return {
        success: true,
        recordsImported: importedCount,
        errors,
        lastSyncTime: new Date()
      };
    } catch (error) {
      return {
        success: false,
        recordsImported: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        lastSyncTime: new Date()
      };
    }
  }

  private async importTrainingRecord(record: TrainingRecord): Promise<void> {
    const trainingEvent = await storage.createTrainingEvent({
      studentName: record.studentName,
      eventType: record.courseName,
      eventDate: new Date(record.completionDate),
      instructorName: record.instructorName,
      organizationId: this.config.organizationId,
      courseType: record.courseName,
      completionDate: new Date(record.completionDate),
      certificateNumber: record.certificateNumber,
      flightHours: record.flightHours || 0,
      groundHours: record.groundHours || 0,
      checkride: record.checkride || false,
      grade: record.grade || 'Pass',
      expirationDate: record.expirationDate ? new Date(record.expirationDate) : null,
      blockchainHash: this.generateBlockchainHash(record),
      source: 'tafs',
      externalId: record.studentId,
      status: 'completed'
    });

    await storage.createAuditLog({
      userId: 'system',
      action: 'RECORD_IMPORTED',
      entityType: 'training_event',
      entityId: trainingEvent.id,
      details: `Imported from TAFS: ${record.certificateNumber}`,
      timestamp: new Date()
    });
  }

  private generateBlockchainHash(record: TrainingRecord): string {
    const data = JSON.stringify({
      studentName: record.studentName,
      courseId: record.courseId,
      completionDate: record.completionDate,
      certificateNumber: record.certificateNumber,
      instructorId: record.instructorId
    });
    
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}

// Integration manager to handle multiple systems
export class TrainingIntegrationManager {
  private integrations: Map<string, any> = new Map();

  addIntegration(config: IntegrationConfig): void {
    let integration;
    
    switch (config.systemType) {
      case 'flightschedulepro':
        integration = new FlightScheduleProIntegration(config);
        break;
      case 'flightcircle':
        integration = new FlightCircleIntegration(config);
        break;
      case 'tafs':
        integration = new TAFSIntegration(config);
        break;
      default:
        throw new Error(`Unsupported system type: ${config.systemType}`);
    }

    this.integrations.set(config.organizationId, integration);
  }

  async syncOrganization(organizationId: string): Promise<SyncResult> {
    const integration = this.integrations.get(organizationId);
    if (!integration) {
      throw new Error(`No integration configured for organization: ${organizationId}`);
    }

    return await integration.syncTrainingRecords();
  }

  async syncAllOrganizations(): Promise<Map<string, SyncResult>> {
    const results = new Map<string, SyncResult>();

    for (const organizationId of this.integrations.keys()) {
      const integration = this.integrations.get(organizationId);
      if (integration) {
        try {
          const result = await integration.syncTrainingRecords();
          results.set(organizationId, result);
        } catch (error) {
          results.set(organizationId, {
            success: false,
            recordsImported: 0,
            errors: [error instanceof Error ? error.message : 'Unknown error'],
            lastSyncTime: new Date()
          });
        }
      }
    }

    return results;
  }

  // Webhook handling for real-time updates
  async handleWebhook(organizationId: string, payload: any): Promise<void> {
    const integration = this.integrations.get(organizationId);
    if (!integration) {
      throw new Error(`No integration configured for organization: ${organizationId}`);
    }

    // Process webhook payload based on system type
    if (payload.event_type === 'training_completed') {
      await this.processTrainingCompletionWebhook(organizationId, payload);
    } else if (payload.event_type === 'certificate_issued') {
      await this.processCertificateIssuanceWebhook(organizationId, payload);
    }
  }

  private async processTrainingCompletionWebhook(organizationId: string, payload: any): Promise<void> {
    const record: TrainingRecord = {
      studentId: payload.student_id,
      studentName: payload.student_name,
      courseId: payload.course_id,
      courseName: payload.course_name,
      completionDate: payload.completion_date,
      certificateNumber: payload.certificate_number,
      instructorId: payload.instructor_id,
      instructorName: payload.instructor_name,
      flightHours: payload.flight_hours,
      groundHours: payload.ground_hours,
      checkride: payload.checkride,
      grade: payload.grade
    };

    // Import the record immediately
    const trainingEvent = await storage.createTrainingEvent({
      studentName: record.studentName,
      eventType: record.courseName,
      eventDate: new Date(record.completionDate),
      instructorName: record.instructorName,
      organizationId: organizationId,
      courseType: record.courseName,
      completionDate: new Date(record.completionDate),
      certificateNumber: record.certificateNumber,
      flightHours: record.flightHours || 0,
      groundHours: record.groundHours || 0,
      checkride: record.checkride || false,
      grade: record.grade || 'Pass',
      blockchainHash: this.generateBlockchainHash(record),
      source: 'webhook',
      externalId: record.studentId,
      status: 'completed'
    });

    await storage.createAuditLog({
      userId: 'system',
      action: 'WEBHOOK_PROCESSED',
      entityType: 'training_event',
      entityId: trainingEvent.id,
      details: `Real-time training completion: ${record.certificateNumber}`,
      timestamp: new Date()
    });
  }

  private async processCertificateIssuanceWebhook(organizationId: string, payload: any): Promise<void> {
    // Handle certificate issuance events
    await storage.createAuditLog({
      userId: 'system',
      action: 'CERTIFICATE_ISSUED',
      entityType: 'training_event',
      entityId: payload.training_event_id,
      details: `Certificate issued: ${payload.certificate_number}`,
      timestamp: new Date()
    });
  }

  private generateBlockchainHash(record: TrainingRecord): string {
    const data = JSON.stringify({
      studentName: record.studentName,
      courseId: record.courseId,
      completionDate: record.completionDate,
      certificateNumber: record.certificateNumber,
      instructorId: record.instructorId
    });
    
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}

// Export singleton instance
export const trainingIntegrationManager = new TrainingIntegrationManager();