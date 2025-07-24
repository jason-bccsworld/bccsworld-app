import OpenAI from "openai";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import type { 
  Organization, 
  ComplianceMetric, 
  TrainingEvent, 
  InstructorMetric,
  ComplianceViolation,
  TrendAnalysis 
} from "../../shared/schema.js";
import * as schema from "../../shared/schema.js";

export class RegulatoryAnalyticsEngine {
  private openai: OpenAI;
  private db: any;

  constructor(database: any) {
    this.db = database;
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  // Real-time compliance scoring
  async calculateComplianceScore(organizationId: string): Promise<number> {
    try {
      // Get recent training events
      const recentTrainingEvents = await this.db
        .select()
        .from(schema.trainingEvents)
        .where(
          and(
            eq(schema.trainingEvents.organizationId, organizationId),
            gte(schema.trainingEvents.startTime, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // Last 30 days
          )
        )
        .limit(100);

      // Get compliance violations
      const violations = await this.db
        .select()
        .from(schema.complianceViolations)
        .where(
          and(
            eq(schema.complianceViolations.organizationId, organizationId),
            gte(schema.complianceViolations.detectedAt, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)) // Last 90 days
          )
        );

      // Get instructor metrics
      const instructorMetrics = await this.db
        .select()
        .from(schema.instructorMetrics)
        .where(eq(schema.instructorMetrics.organizationId, organizationId));

      // Calculate weighted compliance score
      let baseScore = 100;
      
      // Training event quality (40% weight)
      const avgTrainingQuality = recentTrainingEvents.length > 0 
        ? recentTrainingEvents.reduce((sum, event) => sum + (event.qualityScore || 75), 0) / recentTrainingEvents.length
        : 75;
      
      // Violation penalties (30% weight)
      const violationPenalty = violations.reduce((penalty, violation) => {
        switch (violation.severity) {
          case 'critical': return penalty + 15;
          case 'major': return penalty + 8;
          case 'minor': return penalty + 3;
          default: return penalty;
        }
      }, 0);

      // Instructor performance (20% weight)
      const avgInstructorRating = instructorMetrics.length > 0
        ? instructorMetrics.reduce((sum, instructor) => sum + (instructor.performanceRating || 75), 0) / instructorMetrics.length
        : 75;

      // Documentation completeness (10% weight)
      const documentationScore = recentTrainingEvents.length > 0
        ? (recentTrainingEvents.filter(event => event.documentationComplete).length / recentTrainingEvents.length) * 100
        : 80;

      // Calculate final score
      const qualityWeight = avgTrainingQuality * 0.4;
      const instructorWeight = avgInstructorRating * 0.2;
      const documentationWeight = documentationScore * 0.1;
      
      const finalScore = Math.max(0, Math.min(100, 
        qualityWeight + instructorWeight + documentationWeight + (baseScore * 0.3) - violationPenalty
      ));

      return Math.round(finalScore * 100) / 100;
    } catch (error) {
      console.error("Error calculating compliance score:", error);
      return 75; // Default score on error
    }
  }

  // AI-powered risk assessment
  async assessRiskLevel(organizationId: string): Promise<{ 
    riskLevel: 'low' | 'medium' | 'high' | 'critical',
    riskFactors: string[],
    confidence: number 
  }> {
    try {
      // Gather comprehensive data for AI analysis
      const organization = await this.db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.id, organizationId))
        .limit(1);

      if (!organization.length) {
        throw new Error("Organization not found");
      }

      const recentViolations = await this.db
        .select()
        .from(schema.complianceViolations)
        .where(
          and(
            eq(schema.complianceViolations.organizationId, organizationId),
            gte(schema.complianceViolations.detectedAt, new Date(Date.now() - 180 * 24 * 60 * 60 * 1000))
          )
        );

      const complianceScore = await this.calculateComplianceScore(organizationId);

      // AI risk analysis
      const riskAnalysisPrompt = `
Analyze the regulatory compliance risk for this aviation training organization:

Organization: ${organization[0].name}
Type: ${organization[0].organizationType}
Current Compliance Score: ${complianceScore}%
Recent Violations (6 months): ${recentViolations.length}

Violation Details:
${recentViolations.map(v => `- ${v.severity.toUpperCase()}: ${v.violationType} - ${v.description}`).join('\n')}

Based on aviation regulatory standards, assess the risk level and provide analysis.
Respond in JSON format:
{
  "riskLevel": "low|medium|high|critical",
  "riskFactors": ["factor1", "factor2", "factor3"],
  "confidence": 0.85,
  "reasoning": "Brief explanation"
}
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: riskAnalysisPrompt }],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        riskLevel: analysis.riskLevel || 'medium',
        riskFactors: analysis.riskFactors || [],
        confidence: analysis.confidence || 0.7
      };
    } catch (error) {
      console.error("Error assessing risk level:", error);
      return {
        riskLevel: 'medium',
        riskFactors: ['Assessment error - manual review required'],
        confidence: 0.3
      };
    }
  }

  // Cross-organizational benchmarking
  async generateBenchmarkingReport(organizationId?: string): Promise<{
    industryAverage: number,
    regionalAverage: number,
    organizationRanking: number,
    totalOrganizations: number,
    comparativeMetrics: any[]
  }> {
    try {
      // Get all organizations for benchmarking
      const allOrganizations = await this.db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.status, 'active'));

      if (organizationId) {
        const targetOrg = allOrganizations.find(org => org.id === organizationId);
        if (!targetOrg) throw new Error("Organization not found");

        // Regional organizations (same region)
        const regionalOrgs = allOrganizations.filter(org => org.region === targetOrg.region);
        
        // Calculate averages
        const industryAverage = allOrganizations.reduce((sum, org) => sum + (org.complianceScore || 0), 0) / allOrganizations.length;
        const regionalAverage = regionalOrgs.reduce((sum, org) => sum + (org.complianceScore || 0), 0) / regionalOrgs.length;
        
        // Ranking
        const sortedOrgs = allOrganizations.sort((a, b) => (b.complianceScore || 0) - (a.complianceScore || 0));
        const ranking = sortedOrgs.findIndex(org => org.id === organizationId) + 1;

        return {
          industryAverage: Math.round(industryAverage * 100) / 100,
          regionalAverage: Math.round(regionalAverage * 100) / 100,
          organizationRanking: ranking,
          totalOrganizations: allOrganizations.length,
          comparativeMetrics: this.generateComparativeMetrics(targetOrg, allOrganizations)
        };
      } else {
        // Global benchmarking
        const industryAverage = allOrganizations.reduce((sum, org) => sum + (org.complianceScore || 0), 0) / allOrganizations.length;
        
        return {
          industryAverage: Math.round(industryAverage * 100) / 100,
          regionalAverage: industryAverage,
          organizationRanking: 0,
          totalOrganizations: allOrganizations.length,
          comparativeMetrics: []
        };
      }
    } catch (error) {
      console.error("Error generating benchmarking report:", error);
      throw error;
    }
  }

  private generateComparativeMetrics(targetOrg: Organization, allOrgs: Organization[]) {
    const metrics = [];
    
    // Compliance score comparison
    const higherScoringOrgs = allOrgs.filter(org => (org.complianceScore || 0) > (targetOrg.complianceScore || 0)).length;
    metrics.push({
      metric: 'Compliance Score',
      value: targetOrg.complianceScore || 0,
      percentile: Math.round((1 - higherScoringOrgs / allOrgs.length) * 100),
      comparison: higherScoringOrgs < allOrgs.length / 2 ? 'above_average' : 'below_average'
    });

    // Risk level comparison
    const riskLevels = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
    const targetRiskScore = riskLevels[targetOrg.riskLevel as keyof typeof riskLevels] || 2;
    const lowerRiskOrgs = allOrgs.filter(org => (riskLevels[org.riskLevel as keyof typeof riskLevels] || 2) < targetRiskScore).length;
    
    metrics.push({
      metric: 'Risk Level',
      value: targetOrg.riskLevel,
      percentile: Math.round((lowerRiskOrgs / allOrgs.length) * 100),
      comparison: lowerRiskOrgs > allOrgs.length / 2 ? 'better_than_average' : 'needs_improvement'
    });

    return metrics;
  }

  // Predictive compliance modeling
  async generateComplianceForecast(organizationId: string, forecastDays: number = 90): Promise<{
    predictedScore: number,
    trendDirection: 'improving' | 'declining' | 'stable',
    confidenceInterval: { min: number, max: number },
    riskFactors: string[],
    recommendations: string[]
  }> {
    try {
      // Get historical compliance data
      const historicalMetrics = await this.db
        .select()
        .from(schema.complianceMetrics)
        .where(
          and(
            eq(schema.complianceMetrics.organizationId, organizationId),
            eq(schema.complianceMetrics.metricType, 'overall_score'),
            gte(schema.complianceMetrics.timestamp, new Date(Date.now() - 180 * 24 * 60 * 60 * 1000))
          )
        )
        .orderBy(desc(schema.complianceMetrics.timestamp));

      if (historicalMetrics.length < 3) {
        throw new Error("Insufficient historical data for forecasting");
      }

      // AI-powered prediction
      const forecastPrompt = `
Analyze this compliance trend data for aviation training organization and predict future performance:

Historical Compliance Scores (last 6 months):
${historicalMetrics.map(m => `${m.timestamp?.toISOString().split('T')[0]}: ${m.value}%`).join('\n')}

Forecast ${forecastDays} days ahead and provide:
1. Predicted compliance score
2. Trend direction (improving/declining/stable)
3. Confidence interval (min/max range)
4. Key risk factors
5. Improvement recommendations

Respond in JSON format:
{
  "predictedScore": 85.5,
  "trendDirection": "improving",
  "confidenceInterval": {"min": 82.0, "max": 89.0},
  "riskFactors": ["factor1", "factor2"],
  "recommendations": ["action1", "action2"],
  "confidence": 0.82
}
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: forecastPrompt }],
        response_format: { type: "json_object" },
        temperature: 0.2
      });

      const forecast = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        predictedScore: forecast.predictedScore || 80,
        trendDirection: forecast.trendDirection || 'stable',
        confidenceInterval: forecast.confidenceInterval || { min: 75, max: 85 },
        riskFactors: forecast.riskFactors || [],
        recommendations: forecast.recommendations || []
      };
    } catch (error) {
      console.error("Error generating compliance forecast:", error);
      throw error;
    }
  }

  // Multi-dimensional pattern analysis
  async identifyCompliancePatterns(): Promise<{
    seasonalPatterns: any[],
    geographicPatterns: any[],
    organizationalPatterns: any[],
    instructorPatterns: any[]
  }> {
    try {
      // Seasonal analysis
      const seasonalData = await this.db
        .select({
          month: sql<number>`EXTRACT(MONTH FROM ${schema.complianceMetrics.timestamp})`,
          avgScore: sql<number>`AVG(${schema.complianceMetrics.value})`,
          violationCount: sql<number>`COUNT(${schema.complianceViolations.id})`
        })
        .from(schema.complianceMetrics)
        .leftJoin(
          schema.complianceViolations,
          and(
            eq(schema.complianceMetrics.organizationId, schema.complianceViolations.organizationId),
            sql`EXTRACT(MONTH FROM ${schema.complianceViolations.detectedAt}) = EXTRACT(MONTH FROM ${schema.complianceMetrics.timestamp})`
          )
        )
        .where(
          and(
            eq(schema.complianceMetrics.metricType, 'overall_score'),
            gte(schema.complianceMetrics.timestamp, new Date(Date.now() - 365 * 24 * 60 * 60 * 1000))
          )
        )
        .groupBy(sql`EXTRACT(MONTH FROM ${schema.complianceMetrics.timestamp})`);

      // Geographic analysis
      const geographicData = await this.db
        .select({
          region: schema.organizations.region,
          avgScore: sql<number>`AVG(${schema.organizations.complianceScore})`,
          orgCount: sql<number>`COUNT(${schema.organizations.id})`
        })
        .from(schema.organizations)
        .where(eq(schema.organizations.status, 'active'))
        .groupBy(schema.organizations.region);

      return {
        seasonalPatterns: seasonalData,
        geographicPatterns: geographicData,
        organizationalPatterns: [],
        instructorPatterns: []
      };
    } catch (error) {
      console.error("Error identifying compliance patterns:", error);
      return {
        seasonalPatterns: [],
        geographicPatterns: [],
        organizationalPatterns: [],
        instructorPatterns: []
      };
    }
  }
}