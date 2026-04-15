import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { User, FileText, CheckCircle, Settings, Eye, Upload } from "lucide-react";
import { format } from "date-fns";

export default function AuditTrail() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/login";
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: auditLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["/api/audit-logs"],
    enabled: isAuthenticated,
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case "upload_document":
        return <Upload className="w-5 h-5 text-aviation-blue" />;
      case "validate_data":
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case "create_training_event":
        return <FileText className="w-5 h-5 text-amber-500" />;
      case "view":
        return <Eye className="w-5 h-5 text-slate-500" />;
      default:
        return <User className="w-5 h-5 text-slate-500" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "upload_document":
        return "bg-blue-100 text-aviation-blue";
      case "validate_data":
        return "bg-emerald-100 text-emerald-800";
      case "create_training_event":
        return "bg-amber-100 text-amber-800";
      case "view":
        return "bg-slate-100 text-slate-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-aviation-blue"></div>
      </div>
    );
  }

  return (
    <>
      <Header 
        title="Audit Trail"
        description="Complete log of all system activities and user actions"
      />
      
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription>
              Immutable record of all actions performed in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aviation-blue"></div>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>No audit logs found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {auditLogs.map((log: any) => (
                  <div key={log.id} className="flex items-start space-x-4 p-4 bg-slate-50 rounded-lg">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                      {getActionIcon(log.action)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-slate-900">
                            {formatAction(log.action)}
                          </h4>
                          <Badge className={getActionColor(log.action)}>
                            {log.entityType}
                          </Badge>
                        </div>
                        <span className="text-sm text-slate-500">
                          {format(new Date(log.timestamp), "MMM dd, yyyy 'at' hh:mm a")}
                        </span>
                      </div>
                      
                      <div className="text-sm text-slate-600 mb-2">
                        {log.userEmail ? (
                          <span>by {log.userEmail}</span>
                        ) : (
                          <span>by system</span>
                        )}
                        {log.details && (
                          <span className="ml-2">
                            • {Object.entries(log.details).map(([key, value]) => (
                              <span key={key} className="mr-2">
                                {key}: {String(value)}
                              </span>
                            ))}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-xs text-slate-500">
                        <span>IP: {log.ipAddress || "N/A"}</span>
                        <span>Entity ID: {log.entityId}</span>
                        <span>User ID: {log.userId || "system"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
