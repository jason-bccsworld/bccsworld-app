import { eq, desc, and, gte, sql } from "drizzle-orm";
import type { WebSocketServer } from "ws";
import * as schema from "../../shared/schema.js";

export class AlertingService {
  private db: any;
  private wss: WebSocketServer;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(database: any, webSocketServer: WebSocketServer) {
    this.db = database;
    this.wss = webSocketServer;
  }

  async startMonitoring() {
    console.log("Starting regulatory alerting service...");
    
    // Run initial alert check
    await this.checkForNewAlerts();
    
    // Schedule recurring alert monitoring every 5 minutes
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkForNewAlerts();
      } catch (error) {
        console.error("Alert monitoring error:", error);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  async checkForNewAlerts() {
    try {
      await Promise.all([
        this.checkComplianceViolationAlerts(),
        this.checkRiskEscalationAlerts(),
        this.checkTrendAlerts(),
        this.checkAuditDeadlineAlerts(),
        this.checkInstructorCertificationAlerts()
      ]);
    } catch (error) {
      console.error("Error checking for new alerts:", error);
    }
  }

  async checkComplianceViolationAlerts() {
    try {
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      // Check for new critical violations
      const criticalViolations = await this.db
        .select({
          violation: schema.complianceViolations,
          organization: schema.organizations
        })
        .from(schema.complianceViolations)
        .innerJoin(schema.organizations, eq(schema.organizations.id, schema.complianceViolations.organizationId))
        .where(
          and(
            eq(schema.complianceViolations.severity, 'critical'),
            gte(schema.complianceViolations.detectedAt, last24Hours),
            eq(schema.complianceViolations.resolutionStatus, 'open')
          )
        );

      for (const { violation, organization } of criticalViolations) {
        await this.createAlert({
          alertType: 'compliance_issue',
          severity: 'critical',
          title: `Critical Compliance Violation - ${organization.name}`,
          description: `Critical violation detected: ${violation.description}`,
          affectedOrganizations: [organization.id],
          affectedRegions: [organization.region],
          recommendedActions: [
            'Immediate investigation required',
            'Suspend training operations if necessary',
            'Contact organization leadership',
            'Schedule emergency audit'
          ],
          regulatoryBasis: violation.regulatoryReference || 'Multiple CFR sections',
          deadline: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours to respond
        });
      }

      // Check for patterns of multiple violations
      const organizationsWithMultipleViolations = await this.db
        .select({
          organizationId: schema.complianceViolations.organizationId,
          organization: schema.organizations,
          violationCount: sql<number>`COUNT(${schema.complianceViolations.id})`,
          majorViolations: sql<number>`COUNT(CASE WHEN ${schema.complianceViolations.severity} IN ('major', 'critical') THEN 1 END)`
        })
        .from(schema.complianceViolations)
        .innerJoin(schema.organizations, eq(schema.organizations.id, schema.complianceViolations.organizationId))
        .where(
          and(
            gte(schema.complianceViolations.detectedAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)), // Last 30 days
            eq(schema.complianceViolations.resolutionStatus, 'open')
          )
        )
        .groupBy(schema.complianceViolations.organizationId, schema.organizations.id)
        .having(sql`COUNT(${schema.complianceViolations.id}) >= 3`);

      for (const orgData of organizationsWithMultipleViolations) {
        await this.createAlert({
          alertType: 'trend_alert',
          severity: orgData.majorViolations >= 2 ? 'critical' : 'warning',
          title: `Multiple Violations Pattern - ${orgData.organization.name}`,
          description: `Organization has ${orgData.violationCount} open violations in the last 30 days, including ${orgData.majorViolations} major/critical violations`,
          affectedOrganizations: [orgData.organizationId],
          affectedRegions: [orgData.organization.region],
          recommendedActions: [
            'Schedule comprehensive audit',
            'Review organizational processes',
            'Increase monitoring frequency',
            'Consider corrective action plan'
          ]
        });
      }
    } catch (error) {
      console.error("Error checking compliance violation alerts:", error);
    }
  }

  async checkRiskEscalationAlerts() {
    try {
      // Check for organizations with escalating risk levels
      const highRiskOrganizations = await this.db
        .select()
        .from(schema.organizations)
        .where(
          and(
            eq(schema.organizations.status, 'active'),
            eq(schema.organizations.riskLevel, 'high')
          )
        );

      for (const org of highRiskOrganizations) {
        // Check if risk level has increased recently
        const recentTrends = await this.db
          .select()
          .from(schema.trendAnalysis)
          .where(
            and(
              eq(schema.trendAnalysis.scope, 'organization'),
              eq(schema.trendAnalysis.scopeId, org.id),
              eq(schema.trendAnalysis.analysisType, 'risk_trend'),
              gte(schema.trendAnalysis.generatedAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
            )
          )
          .orderBy(desc(schema.trendAnalysis.generatedAt))
          .limit(1);

        if (recentTrends.length > 0 && recentTrends[0].trendDirection === 'declining') {
          await this.createAlert({
            alertType: 'prediction_warning',
            severity: 'warning',
            title: `Escalating Risk Level - ${org.name}`,
            description: `Organization risk level trending upward. Current level: HIGH. Immediate attention required.`,
            affectedOrganizations: [org.id],
            affectedRegions: [org.region],
            recommendedActions: [
              'Conduct immediate risk assessment',
              'Review recent compliance metrics',
              'Schedule intervention meeting',
              'Implement enhanced monitoring'
            ],
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
          });
        }
      }
    } catch (error) {
      console.error("Error checking risk escalation alerts:", error);
    }
  }

  async checkTrendAlerts() {
    try {
      const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      // Check for declining compliance trends
      const decliningTrends = await this.db
        .select({
          trend: schema.trendAnalysis,
          organization: schema.organizations
        })
        .from(schema.trendAnalysis)
        .leftJoin(schema.organizations, eq(schema.organizations.id, schema.trendAnalysis.scopeId))
        .where(
          and(
            eq(schema.trendAnalysis.trendDirection, 'declining'),
            eq(schema.trendAnalysis.analysisType, 'compliance_trend'),
            gte(schema.trendAnalysis.generatedAt, last7Days),
            gte(schema.trendAnalysis.significance, 0.3) // Only significant trends
          )
        );

      for (const { trend, organization } of decliningTrends) {
        if (organization) {
          await this.createAlert({
            alertType: 'trend_alert',
            severity: trend.significance >= 0.7 ? 'critical' : 'warning',
            title: `Declining Compliance Trend - ${organization.name}`,
            description: `Significant declining trend detected in compliance metrics. Confidence: ${(trend.confidence * 100).toFixed(1)}%`,
            affectedOrganizations: [organization.id],
            affectedRegions: [organization.region],
            recommendedActions: [
              'Investigate root causes',
              'Review training procedures',
              'Implement corrective measures',
              'Monitor closely'
            ]
          });
        }
      }

      // Check for regional trends
      const regionalDeclines = await this.db
        .select()
        .from(schema.trendAnalysis)
        .where(
          and(
            eq(schema.trendAnalysis.scope, 'region'),
            eq(schema.trendAnalysis.trendDirection, 'declining'),
            eq(schema.trendAnalysis.analysisType, 'compliance_trend'),
            gte(schema.trendAnalysis.generatedAt, last7Days),
            gte(schema.trendAnalysis.significance, 0.4)
          )
        );

      for (const trend of regionalDeclines) {
        const affectedOrgs = await this.db
          .select({ id: schema.organizations.id })
          .from(schema.organizations)
          .where(
            and(
              eq(schema.organizations.region, trend.scopeId),
              eq(schema.organizations.status, 'active')
            )
          );

        await this.createAlert({
          alertType: 'trend_alert',
          severity: 'warning',
          title: `Regional Compliance Decline - ${trend.scopeId}`,
          description: `Regional compliance trend showing decline across ${affectedOrgs.length} organizations`,
          affectedOrganizations: affectedOrgs.map(org => org.id),
          affectedRegions: [trend.scopeId],
          recommendedActions: [
            'Regional investigation required',
            'Review common factors',
            'Coordinate response across organizations',
            'Implement regional corrective action plan'
          ]
        });
      }
    } catch (error) {
      console.error("Error checking trend alerts:", error);
    }
  }

  async checkAuditDeadlineAlerts() {
    try {
      const next30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const next7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      // Check for upcoming audit deadlines
      const upcomingAudits = await this.db
        .select({
          organization: schema.organizations,
          audit: schema.auditActivities
        })
        .from(schema.auditActivities)
        .innerJoin(schema.organizations, eq(schema.organizations.id, schema.auditActivities.organizationId))
        .where(
          and(
            eq(schema.auditActivities.status, 'planned'),
            gte(schema.auditActivities.startDate, new Date()),
            lte(schema.auditActivities.startDate, next30Days)
          )
        );

      for (const { organization, audit } of upcomingAudits) {
        const daysUntilAudit = Math.ceil((audit.startDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
        const severity = daysUntilAudit <= 7 ? 'warning' : 'info';

        await this.createAlert({
          alertType: 'compliance_deadline',
          severity,
          title: `Upcoming Audit - ${organization.name}`,
          description: `Scheduled ${audit.auditType} audit in ${daysUntilAudit} days`,
          affectedOrganizations: [organization.id],
          affectedRegions: [organization.region],
          recommendedActions: [
            'Prepare audit documentation',
            'Schedule pre-audit meeting',
            'Review compliance status',
            'Notify organization'
          ],
          deadline: audit.startDate
        });
      }

      // Check for overdue corrective actions
      const overdueActions = await this.db
        .select({
          organization: schema.organizations,
          audit: schema.auditActivities
        })
        .from(schema.auditActivities)
        .innerJoin(schema.organizations, eq(schema.organizations.id, schema.auditActivities.organizationId))
        .where(
          and(
            eq(schema.auditActivities.correctiveActionsRequired, true),
            lte(schema.auditActivities.correctiveActionDeadline, new Date()),
            eq(schema.auditActivities.status, 'completed')
          )
        );

      for (const { organization, audit } of overdueActions) {
        await this.createAlert({
          alertType: 'compliance_deadline',
          severity: 'critical',
          title: `Overdue Corrective Actions - ${organization.name}`,
          description: `Corrective actions from ${audit.auditType} audit are overdue`,
          affectedOrganizations: [organization.id],
          affectedRegions: [organization.region],
          recommendedActions: [
            'Contact organization immediately',
            'Request status update',
            'Consider enforcement action',
            'Schedule follow-up audit'
          ]
        });
      }
    } catch (error) {
      console.error("Error checking audit deadline alerts:", error);
    }
  }

  async checkInstructorCertificationAlerts() {
    try {
      const next90Days = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      const next30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      // Check for expiring instructor certifications
      const expiringCertifications = await this.db
        .select({
          instructor: schema.instructorMetrics,
          organization: schema.organizations
        })
        .from(schema.instructorMetrics)
        .innerJoin(schema.organizations, eq(schema.organizations.id, schema.instructorMetrics.organizationId))
        .where(
          and(
            eq(schema.instructorMetrics.activeStatus, true),
            lte(schema.instructorMetrics.certificationExpiry, next90Days),
            gte(schema.instructorMetrics.certificationExpiry, new Date())
          )
        );

      for (const { instructor, organization } of expiringCertifications) {
        const daysUntilExpiry = Math.ceil((instructor.certificationExpiry.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
        const severity = daysUntilExpiry <= 30 ? 'warning' : 'info';

        await this.createAlert({
          alertType: 'regulatory_change',
          severity,
          title: `Instructor Certification Expiring - ${instructor.instructorName}`,
          description: `Instructor certification expires in ${daysUntilExpiry} days at ${organization.name}`,
          affectedOrganizations: [organization.id],
          affectedRegions: [organization.region],
          recommendedActions: [
            'Notify organization',
            'Schedule recertification',
            'Review training schedule impact',
            'Prepare backup instructor plan'
          ],
          deadline: instructor.certificationExpiry
        });
      }
    } catch (error) {
      console.error("Error checking instructor certification alerts:", error);
    }
  }

  async createAlert(alertData: {
    alertType: string;
    severity: string;
    title: string;
    description: string;
    affectedOrganizations?: string[];
    affectedRegions?: string[];
    recommendedActions?: string[];
    regulatoryBasis?: string;
    deadline?: Date;
  }) {
    try {
      // Check if similar alert already exists
      const existingAlert = await this.db
        .select()
        .from(schema.regulatoryAlerts)
        .where(
          and(
            eq(schema.regulatoryAlerts.title, alertData.title),
            eq(schema.regulatoryAlerts.status, 'active'),
            gte(schema.regulatoryAlerts.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
          )
        )
        .limit(1);

      if (existingAlert.length > 0) {
        return; // Don't create duplicate alerts
      }

      // Create new alert
      const newAlert = await this.db
        .insert(schema.regulatoryAlerts)
        .values({
          alertType: alertData.alertType,
          severity: alertData.severity,
          title: alertData.title,
          description: alertData.description,
          affectedOrganizations: alertData.affectedOrganizations || [],
          affectedRegions: alertData.affectedRegions || [],
          recommendedActions: alertData.recommendedActions || [],
          regulatoryBasis: alertData.regulatoryBasis,
          deadline: alertData.deadline,
          status: 'active'
        })
        .returning();

      // Broadcast alert to connected inspectors via WebSocket
      this.broadcastAlert(newAlert[0]);

      console.log(`📢 Alert created: ${alertData.severity.toUpperCase()} - ${alertData.title}`);
    } catch (error) {
      console.error("Error creating alert:", error);
    }
  }

  private broadcastAlert(alert: any) {
    const alertMessage = {
      type: 'regulatory_alert',
      alert: {
        id: alert.id,
        alertType: alert.alertType,
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        affectedOrganizations: alert.affectedOrganizations,
        affectedRegions: alert.affectedRegions,
        recommendedActions: alert.recommendedActions,
        deadline: alert.deadline,
        createdAt: alert.createdAt
      },
      timestamp: new Date().toISOString()
    };

    // Broadcast to all connected inspectors
    this.wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        try {
          client.send(JSON.stringify(alertMessage));
        } catch (error) {
          console.error("Error broadcasting alert:", error);
        }
      }
    });
  }

  async getActiveAlerts(inspectorRegion?: string): Promise<any[]> {
    try {
      let query = this.db
        .select()
        .from(schema.regulatoryAlerts)
        .where(eq(schema.regulatoryAlerts.status, 'active'));

      if (inspectorRegion) {
        query = query.where(
          sql`${schema.regulatoryAlerts.affectedRegions} ? ${inspectorRegion}`
        );
      }

      const alerts = await query
        .orderBy(
          desc(schema.regulatoryAlerts.severity),
          desc(schema.regulatoryAlerts.createdAt)
        )
        .limit(100);

      return alerts;
    } catch (error) {
      console.error("Error getting active alerts:", error);
      return [];
    }
  }

  async acknowledgeAlert(alertId: string, inspectorId: string): Promise<boolean> {
    try {
      const alert = await this.db
        .select()
        .from(schema.regulatoryAlerts)
        .where(eq(schema.regulatoryAlerts.id, alertId))
        .limit(1);

      if (alert.length === 0) {
        return false;
      }

      const currentAcknowledged = alert[0].acknowledgedBy || [];
      if (!currentAcknowledged.includes(inspectorId)) {
        currentAcknowledged.push(inspectorId);
      }

      await this.db
        .update(schema.regulatoryAlerts)
        .set({
          acknowledgedBy: currentAcknowledged,
          acknowledgedAt: new Date()
        })
        .where(eq(schema.regulatoryAlerts.id, alertId));

      return true;
    } catch (error) {
      console.error("Error acknowledging alert:", error);
      return false;
    }
  }

  async resolveAlert(alertId: string, inspectorId: string): Promise<boolean> {
    try {
      await this.db
        .update(schema.regulatoryAlerts)
        .set({
          status: 'resolved',
          resolvedAt: new Date()
        })
        .where(eq(schema.regulatoryAlerts.id, alertId));

      // Broadcast resolution to connected inspectors
      this.wss.clients.forEach(client => {
        if (client.readyState === 1) {
          try {
            client.send(JSON.stringify({
              type: 'alert_resolved',
              alertId,
              resolvedBy: inspectorId,
              timestamp: new Date().toISOString()
            }));
          } catch (error) {
            console.error("Error broadcasting alert resolution:", error);
          }
        }
      });

      return true;
    } catch (error) {
      console.error("Error resolving alert:", error);
      return false;
    }
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log("Alerting service monitoring stopped");
    }
  }
}