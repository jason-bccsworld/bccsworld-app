import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, Activity, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  warning: "bg-amber-100 text-amber-800",
  medium: "bg-amber-100 text-amber-800",
  info: "bg-blue-100 text-blue-700",
  low: "bg-gray-100 text-gray-700",
};

const EVENT_LABELS: Record<string, string> = {
  document_upload: "Document Upload",
  training_event_logged: "Training Event",
  org_setup: "Organization Setup",
  user_login: "User Login",
  user_logout: "User Logout",
  checklist_save: "Checklist Save",
  alert_acknowledged: "Alert Acknowledged",
};

function SeverityIcon({ severity }: { severity: string }) {
  switch (severity) {
    case "critical": case "high": return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case "warning": case "medium": return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case "info": return <Info className="h-4 w-4 text-blue-500" />;
    default: return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  }
}

function exportCSV(logs: any[]) {
  const headers = ["Timestamp", "Event Type", "User ID", "Severity", "IP Address", "Details"];
  const rows = logs.map(l => [
    l.timestamp ? format(new Date(l.timestamp), "yyyy-MM-dd HH:mm:ss") : "",
    l.eventType || l.event_type || "",
    l.userId || l.user_id || "",
    l.severity || "",
    l.ipAddress || l.ip_address || "",
    JSON.stringify(l.details || {}),
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `audit-history-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function AuditHistory() {
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  const { data: logs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/audit-history"],
  });

  const filtered = logs.filter(l => {
    const type = l.eventType || l.event_type || "";
    const userId = l.userId || l.user_id || "";
    const matchSearch = !search || type.includes(search.toLowerCase()) || userId.includes(search.toLowerCase());
    const matchEvent = eventFilter === "all" || type === eventFilter;
    const matchSeverity = severityFilter === "all" || (l.severity || "").toLowerCase() === severityFilter;
    return matchSearch && matchEvent && matchSeverity;
  });

  const allEventTypes = [...new Set(logs.map(l => l.eventType || l.event_type || "").filter(Boolean))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit History</h1>
          <p className="text-slate-600">Complete log of all platform actions and events</p>
        </div>
        <Button variant="outline" onClick={() => exportCSV(filtered)} disabled={filtered.length === 0}>
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Events", value: logs.length, color: "text-blue-600" },
          { label: "Critical", value: logs.filter(l => (l.severity || "").toLowerCase() === "critical").length, color: "text-red-600" },
          { label: "Warnings", value: logs.filter(l => ["warning", "medium"].includes((l.severity || "").toLowerCase())).length, color: "text-amber-600" },
          { label: "Info", value: logs.filter(l => (l.severity || "").toLowerCase() === "info").length, color: "text-green-600" },
        ].map(({ label, value, color }) => (
          <Card key={label}><CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-sm text-gray-600">{label}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search events or users…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={eventFilter} onValueChange={setEventFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Event type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            {allEventTypes.map(t => <SelectItem key={t} value={t}>{EVENT_LABELS[t] || t.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Log Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" /> Audit Log ({filtered.length} events)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-gray-400">Loading audit log…</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Activity className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>No audit events found</p>
            </div>
          ) : (
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {filtered.map((log: any, idx) => {
                const type = log.eventType || log.event_type || "unknown";
                const details = log.details as any || {};
                let detailText = "";
                if (type === "document_upload") detailText = details.fileName || "";
                else if (type === "training_event_logged") detailText = `${details.studentName || ""} — ${details.eventType || ""}`;
                else if (type === "org_setup") detailText = details.organizationName || "";

                return (
                  <div key={log.id || idx} className="flex items-start gap-3 p-4 hover:bg-gray-50">
                    <div className="mt-0.5 flex-shrink-0"><SeverityIcon severity={(log.severity || "info").toLowerCase()} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-gray-900">
                          {EVENT_LABELS[type] || type.replace(/_/g, " ")}
                        </span>
                        <Badge className={`${SEVERITY_STYLES[(log.severity || "info").toLowerCase()] || SEVERITY_STYLES.info} text-xs border-0`}>
                          {log.severity || "info"}
                        </Badge>
                      </div>
                      {detailText && <p className="text-sm text-gray-600 mt-0.5">{detailText}</p>}
                      <p className="text-xs text-gray-400 mt-1">
                        User: {log.userId || log.user_id || "system"}
                        {(log.ipAddress || log.ip_address) ? ` · IP: ${log.ipAddress || log.ip_address}` : ""}
                      </p>
                    </div>
                    <div className="text-xs text-gray-400 flex-shrink-0 text-right">
                      {log.timestamp ? format(new Date(log.timestamp), "MMM d, HH:mm") : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
