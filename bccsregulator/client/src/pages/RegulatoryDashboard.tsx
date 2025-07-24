import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, 
  AlertTriangle, 
  Building, 
  TrendingUp, 
  Activity,
  Globe,
  Users,
  FileText,
  Eye,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { Link } from "wouter";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

export function RegulatoryDashboard() {
  const [realTimeData, setRealTimeData] = useState<any>(null);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const ws = new WebSocket(`ws://${window.location.host}`);
    
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'subscribe',
        feeds: ['compliance_alerts', 'trend_updates', 'violation_notifications']
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'regulatory_alert') {
        setRealTimeData(data);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  // Fetch overview data
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['/api/analytics/overview'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch organizations
  const { data: organizations = [] } = useQuery({
    queryKey: ['/api/organizations'],
  });

  // Fetch active alerts
  const { data: alerts = [] } = useQuery({
    queryKey: ['/api/alerts'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch regional analytics
  const { data: regionalData = [] } = useQuery({
    queryKey: ['/api/analytics/regional'],
  });

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "low": return "bg-green-100 text-green-800 border-green-200";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "high": return "bg-orange-100 text-orange-800 border-orange-200";
      case "critical": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 border-green-200";
      case "under_review": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "suspended": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical": return <AlertCircle className="w-4 h-4 text-red-600" />;
      case "warning": return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case "info": return <CheckCircle className="w-4 h-4 text-blue-600" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const chartColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (overviewLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-regulatory-blue"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="regulatory-header px-6 py-8 mb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">BCCS Regulator</h1>
              <p className="text-blue-100 mt-2">Advanced Regulatory Oversight & Analytics Platform</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="live-indicator">
                <Badge className="bg-green-500 text-white">
                  <Activity className="w-3 h-3 mr-1" />
                  Live Monitoring
                </Badge>
              </div>
              <span className="text-blue-100 text-sm">
                {new Date().toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 space-y-8">
        {/* Real-time Alert Banner */}
        {realTimeData && (
          <div className={`alert-${realTimeData.alert.severity} border p-4 rounded-lg animate-fade-in`}>
            <div className="flex items-center space-x-3">
              {getSeverityIcon(realTimeData.alert.severity)}
              <div>
                <h4 className="font-semibold">{realTimeData.alert.title}</h4>
                <p className="text-sm">{realTimeData.alert.description}</p>
              </div>
              <Link href="/alerts">
                <Button size="sm" variant="outline">View Details</Button>
              </Link>
            </div>
          </div>
        )}

        {/* Key Metrics Overview */}
        <div className="dashboard-grid">
          <Card className="metric-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview?.totalOrganizations || 0}</div>
              <p className="text-xs text-muted-foreground">
                Actively monitored Part 142 organizations
              </p>
            </CardContent>
          </Card>

          <Card className="metric-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Compliance</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview?.averageCompliance?.toFixed(1) || '0.0'}%</div>
              <Progress value={overview?.averageCompliance || 0} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="metric-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{alerts.length}</div>
              <div className="flex space-x-2 mt-2">
                <Badge className="bg-red-100 text-red-800 text-xs">
                  {alerts.filter((a: any) => a.severity === 'critical').length} Critical
                </Badge>
                <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                  {alerts.filter((a: any) => a.severity === 'warning').length} Warning
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="metric-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Risk Distribution</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">High Risk</span>
                  <Badge className="bg-red-100 text-red-800 text-xs">
                    {overview?.riskDistribution?.high || 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Medium Risk</span>
                  <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                    {overview?.riskDistribution?.medium || 0}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="organizations" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="organizations">Organizations</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="regional">Regional View</TabsTrigger>
          </TabsList>

          {/* Organizations Tab */}
          <TabsContent value="organizations" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {organizations.map((org: any) => (
                <Card key={org.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{org.name}</CardTitle>
                      <Badge className={getStatusColor(org.status)}>
                        {org.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <CardDescription>{org.location}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Compliance Score</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={org.complianceScore || 0} className="w-16" />
                        <span className="text-sm font-medium">{org.complianceScore?.toFixed(1) || '0.0'}%</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Risk Level</span>
                      <div className="flex items-center space-x-2">
                        <div className={`risk-indicator ${org.riskLevel || 'medium'}`}></div>
                        <Badge className={getRiskColor(org.riskLevel || 'medium')}>
                          {(org.riskLevel || 'medium').toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Last Audit</span>
                      <span className="text-sm text-muted-foreground">
                        {org.lastAuditDate ? new Date(org.lastAuditDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    
                    <div className="flex space-x-2 mt-4">
                      <Link href={`/organization/${org.id}`}>
                        <Button size="sm" variant="outline" className="flex-1">
                          <Eye className="w-4 h-4 mr-1" />
                          Inspect
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Compliance Score Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={organizations.map((org: any) => ({
                      name: org.name.substring(0, 10) + '...',
                      score: org.complianceScore || 0
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="score" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Risk Level Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Low', value: overview?.riskDistribution?.low || 0, color: '#10b981' },
                          { name: 'Medium', value: overview?.riskDistribution?.medium || 0, color: '#f59e0b' },
                          { name: 'High', value: overview?.riskDistribution?.high || 0, color: '#ef4444' },
                          { name: 'Critical', value: overview?.riskDistribution?.critical || 0, color: '#dc2626' }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                      >
                        {[
                          { name: 'Low', value: overview?.riskDistribution?.low || 0, color: '#10b981' },
                          { name: 'Medium', value: overview?.riskDistribution?.medium || 0, color: '#f59e0b' },
                          { name: 'High', value: overview?.riskDistribution?.high || 0, color: '#ef4444' },
                          { name: 'Critical', value: overview?.riskDistribution?.critical || 0, color: '#dc2626' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-center">
              <Link href="/analytics">
                <Button>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  View Detailed Analytics
                </Button>
              </Link>
            </div>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-6">
            <div className="space-y-4">
              {alerts.slice(0, 10).map((alert: any) => (
                <Card key={alert.id} className={`alert-${alert.severity}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getSeverityIcon(alert.severity)}
                        <CardTitle className="text-lg">{alert.title}</CardTitle>
                        <Badge className={`alert-${alert.severity}`}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(alert.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-4">{alert.description}</p>
                    {alert.recommendedActions && alert.recommendedActions.length > 0 && (
                      <div>
                        <h5 className="font-medium mb-2">Recommended Actions:</h5>
                        <ul className="text-sm space-y-1">
                          {alert.recommendedActions.map((action: string, idx: number) => (
                            <li key={idx} className="flex items-center space-x-2">
                              <span>•</span>
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-center">
              <Link href="/alerts">
                <Button>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  View All Alerts
                </Button>
              </Link>
            </div>
          </TabsContent>

          {/* Regional Tab */}
          <TabsContent value="regional" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regionalData.map((region: any) => (
                <Card key={region.region}>
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <Globe className="w-5 h-5 text-muted-foreground" />
                      <CardTitle>{region.region}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Organizations</span>
                      <Badge variant="outline">{region.organizationCount}</Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Avg Compliance</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={region.averageCompliance || 0} className="w-16" />
                        <span className="text-sm font-medium">{region.averageCompliance?.toFixed(1) || '0.0'}%</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">High Risk</span>
                      <Badge className="bg-orange-100 text-orange-800">{region.highRiskCount || 0}</Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Critical Risk</span>
                      <Badge className="bg-red-100 text-red-800">{region.criticalRiskCount || 0}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/trends">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <TrendingUp className="w-12 h-12 text-trend-purple mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Trend Analysis</h3>
                <p className="text-sm text-muted-foreground">AI-powered compliance trend analysis and forecasting</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/data-feeds">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <Activity className="w-12 h-12 text-compliance-green mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Data Feeds</h3>
                <p className="text-sm text-muted-foreground">Monitor real-time data ingestion from BCCS142 systems</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/audits">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <FileText className="w-12 h-12 text-warning-amber mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Audit Management</h3>
                <p className="text-sm text-muted-foreground">Schedule and manage regulatory audits and follow-ups</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}