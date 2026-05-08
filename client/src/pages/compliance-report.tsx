import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Printer, Download, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { format } from "date-fns";
import { FeatureGate } from "@/components/feature-gate";

function PrintSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold text-gray-800 border-b pb-1 mb-3">{title}</h2>
      {children}
    </div>
  );
}

export default function ComplianceReport() {
  const { data: events = [] } = useQuery<any[]>({ queryKey: ["/api/training-events"] });
  const { data: students = [] } = useQuery<any[]>({ queryKey: ["/api/students"] });
  const { data: instructors = [] } = useQuery<any[]>({ queryKey: ["/api/instructors"] });
  const { data: alertsData } = useQuery<any>({ queryKey: ["/api/alerts"] });
  const alerts: any[] = Array.isArray(alertsData) ? alertsData : (alertsData?.alerts || []);

  const orgName = "Training Organization"; // could fetch from org settings
  const today = format(new Date(), "MMMM d, yyyy");

  const completedEvents = events.filter(e => e.status === "completed");
  const pendingEvents = events.filter(e => e.status === "pending");
  const activeStudents = students.filter(s => s.status === "active");
  const currentInstructors = instructors.filter(i => i.status === "current");
  const expiringInstructors = instructors.filter(i => {
    if (!i.expiration_date) return false;
    const days = (new Date(i.expiration_date).getTime() - Date.now()) / 86400000;
    return days <= 90;
  });

  const complianceScore = Math.round(
    ((completedEvents.length / (events.length || 1)) * 40) +
    ((currentInstructors.length / (instructors.length || 1)) * 30) +
    (expiringInstructors.length === 0 ? 30 : Math.max(0, 30 - expiringInstructors.length * 10))
  );

  const handlePrint = () => window.print();

  return (
    <FeatureGate feature="complianceReports" featureLabel="Compliance Reports">
    <div className="space-y-6">
      {/* Screen-only controls */}
      <div className="print:hidden flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compliance Report</h1>
          <p className="text-slate-600">Generate a printable compliance status summary for FAA inspection</p>
        </div>
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" /> Print / Save PDF
        </Button>
      </div>

      {/* Overall score */}
      <Card className="print:shadow-none">
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white ${
              complianceScore >= 80 ? "bg-green-600" : complianceScore >= 60 ? "bg-amber-500" : "bg-red-600"
            }`}>
              {complianceScore}%
            </div>
            <div>
              <h2 className="text-xl font-bold">{complianceScore >= 80 ? "Compliant" : complianceScore >= 60 ? "Partially Compliant" : "Non-Compliant"}</h2>
              <p className="text-gray-500">Overall compliance score as of {today}</p>
              {complianceScore >= 80 && <p className="text-green-600 text-sm mt-1 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Ready for FAA audit</p>}
              {complianceScore < 80 && <p className="text-amber-600 text-sm mt-1 flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Action required before audit</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Printable report */}
      <div className="bg-white rounded-xl border shadow-sm print:shadow-none print:border-none p-8 max-w-4xl mx-auto" id="report-content">
        {/* Report header */}
        <div className="text-center mb-8 pb-6 border-b">
          <h1 className="text-2xl font-bold text-gray-900">Aviation Compliance Report</h1>
          <p className="text-gray-600 mt-1">{orgName}</p>
          <p className="text-sm text-gray-400 mt-1">Generated: {today} · BCCS-US Compliance Platform</p>
        </div>

        <PrintSection title="Executive Summary">
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { label: "Compliance Score", value: `${complianceScore}%`, color: complianceScore >= 80 ? "text-green-600" : "text-amber-600" },
              { label: "Training Events", value: `${completedEvents.length}/${events.length}` , color: "text-blue-600" },
              { label: "Active Students", value: activeStudents.length, color: "text-blue-600" },
            ].map(({ label, value, color }) => (
              <div key={label} className="border rounded p-3">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-sm text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        </PrintSection>

        <PrintSection title="Training Records Summary">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-2 border">Metric</th>
                <th className="text-left p-2 border">Value</th>
                <th className="text-left p-2 border">Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { metric: "Total Training Events Logged", value: events.length, status: events.length > 0 ? "OK" : "Action Required" },
                { metric: "Completed Events", value: completedEvents.length, status: "OK" },
                { metric: "Pending Events", value: pendingEvents.length, status: pendingEvents.length === 0 ? "OK" : "Review" },
                { metric: "Blockchain-Verified Records", value: completedEvents.filter(e => e.blockchain_hash).length, status: "OK" },
              ].map(({ metric, value, status }) => (
                <tr key={metric}>
                  <td className="p-2 border">{metric}</td>
                  <td className="p-2 border font-medium">{value}</td>
                  <td className="p-2 border">
                    <span className={status === "OK" ? "text-green-600" : status === "Review" ? "text-amber-600" : "text-red-600"}>
                      {status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </PrintSection>

        <PrintSection title="Student Roster Status">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-2 border">Status</th>
                <th className="text-left p-2 border">Count</th>
                <th className="text-left p-2 border">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {["active", "completed", "suspended"].map(status => {
                const cnt = students.filter(s => s.status === status).length;
                return (
                  <tr key={status}>
                    <td className="p-2 border capitalize">{status}</td>
                    <td className="p-2 border font-medium">{cnt}</td>
                    <td className="p-2 border">{students.length > 0 ? `${Math.round(cnt / students.length * 100)}%` : "—"}</td>
                  </tr>
                );
              })}
              <tr className="font-bold bg-gray-50">
                <td className="p-2 border">Total</td>
                <td className="p-2 border">{students.length}</td>
                <td className="p-2 border">100%</td>
              </tr>
            </tbody>
          </table>
        </PrintSection>

        <PrintSection title="Instructor Certificate Status (Part 141.10)">
          {instructors.length === 0 ? (
            <p className="text-amber-600 p-3 bg-amber-50 rounded border border-amber-200 text-sm">
              ⚠ No instructor records on file. Add instructor records to meet Part 141.10 requirements.
            </p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-2 border">Instructor</th>
                  <th className="text-left p-2 border">Certificate</th>
                  <th className="text-left p-2 border">Cert #</th>
                  <th className="text-left p-2 border">Expiration</th>
                  <th className="text-left p-2 border">Status</th>
                </tr>
              </thead>
              <tbody>
                {instructors.map((i: any) => {
                  const isExpiring = i.expiration_date && (new Date(i.expiration_date).getTime() - Date.now()) / 86400000 <= 90;
                  return (
                    <tr key={i.id}>
                      <td className="p-2 border">{i.first_name} {i.last_name}</td>
                      <td className="p-2 border">{i.certificate_type}</td>
                      <td className="p-2 border font-mono text-xs">{i.certificate_number}</td>
                      <td className="p-2 border">{i.expiration_date ? format(new Date(i.expiration_date), "MMM d, yyyy") : "—"}</td>
                      <td className={`p-2 border font-medium ${i.status === "current" && !isExpiring ? "text-green-600" : "text-amber-600"}`}>
                        {isExpiring ? "Expiring Soon" : i.status}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </PrintSection>

        <PrintSection title="Open Compliance Alerts">
          {(alerts as any[]).filter((a: any) => !a.acknowledged).length === 0 ? (
            <p className="text-green-700 p-3 bg-green-50 rounded border border-green-200 text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> No open compliance alerts — ready for inspection.
            </p>
          ) : (
            <div className="space-y-2">
              {(alerts as any[]).filter((a: any) => !a.acknowledged).slice(0, 5).map((alert: any, idx: number) => (
                <div key={alert.id || idx} className="p-3 bg-amber-50 border border-amber-200 rounded text-sm">
                  <p className="font-medium">{alert.title || alert.message}</p>
                  {alert.affectedFARPart && <p className="text-xs text-gray-500 mt-0.5">FAR Part {alert.affectedFARPart}</p>}
                </div>
              ))}
            </div>
          )}
        </PrintSection>

        {/* Certification footer */}
        <div className="mt-8 pt-6 border-t text-sm text-gray-500">
          <p className="font-medium text-gray-700">Certification</p>
          <p className="mt-1">I certify that the information contained in this report is accurate and complete to the best of my knowledge and belief.</p>
          <div className="mt-4 grid grid-cols-2 gap-8">
            <div>
              <div className="border-b border-gray-400 h-8 mb-1"></div>
              <p className="text-xs">Chief Instructor / Director of Training · Date</p>
            </div>
            <div>
              <div className="border-b border-gray-400 h-8 mb-1"></div>
              <p className="text-xs">Authorized Representative · Date</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </FeatureGate>
  );
}
