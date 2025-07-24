import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building, Shield, AlertTriangle, TrendingUp } from "lucide-react";
import { Link } from "wouter";

export function OrganizationDetail() {
  const { id } = useParams();

  const { data: organization, isLoading } = useQuery({
    queryKey: [`/api/organizations/${id}`],
  });

  const { data: complianceMetrics } = useQuery({
    queryKey: [`/api/compliance/metrics/${id}`],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-regulatory-blue"></div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Organization Not Found</h2>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="regulatory-header px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="outline" size="sm" className="text-white border-white hover:bg-white/10">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">{organization.name}</h1>
                <p className="text-blue-100">{organization.location}</p>
              </div>
            </div>
            <Badge className={organization.status === 'active' ? 'bg-green-500' : 'bg-red-500'}>
              {organization.status.toUpperCase()}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{complianceMetrics?.complianceScore?.toFixed(1) || organization.complianceScore?.toFixed(1) || '0.0'}%</div>
              <p className="text-xs text-muted-foreground">
                Current regulatory compliance rating
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Risk Level</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className={`risk-indicator ${complianceMetrics?.riskLevel || organization.riskLevel || 'medium'}`}></div>
                <span className="text-2xl font-bold capitalize">{complianceMetrics?.riskLevel || organization.riskLevel || 'Medium'}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                AI-assessed regulatory risk
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Audit</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {organization.lastAuditDate ? new Date(organization.lastAuditDate).toLocaleDateString() : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                Most recent regulatory inspection
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Organization Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Certificate Number</h4>
                  <p className="font-medium">{organization.certificateNumber || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Region</h4>
                  <p className="font-medium">{organization.region || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Type</h4>
                  <p className="font-medium">{organization.organizationType || 'Part 142'}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Status</h4>
                  <Badge variant={organization.status === 'active' ? 'default' : 'destructive'}>
                    {organization.status}
                  </Badge>
                </div>
              </div>
              
              {organization.contactInfo && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Contact Information</h4>
                  <div className="space-y-1 text-sm">
                    {organization.contactInfo.phone && (
                      <p>Phone: {organization.contactInfo.phone}</p>
                    )}
                    {organization.contactInfo.email && (
                      <p>Email: {organization.contactInfo.email}</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Risk Factors</CardTitle>
              <CardDescription>
                {complianceMetrics?.confidence ? 
                  `AI Assessment Confidence: ${(complianceMetrics.confidence * 100).toFixed(1)}%` :
                  'Latest risk assessment factors'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {complianceMetrics?.riskFactors && complianceMetrics.riskFactors.length > 0 ? (
                <div className="space-y-3">
                  {complianceMetrics.riskFactors.map((factor: any, index: number) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm">{factor.factor}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{factor.weight}%</span>
                        <Badge variant={factor.severity === 'high' ? 'destructive' : factor.severity === 'medium' ? 'secondary' : 'default'}>
                          {factor.severity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No specific risk factors identified</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <Link href={`/trends?scope=organization&scopeId=${id}`}>
            <Button>
              <TrendingUp className="w-4 h-4 mr-2" />
              View Trends
            </Button>
          </Link>
          <Link href="/alerts">
            <Button variant="outline">
              <AlertTriangle className="w-4 h-4 mr-2" />
              View Alerts
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}