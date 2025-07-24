import { eq, desc } from "drizzle-orm";
import type { AlertingService } from "./alerting.js";
import * as schema from "../../shared/schema.js";

export class DataIngestionService {
  private db: any;
  private alertingService: AlertingService;
  private ingestionInterval: NodeJS.Timeout | null = null;

  constructor(database: any, alertingService: AlertingService) {
    this.db = database;
    this.alertingService = alertingService;
  }

  async startMonitoring() {
    console.log("Starting data ingestion monitoring service...");
    
    // Initialize data feeds for existing organizations
    await this.initializeDataFeeds();
    
    // Start periodic monitoring
    this.ingestionInterval = setInterval(async () => {
      try {
        await this.monitorDataFeeds();
      } catch (error) {
        console.error("Data ingestion monitoring error:", error);
      }
    }, 2 * 60 * 1000); // Check every 2 minutes
  }

  async initializeDataFeeds() {
    try {
      const organizations = await this.db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.status, 'active'));

      for (const org of organizations) {
        // Check if data feed already exists
        const existingFeed = await this.db
          .select()
          .from(schema.dataFeeds)
          .where(eq(schema.dataFeeds.organizationId, org.id))
          .limit(1);

        if (existingFeed.length === 0) {
          // Create initial data feed configuration
          await this.db.insert(schema.dataFeeds).values({
            organizationId: org.id,
            sourceSystem: 'bccs142',
            feedType: 'training_events',
            apiEndpoint: `https://${org.name.toLowerCase().replace(/\s+/g, '-')}.bccs142.app/api/regulator/feed`,
            authenticationMethod: 'api_key',
            syncFrequency: 'real_time',
            syncStatus: 'active',
            dataQualityScore: 95.0,
            configurationSettings: {
              enableRealTimeSync: true,
              batchSize: 100,
              retryAttempts: 3,
              timeoutSeconds: 30
            }
          });
        }
      }
    } catch (error) {
      console.error("Error initializing data feeds:", error);
    }
  }

  async monitorDataFeeds() {
    try {
      const activeFeeds = await this.db
        .select()
        .from(schema.dataFeeds)
        .where(eq(schema.dataFeeds.syncStatus, 'active'));

      for (const feed of activeFeeds) {
        await this.processDataFeed(feed);
      }
    } catch (error) {
      console.error("Error monitoring data feeds:", error);
    }
  }

  async processDataFeed(feed: any) {
    try {
      // Simulate real-time data ingestion from BCCS142 systems
      const mockData = await this.simulateDataIngestion(feed);
      
      if (mockData.success) {
        // Process incoming training events
        for (const event of mockData.trainingEvents) {
          await this.processTrainingEvent(event, feed.organizationId);
        }

        // Process compliance metrics
        for (const metric of mockData.complianceMetrics) {
          await this.processComplianceMetric(metric, feed.organizationId);
        }

        // Update feed status
        await this.updateFeedStatus(feed.id, {
          lastSyncTime: new Date(),
          recordsProcessed: mockData.trainingEvents.length + mockData.complianceMetrics.length,
          errorCount: 0,
          dataQualityScore: this.calculateDataQuality(mockData)
        });
      } else {
        await this.handleFeedError(feed, mockData.error);
      }
    } catch (error) {
      console.error(`Error processing data feed ${feed.id}:`, error);
      await this.handleFeedError(feed, error.message);
    }
  }

  async simulateDataIngestion(feed: any): Promise<{
    success: boolean;
    trainingEvents: any[];
    complianceMetrics: any[];
    instructorMetrics: any[];
    error?: string;
  }> {
    // Simulate API call to BCCS142 system
    try {
      // Generate realistic training data based on organization
      const organization = await this.db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.id, feed.organizationId))
        .limit(1);

      if (!organization.length) {
        throw new Error("Organization not found");
      }

      const org = organization[0];
      const now = new Date();
      
      // Generate 1-5 training events per monitoring cycle
      const eventCount = Math.floor(Math.random() * 5) + 1;
      const trainingEvents = [];
      
      for (let i = 0; i < eventCount; i++) {
        const startTime = new Date(now.getTime() - Math.random() * 2 * 60 * 60 * 1000); // Last 2 hours
        const duration = (Math.random() * 3 + 1) * 60 * 60 * 1000; // 1-4 hours
        
        trainingEvents.push({
          studentId: `STU-${Math.floor(Math.random() * 10000)}`,
          instructorId: `INS-${Math.floor(Math.random() * 100)}`,
          courseType: this.getRandomCourseType(),
          lessonType: this.getRandomLessonType(),
          aircraftType: this.getRandomAircraftType(),
          startTime,
          endTime: new Date(startTime.getTime() + duration),
          completionStatus: Math.random() > 0.05 ? 'completed' : 'failed', // 95% completion rate
          qualityScore: Math.random() * 20 + 80, // 80-100
          safetyScore: Math.random() * 15 + 85, // 85-100
          documentationComplete: Math.random() > 0.1, // 90% documentation complete
          complianceChecks: this.generateComplianceChecks(),
          blockchainHash: this.generateMockHash()
        });
      }

      // Generate compliance metrics
      const complianceMetrics = [
        {
          metricType: 'overall_score',
          value: this.generateRealisticScore(org.complianceScore || 85),
          category: 'compliance',
          unit: 'percentage'
        },
        {
          metricType: 'training_quality',
          value: Math.random() * 10 + 85, // 85-95
          category: 'quality',
          unit: 'score'
        },
        {
          metricType: 'safety_incidents',
          value: Math.random() > 0.98 ? 1 : 0, // 2% chance of incident
          category: 'safety',
          unit: 'count'
        }
      ];

      return {
        success: true,
        trainingEvents,
        complianceMetrics,
        instructorMetrics: []
      };
    } catch (error) {
      return {
        success: false,
        trainingEvents: [],
        complianceMetrics: [],
        instructorMetrics: [],
        error: error.message
      };
    }
  }

  async processTrainingEvent(eventData: any, organizationId: string) {
    try {
      // Check if event already exists (prevent duplicates)
      const existingEvent = await this.db
        .select()
        .from(schema.trainingEvents)
        .where(eq(schema.trainingEvents.externalId, eventData.externalId))
        .limit(1);

      if (existingEvent.length > 0) {
        return; // Skip duplicate
      }

      // Insert training event
      await this.db.insert(schema.trainingEvents).values({
        organizationId,
        externalId: eventData.externalId || `${organizationId}-${Date.now()}-${Math.random()}`,
        studentId: eventData.studentId,
        instructorId: eventData.instructorId,
        courseType: eventData.courseType,
        lessonType: eventData.lessonType,
        aircraftType: eventData.aircraftType,
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        completionStatus: eventData.completionStatus,
        complianceChecks: eventData.complianceChecks,
        qualityScore: eventData.qualityScore,
        safetyScore: eventData.safetyScore,
        documentationComplete: eventData.documentationComplete,
        blockchainHash: eventData.blockchainHash
      });

      // Check for compliance violations
      await this.checkEventCompliance(eventData, organizationId);
    } catch (error) {
      console.error("Error processing training event:", error);
    }
  }

  async processComplianceMetric(metricData: any, organizationId: string) {
    try {
      await this.db.insert(schema.complianceMetrics).values({
        organizationId,
        metricType: metricData.metricType,
        value: metricData.value,
        category: metricData.category,
        unit: metricData.unit,
        calculatedBy: 'system',
        metadata: metricData.metadata || {}
      });

      // Update organization compliance score if it's an overall score
      if (metricData.metricType === 'overall_score') {
        await this.db
          .update(schema.organizations)
          .set({ 
            complianceScore: metricData.value,
            updatedAt: new Date()
          })
          .where(eq(schema.organizations.id, organizationId));
      }
    } catch (error) {
      console.error("Error processing compliance metric:", error);
    }
  }

  async checkEventCompliance(eventData: any, organizationId: string) {
    const violations = [];

    // Check documentation compliance
    if (!eventData.documentationComplete) {
      violations.push({
        violationType: 'documentation',
        severity: 'minor',
        description: 'Incomplete training documentation',
        regulatoryReference: '14 CFR 142.73'
      });
    }

    // Check quality standards
    if (eventData.qualityScore < 70) {
      violations.push({
        violationType: 'procedure',
        severity: eventData.qualityScore < 50 ? 'major' : 'minor',
        description: `Training quality below standards: ${eventData.qualityScore}%`,
        regulatoryReference: '14 CFR 142.37'
      });
    }

    // Check safety standards
    if (eventData.safetyScore < 85) {
      violations.push({
        violationType: 'safety',
        severity: eventData.safetyScore < 70 ? 'critical' : 'major',
        description: `Safety score below minimum: ${eventData.safetyScore}%`,
        regulatoryReference: '14 CFR 142.39'
      });
    }

    // Insert violations and create alerts
    for (const violation of violations) {
      const violationRecord = await this.db.insert(schema.complianceViolations).values({
        organizationId,
        violationType: violation.violationType,
        severity: violation.severity,
        description: violation.description,
        regulatoryReference: violation.regulatoryReference,
        detectedBy: 'ai_analysis',
        evidence: {
          trainingEventId: eventData.externalId,
          qualityScore: eventData.qualityScore,
          safetyScore: eventData.safetyScore,
          timestamp: new Date()
        }
      }).returning();

      // Create alert for major/critical violations
      if (['major', 'critical'].includes(violation.severity)) {
        const organization = await this.db
          .select()
          .from(schema.organizations)
          .where(eq(schema.organizations.id, organizationId))
          .limit(1);

        if (organization.length > 0) {
          await this.alertingService.createAlert({
            alertType: 'compliance_issue',
            severity: violation.severity === 'critical' ? 'critical' : 'warning',
            title: `${violation.severity.toUpperCase()} Compliance Violation`,
            description: violation.description,
            affectedOrganizations: [organizationId],
            affectedRegions: [organization[0].region],
            recommendedActions: [
              'Review training procedures',
              'Investigate root cause',
              'Implement corrective action',
              'Schedule follow-up monitoring'
            ],
            regulatoryBasis: violation.regulatoryReference
          });
        }
      }
    }
  }

  async updateFeedStatus(feedId: string, updates: any) {
    try {
      await this.db
        .update(schema.dataFeeds)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(schema.dataFeeds.id, feedId));
    } catch (error) {
      console.error("Error updating feed status:", error);
    }
  }

  async handleFeedError(feed: any, errorMessage: string) {
    try {
      const newErrorCount = (feed.errorCount || 0) + 1;
      
      await this.db
        .update(schema.dataFeeds)
        .set({
          errorCount: newErrorCount,
          lastError: errorMessage,
          syncStatus: newErrorCount >= 5 ? 'error' : 'active', // Disable after 5 consecutive errors
          updatedAt: new Date()
        })
        .where(eq(schema.dataFeeds.id, feed.id));

      // Create alert for persistent errors
      if (newErrorCount >= 3) {
        const organization = await this.db
          .select()
          .from(schema.organizations)
          .where(eq(schema.organizations.id, feed.organizationId))
          .limit(1);

        if (organization.length > 0) {
          await this.alertingService.createAlert({
            alertType: 'compliance_issue',
            severity: newErrorCount >= 5 ? 'critical' : 'warning',
            title: `Data Feed Error - ${organization[0].name}`,
            description: `Data feed has failed ${newErrorCount} times. Latest error: ${errorMessage}`,
            affectedOrganizations: [feed.organizationId],
            affectedRegions: [organization[0].region],
            recommendedActions: [
              'Check network connectivity',
              'Verify API credentials',
              'Contact organization IT support',
              'Review feed configuration'
            ]
          });
        }
      }
    } catch (error) {
      console.error("Error handling feed error:", error);
    }
  }

  private getRandomCourseType(): string {
    const types = ['PPL', 'CPL', 'ATPL', 'IR', 'MEL', 'Type Rating', 'Recurrent'];
    return types[Math.floor(Math.random() * types.length)];
  }

  private getRandomLessonType(): string {
    const types = ['Ground School', 'Flight Training', 'Simulator', 'Check Ride', 'Proficiency Check'];
    return types[Math.floor(Math.random() * types.length)];
  }

  private getRandomAircraftType(): string {
    const types = ['C172', 'C182', 'PA-28', 'B737-800', 'A320', 'Simulator'];
    return types[Math.floor(Math.random() * types.length)];
  }

  private generateComplianceChecks(): any {
    return {
      preflightCheck: Math.random() > 0.05,
      documentationCheck: Math.random() > 0.1,
      safetyBriefing: Math.random() > 0.02,
      postflightDebrief: Math.random() > 0.05,
      logbookEntry: Math.random() > 0.08
    };
  }

  private generateMockHash(): string {
    return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }

  private generateRealisticScore(baseScore: number): number {
    // Generate score that varies slightly from base score
    const variation = (Math.random() - 0.5) * 10; // ±5 points
    return Math.max(0, Math.min(100, baseScore + variation));
  }

  private calculateDataQuality(data: any): number {
    let qualityScore = 100;
    
    // Reduce score for missing fields or invalid data
    data.trainingEvents.forEach((event: any) => {
      if (!event.documentationComplete) qualityScore -= 2;
      if (!event.blockchainHash) qualityScore -= 5;
      if (event.qualityScore < 70) qualityScore -= 3;
    });

    return Math.max(70, qualityScore); // Minimum 70% quality score
  }

  async getDataFeedStatus(): Promise<any[]> {
    try {
      const feeds = await this.db
        .select({
          feed: schema.dataFeeds,
          organization: schema.organizations
        })
        .from(schema.dataFeeds)
        .leftJoin(schema.organizations, eq(schema.organizations.id, schema.dataFeeds.organizationId))
        .orderBy(desc(schema.dataFeeds.lastSyncTime));

      return feeds;
    } catch (error) {
      console.error("Error getting data feed status:", error);
      return [];
    }
  }

  stopMonitoring() {
    if (this.ingestionInterval) {
      clearInterval(this.ingestionInterval);
      this.ingestionInterval = null;
      console.log("Data ingestion monitoring stopped");
    }
  }
}