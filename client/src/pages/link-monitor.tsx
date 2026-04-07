import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface LinkStatus {
  url: string;
  status: 'active' | 'broken' | 'redirected' | 'changed';
  lastChecked: string;
  responseCode?: number;
  newUrl?: string;
  contentChange?: boolean;
  errorMessage?: string;
}

interface LinkAlert {
  id: string;
  url: string;
  alertType: 'broken_link' | 'redirect_detected' | 'content_changed' | 'new_regulation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  detectedAt: string;
  resolved: boolean;
  suggestedAction?: string;
  newUrl?: string;
}

export default function LinkMonitorPage() {
  const [linkStatuses, setLinkStatuses] = useState<LinkStatus[]>([]);
  const [alerts, setAlerts] = useState<LinkAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLinkData = async () => {
    try {
      const res = await fetch('/api/link-monitor/statuses', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();

      const statuses: LinkStatus[] = (data.statuses || []).map((s: any) => ({
        url: s.url,
        status: s.status,
        lastChecked: s.lastChecked,
        responseCode: s.responseCode,
        newUrl: s.newUrl,
        contentChange: s.contentChange,
        errorMessage: s.errorMessage,
      }));

      const linkAlerts: LinkAlert[] = (data.alerts || []).map((a: any) => ({
        id: a.id,
        url: a.description?.match(/https?:\/\/[^\s]+/)?.[0] || '',
        alertType: a.type === 'REGULATORY_CHANGE' ? 'redirect_detected' : 'content_changed',
        severity: a.severity === 'CRITICAL' ? 'critical' :
                  a.severity === 'HIGH' ? 'high' :
                  a.severity === 'MEDIUM' ? 'medium' : 'low',
        message: a.description,
        detectedAt: a.createdAt,
        resolved: a.acknowledged,
        suggestedAction: a.actionRequired,
      }));

      setLinkStatuses(statuses);
      setAlerts(linkAlerts);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching link data:', error);
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLinkData();
    setRefreshing(false);
  };

  const handleResolveAlert = async (alertId: string) => {
    setAlerts(alerts.map(alert => 
      alert.id === alertId ? { ...alert, resolved: true } : alert
    ));
  };

  useEffect(() => {
    fetchLinkData();
  }, []);

  const getStatusIcon = (status: LinkStatus['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'broken':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'redirected':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'changed':
        return <AlertTriangle className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: LinkStatus['status']) => {
    const variants = {
      active: 'bg-green-100 text-green-800',
      broken: 'bg-red-100 text-red-800',
      redirected: 'bg-yellow-100 text-yellow-800',
      changed: 'bg-blue-100 text-blue-800',
    };
    
    return (
      <Badge className={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getSeverityBadge = (severity: LinkAlert['severity']) => {
    const variants = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    };
    
    return (
      <Badge className={variants[severity]}>
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2">Loading link monitoring data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Regulatory Link Monitor</h1>
          <p className="text-gray-600">
            AI-powered monitoring of regulatory hyperlinks to prevent broken references
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Checking...' : 'Refresh Status'}
        </Button>
      </div>

      {/* Active Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Active Alerts ({alerts.filter(a => !a.resolved).length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alerts.filter(alert => !alert.resolved).map((alert) => (
              <Alert key={alert.id} className="border-l-4 border-l-orange-500">
                <AlertDescription>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getSeverityBadge(alert.severity)}
                        <span className="text-sm text-gray-500">
                          {alert.alertType.replace('_', ' ').toLowerCase()}
                        </span>
                      </div>
                      <p className="font-medium mb-1">{alert.message}</p>
                      <p className="text-sm text-gray-600 mb-2">
                        URL: <code className="bg-gray-100 px-1 rounded">{alert.url}</code>
                      </p>
                      {alert.newUrl && (
                        <p className="text-sm text-gray-600 mb-2">
                          New URL: <code className="bg-gray-100 px-1 rounded">{alert.newUrl}</code>
                        </p>
                      )}
                      <p className="text-sm text-blue-600 mb-2">
                        <strong>Suggested Action:</strong> {alert.suggestedAction}
                      </p>
                      <p className="text-xs text-gray-500">
                        Detected: {new Date(alert.detectedAt).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleResolveAlert(alert.id)}
                      variant="outline"
                      size="sm"
                      className="ml-4"
                    >
                      Mark Resolved
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
            {alerts.filter(alert => !alert.resolved).length === 0 && (
              <p className="text-gray-500 text-center py-4">
                No active alerts - all regulatory links are functioning properly
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Link Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Link Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {linkStatuses.map((link, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(link.status)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {link.url.length > 60 ? 
                          `${link.url.substring(0, 60)}...` : 
                          link.url
                        }
                      </span>
                      <ExternalLink className="h-3 w-3 text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-500">
                      Last checked: {new Date(link.lastChecked).toLocaleString()}
                    </p>
                    {link.errorMessage && (
                      <p className="text-xs text-red-600">
                        Error: {link.errorMessage}
                      </p>
                    )}
                    {link.newUrl && (
                      <p className="text-xs text-blue-600">
                        Redirected to: {link.newUrl}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(link.status)}
                  {link.responseCode && (
                    <Badge variant="outline" className="text-xs">
                      {link.responseCode}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monitoring Statistics */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Links</p>
                <p className="text-2xl font-bold">{linkStatuses.length}</p>
              </div>
              <ExternalLink className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Links</p>
                <p className="text-2xl font-bold text-green-600">
                  {linkStatuses.filter(l => l.status === 'active').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Issues Found</p>
                <p className="text-2xl font-bold text-red-600">
                  {linkStatuses.filter(l => l.status === 'broken').length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Redirects</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {linkStatuses.filter(l => l.status === 'redirected').length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}