import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plane, Shield, ShieldCheck, ShieldX, CheckCircle2, XCircle, Clock,
  AlertTriangle, Users, FileText, ClipboardList, GraduationCap, BookOpen,
  Search, ChevronRight, ChevronLeft, Building2, Key, RefreshCw, Loader2,
  Calendar, User, Mail, Award, AlertCircle, Eye
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

// ── API helper (key-authenticated, no cookie auth needed) ──────────────────

async function reviewerFetch(path: string, key: string) {
  const url = new URL(path, window.location.origin);
  url.searchParams.set("key", key);
  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || "Request failed");
  }
  return res.json();
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color = "blue" }: {
  icon: React.ElementType; label: string; value: number | string; sub?: string; color?: string;
}) {
  const colors: Record<string, string> = {
    blue: "text-blue-600 bg-blue-50",
    green: "text-green-600 bg-green-50",
    amber: "text-amber-600 bg-amber-50",
    red: "text-red-600 bg-red-50",
    purple: "text-purple-600 bg-purple-50",
    emerald: "text-emerald-600 bg-emerald-50",
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${colors[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xl font-bold text-slate-900 leading-none">{value}</p>
          <p className="text-sm text-slate-500 mt-0.5">{label}</p>
          {sub && <p className="text-xs text-slate-400">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function CertBadge({ expirationDate }: { expirationDate: string | null }) {
  if (!expirationDate) return <Badge variant="secondary" className="text-xs">No Expiry</Badge>;
  const exp = new Date(expirationDate);
  const now = new Date();
  const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / 86400000);
  if (daysLeft < 0) return <Badge className="bg-red-100 text-red-700 border-0 text-xs">Expired</Badge>;
  if (daysLeft < 90) return <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">Expires {format(exp, "MMM d, yyyy")}</Badge>;
  return <Badge className="bg-green-100 text-green-700 border-0 text-xs">Valid until {format(exp, "MMM d, yyyy")}</Badge>;
}

function SummaryTab({ orgId, apiKey }: { orgId: string; apiKey: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    reviewerFetch(`/api/reviewer-keys/org/${orgId}/summary`, apiKey)
      .then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [orgId, apiKey]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;
  if (error || !data) return <div className="text-red-500 py-8 text-center">{error || "Failed to load"}</div>;

  const { stats } = data;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={ClipboardList} label="Form Submissions" value={stats.formSubmissions} sub={`${stats.approvedForms} approved`} color="blue" />
        <StatCard icon={FileText} label="Form Templates" value={stats.formTemplates} color="purple" />
        <StatCard icon={Shield} label="Training Records" value={stats.trainingRecords} sub={`${stats.signedRecords} signed`} color="green" />
        <StatCard icon={GraduationCap} label="Instructors" value={stats.instructors} sub={stats.expiredCerts > 0 ? `${stats.expiredCerts} expired certs` : undefined} color={stats.expiredCerts > 0 ? "red" : "emerald"} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={BookOpen} label="Students" value={stats.students} color="blue" />
        <StatCard icon={CheckCircle2} label="Completed Training" value={stats.completedTraining} color="green" />
        <StatCard icon={Clock} label="Pending Training" value={stats.pendingTraining} color="amber" />
        <StatCard icon={ShieldCheck} label="Cryptographically Signed" value={stats.signedRecords} sub={`of ${stats.trainingRecords} records`} color="emerald" />
      </div>

      {(stats.expiredCerts > 0 || stats.expiringCerts > 0 || stats.pendingForms > 0) && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="font-medium text-amber-800 flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4" /> Attention Items
            </p>
            <ul className="space-y-1 text-sm text-amber-700">
              {stats.expiredCerts > 0 && <li>• {stats.expiredCerts} instructor certificate(s) are expired</li>}
              {stats.expiringCerts > 0 && <li>• {stats.expiringCerts} instructor certificate(s) expire within 90 days</li>}
              {stats.pendingForms > 0 && <li>• {stats.pendingForms} form submission(s) awaiting review</li>}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FormsTab({ orgId, apiKey }: { orgId: string; apiKey: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    reviewerFetch(`/api/reviewer-keys/org/${orgId}/forms`, apiKey)
      .then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [orgId, apiKey]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;
  if (error) return <div className="text-red-500 py-8 text-center">{error}</div>;

  const submissions = (data?.submissions ?? []).filter((s: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (s.template_title || "").toLowerCase().includes(q)
      || (s.submitted_by || "").toLowerCase().includes(q)
      || (s.submitter_name || "").toLowerCase().includes(q)
      || (s.organization_name || "").toLowerCase().includes(q);
  });

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
      submitted: "bg-blue-100 text-blue-700",
      under_review: "bg-amber-100 text-amber-700",
    };
    return map[status] ?? "bg-slate-100 text-slate-600";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search submissions…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span className="text-sm text-slate-500">{submissions.length} submissions</span>
      </div>

      {data?.templates?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">FAA Form Templates ({data.templates.length})</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {data.templates.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-slate-800">{t.title}</p>
                  {t.faa_document_title && <p className="text-xs text-slate-400">{t.faa_document_title}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {t.regulation_status === "needs_review" && (
                    <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">Needs Review</Badge>
                  )}
                  <Badge className={t.auto_generated ? "bg-purple-100 text-purple-700 border-0 text-xs" : "bg-slate-100 text-slate-600 border-0 text-xs"}>
                    {t.auto_generated ? "AI-Generated" : "Manual"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Submissions</p>
        {submissions.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>No submissions found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {submissions.map((s: any) => {
              const formData = typeof s.form_data === "string" ? JSON.parse(s.form_data) : (s.form_data ?? {});
              const fieldCount = Object.keys(formData).length;
              const isOpen = expanded === s.id;
              return (
                <div key={s.id} className="rounded-lg border bg-white overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 text-left"
                    onClick={() => setExpanded(isOpen ? null : s.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={`${statusBadge(s.status)} border-0 text-xs shrink-0`}>{s.status}</Badge>
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{s.template_title || "Untitled Form"}</p>
                        <p className="text-xs text-slate-400">
                          {s.submitter_name || s.submitted_by || "Anonymous"} · {s.submitted_at ? formatDistanceToNow(new Date(s.submitted_at), { addSuffix: true }) : "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{fieldCount} fields</span>
                      {isOpen ? <ChevronRight className="h-4 w-4 text-slate-400 rotate-90" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t px-4 py-3 bg-slate-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                        {Object.entries(formData).map(([key, val]) => (
                          <div key={key} className="text-sm">
                            <span className="font-medium text-slate-600 capitalize">{key.replace(/_/g, " ")}: </span>
                            <span className="text-slate-800">{String(val ?? "—")}</span>
                          </div>
                        ))}
                      </div>
                      {s.notes && (
                        <div className="mt-3 pt-3 border-t text-sm">
                          <span className="font-medium text-slate-600">Notes: </span>
                          <span className="text-slate-700">{s.notes}</span>
                        </div>
                      )}
                      {s.submitter_email && (
                        <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {s.submitter_email}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function TrainingTab({ orgId, apiKey }: { orgId: string; apiKey: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    reviewerFetch(`/api/reviewer-keys/org/${orgId}/compliance-records`, apiKey)
      .then(setRows).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [orgId, apiKey]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;
  if (error) return <div className="text-red-500 py-8 text-center">{error}</div>;

  const filtered = rows.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (r.student_name || "").toLowerCase().includes(q)
      || (r.instructor_name || "").toLowerCase().includes(q)
      || (r.event_type || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search records…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span className="text-sm text-slate-500">{filtered.length} records</span>
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p>No training records found</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="text-left py-3 px-4 font-medium text-slate-600">Student</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Instructor</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Type</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Date</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Signature</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r: any) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium">{r.student_name}</td>
                  <td className="py-3 px-4 text-slate-600">{r.instructor_name}</td>
                  <td className="py-3 px-4 text-slate-600 capitalize">{(r.event_type || "").replace(/_/g, " ")}</td>
                  <td className="py-3 px-4 text-slate-600">
                    {r.event_date ? format(new Date(r.event_date), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="py-3 px-4">
                    <Badge className={
                      r.status === "completed" ? "bg-green-100 text-green-700 border-0 text-xs" :
                      r.status === "pending" ? "bg-amber-100 text-amber-700 border-0 text-xs" :
                      "bg-red-100 text-red-700 border-0 text-xs"
                    }>{r.status}</Badge>
                  </td>
                  <td className="py-3 px-4">
                    {r.signature ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-700 font-medium">
                        <ShieldCheck className="h-3.5 w-3.5" /> Signed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <ShieldX className="h-3.5 w-3.5" /> Unsigned
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function InstructorsTab({ orgId, apiKey }: { orgId: string; apiKey: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    reviewerFetch(`/api/reviewer-keys/org/${orgId}/instructors`, apiKey)
      .then(setRows).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [orgId, apiKey]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;
  if (error) return <div className="text-red-500 py-8 text-center">{error}</div>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">{rows.length} instructor records</p>
      {rows.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p>No instructor records found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rows.map((r: any) => (
            <Card key={r.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-semibold text-slate-900">{r.first_name} {r.last_name}</p>
                    <p className="text-xs text-slate-500 capitalize">{(r.certificate_type || "").replace(/_/g, " ")}</p>
                  </div>
                  <CertBadge expirationDate={r.expiration_date} />
                </div>
                <div className="space-y-1 text-xs text-slate-600">
                  {r.certificate_number && (
                    <div className="flex items-center gap-1.5">
                      <Award className="h-3 w-3 text-slate-400" />
                      <span className="font-mono">{r.certificate_number}</span>
                    </div>
                  )}
                  {r.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3 w-3 text-slate-400" /> {r.email}
                    </div>
                  )}
                  {r.issue_date && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      Issued: {format(new Date(r.issue_date), "MMM d, yyyy")}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StudentsTab({ orgId, apiKey }: { orgId: string; apiKey: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    reviewerFetch(`/api/reviewer-keys/org/${orgId}/students`, apiKey)
      .then(setRows).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [orgId, apiKey]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;
  if (error) return <div className="text-red-500 py-8 text-center">{error}</div>;

  const filtered = rows.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${r.first_name} ${r.last_name}`.toLowerCase().includes(q) || (r.email || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search students…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span className="text-sm text-slate-500">{filtered.length} students</span>
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p>No students found</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="text-left py-3 px-4 font-medium text-slate-600">Student</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Email</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Enrolled</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Expected Completion</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r: any) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium">{r.first_name} {r.last_name}</td>
                  <td className="py-3 px-4 text-slate-500">{r.email || "—"}</td>
                  <td className="py-3 px-4 text-slate-500">
                    {r.enrollment_date ? format(new Date(r.enrollment_date), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {r.expected_completion ? format(new Date(r.expected_completion), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="py-3 px-4">
                    <Badge className={
                      r.status === "active" ? "bg-green-100 text-green-700 border-0 text-xs" :
                      r.status === "completed" ? "bg-blue-100 text-blue-700 border-0 text-xs" :
                      "bg-slate-100 text-slate-600 border-0 text-xs"
                    }>{r.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Org type / authority labels ──────────────────────────────────────────────

const ORG_TYPE_LABELS: Record<string, string> = {
  part_141: "Part 141 – Pilot School",
  part_142: "Part 142 – Training Center",
  part_121: "Part 121 – Airline",
  part_135: "Part 135 – On-Demand",
  mro: "MRO – Maintenance",
  atc: "ATC – Air Traffic Control",
};
const AUTH_LABELS: Record<string, string> = {
  faa: "FAA", easa: "EASA", transport_canada: "Transport Canada",
  casa: "CASA", gcaa: "GCAA",
};

// ── Main page ────────────────────────────────────────────────────────────────

export default function ReviewerPortal() {
  const [apiKey, setApiKey] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("key") || params.get("apiKey") || "";
  });
  const [keyInput, setKeyInput] = useState("");
  const [context, setContext] = useState<any>(null);
  const [contextError, setContextError] = useState<string | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<any>(null);

  const loadContext = async (key: string) => {
    if (!key.trim()) return;
    setContextLoading(true);
    setContextError(null);
    try {
      const ctx = await reviewerFetch("/api/reviewer-keys/context", key.trim());
      setContext(ctx);
      setApiKey(key.trim());
      // Update URL with key (for sharing/bookmarking)
      const url = new URL(window.location.href);
      url.searchParams.set("key", key.trim());
      window.history.replaceState({}, "", url.toString());
    } catch (e: any) {
      setContextError(e.message);
      setContext(null);
    } finally {
      setContextLoading(false);
    }
  };

  useEffect(() => {
    if (apiKey) loadContext(apiKey);
  }, []);

  // ── Key entry screen ─────────────────────────────────────────────────────
  if (!context) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
              <Plane className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">BCCS Reviewer Portal</h1>
            <p className="text-slate-400 mt-1">Enter your reviewer API key to access organization data</p>
          </div>
          <Card>
            <CardContent className="p-6 space-y-4">
              {contextError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {contextError}
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Reviewer API Key</label>
                <Input
                  value={keyInput}
                  onChange={e => setKeyInput(e.target.value)}
                  placeholder="bccs_rev_…"
                  className="font-mono"
                  onKeyDown={e => e.key === "Enter" && loadContext(keyInput)}
                />
              </div>
              <Button
                className="w-full"
                onClick={() => loadContext(keyInput)}
                disabled={!keyInput.trim() || contextLoading}
              >
                {contextLoading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verifying…</>
                  : <><Eye className="h-4 w-4 mr-2" />Access Reviewer Portal</>
                }
              </Button>
              <p className="text-xs text-center text-slate-400">
                API keys are issued by your organization's BCCS administrator
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const orgs: any[] = context.orgs ?? [];

  // ── Org detail view ─────────────────────────────────────────────────────
  if (selectedOrg) {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Top bar */}
        <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-600 rounded-lg">
              <Plane className="h-5 w-5" />
            </div>
            <div>
              <span className="font-semibold">BCCS Reviewer Portal</span>
              <span className="text-slate-400 text-sm ml-2">— {context.reviewerName}</span>
            </div>
          </div>
          <Button size="sm" variant="ghost" className="text-slate-300 hover:text-white" onClick={() => setSelectedOrg(null)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> All Organizations
          </Button>
        </div>

        <div className="max-w-5xl mx-auto p-6 space-y-5">
          {/* Org header */}
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Building2 className="h-7 w-7 text-blue-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-900">{selectedOrg.organization_name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="secondary">{ORG_TYPE_LABELS[selectedOrg.organization_type] || selectedOrg.organization_type}</Badge>
                <Badge variant="outline">{AUTH_LABELS[selectedOrg.regulatory_authority] || selectedOrg.regulatory_authority}</Badge>
                {selectedOrg.certificate_number && (
                  <span className="text-sm font-mono text-slate-500">{selectedOrg.certificate_number}</span>
                )}
              </div>
            </div>
          </div>

          {/* Audit tabs */}
          <Tabs defaultValue="summary">
            <TabsList className="bg-white border">
              <TabsTrigger value="summary"><ClipboardList className="h-4 w-4 mr-1.5" /> Summary</TabsTrigger>
              <TabsTrigger value="forms"><FileText className="h-4 w-4 mr-1.5" /> Digital Forms</TabsTrigger>
              <TabsTrigger value="training"><Shield className="h-4 w-4 mr-1.5" /> Training Records</TabsTrigger>
              <TabsTrigger value="instructors"><GraduationCap className="h-4 w-4 mr-1.5" /> Instructors</TabsTrigger>
              <TabsTrigger value="students"><BookOpen className="h-4 w-4 mr-1.5" /> Students</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="mt-4"><SummaryTab orgId={selectedOrg.id} apiKey={apiKey} /></TabsContent>
            <TabsContent value="forms" className="mt-4"><FormsTab orgId={selectedOrg.id} apiKey={apiKey} /></TabsContent>
            <TabsContent value="training" className="mt-4"><TrainingTab orgId={selectedOrg.id} apiKey={apiKey} /></TabsContent>
            <TabsContent value="instructors" className="mt-4"><InstructorsTab orgId={selectedOrg.id} apiKey={apiKey} /></TabsContent>
            <TabsContent value="students" className="mt-4"><StudentsTab orgId={selectedOrg.id} apiKey={apiKey} /></TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  // ── Org list view ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-600 rounded-lg">
            <Plane className="h-5 w-5" />
          </div>
          <div>
            <span className="font-semibold">BCCS Reviewer Portal</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-400">Signed in as</span>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
              {context.reviewerName?.charAt(0)?.toUpperCase()}
            </div>
            <span>{context.reviewerName}</span>
          </div>
          {context.expiresAt && (
            <span className="text-slate-400 text-xs">
              Key expires {formatDistanceToNow(new Date(context.expiresAt), { addSuffix: true })}
            </span>
          )}
          <Button size="sm" variant="ghost" className="text-slate-300 hover:text-white" onClick={() => {
            setContext(null);
            setApiKey("");
            setKeyInput("");
            window.history.replaceState({}, "", window.location.pathname);
          }}>
            Sign Out
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Organizations</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {context.orgScope === "all" ? "Full access — all organizations" : `Scoped access — ${orgs.length} organization${orgs.length !== 1 ? "s" : ""}`}
            {context.label && <span className="ml-2 text-xs bg-slate-100 px-2 py-0.5 rounded font-mono">{context.label}</span>}
          </p>
        </div>

        {orgs.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-slate-400">
              <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No organizations accessible</p>
              <p className="text-sm mt-1">This key has not been scoped to any organizations yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orgs.map((org: any) => (
              <button
                key={org.id}
                onClick={() => setSelectedOrg(org)}
                className="text-left rounded-xl border bg-white hover:border-blue-400 hover:shadow-md transition-all p-5 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-blue-500 transition-colors mt-1" />
                </div>
                <h3 className="font-semibold text-slate-900 text-base leading-tight">{org.organization_name}</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-xs font-normal">
                    {ORG_TYPE_LABELS[org.organization_type] || org.organization_type}
                  </Badge>
                  <Badge variant="outline" className="text-xs font-normal">
                    {AUTH_LABELS[org.regulatory_authority] || org.regulatory_authority}
                  </Badge>
                </div>
                {org.certificate_number && (
                  <p className="mt-2 text-xs font-mono text-slate-400">{org.certificate_number}</p>
                )}
                <p className="mt-3 text-xs text-blue-600 font-medium group-hover:underline">
                  Open audit view →
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
