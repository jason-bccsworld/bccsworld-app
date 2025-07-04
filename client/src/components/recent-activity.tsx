import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

export default function RecentActivity() {
  const { data: auditLogs = [] } = useQuery({
    queryKey: ["/api/audit-logs"],
    select: (data) => data.slice(0, 5), // Only show last 5 activities
  });

  const getActivityColor = (action: string) => {
    switch (action) {
      case "create_training_event":
        return "bg-emerald-500";
      case "upload_document":
        return "bg-aviation-blue";
      case "validate_data":
        return "bg-amber-500";
      default:
        return "bg-slate-500";
    }
  };

  const formatActivity = (log: any) => {
    switch (log.action) {
      case "create_training_event":
        return `${log.details?.studentName || "Student"} completed ${log.details?.eventType || "training event"}`;
      case "upload_document":
        return `New document uploaded: ${log.details?.filename || "document"}`;
      case "validate_data":
        return `Data validated: ${log.details?.validatedValue || "field"}`;
      default:
        return `${log.action.replace(/_/g, " ")} performed`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {auditLogs.length === 0 ? (
          <p className="text-slate-500 text-center py-4">No recent activity</p>
        ) : (
          <div className="space-y-4">
            {auditLogs.map((log: any) => (
              <div key={log.id} className="flex items-start space-x-3">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getActivityColor(log.action)}`} />
                <div>
                  <p className="text-sm text-slate-900">{formatActivity(log)}</p>
                  <p className="text-xs text-slate-500">
                    {format(new Date(log.timestamp), "MMM dd, yyyy 'at' hh:mm a")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
