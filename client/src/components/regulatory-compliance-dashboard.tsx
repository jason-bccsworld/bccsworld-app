import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Globe, 
  RefreshCw,
  FileText,
  Calendar,
  TrendingUp
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface RegulatoryCompliance {
  id: string;
  regulation: string;
  section?: string;
  country: string;
  currentVersion: string;
  lastChecked: string;
  complianceLevel: "compliant" | "warning" | "non-compliant";
  pendingChanges: any[];
  nextReviewDate: string;
  requiredActions: string[];
  actionDeadline?: string;
  actionStatus: string;
}

interface ComplianceReport {
  overallStatus: "compliant" | "warning" | "non-compliant";
  regulations: RegulatoryCompliance[];
  recommendations: string[];
  lastUpdated: string;
}

export function RegulatoryComplianceDashboard() {
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  
  const { data: complianceReport, isLoading, refetch } = useQuery<ComplianceReport>({
    queryKey: ["/api/regulatory/compliance-report", selectedCountry],
    refetchInterval: 5 * 60 * 1000, // Check every 5 minutes
  });

  const getStatusColor = (level: string) => {
    switch (level) {
      case "compliant": return "bg-green-500";
      case "warning": return "bg-yellow-500";
      case "non-compliant": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusIcon = (level: string) => {
    switch (level) {
      case "compliant": return <CheckCircle className="w-4 h-4" />;
      case "warning": return <AlertTriangle className="w-4 h-4" />;
      case "non-compliant": return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "destructive";
      case "high": return "destructive";
      case "medium": return "secondary";
      case "low": return "outline";
      default: return "outline";
    }
  };

  const countries = complianceReport?.regulations 
    ? [...new Set(complianceReport.regulations.map(r => r.country))]
    : [];

  const filteredRegulations = complianceReport?.regulations?.filter(
    reg => selectedCountry === "all" || reg.country === selectedCountry
  ) || [];

  const complianceStats = {
    total: filteredRegulations.length,
    compliant: filteredRegulations.filter(r => r.complianceLevel === "compliant").length,
    warning: filteredRegulations.filter(r => r.complianceLevel === "warning").length,
    nonCompliant: filteredRegulations.filter(r => r.complianceLevel === "non-compliant").length,
  };

  const compliancePercentage = complianceStats.total > 0 
    ? Math.round((complianceStats.compliant / complianceStats.total) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading compliance status...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with overall status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Regulatory Compliance Monitor
          </h2>
          <p className="text-muted-foreground">
            Automated monitoring of aviation regulations across all jurisdictions
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overall status alert */}
      {complianceReport && (
        <Alert className={`border-l-4 ${
          complianceReport.overallStatus === "compliant" ? "border-l-green-500" :
          complianceReport.overallStatus === "warning" ? "border-l-yellow-500" :
          "border-l-red-500"
        }`}>
          <div className="flex items-center gap-2">
            {getStatusIcon(complianceReport.overallStatus)}
            <AlertDescription>
              <strong>Overall Status: {complianceReport.overallStatus.toUpperCase()}</strong>
              {complianceReport.overallStatus !== "compliant" && (
                <span className="ml-2">Immediate attention required for compliance maintenance</span>
              )}
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Compliance statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overall Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{compliancePercentage}%</div>
            <Progress value={compliancePercentage} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Compliant</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{complianceStats.compliant}</div>
            <p className="text-xs text-muted-foreground">regulations up to date</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">Warnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{complianceStats.warning}</div>
            <p className="text-xs text-muted-foreground">require review</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Non-Compliant</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{complianceStats.nonCompliant}</div>
            <p className="text-xs text-muted-foreground">urgent action needed</p>
          </CardContent>
        </Card>
      </div>

      {/* Country filter and detailed view */}
      <Tabs defaultValue="regulations" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="regulations">Regulations</TabsTrigger>
            <TabsTrigger value="changes">Recent Changes</TabsTrigger>
            <TabsTrigger value="actions">Required Actions</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <select 
              value={selectedCountry} 
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="px-3 py-1 border rounded-md"
            >
              <option value="all">All Countries</option>
              {countries.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>
        </div>

        <TabsContent value="regulations">
          <div className="grid gap-4">
            {filteredRegulations.map((regulation) => (
              <Card key={regulation.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(regulation.complianceLevel)}>
                        {getStatusIcon(regulation.complianceLevel)}
                        <span className="ml-1">{regulation.complianceLevel}</span>
                      </Badge>
                      <div>
                        <CardTitle className="text-lg">{regulation.regulation}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {regulation.country} • Version {regulation.currentVersion}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>Last checked: {new Date(regulation.lastChecked).toLocaleDateString()}</p>
                      <p>Next review: {new Date(regulation.nextReviewDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardHeader>
                
                {(regulation.pendingChanges.length > 0 || regulation.requiredActions.length > 0) && (
                  <CardContent>
                    {regulation.pendingChanges.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium mb-2">Pending Changes ({regulation.pendingChanges.length})</h4>
                        <div className="space-y-2">
                          {regulation.pendingChanges.slice(0, 3).map((change: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <Badge variant={getPriorityColor(change.priority)} size="sm">
                                {change.priority}
                              </Badge>
                              <span>{change.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {regulation.requiredActions.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Required Actions</h4>
                        <ul className="text-sm space-y-1">
                          {regulation.requiredActions.slice(0, 3).map((action, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                              {action}
                            </li>
                          ))}
                        </ul>
                        {regulation.actionDeadline && (
                          <p className="text-sm text-red-600 mt-2">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            Deadline: {new Date(regulation.actionDeadline).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="changes">
          <Card>
            <CardHeader>
              <CardTitle>Recent Regulatory Changes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Regulatory change monitoring is active. Changes will appear here as they are detected.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Action Items</CardTitle>
            </CardHeader>
            <CardContent>
              {complianceReport?.recommendations && complianceReport.recommendations.length > 0 ? (
                <div className="space-y-3">
                  {complianceReport.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-blue-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Recommendation {idx + 1}</p>
                        <p className="text-sm text-muted-foreground">{rec}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No immediate actions required. All regulations are up to date.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer with last update info */}
      {complianceReport && (
        <div className="text-center text-sm text-muted-foreground">
          Last updated: {new Date(complianceReport.lastUpdated).toLocaleString()}
          <br />
          Monitoring active for {complianceReport.regulations.length} regulations across {countries.length} jurisdictions
        </div>
      )}
    </div>
  );
}