import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import type { RegulatoryAnalyticsEngine } from "./analytics-engine.js";
import * as schema from "../../shared/schema.js";

export class TrendAnalysisService {
  private db: any;
  private analyticsEngine: RegulatoryAnalyticsEngine;
  private analysisInterval: NodeJS.Timeout | null = null;

  constructor(database: any, analyticsEngine: RegulatoryAnalyticsEngine) {
    this.db = database;
    this.analyticsEngine = analyticsEngine;
  }

  async startBackgroundAnalysis() {
    console.log("Starting trend analysis background service...");
    
    // Run initial analysis
    await this.runComprehensiveAnalysis();
    
    // Schedule recurring analysis every 6 hours
    this.analysisInterval = setInterval(async () => {
      try {
        await this.runComprehensiveAnalysis();
      } catch (error) {
        console.error("Background trend analysis error:", error);
      }
    }, 6 * 60 * 60 * 1000); // 6 hours
  }

  async runComprehensiveAnalysis() {
    console.log("Running comprehensive trend analysis...");
    
    try {
      await Promise.all([
        this.analyzeComplianceTrends(),
        this.analyzeRegionalTrends(),
        this.analyzeInstructorTrends(),
        this.analyzeSeasonalTrends(),
        this.analyzeRiskTrends()
      ]);
      
      console.log("✓ Comprehensive trend analysis completed");
    } catch (error) {
      console.error("Error in comprehensive analysis:", error);
    }
  }

  async analyzeComplianceTrends() {
    try {
      const organizations = await this.db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.status, 'active'));

      for (const org of organizations) {
        // Get historical compliance data
        const last90Days = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const complianceMetrics = await this.db
          .select()
          .from(schema.complianceMetrics)
          .where(
            and(
              eq(schema.complianceMetrics.organizationId, org.id),
              eq(schema.complianceMetrics.metricType, 'overall_score'),
              gte(schema.complianceMetrics.timestamp, last90Days)
            )
          )
          .orderBy(schema.complianceMetrics.timestamp);

        if (complianceMetrics.length >= 5) {
          const trendData = this.calculateTrendDirection(complianceMetrics.map(m => m.value));
          
          await this.db.insert(schema.trendAnalysis).values({
            analysisType: 'compliance_trend',
            scope: 'organization',
            scopeId: org.id,
            timeframe: 'daily',
            startDate: last90Days,
            endDate: new Date(),
            dataPoints: complianceMetrics.map(m => ({
              date: m.timestamp,
              value: m.value,
              category: 'compliance_score'
            })),
            trendDirection: trendData.direction,
            significance: trendData.significance,
            predictions: await this.generatePredictions(complianceMetrics),
            insights: `Compliance trend analysis for ${org.name}: ${trendData.direction} trend with ${trendData.significance.toFixed(2)} significance`,
            confidence: trendData.confidence
          });
        }
      }
    } catch (error) {
      console.error("Error analyzing compliance trends:", error);
    }
  }

  async analyzeRegionalTrends() {
    try {
      // Get unique regions
      const regions = await this.db
        .selectDistinct({ region: schema.organizations.region })
        .from(schema.organizations)
        .where(eq(schema.organizations.status, 'active'));

      for (const { region } of regions) {
        const regionalOrgs = await this.db
          .select()
          .from(schema.organizations)
          .where(
            and(
              eq(schema.organizations.region, region),
              eq(schema.organizations.status, 'active')
            )
          );

        // Calculate regional compliance average over time
        const last90Days = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const regionalData = [];
        
        for (let i = 0; i < 90; i += 7) { // Weekly intervals
          const weekStart = new Date(Date.now() - (i + 7) * 24 * 60 * 60 * 1000);
          const weekEnd = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
          
          const weeklyScores = await this.getWeeklyAverageForRegion(region, weekStart, weekEnd);
          if (weeklyScores.length > 0) {
            const avgScore = weeklyScores.reduce((sum, score) => sum + score, 0) / weeklyScores.length;
            regionalData.push({
              date: weekEnd,
              value: avgScore,
              category: 'regional_compliance'
            });
          }
        }

        if (regionalData.length >= 3) {
          const trendData = this.calculateTrendDirection(regionalData.map(d => d.value));
          
          await this.db.insert(schema.trendAnalysis).values({
            analysisType: 'compliance_trend',
            scope: 'region',
            scopeId: region,
            timeframe: 'weekly',
            startDate: last90Days,
            endDate: new Date(),
            dataPoints: regionalData,
            trendDirection: trendData.direction,
            significance: trendData.significance,
            insights: `Regional compliance trend for ${region}: ${trendData.direction} with ${regionalOrgs.length} organizations`,
            confidence: trendData.confidence
          });
        }
      }
    } catch (error) {
      console.error("Error analyzing regional trends:", error);
    }
  }

  async analyzeInstructorTrends() {
    try {
      const last90Days = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      
      // Analyze instructor performance trends across all organizations
      const instructorData = await this.db
        .select({
          instructorId: schema.instructorMetrics.instructorId,
          organizationId: schema.instructorMetrics.organizationId,
          performanceRating: schema.instructorMetrics.performanceRating,
          calculatedAt: schema.instructorMetrics.calculatedAt,
          studentsTrained: schema.instructorMetrics.studentsTrained,
          complianceViolations: schema.instructorMetrics.complianceViolations
        })
        .from(schema.instructorMetrics)
        .where(gte(schema.instructorMetrics.calculatedAt, last90Days))
        .orderBy(schema.instructorMetrics.calculatedAt);

      // Group by instructor and analyze trends
      const instructorTrends = new Map();
      
      instructorData.forEach(record => {
        if (!instructorTrends.has(record.instructorId)) {
          instructorTrends.set(record.instructorId, []);
        }
        instructorTrends.get(record.instructorId).push(record);
      });

      for (const [instructorId, records] of instructorTrends) {
        if (records.length >= 3) {
          const performanceValues = records.map((r: any) => r.performanceRating || 75);
          const trendData = this.calculateTrendDirection(performanceValues);
          
          await this.db.insert(schema.trendAnalysis).values({
            analysisType: 'performance_trend',
            scope: 'instructor',
            scopeId: instructorId,
            timeframe: 'daily',
            startDate: last90Days,
            endDate: new Date(),
            dataPoints: records.map((r: any) => ({
              date: r.calculatedAt,
              value: r.performanceRating,
              metadata: {
                studentsTrained: r.studentsTrained,
                violations: r.complianceViolations
              }
            })),
            trendDirection: trendData.direction,
            significance: trendData.significance,
            insights: `Instructor performance trend: ${trendData.direction} over ${records.length} evaluations`,
            confidence: trendData.confidence
          });
        }
      }
    } catch (error) {
      console.error("Error analyzing instructor trends:", error);
    }
  }

  async analyzeSeasonalTrends() {
    try {
      // Analyze seasonal patterns in compliance and training activity
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      
      const monthlyData = await this.db
        .select({
          month: sql<number>`EXTRACT(MONTH FROM ${schema.complianceMetrics.timestamp})`,
          year: sql<number>`EXTRACT(YEAR FROM ${schema.complianceMetrics.timestamp})`,
          avgScore: sql<number>`AVG(${schema.complianceMetrics.value})`,
          recordCount: sql<number>`COUNT(*)`
        })
        .from(schema.complianceMetrics)
        .where(
          and(
            eq(schema.complianceMetrics.metricType, 'overall_score'),
            gte(schema.complianceMetrics.timestamp, oneYearAgo)
          )
        )
        .groupBy(
          sql`EXTRACT(MONTH FROM ${schema.complianceMetrics.timestamp})`,
          sql`EXTRACT(YEAR FROM ${schema.complianceMetrics.timestamp})`
        )
        .orderBy(
          sql`EXTRACT(YEAR FROM ${schema.complianceMetrics.timestamp})`,
          sql`EXTRACT(MONTH FROM ${schema.complianceMetrics.timestamp})`
        );

      if (monthlyData.length >= 6) {
        const seasonalScores = monthlyData.map((d: any) => d.avgScore);
        const trendData = this.calculateTrendDirection(seasonalScores);
        
        await this.db.insert(schema.trendAnalysis).values({
          analysisType: 'compliance_trend',
          scope: 'global',
          scopeId: 'seasonal',
          timeframe: 'monthly',
          startDate: oneYearAgo,
          endDate: new Date(),
          dataPoints: monthlyData.map((d: any) => ({
            month: d.month,
            year: d.year,
            value: d.avgScore,
            recordCount: d.recordCount
          })),
          trendDirection: trendData.direction,
          significance: trendData.significance,
          insights: `Seasonal compliance pattern: ${this.identifySeasonalPattern(monthlyData)}`,
          confidence: trendData.confidence
        });
      }
    } catch (error) {
      console.error("Error analyzing seasonal trends:", error);
    }
  }

  async analyzeRiskTrends() {
    try {
      const last90Days = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      
      // Analyze risk level changes over time
      const organizations = await this.db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.status, 'active'));

      const riskLevelMapping = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
      
      for (const org of organizations) {
        // Get violation history to track risk changes
        const violations = await this.db
          .select()
          .from(schema.complianceViolations)
          .where(
            and(
              eq(schema.complianceViolations.organizationId, org.id),
              gte(schema.complianceViolations.detectedAt, last90Days)
            )
          )
          .orderBy(schema.complianceViolations.detectedAt);

        if (violations.length > 0) {
          // Calculate weekly risk scores
          const weeklyRiskData = [];
          for (let i = 0; i < 12; i++) { // 12 weeks
            const weekStart = new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
            const weekEnd = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
            
            const weekViolations = violations.filter(v => 
              v.detectedAt && v.detectedAt >= weekStart && v.detectedAt <= weekEnd
            );
            
            let riskScore = riskLevelMapping[org.riskLevel as keyof typeof riskLevelMapping] || 2;
            
            // Adjust based on violations in that week
            weekViolations.forEach(v => {
              switch (v.severity) {
                case 'critical': riskScore += 0.8; break;
                case 'major': riskScore += 0.4; break;
                case 'minor': riskScore += 0.1; break;
              }
            });
            
            weeklyRiskData.push({
              date: weekEnd,
              value: Math.min(4, riskScore),
              violationCount: weekViolations.length
            });
          }

          if (weeklyRiskData.length >= 4) {
            const riskValues = weeklyRiskData.map(d => d.value);
            const trendData = this.calculateTrendDirection(riskValues);
            
            await this.db.insert(schema.trendAnalysis).values({
              analysisType: 'risk_trend',
              scope: 'organization',
              scopeId: org.id,
              timeframe: 'weekly',
              startDate: last90Days,
              endDate: new Date(),
              dataPoints: weeklyRiskData,
              trendDirection: trendData.direction,
              significance: trendData.significance,
              insights: `Risk trend analysis: ${trendData.direction} risk trajectory for ${org.name}`,
              confidence: trendData.confidence
            });
          }
        }
      }
    } catch (error) {
      console.error("Error analyzing risk trends:", error);
    }
  }

  private calculateTrendDirection(values: number[]): {
    direction: 'improving' | 'declining' | 'stable' | 'volatile',
    significance: number,
    confidence: number
  } {
    if (values.length < 3) {
      return { direction: 'stable', significance: 0, confidence: 0.1 };
    }

    // Simple linear regression to determine trend
    const n = values.length;
    const xSum = n * (n - 1) / 2; // Sum of indices 0,1,2,...,n-1
    const ySum = values.reduce((sum, val) => sum + val, 0);
    const xySum = values.reduce((sum, val, index) => sum + (val * index), 0);
    const xxSum = (n - 1) * n * (2 * n - 1) / 6; // Sum of squares of indices

    const slope = (n * xySum - xSum * ySum) / (n * xxSum - xSum * xSum);
    const volatility = this.calculateVolatility(values);
    
    // Determine trend direction
    let direction: 'improving' | 'declining' | 'stable' | 'volatile';
    if (volatility > 10) {
      direction = 'volatile';
    } else if (Math.abs(slope) < 0.1) {
      direction = 'stable';
    } else if (slope > 0) {
      direction = 'improving';
    } else {
      direction = 'declining';
    }

    // Calculate significance and confidence
    const significance = Math.abs(slope) * 10; // Scale slope for significance
    const confidence = Math.max(0.1, Math.min(0.9, 1 - (volatility / 50))); // Higher volatility = lower confidence

    return { direction, significance, confidence };
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private async generatePredictions(complianceMetrics: any[]): Promise<any> {
    // Simple linear extrapolation for predictions
    if (complianceMetrics.length < 3) return null;

    const values = complianceMetrics.map(m => m.value);
    const trend = this.calculateTrendDirection(values);
    
    // Predict next 30 days
    const lastValue = values[values.length - 1];
    const predictions = [];
    
    for (let i = 1; i <= 30; i++) {
      const predictedValue = lastValue + (trend.significance * i * 0.1);
      predictions.push({
        day: i,
        predictedScore: Math.max(0, Math.min(100, predictedValue)),
        confidence: Math.max(0.1, trend.confidence - (i * 0.01))
      });
    }

    return predictions;
  }

  private async getWeeklyAverageForRegion(region: string, startDate: Date, endDate: Date): Promise<number[]> {
    try {
      const regionalScores = await this.db
        .select({ score: schema.complianceMetrics.value })
        .from(schema.complianceMetrics)
        .innerJoin(schema.organizations, eq(schema.organizations.id, schema.complianceMetrics.organizationId))
        .where(
          and(
            eq(schema.organizations.region, region),
            eq(schema.complianceMetrics.metricType, 'overall_score'),
            gte(schema.complianceMetrics.timestamp, startDate),
            lte(schema.complianceMetrics.timestamp, endDate)
          )
        );

      return regionalScores.map(s => s.score);
    } catch (error) {
      console.error("Error getting weekly average for region:", error);
      return [];
    }
  }

  private identifySeasonalPattern(monthlyData: any[]): string {
    // Simple seasonal pattern identification
    const winterMonths = monthlyData.filter((d: any) => [12, 1, 2].includes(d.month));
    const springMonths = monthlyData.filter((d: any) => [3, 4, 5].includes(d.month));
    const summerMonths = monthlyData.filter((d: any) => [6, 7, 8].includes(d.month));
    const fallMonths = monthlyData.filter((d: any) => [9, 10, 11].includes(d.month));

    const avgBySeasons = [
      { season: 'Winter', avg: winterMonths.reduce((sum: number, d: any) => sum + d.avgScore, 0) / (winterMonths.length || 1) },
      { season: 'Spring', avg: springMonths.reduce((sum: number, d: any) => sum + d.avgScore, 0) / (springMonths.length || 1) },
      { season: 'Summer', avg: summerMonths.reduce((sum: number, d: any) => sum + d.avgScore, 0) / (summerMonths.length || 1) },
      { season: 'Fall', avg: fallMonths.reduce((sum: number, d: any) => sum + d.avgScore, 0) / (fallMonths.length || 1) }
    ];

    const bestSeason = avgBySeasons.reduce((best, current) => current.avg > best.avg ? current : best);
    const worstSeason = avgBySeasons.reduce((worst, current) => current.avg < worst.avg ? current : worst);

    return `Best compliance in ${bestSeason.season} (${bestSeason.avg.toFixed(1)}%), lowest in ${worstSeason.season} (${worstSeason.avg.toFixed(1)}%)`;
  }

  async getTrendAnalysis(scope: string, scopeId?: string, analysisType?: string): Promise<any[]> {
    try {
      let query = this.db
        .select()
        .from(schema.trendAnalysis)
        .where(eq(schema.trendAnalysis.scope, scope));

      if (scopeId) {
        query = query.where(eq(schema.trendAnalysis.scopeId, scopeId));
      }

      if (analysisType) {
        query = query.where(eq(schema.trendAnalysis.analysisType, analysisType));
      }

      const results = await query
        .orderBy(desc(schema.trendAnalysis.generatedAt))
        .limit(50);

      return results;
    } catch (error) {
      console.error("Error getting trend analysis:", error);
      return [];
    }
  }

  stopBackgroundAnalysis() {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
      console.log("Trend analysis background service stopped");
    }
  }
}