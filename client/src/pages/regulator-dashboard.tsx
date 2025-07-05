import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Search, 
  Shield, 
  AlertCircle, 
  CheckCircle, 
  FileText, 
  Building, 
  TrendingUp,
  Eye,
  Download,
  Calendar,
  AlertTriangle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

export default function RegulatorDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedOrganization, setSelectedOrganization] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized", 
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Get overall compliance metrics across all organizations
  const { data: overallMetrics } = useQuery({
    queryKey: ["/api/analytics/compliance-metrics", "all"],
    enabled: isAuthenticated,
  });

  // Get organization-specific metrics when one is selected
  const { data: orgMetrics } = useQuery({
    queryKey: ["/api/analytics/compliance-metrics", selectedOrganization],
    enabled: isAuthenticated && selectedOrganization !== "all",
  });

  // Get comprehensive analytics report
  const { data: analyticsReport } = useQuery({
    queryKey: ["/api/analytics/report", "month"],
    enabled: isAuthenticated,
  });

  // Get forecasting data
  const { data: forecast } = useQuery({
    queryKey: ["/api/analytics/forecast", selectedOrganization],
    enabled: isAuthenticated,
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-aviation-blue"></div>
      </div>
    );
  }

  const currentMetrics = selectedOrganization === "all" ? overallMetrics : orgMetrics || overallMetrics;
  
  // Mock organization data for demonstration
  const organizations = [
    {
      id: "org1",
      name: "Eagle Flight Academy",
      location: "Texas, USA",
      complianceScore: 94,
      riskLevel: "low",
      lastAudit: "2024-12-15",
      certificatesIssued: 156,
      status: "active"
    },
    {
      id: "org2", 
      name: "Skyward Training Center",
      location: "São Paulo, Brazil",
      complianceScore: 87,
      riskLevel: "medium",
      lastAudit: "2024-11-28",
      certificatesIssued: 89,
      status: "active"
    },
    {
      id: "org3",
      name: "Aviation Excellence Institute", 
      location: "Lagos, Nigeria",
      complianceScore: 76,
      riskLevel: "high",
      lastAudit: "2024-10-12",
      certificatesIssued: 45,
      status: "review"
    },
    {
      id: "org4",
      name: "Nordic Flight School",
      location: "Stockholm, Sweden", 
      complianceScore: 91,
      riskLevel: "low",
      lastAudit: "2024-12-08",
      certificatesIssued: 123,
      status: "active"
    }
  ];

  const filteredOrganizations = organizations.filter(org => 
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "low": return "text-emerald-600 bg-emerald-50 border-emerald-200";
      case "medium": return "text-amber-600 bg-amber-50 border-amber-200";
      case "high": return "text-red-600 bg-red-50 border-red-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "text-emerald-600 bg-emerald-50 border-emerald-200";
      case "review": return "text-amber-600 bg-amber-50 border-amber-200";
      case "suspended": return "text-red-600 bg-red-50 border-red-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Regulatory Oversight</h1>
          <p className="text-slate-600">Comprehensive compliance monitoring across all training organizations</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={selectedOrganization} onValueChange={setSelectedOrganization}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Organizations</SelectItem>
              {organizations.map(org => (
                <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {selectedOrganization === "all" ? "Overall Compliance" : "Org Compliance"}
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(currentMetrics as any)?.overallScore || 87}%</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Badge className={getRiskColor((currentMetrics as any)?.riskLevel || "medium")}>
                {((currentMetrics as any)?.riskLevel || "medium").toUpperCase()}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Organizations</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {selectedOrganization === "all" ? organizations.filter(o => o.status === "active").length : "1"}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedOrganization === "all" ? `${organizations.filter(o => o.status === "review").length} under review` : organizations.find(o => o.id === selectedOrganization)?.status}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Certificates</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {selectedOrganization === "all" 
                ? organizations.reduce((sum, org) => sum + org.certificatesIssued, 0)
                : organizations.find(o => o.id === selectedOrganization)?.certificatesIssued || 0
              }
            </div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Assessment</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {selectedOrganization === "all" 
                ? organizations.filter(o => o.riskLevel === "high").length
                : "0"
              }
            </div>
            <p className="text-xs text-muted-foreground">
              High-risk organizations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="organizations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Analytics</TabsTrigger>
          <TabsTrigger value="actions">Regulatory Actions</TabsTrigger>
        </TabsList>

        {/* Organizations Tab */}
        <TabsContent value="organizations" className="space-y-6">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredOrganizations.map((org) => (
              <Card key={org.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{org.name}</CardTitle>
                    <Badge className={getStatusColor(org.status)}>
                      {org.status.toUpperCase()}
                    </Badge>
                  </div>
                  <CardDescription>{org.location}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Compliance Score</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={org.complianceScore} className="w-20" />
                      <span className="text-sm font-medium">{org.complianceScore}%</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Risk Level</span>
                    <Badge className={getRiskColor(org.riskLevel)}>
                      {org.riskLevel.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Certificates Issued</span>
                    <span className="font-medium">{org.certificatesIssued}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Last Audit</span>
                    <span className="text-sm text-muted-foreground">{org.lastAudit}</span>
                  </div>
                  
                  <div className="flex space-x-2 mt-4">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setSelectedOrganization(org.id)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Inspect
                    </Button>
                    <Button size="sm" variant="outline">
                      <FileText className="w-4 h-4 mr-1" />
                      Audit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Compliance Analytics Tab */}
        <TabsContent value="compliance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Trends</CardTitle>
                <CardDescription>Monthly compliance scores across organizations</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={(analyticsReport as any)?.accuracyTrends || [
                    { date: "Dec", value: 82 },
                    { date: "Jan", value: 85 },
                    { date: "Feb", value: 87 },
                    { date: "Mar", value: 89 },
                    { date: "Apr", value: 86 },
                    { date: "May", value: 91 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Distribution</CardTitle>
                <CardDescription>Organizations by risk level</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { risk: "Low", count: organizations.filter(o => o.riskLevel === "low").length },
                    { risk: "Medium", count: organizations.filter(o => o.riskLevel === "medium").length },
                    { risk: "High", count: organizations.filter(o => o.riskLevel === "high").length }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="risk" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0ea5e9" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Compliance Issues</CardTitle>
              <CardDescription>Recent compliance concerns requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 border border-amber-200 bg-amber-50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <div className="flex-1">
                    <h4 className="font-medium text-amber-800">Missing Training Records</h4>
                    <p className="text-sm text-amber-700">Aviation Excellence Institute - 3 incomplete certifications</p>
                  </div>
                  <Badge variant="outline" className="text-amber-600">
                    14 days overdue
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-3 p-3 border border-blue-200 bg-blue-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-800">Upcoming Audit</h4>
                    <p className="text-sm text-blue-700">Skyward Training Center - Scheduled for Jan 15, 2025</p>
                  </div>
                  <Badge variant="outline" className="text-blue-600">
                    7 days
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-3 p-3 border border-emerald-200 bg-emerald-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <div className="flex-1">
                    <h4 className="font-medium text-emerald-800">Compliance Achieved</h4>
                    <p className="text-sm text-emerald-700">Eagle Flight Academy - All requirements met</p>
                  </div>
                  <Badge variant="outline" className="text-emerald-600">
                    Completed
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Forecasted Compliance</CardTitle>
              <CardDescription>Predicted compliance rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Next Month</span>
                  <div className="flex items-center space-x-2">
                    <Progress value={(forecast as any)?.nextMonth || 85} className="w-24" />
                    <span className="text-sm font-medium">{(forecast as any)?.nextMonth || 85}%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Next Quarter</span>
                  <div className="flex items-center space-x-2">
                    <Progress value={(forecast as any)?.nextQuarter || 87} className="w-24" />
                    <span className="text-sm font-medium">{(forecast as any)?.nextQuarter || 87}%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Year End</span>
                  <div className="flex items-center space-x-2">
                    <Progress value={(forecast as any)?.yearEnd || 89} className="w-24" />
                    <span className="text-sm font-medium">{(forecast as any)?.yearEnd || 89}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Enforcement Actions</CardTitle>
                <CardDescription>Available regulatory actions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Issue Compliance Warning
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Inspection
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  Request Documentation
                </Button>
                <Button className="w-full justify-start" variant="destructive">
                  <Shield className="w-4 h-4 mr-2" />
                  Suspend Certification
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reports & Export</CardTitle>
                <CardDescription>Generate regulatory reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Compliance Summary Report
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Organization Performance Report
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Risk Assessment Report
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Annual Audit Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}