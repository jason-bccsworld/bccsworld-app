import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FeatureGate } from "@/components/feature-gate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Target, 
  Calendar,
  Users,
  Building,
  ArrowUp,
  ArrowDown,
  Minus,
  CheckCircle2,
  XCircle,
  Clock
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

interface ComplianceMetrics {
  overallScore?: number;
  trendDirection?: string;
  riskLevel?: string;
  recommendations?: string[];
}

interface RiskFactor {
  factor: string;
  impact: number;
  mitigation: string;
}

interface ComplianceForecast {
  nextMonth?: number;
  nextQuarter?: number;
  yearEnd?: number;
  confidence?: number;
  riskFactors?: RiskFactor[];
}

interface OrganizationPerformance {
  name: string;
  trend: string;
  riskLevel: string;
  score: number;
}

interface UpcomingDeadline {
  description: string;
  deadline: string;
  organizationsAtRisk: number;
}

interface AnalyticsReport {
  documentProcessingTrends?: Array<{ date: string; value: number }>;
  accuracyTrends?: Array<{ date: string; value: number }>;
  organizationPerformance?: OrganizationPerformance[];
  predictiveInsights?: {
    upcomingDeadlines?: UpcomingDeadline[];
    resourceAllocation?: {
      predictedWorkload?: number;
      recommendedStaffing?: number;
      peakPeriods?: string[];
    };
  };
}

export default function AnalyticsDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month" | "quarter">("month");
  const [selectedOrganization, setSelectedOrganization] = useState<string>("all");

  const { data: complianceMetrics, isLoading: metricsLoading } = useQuery<ComplianceMetrics>({
    queryKey: ["/api/analytics/compliance-metrics", selectedOrganization],
  });

  const { data: forecast, isLoading: forecastLoading } = useQuery<ComplianceForecast>({
    queryKey: ["/api/analytics/forecast", selectedOrganization],
  });

  const { data: analyticsReport, isLoading: reportLoading } = useQuery<AnalyticsReport>({
    queryKey: ["/api/analytics/report", selectedPeriod],
  });

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "low": return "text-emerald-600 bg-emerald-50 border-emerald-200";
      case "medium": return "text-amber-600 bg-amber-50 border-amber-200";
      case "high": return "text-orange-600 bg-orange-50 border-orange-200";
      case "critical": return "text-red-600 bg-red-50 border-red-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case "up": return <ArrowUp className="w-4 h-4 text-emerald-600" />;
      case "down": return <ArrowDown className="w-4 h-4 text-red-600" />;
      default: return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  if (metricsLoading || forecastLoading || reportLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const pieChartData = [
    { name: 'Compliant', value: complianceMetrics?.overallScore || 0, color: '#10b981' },
    { name: 'Non-Compliant', value: 100 - (complianceMetrics?.overallScore || 0), color: '#f59e0b' }
  ];

  return (
    <FeatureGate feature="advancedAnalytics" featureLabel="Advanced Analytics">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Advanced Analytics</h1>
          <p className="text-gray-600">Compliance forecasting and predictive insights</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={selectedPeriod} onValueChange={(value: "week" | "month" | "quarter") => setSelectedPeriod(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="quarter">Quarter</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedOrganization} onValueChange={setSelectedOrganization}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Organizations</SelectItem>
              <SelectItem value="org1">Eagle Flight Academy</SelectItem>
              <SelectItem value="org2">Skyward Training Center</SelectItem>
              <SelectItem value="org3">Aviation Excellence Institute</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{complianceMetrics?.overallScore || 0}%</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {getTrendIcon(complianceMetrics?.trendDirection || "stable")}
              <span className="ml-1">
                {complianceMetrics?.trendDirection === "up" ? "Improving" :
                 complianceMetrics?.trendDirection === "down" ? "Declining" : "Stable"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Forecasted Compliance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{forecast?.nextMonth || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Next month prediction
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Level</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge className={getRiskColor(complianceMetrics?.riskLevel || "low")}>
              {(complianceMetrics?.riskLevel || "low").toUpperCase()}
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">
              Current assessment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Forecast Confidence</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{forecast?.confidence || 0}%</div>
            <Progress value={forecast?.confidence || 0} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="forecast" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="forecast">Forecasting</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Forecasting Tab */}
        <TabsContent value="forecast" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Forecast</CardTitle>
                <CardDescription>Predicted compliance rates for upcoming periods</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Next Month</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={forecast?.nextMonth || 0} className="w-24" />
                      <span className="text-sm font-medium">{forecast?.nextMonth || 0}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Next Quarter</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={forecast?.nextQuarter || 0} className="w-24" />
                      <span className="text-sm font-medium">{forecast?.nextQuarter || 0}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Year End</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={forecast?.yearEnd || 0} className="w-24" />
                      <span className="text-sm font-medium">{forecast?.yearEnd || 0}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compliance Distribution</CardTitle>
                <CardDescription>Current compliance status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Risk Factors */}
          <Card>
            <CardHeader>
              <CardTitle>Risk Factors Analysis</CardTitle>
              <CardDescription>Identified risks and mitigation strategies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {forecast?.riskFactors?.map((risk, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{risk.factor}</h4>
                      <Badge variant="outline" className="text-xs">
                        {risk.impact}% Impact
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{risk.mitigation}</p>
                  </div>
                )) || []}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Document Processing Trends</CardTitle>
                <CardDescription>Daily document processing volume</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analyticsReport?.documentProcessingTrends || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="value" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Accuracy Trends</CardTitle>
                <CardDescription>Processing accuracy over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsReport?.accuracyTrends || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Organizations Tab */}
        <TabsContent value="organizations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Performance</CardTitle>
              <CardDescription>Compliance scores by organization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsReport?.organizationPerformance?.map((org, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Building className="w-8 h-8 text-gray-400" />
                      <div>
                        <h4 className="font-medium">{org.name}</h4>
                        <div className="flex items-center space-x-2">
                          {getTrendIcon(org.trend)}
                          <span className="text-sm text-gray-600 capitalize">{org.trend}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge className={getRiskColor(org.riskLevel)}>
                        {org.riskLevel.toUpperCase()}
                      </Badge>
                      <div className="text-right">
                        <div className="text-lg font-bold">{org.score}%</div>
                        <Progress value={org.score} className="w-16" />
                      </div>
                    </div>
                  </div>
                )) || []}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Deadlines</CardTitle>
                <CardDescription>Critical compliance deadlines approaching</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsReport?.predictiveInsights?.upcomingDeadlines?.map((deadline, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <Calendar className="w-5 h-5 text-orange-500" />
                      <div className="flex-1">
                        <h4 className="font-medium">{deadline.description}</h4>
                        <p className="text-sm text-gray-600">{deadline.deadline}</p>
                      </div>
                      <Badge variant="outline" className="text-orange-600">
                        {deadline.organizationsAtRisk} at risk
                      </Badge>
                    </div>
                  )) || []}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resource Allocation</CardTitle>
                <CardDescription>Recommended staffing and workload predictions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Predicted Workload</span>
                    <span className="font-medium">{analyticsReport?.predictiveInsights?.resourceAllocation?.predictedWorkload || 0}%</span>
                  </div>
                  <Progress value={analyticsReport?.predictiveInsights?.resourceAllocation?.predictedWorkload || 0} />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Recommended Staff</span>
                    <span className="font-medium">{analyticsReport?.predictiveInsights?.resourceAllocation?.recommendedStaffing || 0} people</span>
                  </div>
                  
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Peak Periods</h4>
                    <div className="flex flex-wrap gap-2">
                      {analyticsReport?.predictiveInsights?.resourceAllocation?.peakPeriods?.map((period, index) => (
                        <Badge key={index} variant="secondary">
                          {period}
                        </Badge>
                      )) || []}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>AI Recommendations</CardTitle>
              <CardDescription>Automated suggestions for improving compliance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {complianceMetrics?.recommendations?.map((recommendation, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5" />
                    <span className="text-sm text-blue-800">{recommendation}</span>
                  </div>
                )) || []}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </FeatureGate>
  );
}