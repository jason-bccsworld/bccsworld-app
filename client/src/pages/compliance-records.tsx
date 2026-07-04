import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Eye, Download, Filter, Search, Plus, Loader2, CheckCircle2, Clock,
  Shield, ShieldCheck, ShieldAlert, ShieldX, Lock, ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useEffect } from "react";

const EVENT_TYPES = [
  { value: "ground", label: "Ground Training" },
  { value: "flight", label: "Flight Training" },
  { value: "simulator", label: "Simulator Session" },
  { value: "check_ride", label: "Check Ride" },
  { value: "evaluation", label: "Evaluation" },
  { value: "proficiency_check", label: "Proficiency Check" },
  { value: "recurrent", label: "Recurrent Training" },
];

function exportCSV(events: any[]) {
  const headers = ["Student", "Instructor", "Event Type", "Date", "Duration (hrs)", "Curriculum Item", "Status", "Signed", "Key Fingerprint", "Chain Hash"];
  const rows = events.map(e => [
    e.student_name || e.studentName,
    e.instructor_name || e.instructorName,
    e.event_type || e.eventType,
    e.event_date ? format(new Date(e.event_date), "yyyy-MM-dd") : "",
    e.duration_hours || e.durationHours || "",
    e.curriculum_item || e.curriculumItem || "",
    e.status,
    e.signature ? "Yes" : "No",
    e.key_fingerprint || "",
    e.chain_hash || "",
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `training-records-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
  URL.revokeObjectURL(url);
}

interface VerifyResult {
  valid: boolean;
  eventId: string;
  keyFingerprint: string | null;
  signedAt: string | null;
  details: string;
}

export default function ComplianceRecords() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [logOpen, setLogOpen] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ result: VerifyResult; eventId: string } | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [signingId, setSigningId] = useState<string | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  // Form state
  const [studentName, setStudentName] = useState("");
  const [instructorName, setInstructorName] = useState("");
  const [eventType, setEventType] = useState("");
  const [eventDate, setEventDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [durationHours, setDurationHours] = useState("");
  const [curriculumItem, setCurriculumItem] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("completed");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) window.location.href = "/login";
  }, [isAuthenticated, isLoading]);

  const { data: trainingEvents = [], isLoading: eventsLoading } = useQuery<any[]>({
    queryKey: ["/api/training-events"],
    enabled: isAuthenticated,
  });

  const { data: students = [] } = useQuery<any[]>({
    queryKey: ["/api/students"],
    enabled: isAuthenticated,
  });

  const { data: orgKey } = useQuery<any>({
    queryKey: ["/api/org-keys/current"],
    enabled: isAuthenticated,
  });

  const { data: evidence, isLoading: evidenceLoading, refetch: refetchEvidence } = useQuery<any>({
    queryKey: ["/api/governance/evidence"],
    enabled: isAuthenticated && evidenceOpen,
  });

  const logMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/training-events", {
      studentName, instructorName, eventType, eventDate, durationHours, curriculumItem, notes, status
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      const autoSigned = orgKey?.hasKey;
      toast({
        title: "Training event logged",
        description: autoSigned
          ? "Record saved and cryptographically signed with your org key."
          : "Record saved. Generate an org key to enable automatic signing.",
      });
      setLogOpen(false);
      setStudentName(""); setInstructorName(""); setEventType(""); setDurationHours(""); setCurriculumItem(""); setNotes("");
    },
    onError: (err: any) => {
      toast({ title: "Failed to log event", description: err.message, variant: "destructive" });
    }
  });

  const signAllMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/org-keys/sign-all"),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-events"] });
      toast({ title: "Signing complete", description: `${data.signed} records signed, ${data.failed} failed.` });
    },
    onError: (err: any) => {
      toast({ title: "Signing failed", description: err.message, variant: "destructive" });
    }
  });

  const handleVerify = async (eventId: string) => {
    setVerifyingId(eventId);
    try {
      const result = await apiRequest("GET", `/api/org-keys/verify/${eventId}`);
      setVerifyResult({ result, eventId });
    } catch (err: any) {
      toast({ title: "Verification failed", description: err.message, variant: "destructive" });
    } finally {
      setVerifyingId(null);
    }
  };

  const handleSignOne = async (eventId: string) => {
    setSigningId(eventId);
    try {
      await apiRequest("POST", `/api/org-keys/sign/${eventId}`);
      queryClient.invalidateQueries({ queryKey: ["/api/training-events"] });
      toast({ title: "Record signed", description: "Ed25519 signature applied." });
    } catch (err: any) {
      toast({ title: "Signing failed", description: err.message, variant: "destructive" });
    } finally {
      setSigningId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-emerald-100 text-emerald-800";
      case "pending": return "bg-amber-100 text-amber-800";
      case "failed": return "bg-red-100 text-red-800";
      default: return "bg-slate-100 text-slate-800";
    }
  };

  const filtered = trainingEvents.filter(e => {
    const name = (e.student_name || e.studentName || "").toLowerCase();
    const instructor = (e.instructor_name || e.instructorName || "").toLowerCase();
    const type = e.event_type || e.eventType || "";
    const matchSearch = !search || name.includes(search.toLowerCase()) || instructor.includes(search.toLowerCase());
    const matchType = typeFilter === "all" || type === typeFilter;
    return matchSearch && matchType;
  });

  const signedCount = trainingEvents.filter(e => e.signature || e.signed_at).length;
  const unsignedCount = trainingEvents.length - signedCount;

  if (isLoading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Training Records</h1>
          <p className="text-slate-600">Ed25519-signed training records with cryptographic chain-of-trust</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {orgKey?.hasKey && unsignedCount > 0 && (
            <Button variant="outline" onClick={() => signAllMutation.mutate()} disabled={signAllMutation.isPending}>
              {signAllMutation.isPending
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Signing…</>
                : <><Shield className="h-4 w-4 mr-2" />Sign All Unsigned ({unsignedCount})</>
              }
            </Button>
          )}
          <Button variant="outline" onClick={() => exportCSV(filtered)} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button variant="outline" onClick={() => setEvidenceOpen(true)} data-testid="button-evidence-package">
            <ShieldCheck className="h-4 w-4 mr-2" /> Evidence Package
          </Button>
          <Button onClick={() => setLogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Log Training Event
          </Button>
        </div>
      </div>

      {/* Key status banner */}
      {orgKey && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm ${orgKey.hasKey ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
          {orgKey.hasKey ? <ShieldCheck className="h-4 w-4 flex-shrink-0" /> : <ShieldAlert className="h-4 w-4 flex-shrink-0" />}
          {orgKey.hasKey ? (
            <span>
              <strong>Ed25519 key active</strong> — Fingerprint: <code className="font-mono text-xs bg-emerald-100 px-1 rounded">{orgKey.fingerprint}</code>
              {" · "}{signedCount} of {trainingEvents.length} records signed
            </span>
          ) : (
            <span>
              <strong>No signing key configured.</strong> Go to Organization Setup → Generate Key to enable cryptographic record signing.
            </span>
          )}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{trainingEvents.length}</p>
          <p className="text-sm text-gray-600">Total Events</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{trainingEvents.filter(e => (e.status || '') === 'completed').length}</p>
          <p className="text-sm text-gray-600">Completed</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{signedCount}</p>
          <p className="text-sm text-gray-600">Cryptographically Signed</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{[...new Set(trainingEvents.map(e => e.student_name || e.studentName))].length}</p>
          <p className="text-sm text-gray-600">Students</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle>Training Events ({filtered.length})</CardTitle>
              <CardDescription>All logged training sessions — signed records are cryptographically verifiable</CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input placeholder="Search by name…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-52" />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Event type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {eventsLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Clock className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-lg font-medium">No training events found</p>
              <p className="text-sm mt-1">Use "Log Training Event" to create the first record.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium">Student</th>
                    <th className="text-left py-3 px-4 font-medium">Instructor</th>
                    <th className="text-left py-3 px-4 font-medium">Event Type</th>
                    <th className="text-left py-3 px-4 font-medium">Date</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Signature</th>
                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((event: any) => {
                    const isSigned = !!(event.signature || event.signed_at || event.key_fingerprint);
                    return (
                      <tr key={event.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-medium">{event.student_name || event.studentName}</td>
                        <td className="py-3 px-4 text-slate-600">{event.instructor_name || event.instructorName}</td>
                        <td className="py-3 px-4 text-slate-600 capitalize">{(event.event_type || event.eventType || "").replace("_", " ")}</td>
                        <td className="py-3 px-4 text-slate-600">
                          {event.event_date ? format(new Date(event.event_date), "MMM dd, yyyy") : "—"}
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={getStatusColor(event.status)}>{event.status}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          {isSigned ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-700 font-medium">
                              <ShieldCheck className="h-3.5 w-3.5" />
                              <span>Signed</span>
                              {event.key_fingerprint && (
                                <code className="text-[10px] text-slate-400 ml-1">{event.key_fingerprint.slice(0, 11)}…</code>
                              )}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <ShieldX className="h-3.5 w-3.5" />
                              Unsigned
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1">
                            {isSigned ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs text-blue-600"
                                onClick={() => handleVerify(event.id)}
                                disabled={verifyingId === event.id}
                              >
                                {verifyingId === event.id
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <><ShieldCheck className="h-3 w-3 mr-1" />Verify</>
                                }
                              </Button>
                            ) : orgKey?.hasKey ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs text-slate-600"
                                onClick={() => handleSignOne(event.id)}
                                disabled={signingId === event.id}
                              >
                                {signingId === event.id
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <><Shield className="h-3 w-3 mr-1" />Sign</>
                                }
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Evidence Package Dialog */}
      <Dialog open={evidenceOpen} onOpenChange={setEvidenceOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Evidence-on-Demand Package
            </DialogTitle>
            <DialogDescription>
              A single verifiable artifact for an auditor — signed records batch-verified server-side,
              plus the governance decision log and audit trail behind them.
            </DialogDescription>
          </DialogHeader>

          {evidenceLoading ? (
            <div className="flex items-center gap-2 text-slate-500 py-8 justify-center">
              <Loader2 className="h-5 w-5 animate-spin" /> Assembling and verifying evidence…
            </div>
          ) : evidence ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-slate-800">{evidence.integrity.total}</p>
                  <p className="text-xs text-slate-500">Records</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">{evidence.integrity.signed}</p>
                  <p className="text-xs text-slate-500">Signed</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{evidence.integrity.verified}</p>
                  <p className="text-xs text-slate-500">Crypto-Verified</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600">{evidence.integrity.unsigned}</p>
                  <p className="text-xs text-slate-500">Unsigned</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">
                  Training Records ({evidence.trainingEvents.length})
                </p>
                {evidence.trainingEvents.length === 0 ? (
                  <p className="text-sm text-slate-400">No training records logged yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {evidence.trainingEvents.map((e: any) => (
                      <div key={e.id} className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
                        <div className="min-w-0">
                          <span className="font-medium text-slate-800">{e.student_name}</span>
                          <span className="text-slate-400"> · {e.event_type}</span>
                        </div>
                        {e.verificationValid ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 border gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                          </Badge>
                        ) : e.isSigned ? (
                          <Badge className="bg-red-100 text-red-800 border-red-200 border gap-1">
                            <ShieldX className="h-3.5 w-3.5" /> Failed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-700 border-amber-300 gap-1">
                            <ShieldAlert className="h-3.5 w-3.5" /> Unsigned
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">
                  Governance Decisions ({evidence.governanceDecisions.length})
                </p>
                {evidence.governanceDecisions.length === 0 ? (
                  <p className="text-sm text-slate-400">No governance decisions recorded yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {evidence.governanceDecisions.map((d: any) => (
                      <div key={d.id} className="flex items-start gap-2 text-sm border rounded-md px-3 py-2">
                        <Badge
                          className={`border gap-1 ${
                            d.decision === "allowed"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : d.decision === "refused"
                              ? "bg-red-100 text-red-800 border-red-200"
                              : "bg-amber-100 text-amber-800 border-amber-200"
                          }`}
                        >
                          {d.decision === "allowed" ? "ADMISSIBLE" : d.decision.toUpperCase()}
                        </Badge>
                        <div className="min-w-0 flex-1">
                          <p className="text-slate-700 truncate">{d.action_description}</p>
                          <p className="text-xs text-slate-400">
                            {d.requester_authority?.replace(/_/g, " ")}
                            {d.regulatory_basis ? ` · ${d.regulatory_basis}` : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-400">
                Generated {new Date(evidence.generatedAt).toLocaleString()} · Scope: {evidence.scope}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-400 py-8 text-center">No evidence available.</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => refetchEvidence()} disabled={evidenceLoading}>
              <Loader2 className={`h-4 w-4 mr-2 ${evidenceLoading ? "animate-spin" : "hidden"}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => setEvidenceOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verify Result Dialog */}
      <Dialog open={!!verifyResult} onOpenChange={() => setVerifyResult(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {verifyResult?.result.valid
                ? <ShieldCheck className="h-5 w-5 text-emerald-600" />
                : <ShieldX className="h-5 w-5 text-red-500" />
              }
              Cryptographic Verification
            </DialogTitle>
          </DialogHeader>
          {verifyResult && (
            <div className="space-y-3 py-2">
              <div className={`flex items-center gap-2 p-3 rounded-lg font-medium ${verifyResult.result.valid ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                {verifyResult.result.valid ? <CheckCircle2 className="h-5 w-5" /> : <ShieldX className="h-5 w-5" />}
                {verifyResult.result.valid ? "Signature Valid — Record is Authentic" : "Signature Invalid"}
              </div>
              <div className="text-sm text-slate-600">{verifyResult.result.details}</div>
              {verifyResult.result.keyFingerprint && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500">Signing Key Fingerprint (Ed25519)</p>
                  <code className="block text-xs font-mono bg-slate-100 p-2 rounded break-all">{verifyResult.result.keyFingerprint}</code>
                </div>
              )}
              {verifyResult.result.signedAt && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500">Signed At</p>
                  <p className="text-xs text-slate-700">{new Date(verifyResult.result.signedAt).toLocaleString()}</p>
                </div>
              )}
              <p className="text-xs text-slate-400">Record ID: <code>{verifyResult.result.eventId}</code></p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyResult(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Training Event Dialog */}
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" /> Log Training Event
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Student Name *</Label>
                <Input
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  placeholder="Student full name"
                  list="student-names"
                />
                <datalist id="student-names">
                  {students.map((s: any) => (
                    <option key={s.id} value={`${s.first_name} ${s.last_name}`} />
                  ))}
                </datalist>
              </div>
              <div>
                <Label>Instructor Name *</Label>
                <Input value={instructorName} onChange={e => setInstructorName(e.target.value)} placeholder="Instructor name" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Event Type *</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date *</Label>
                <Input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Duration (hours)</Label>
                <Input value={durationHours} onChange={e => setDurationHours(e.target.value)} placeholder="e.g. 1.5" type="number" step="0.5" />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Curriculum Item / Topic</Label>
              <Input value={curriculumItem} onChange={e => setCurriculumItem(e.target.value)} placeholder="e.g. Part 61.109 – Pre-solo hours" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observations, performance notes…" rows={3} />
            </div>
            {orgKey?.hasKey && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2">
                <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
                This record will be automatically signed with your org's Ed25519 key on save.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => logMutation.mutate()}
              disabled={logMutation.isPending || !studentName || !instructorName || !eventType || !eventDate}
            >
              {logMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Logging…</> : "Log Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
