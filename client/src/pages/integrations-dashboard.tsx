import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Plus,
  RefreshCw,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Webhook,
  Database,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Integration {
  id: string;
  organizationId: string;
  systemType: string;
  systemName: string;
  apiUrl: string;
  syncInterval: number;
  lastSync: string | null;
  isActive: boolean;
  createdAt: string;
}

interface SyncLog {
  id: string;
  syncType: string;
  status: string;
  recordsImported: number;
  recordsErrors: number;
  startTime: string;
  endTime: string | null;
  duration: number | null;
}

export default function IntegrationsDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/login";
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // For demo purposes, using a mock organization ID
  const organizationId = "org1";

  // Get integrations for the organization
  const { data: integrations } = useQuery({
    queryKey: ["/api/integrations", organizationId],
    enabled: isAuthenticated,
  });

  // Get sync logs for selected integration
  const { data: syncLogs } = useQuery<any[]>({
    queryKey: ["/api/integrations", selectedIntegration, "logs"],
    enabled: isAuthenticated && !!selectedIntegration,
  });

  // Create integration mutation
  const createIntegration = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/integrations", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
      setShowCreateDialog(false);
      toast({
        title: "Success",
        description: "Integration created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create integration",
        variant: "destructive",
      });
    },
  });

  // Sync integration mutation
  const syncIntegration = useMutation({
    mutationFn: async (integrationId: string): Promise<{ recordsImported?: number }> => {
      const res = await apiRequest("POST", `/api/integrations/${integrationId}/sync`);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
      toast({
        title: "Sync Complete",
        description: `Imported ${data.recordsImported} records`,
      });
    },
    onError: (error) => {
      toast({
        title: "Sync Failed",
        description: "Failed to sync integration",
        variant: "destructive",
      });
    },
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-aviation-blue"></div>
      </div>
    );
  }

  const getSystemIcon = (systemType: string) => {
    switch (systemType) {
      case "flightschedulepro": return <Database className="w-5 h-5" />;
      case "flightcircle": return <Activity className="w-5 h-5" />;
      case "tafs": return <Settings className="w-5 h-5" />;
      default: return <Database className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success": return "text-emerald-600 bg-emerald-50 border-emerald-200";
      case "error": return "text-red-600 bg-red-50 border-red-200";
      case "partial": return "text-amber-600 bg-amber-50 border-amber-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Training System Integrations</h1>
          <p className="text-slate-600">Connect and sync with external aviation training management systems</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Integration
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Integration</DialogTitle>
              <DialogDescription>
                Connect to an external training management system
              </DialogDescription>
            </DialogHeader>
            <IntegrationForm
              onSubmit={(data) => createIntegration.mutate({ ...data, organizationId })}
              isLoading={createIntegration.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(integrations as Integration[] || []).map((integration) => (
          <Card key={integration.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getSystemIcon(integration.systemType)}
                  <CardTitle className="text-lg">{integration.systemName}</CardTitle>
                </div>
                <div className="flex items-center space-x-2">
                  {integration.isActive ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>
              </div>
              <CardDescription className="capitalize">
                {integration.systemType.replace(/([A-Z])/g, ' $1').trim()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Last Sync:</span>
                <span className="font-medium">
                  {integration.lastSync 
                    ? new Date(integration.lastSync).toLocaleDateString()
                    : "Never"
                  }
                </span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Sync Interval:</span>
                <span className="font-medium">{integration.syncInterval}h</span>
              </div>

              <Separator />

              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => syncIntegration.mutate(integration.id)}
                  disabled={!integration.isActive || syncIntegration.isPending}
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Sync Now
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedIntegration(integration.id)}
                  className="flex-1"
                >
                  <Activity className="w-4 h-4 mr-1" />
                  View Logs
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sync Logs Panel */}
      {selectedIntegration && (
        <Card>
          <CardHeader>
            <CardTitle>Sync History</CardTitle>
            <CardDescription>
              Recent synchronization activity for selected integration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(syncLogs as SyncLog[] || []).map((log, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge className={getStatusColor(log.status)}>
                      {log.status.toUpperCase()}
                    </Badge>
                    <div>
                      <p className="font-medium text-sm">
                        {log.syncType === "manual" ? "Manual Sync" : "Scheduled Sync"}
                      </p>
                      <p className="text-xs text-slate-600">
                        {new Date(log.startTime).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {log.recordsImported} imported
                    </p>
                    {log.recordsErrors > 0 && (
                      <p className="text-xs text-red-600">
                        {log.recordsErrors} errors
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {(!syncLogs || syncLogs.length === 0) && (
                <div className="text-center py-8 text-slate-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No sync history available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Integration Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Webhook className="w-5 h-5" />
            <span>Integration Guide</span>
          </CardTitle>
          <CardDescription>
            Supported training management systems and setup instructions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium flex items-center space-x-2 mb-2">
                <Database className="w-4 h-4" />
                <span>Flight Schedule Pro</span>
              </h4>
              <p className="text-sm text-slate-600">
                Popular scheduling and training management platform. Requires API key from account settings.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium flex items-center space-x-2 mb-2">
                <Activity className="w-4 h-4" />
                <span>Flight Circle</span>
              </h4>
              <p className="text-sm text-slate-600">
                Comprehensive flight training management. Uses X-API-Key authentication method.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium flex items-center space-x-2 mb-2">
                <Settings className="w-4 h-4" />
                <span>TAFS</span>
              </h4>
              <p className="text-sm text-slate-600">
                Training Aircraft Flight Scheduler. Requires Token-based authentication.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-800">Webhook Support</h4>
              <p className="text-sm text-blue-700">
                Set up webhooks in your training system to point to:
                <code className="ml-1 px-1 bg-white rounded">
                  /api/integrations/webhook/{organizationId}
                </code>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Integration Form Component
function IntegrationForm({ onSubmit, isLoading }: { onSubmit: (data: any) => void; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    systemType: '',
    systemName: '',
    apiUrl: '',
    apiKey: '',
    syncInterval: 24,
    isActive: true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="systemType">System Type</Label>
        <Select value={formData.systemType} onValueChange={(value) => setFormData({ ...formData, systemType: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select training system" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="flightschedulepro">Flight Schedule Pro</SelectItem>
            <SelectItem value="flightcircle">Flight Circle</SelectItem>
            <SelectItem value="tafs">TAFS</SelectItem>
            <SelectItem value="custom">Custom System</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="systemName">System Name</Label>
        <Input
          id="systemName"
          value={formData.systemName}
          onChange={(e) => setFormData({ ...formData, systemName: e.target.value })}
          placeholder="e.g., Main Training System"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="apiUrl">API URL</Label>
        <Input
          id="apiUrl"
          value={formData.apiUrl}
          onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
          placeholder="https://api.yourtrainingystem.com"
          type="url"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="apiKey">API Key</Label>
        <Input
          id="apiKey"
          value={formData.apiKey}
          onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
          placeholder="Your API key"
          type="password"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="syncInterval">Sync Interval (hours)</Label>
        <Input
          id="syncInterval"
          value={formData.syncInterval}
          onChange={(e) => setFormData({ ...formData, syncInterval: parseInt(e.target.value) || 24 })}
          type="number"
          min="1"
          max="168"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
        />
        <Label htmlFor="isActive">Active</Label>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Creating..." : "Create Integration"}
        </Button>
      </div>
    </form>
  );
}