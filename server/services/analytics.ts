export interface ComplianceMetrics {
  overallScore: number;
  trendDirection: "up" | "down" | "stable";
  riskLevel: "low" | "medium" | "high" | "critical";
  forecastedCompliance: number;
  keyRiskFactors: string[];
  recommendations: string[];
}

export interface TimeSeriesData {
  date: string;
  value: number;
  predicted?: boolean;
}

export interface ComplianceForecast {
  nextMonth: number;
  nextQuarter: number;
  yearEnd: number;
  confidence: number;
  riskFactors: Array<{
    factor: string;
    impact: number;
    mitigation: string;
  }>;
}

export interface AnalyticsReport {
  period: string;
  complianceRate: number;
  documentProcessingTrends: TimeSeriesData[];
  accuracyTrends: TimeSeriesData[];
  organizationPerformance: Array<{
    organizationId: string;
    name: string;
    score: number;
    trend: "improving" | "declining" | "stable";
    riskLevel: "low" | "medium" | "high";
  }>;
  predictiveInsights: {
    upcomingDeadlines: Array<{
      deadline: string;
      description: string;
      organizationsAtRisk: number;
    }>;
    resourceAllocation: {
      predictedWorkload: number;
      recommendedStaffing: number;
      peakPeriods: string[];
    };
  };
}

/**
 * The documents storage domain this service depended on has been removed from
 * the schema, so its document-processing analytics are no longer available.
 * Live compliance metrics are served directly by the /api/analytics routes,
 * which query digital_form_submissions, students, and training-event tables.
 * The methods below fail explicitly rather than returning fabricated data.
 */
export class AnalyticsService {
  async generateComplianceMetrics(_organizationId?: string): Promise<ComplianceMetrics> {
    throw new Error("feature unavailable: documents storage removed");
  }

  async generateDetailedForecast(_organizationId?: string): Promise<ComplianceForecast> {
    throw new Error("feature unavailable: documents storage removed");
  }

  async generateAnalyticsReport(_period?: string): Promise<AnalyticsReport> {
    throw new Error("feature unavailable: documents storage removed");
  }
}

export const analyticsService = new AnalyticsService();
