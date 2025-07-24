import express from "express";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import * as schema from "../shared/schema.js";

export function setupRoutes(app: express.Application, services: {
  db: any;
  analyticsEngine: any;
  trendAnalysis: any;
  alertingService: any;
  dataIngestion: any;
}) {
  const { db, analyticsEngine, trendAnalysis, alertingService, dataIngestion } = services;

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "healthy", 
      service: "BCCS Regulator",
      timestamp: new Date().toISOString() 
    });
  });

  // Organizations
  app.get("/api/organizations", async (req, res) => {
    try {
      const organizations = await db
        .select()
        .from(schema.organizations)
        .orderBy(schema.organizations.name);
      
      res.json(organizations);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      res.status(500).json({ error: "Failed to fetch organizations" });
    }
  });

  app.get("/api/organizations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const organization = await db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.id, id))
        .limit(1);

      if (!organization.length) {
        return res.status(404).json({ error: "Organization not found" });
      }

      res.json(organization[0]);
    } catch (error) {
      console.error("Error fetching organization:", error);
      res.status(500).json({ error: "Failed to fetch organization" });
    }
  });

  // Real-time compliance metrics
  app.get("/api/compliance/metrics/:organizationId", async (req, res) => {
    try {
      const { organizationId } = req.params;
      const score = await analyticsEngine.calculateComplianceScore(organizationId);
      const riskAssessment = await analyticsEngine.assessRiskLevel(organizationId);
      
      res.json({
        complianceScore: score,
        riskLevel: riskAssessment.riskLevel,
        riskFactors: riskAssessment.riskFactors,
        confidence: riskAssessment.confidence,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error fetching compliance metrics:", error);
      res.status(500).json({ error: "Failed to fetch compliance metrics" });
    }
  });

  // Analytics dashboard data
  app.get("/api/analytics/overview", async (req, res) => {
    try {
      const organizations = await db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.status, 'active'));

      const totalOrganizations = organizations.length;
      const averageCompliance = organizations.reduce((sum, org) => sum + (org.complianceScore || 0), 0) / totalOrganizations;
      
      const riskDistribution = {
        low: organizations.filter(org => org.riskLevel === 'low').length,
        medium: organizations.filter(org => org.riskLevel === 'medium').length,
        high: organizations.filter(org => org.riskLevel === 'high').length,
        critical: organizations.filter(org => org.riskLevel === 'critical').length
      };

      // Get recent violations
      const recentViolations = await db
        .select()
        .from(schema.complianceViolations)
        .where(
          and(
            gte(schema.complianceViolations.detectedAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
            eq(schema.complianceViolations.resolutionStatus, 'open')
          )
        );

      const violationsBySeverity = {
        critical: recentViolations.filter(v => v.severity === 'critical').length,
        major: recentViolations.filter(v => v.severity === 'major').length,
        minor: recentViolations.filter(v => v.severity === 'minor').length
      };

      res.json({
        totalOrganizations,
        averageCompliance: Math.round(averageCompliance * 100) / 100,
        riskDistribution,
        violationsBySeverity,
        activeAlerts: await alertingService.getActiveAlerts(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error fetching analytics overview:", error);
      res.status(500).json({ error: "Failed to fetch analytics overview" });
    }
  });

  // Trend analysis
  app.get("/api/trends/:scope", async (req, res) => {
    try {
      const { scope } = req.params;
      const { scopeId, analysisType } = req.query;
      
      const trends = await trendAnalysis.getTrendAnalysis(
        scope, 
        scopeId as string, 
        analysisType as string
      );
      
      res.json(trends);
    } catch (error) {
      console.error("Error fetching trends:", error);
      res.status(500).json({ error: "Failed to fetch trend analysis" });
    }
  });

  // Compliance patterns
  app.get("/api/analytics/patterns", async (req, res) => {
    try {
      const patterns = await analyticsEngine.identifyCompliancePatterns();
      res.json(patterns);
    } catch (error) {
      console.error("Error fetching compliance patterns:", error);
      res.status(500).json({ error: "Failed to fetch compliance patterns" });
    }
  });

  // Benchmarking
  app.get("/api/benchmarking/:organizationId?", async (req, res) => {
    try {
      const { organizationId } = req.params;
      const benchmark = await analyticsEngine.generateBenchmarkingReport(organizationId);
      res.json(benchmark);
    } catch (error) {
      console.error("Error fetching benchmarking data:", error);
      res.status(500).json({ error: "Failed to fetch benchmarking data" });
    }
  });

  // Compliance forecast
  app.get("/api/forecast/:organizationId", async (req, res) => {
    try {
      const { organizationId } = req.params;
      const { days } = req.query;
      
      const forecast = await analyticsEngine.generateComplianceForecast(
        organizationId, 
        days ? parseInt(days as string) : 90
      );
      
      res.json(forecast);
    } catch (error) {
      console.error("Error generating forecast:", error);
      res.status(500).json({ error: "Failed to generate compliance forecast" });
    }
  });

  // Alerts management
  app.get("/api/alerts", async (req, res) => {
    try {
      const { region } = req.query;
      const alerts = await alertingService.getActiveAlerts(region as string);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  app.post("/api/alerts/:alertId/acknowledge", async (req, res) => {
    try {
      const { alertId } = req.params;
      const { inspectorId } = req.body;
      
      const success = await alertingService.acknowledgeAlert(alertId, inspectorId);
      
      if (success) {
        res.json({ message: "Alert acknowledged successfully" });
      } else {
        res.status(404).json({ error: "Alert not found" });
      }
    } catch (error) {
      console.error("Error acknowledging alert:", error);
      res.status(500).json({ error: "Failed to acknowledge alert" });
    }
  });

  app.post("/api/alerts/:alertId/resolve", async (req, res) => {
    try {
      const { alertId } = req.params;
      const { inspectorId } = req.body;
      
      const success = await alertingService.resolveAlert(alertId, inspectorId);
      
      if (success) {
        res.json({ message: "Alert resolved successfully" });
      } else {
        res.status(404).json({ error: "Alert not found" });
      }
    } catch (error) {
      console.error("Error resolving alert:", error);
      res.status(500).json({ error: "Failed to resolve alert" });
    }
  });

  // Compliance violations
  app.get("/api/violations", async (req, res) => {
    try {
      const { organizationId, severity, status, days } = req.query;
      
      let query = db.select({
        violation: schema.complianceViolations,
        organization: schema.organizations
      })
      .from(schema.complianceViolations)
      .leftJoin(schema.organizations, eq(schema.organizations.id, schema.complianceViolations.organizationId));

      // Apply filters
      const conditions = [];
      
      if (organizationId) {
        conditions.push(eq(schema.complianceViolations.organizationId, organizationId as string));
      }
      
      if (severity) {
        conditions.push(eq(schema.complianceViolations.severity, severity as string));
      }
      
      if (status) {
        conditions.push(eq(schema.complianceViolations.resolutionStatus, status as string));
      }
      
      if (days) {
        const daysAgo = new Date(Date.now() - parseInt(days as string) * 24 * 60 * 60 * 1000);
        conditions.push(gte(schema.complianceViolations.detectedAt, daysAgo));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const violations = await query
        .orderBy(desc(schema.complianceViolations.detectedAt))
        .limit(100);

      res.json(violations);
    } catch (error) {
      console.error("Error fetching violations:", error);
      res.status(500).json({ error: "Failed to fetch violations" });
    }
  });

  // Training events
  app.get("/api/training-events", async (req, res) => {
    try {
      const { organizationId, days } = req.query;
      
      let query = db.select({
        event: schema.trainingEvents,
        organization: schema.organizations
      })
      .from(schema.trainingEvents)
      .leftJoin(schema.organizations, eq(schema.organizations.id, schema.trainingEvents.organizationId));

      const conditions = [];
      
      if (organizationId) {
        conditions.push(eq(schema.trainingEvents.organizationId, organizationId as string));
      }
      
      if (days) {
        const daysAgo = new Date(Date.now() - parseInt(days as string) * 24 * 60 * 60 * 1000);
        conditions.push(gte(schema.trainingEvents.startTime, daysAgo));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const events = await query
        .orderBy(desc(schema.trainingEvents.startTime))
        .limit(100);

      res.json(events);
    } catch (error) {
      console.error("Error fetching training events:", error);
      res.status(500).json({ error: "Failed to fetch training events" });
    }
  });

  // Instructor metrics
  app.get("/api/instructors", async (req, res) => {
    try {
      const { organizationId } = req.query;
      
      let query = db.select({
        instructor: schema.instructorMetrics,
        organization: schema.organizations
      })
      .from(schema.instructorMetrics)
      .leftJoin(schema.organizations, eq(schema.organizations.id, schema.instructorMetrics.organizationId));

      if (organizationId) {
        query = query.where(eq(schema.instructorMetrics.organizationId, organizationId as string));
      }

      const instructors = await query
        .orderBy(desc(schema.instructorMetrics.calculatedAt))
        .limit(100);

      res.json(instructors);
    } catch (error) {
      console.error("Error fetching instructor metrics:", error);
      res.status(500).json({ error: "Failed to fetch instructor metrics" });
    }
  });

  // Data feed status
  app.get("/api/data-feeds", async (req, res) => {
    try {
      const feeds = await dataIngestion.getDataFeedStatus();
      res.json(feeds);
    } catch (error) {
      console.error("Error fetching data feeds:", error);
      res.status(500).json({ error: "Failed to fetch data feed status" });
    }
  });

  // Audit activities
  app.get("/api/audits", async (req, res) => {
    try {
      const { organizationId, status } = req.query;
      
      let query = db.select({
        audit: schema.auditActivities,
        organization: schema.organizations
      })
      .from(schema.auditActivities)
      .leftJoin(schema.organizations, eq(schema.organizations.id, schema.auditActivities.organizationId));

      const conditions = [];
      
      if (organizationId) {
        conditions.push(eq(schema.auditActivities.organizationId, organizationId as string));
      }
      
      if (status) {
        conditions.push(eq(schema.auditActivities.status, status as string));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const audits = await query
        .orderBy(desc(schema.auditActivities.startDate))
        .limit(50);

      res.json(audits);
    } catch (error) {
      console.error("Error fetching audits:", error);
      res.status(500).json({ error: "Failed to fetch audit activities" });
    }
  });

  // Regional analytics
  app.get("/api/analytics/regional", async (req, res) => {
    try {
      const regionalData = await db
        .select({
          region: schema.organizations.region,
          organizationCount: sql<number>`COUNT(${schema.organizations.id})`,
          averageCompliance: sql<number>`AVG(${schema.organizations.complianceScore})`,
          highRiskCount: sql<number>`COUNT(CASE WHEN ${schema.organizations.riskLevel} = 'high' THEN 1 END)`,
          criticalRiskCount: sql<number>`COUNT(CASE WHEN ${schema.organizations.riskLevel} = 'critical' THEN 1 END)`
        })
        .from(schema.organizations)
        .where(eq(schema.organizations.status, 'active'))
        .groupBy(schema.organizations.region);

      res.json(regionalData);
    } catch (error) {
      console.error("Error fetching regional analytics:", error);
      res.status(500).json({ error: "Failed to fetch regional analytics" });
    }
  });

  // Force trend analysis
  app.post("/api/analytics/refresh", async (req, res) => {
    try {
      await trendAnalysis.runComprehensiveAnalysis();
      res.json({ message: "Trend analysis refresh initiated" });
    } catch (error) {
      console.error("Error refreshing analytics:", error);
      res.status(500).json({ error: "Failed to refresh analytics" });
    }
  });

  // System metrics
  app.get("/api/system/metrics", async (req, res) => {
    try {
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const systemMetrics = await db
        .select()
        .from(schema.systemMetrics)
        .where(gte(schema.systemMetrics.timestamp, last24Hours))
        .orderBy(desc(schema.systemMetrics.timestamp))
        .limit(100);

      res.json(systemMetrics);
    } catch (error) {
      console.error("Error fetching system metrics:", error);
      res.status(500).json({ error: "Failed to fetch system metrics" });
    }
  });
}