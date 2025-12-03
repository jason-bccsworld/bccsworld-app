import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Key, 
  Users, 
  FileCheck, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  Lock,
  Globe,
  ArrowRight
} from 'lucide-react';
import { Link } from 'wouter';

export function KeyManagementDashboard() {
  // This would fetch real stats in a production environment
  const stats = {
    totalOrganizations: 142,
    totalCredentials: 8567,
    trainingRecords: 23456,
    verifications: 45789,
    activeRecoveries: 3,
    monthlyGrowth: 23.5
  };

  const recentActivities = [
    {
      type: 'organization_registered',
      message: 'FlightSafety International registered new Part 142 certificate',
      timestamp: '2 hours ago',
      status: 'success'
    },
    {
      type: 'credential_verified',
      message: 'ATP License 987654321 verified across BCCS platforms',
      timestamp: '4 hours ago',
      status: 'success'
    },
    {
      type: 'training_record',
      message: 'Multi-signature training record created for B737 Type Rating',
      timestamp: '6 hours ago',
      status: 'success'
    },
    {
      type: 'key_recovery',
      message: 'Key recovery request initiated for Pilot License 123456789',
      timestamp: '1 day ago',
      status: 'warning'
    }
  ];

  const platformIntegrations = [
    {
      name: 'BCCS-US',
      description: 'Training Platform',
      status: 'active',
      verifications: 15234,
      color: 'blue'
    },
    {
      name: 'BCCSMAINT',
      description: 'Maintenance Platform', 
      status: 'active',
      verifications: 8967,
      color: 'green'
    },
    {
      name: 'BCCSATC',
      description: 'ATC Training',
      status: 'coming_soon',
      verifications: 0,
      color: 'purple'
    },
    {
      name: 'BCCSREG',
      description: 'Registry Platform',
      status: 'active',
      verifications: 21588,
      color: 'orange'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8 text-blue-600" />
            Universal Blockchain Key Management
          </h1>
          <p className="text-gray-600 mt-2">
            Professional credential management with blockchain security across all BCCS platforms
          </p>
        </div>
        <Link href="/key-management">
          <Button size="lg" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Manage Keys
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Training Organizations</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrganizations.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Registered with blockchain keys</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Professional Credentials</CardTitle>
            <Key className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCredentials.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Active credentials with private keys</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Training Records</CardTitle>
            <FileCheck className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.trainingRecords.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Multi-signature blockchain records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cross-Platform Verifications</CardTitle>
            <CheckCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.verifications.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +{stats.monthlyGrowth}% this month
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Integrations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Platform Integrations
            </CardTitle>
            <CardDescription>
              Universal credential verification across all BCCS platforms
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {platformIntegrations.map((platform) => (
              <div key={platform.name} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full bg-${platform.color}-100`}>
                    <Shield className={`h-4 w-4 text-${platform.color}-600`} />
                  </div>
                  <div>
                    <h4 className="font-semibold">{platform.name}</h4>
                    <p className="text-sm text-gray-600">{platform.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge 
                    variant={platform.status === 'active' ? 'default' : 'secondary'}
                    className="mb-1"
                  >
                    {platform.status === 'active' ? 'Active' : 'Coming Soon'}
                  </Badge>
                  {platform.verifications > 0 && (
                    <p className="text-xs text-gray-500">
                      {platform.verifications.toLocaleString()} verifications
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest blockchain key management activities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className={`p-1 rounded-full ${
                  activity.status === 'success' ? 'bg-green-100' : 'bg-yellow-100'
                }`}>
                  {activity.status === 'success' ? 
                    <CheckCircle className="h-4 w-4 text-green-600" /> :
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  }
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.message}</p>
                  <p className="text-xs text-gray-500">{activity.timestamp}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Key Recovery Status */}
      {stats.activeRecoveries > 0 && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                <strong>{stats.activeRecoveries} active key recovery requests</strong> require admin attention.
              </span>
              <Button variant="outline" size="sm">
                Review Requests
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* System Architecture Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Universal Key Management Architecture
          </CardTitle>
          <CardDescription>
            Hierarchical blockchain key system with BCCS as recovery authority
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 border rounded-lg">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h4 className="font-semibold">Training Organizations</h4>
              <p className="text-sm text-gray-600 mt-1">
                Master public keys for certificate verification and organizational signing authority
              </p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <Key className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h4 className="font-semibold">Professional Credentials</h4>
              <p className="text-sm text-gray-600 mt-1">
                Individual private keys tied to aviation licenses for career-portable records
              </p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <Lock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <h4 className="font-semibold">Recovery Authority</h4>
              <p className="text-sm text-gray-600 mt-1">
                BCCS provides secure key recovery with identity verification and employment confirmation
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link href="/key-management">
          <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2">
            <Users className="h-6 w-6" />
            <span className="text-sm">Register Organization</span>
          </Button>
        </Link>
        
        <Link href="/key-management">
          <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2">
            <Key className="h-6 w-6" />
            <span className="text-sm">Register Credential</span>
          </Button>
        </Link>
        
        <Link href="/key-management">
          <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2">
            <FileCheck className="h-6 w-6" />
            <span className="text-sm">Create Training Record</span>
          </Button>
        </Link>
        
        <Link href="/key-management">
          <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2">
            <CheckCircle className="h-6 w-6" />
            <span className="text-sm">Verify Credentials</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}