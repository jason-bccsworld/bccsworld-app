import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  FileText,
  Users,
  Calendar,
  Shield
} from 'lucide-react';

interface ComplianceMetrics {
  overallScore: number;
  totalRequirements: number;
  compliantItems: number;
  nonCompliantItems: number;
  partialItems: number;
  criticalIssues: number;
  upcomingDeadlines: number;
  documentsProcessed: number;
  lastAuditDate: string;
}

export default function ComplianceDashboard() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['/api/compliance/metrics'],
    queryFn: async () => {
      // Mock data for demonstration - would come from real API
      const mockMetrics: ComplianceMetrics = {
        overallScore: 87,
        totalRequirements: 200,
        compliantItems: 174,
        nonCompliantItems: 15,
        partialItems: 11,
        criticalIssues: 3,
        upcomingDeadlines: 5,
        documentsProcessed: 42,
        lastAuditDate: new Date().toISOString()
      };
      return mockMetrics;
    }
  });

  if (isLoading) {
    return <div>Loading compliance dashboard...</div>;
  }

  if (!metrics) {
    return <div>Failed to load compliance metrics</div>;
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-100';
    if (score >= 75) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="space-y-6">
      {/* Overall Compliance Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="mr-2 h-5 w-5" />
            Overall Compliance Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className={`text-4xl font-bold ${getScoreColor(metrics.overallScore)}`}>
              {metrics.overallScore}%
            </div>
            <div className={`px-4 py-2 rounded-full ${getScoreBgColor(metrics.overallScore)}`}>
              <span className={`font-semibold ${getScoreColor(metrics.overallScore)}`}>
                {metrics.overallScore >= 90 ? 'Excellent' : 
                 metrics.overallScore >= 75 ? 'Good' : 'Needs Improvement'}
              </span>
            </div>
          </div>
          <Progress value={metrics.overallScore} className="mt-4" />
          <p className="text-sm text-gray-600 mt-2">
            Based on {metrics.totalRequirements} FAR Part 142 requirements
          </p>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
              Compliant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metrics.compliantItems}
            </div>
            <p className="text-sm text-gray-600">
              of {metrics.totalRequirements} requirements
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <AlertTriangle className="mr-2 h-4 w-4 text-red-500" />
              Critical Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {metrics.criticalIssues}
            </div>
            <p className="text-sm text-gray-600">require immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Clock className="mr-2 h-4 w-4 text-yellow-500" />
              Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {metrics.upcomingDeadlines}
            </div>
            <p className="text-sm text-gray-600">within 60 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <FileText className="mr-2 h-4 w-4 text-blue-500" />
              Documents Processed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {metrics.documentsProcessed}
            </div>
            <p className="text-sm text-gray-600">compliance documents</p>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 rounded mr-3"></div>
                <span>Compliant</span>
              </div>
              <div className="flex items-center">
                <span className="mr-2 font-semibold">{metrics.compliantItems}</span>
                <Badge className="bg-green-100 text-green-800">
                  {Math.round((metrics.compliantItems / metrics.totalRequirements) * 100)}%
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-yellow-500 rounded mr-3"></div>
                <span>Partial Compliance</span>
              </div>
              <div className="flex items-center">
                <span className="mr-2 font-semibold">{metrics.partialItems}</span>
                <Badge className="bg-yellow-100 text-yellow-800">
                  {Math.round((metrics.partialItems / metrics.totalRequirements) * 100)}%
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-500 rounded mr-3"></div>
                <span>Non-Compliant</span>
              </div>
              <div className="flex items-center">
                <span className="mr-2 font-semibold">{metrics.nonCompliantItems}</span>
                <Badge className="bg-red-100 text-red-800">
                  {Math.round((metrics.nonCompliantItems / metrics.totalRequirements) * 100)}%
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Items */}
      {(metrics.criticalIssues > 0 || metrics.upcomingDeadlines > 0) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Action Required:</strong> You have {metrics.criticalIssues} critical compliance issues and {metrics.upcomingDeadlines} upcoming deadlines that need attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Last Audit Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-4 w-4" />
            Last Audit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Last comprehensive audit completed on{' '}
            <span className="font-semibold">
              {new Date(metrics.lastAuditDate).toLocaleDateString()}
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}