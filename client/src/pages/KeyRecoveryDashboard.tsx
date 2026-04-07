import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  Key, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Users,
  Fingerprint,
  FileCheck,
  Lock,
  Activity,
  TrendingUp,
  AlertCircle,
  Eye
} from 'lucide-react';
import { Link } from 'wouter';

interface RecoveryRequest {
  id: string;
  credentialId: string;
  requestType: string;
  status: string;
  progress: number;
  requestedAt: string;
  urgencyLevel: string;
  requesterName: string;
  organization: string;
}

export function KeyRecoveryDashboard() {
  const { data: requestsResponse, isLoading } = useQuery({
    queryKey: ['/api/advanced-key-recovery/requests'],
    queryFn: async () => {
      const res = await fetch('/api/advanced-key-recovery/requests', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load requests');
      return res.json();
    }
  });

  const apiRequests: any[] = requestsResponse?.data ?? [];

  const recentRequests: RecoveryRequest[] = apiRequests.map((r: any) => ({
    id: r.id,
    credentialId: r.credentialId ?? '',
    requestType: r.requestType ?? 'lost_key',
    status: r.status ?? 'processing',
    progress: r.progress ?? 0,
    requestedAt: r.requestedAt
      ? new Date(r.requestedAt).toLocaleString()
      : '—',
    urgencyLevel: r.urgencyLevel ?? 'medium',
    requesterName: r.requesterName ?? 'Pilot',
    organization: r.organization ?? '—'
  }));

  const stats = {
    totalRequests: recentRequests.length,
    pendingRequests: recentRequests.filter(r => r.status === 'pending_approval' || r.status === 'processing').length,
    completedRequests: recentRequests.filter(r => r.status === 'completed').length,
    emergencyRequests: recentRequests.filter(r => r.urgencyLevel === 'critical').length,
    averageProcessingTime: '18 hours',
    successRate: recentRequests.length > 0
      ? Math.round((recentRequests.filter(r => r.status === 'completed').length / recentRequests.length) * 100)
      : 0
  };

  const verificationMethods = [
    {
      name: 'Biometric Verification',
      icon: Fingerprint,
      success: 94,
      total: 125,
      color: 'text-blue-600'
    },
    {
      name: 'Identity Documents',
      icon: FileCheck,
      success: 118,
      total: 125,
      color: 'text-green-600'
    },
    {
      name: 'Employment Verification',
      icon: Users,
      success: 110,
      total: 125,
      color: 'text-purple-600'
    },
    {
      name: 'Regulatory Authority',
      icon: Shield,
      success: 89,
      total: 95,
      color: 'text-orange-600'
    }
  ];

  const securityAlerts = [
    {
      type: 'suspicious_location',
      message: 'Recovery request from unusual geographic location detected',
      severity: 'medium',
      count: 3,
      timestamp: '1 hour ago'
    },
    {
      type: 'multiple_attempts',
      message: 'Multiple failed biometric verification attempts',
      severity: 'high',
      count: 1,
      timestamp: '3 hours ago'
    },
    {
      type: 'expired_documents',
      message: 'Identity documents past expiration date submitted',
      severity: 'low',
      count: 2,
      timestamp: '6 hours ago'
    }
  ];

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'processing': return 'text-blue-600';
      case 'pending_approval': return 'text-orange-600';
      case 'investigating': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <Lock className="h-8 w-8 mx-auto mb-2 animate-pulse" />
          <p>Loading recovery dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Lock className="h-8 w-8 text-red-600" />
            Advanced Key Recovery Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Monitor and manage secure key recovery requests with comprehensive verification
          </p>
        </div>
        <Link href="/advanced-key-recovery">
          <Button size="lg" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Initiate Recovery
          </Button>
        </Link>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRequests}</div>
            <p className="text-xs text-muted-foreground">All time recovery requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingRequests}</div>
            <p className="text-xs text-muted-foreground">Awaiting verification</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emergency Requests</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.emergencyRequests}</div>
            <p className="text-xs text-muted-foreground">Requiring immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate}%</div>
            <p className="text-xs text-muted-foreground">Average processing: {stats.averageProcessingTime}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Recovery Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Recent Recovery Requests
            </CardTitle>
            <CardDescription>
              Latest key recovery requests and their current status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentRequests.length === 0 && (
              <p className="text-center text-muted-foreground py-4 text-sm">No recovery requests yet.</p>
            )}
            {recentRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{request.requesterName}</span>
                    <Badge variant="outline" className="text-xs">
                      {request.organization}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge 
                      variant="outline" 
                      className={getUrgencyColor(request.urgencyLevel)}
                    >
                      {request.urgencyLevel.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {request.requestType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={request.progress} className="flex-1 h-2" />
                    <span className="text-xs text-gray-500">{request.progress}%</span>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className={`text-sm font-medium ${getStatusColor(request.status)}`}>
                    {request.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                  <div className="text-xs text-gray-500">{request.requestedAt}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Verification Methods Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Verification Methods Performance
            </CardTitle>
            <CardDescription>
              Success rates for different verification methods
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {verificationMethods.map((method, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <method.icon className={`h-5 w-5 ${method.color}`} />
                  <div>
                    <h4 className="font-semibold">{method.name}</h4>
                    <p className="text-sm text-gray-600">
                      {method.success}/{method.total} successful
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">
                    {Math.round((method.success / method.total) * 100)}%
                  </div>
                  <div className="text-xs text-gray-500">Success Rate</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Security Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Security Alerts
          </CardTitle>
          <CardDescription>
            Recent security alerts and suspicious activities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {securityAlerts.map((alert, index) => (
            <Alert key={index}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <span className="font-semibold">{alert.message}</span>
                    <div className="text-sm text-gray-600 mt-1">
                      {alert.count} occurrence(s) • {alert.timestamp}
                    </div>
                  </div>
                  <Badge 
                    variant="outline"
                    className={
                      alert.severity === 'high' ? 'bg-red-100 text-red-800' :
                      alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }
                  >
                    {alert.severity.toUpperCase()}
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </CardContent>
      </Card>

      {/* Recovery Process Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Multi-Factor Recovery Process
          </CardTitle>
          <CardDescription>
            Comprehensive security verification workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 border rounded-lg">
              <Fingerprint className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h4 className="font-semibold">Biometric Verification</h4>
              <p className="text-sm text-gray-600 mt-1">
                Multi-modal biometric authentication including fingerprint, face, voice, and retina
              </p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <FileCheck className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h4 className="font-semibold">Identity Documents</h4>
              <p className="text-sm text-gray-600 mt-1">
                OCR processing and cross-reference with issuing authorities for document verification
              </p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <h4 className="font-semibold">Employment Verification</h4>
              <p className="text-sm text-gray-600 mt-1">
                HR contact verification and manager approval for current employment status
              </p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <Shield className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <h4 className="font-semibold">Regulatory Authority</h4>
              <p className="text-sm text-gray-600 mt-1">
                Cross-reference with FAA, EASA, and other regulatory databases
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Recovery Protocol */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Emergency Recovery Protocol
          </CardTitle>
          <CardDescription>
            Fast-track recovery for critical situations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-3 border rounded-lg bg-red-50">
              <div className="text-lg font-bold text-red-700">Critical</div>
              <div className="text-sm text-red-600">1-4 hours</div>
              <div className="text-xs text-gray-600 mt-1">Medical emergencies</div>
            </div>
            
            <div className="text-center p-3 border rounded-lg bg-orange-50">
              <div className="text-lg font-bold text-orange-700">High</div>
              <div className="text-sm text-orange-600">4-12 hours</div>
              <div className="text-xs text-gray-600 mt-1">Security breaches</div>
            </div>
            
            <div className="text-center p-3 border rounded-lg bg-yellow-50">
              <div className="text-lg font-bold text-yellow-700">Medium</div>
              <div className="text-sm text-yellow-600">1-2 days</div>
              <div className="text-xs text-gray-600 mt-1">Equipment failure</div>
            </div>
            
            <div className="text-center p-3 border rounded-lg bg-green-50">
              <div className="text-lg font-bold text-green-700">Low</div>
              <div className="text-sm text-green-600">3-5 days</div>
              <div className="text-xs text-gray-600 mt-1">Standard requests</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link href="/advanced-key-recovery">
          <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2">
            <AlertTriangle className="h-6 w-6" />
            <span className="text-sm">Initiate Recovery</span>
          </Button>
        </Link>
        
        <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2">
          <Eye className="h-6 w-6" />
          <span className="text-sm">Review Pending</span>
        </Button>
        
        <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2">
          <Shield className="h-6 w-6" />
          <span className="text-sm">Security Audit</span>
        </Button>
        
        <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2">
          <Activity className="h-6 w-6" />
          <span className="text-sm">System Status</span>
        </Button>
      </div>
    </div>
  );
}