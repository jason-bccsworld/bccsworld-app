import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AgentWorkspaceHeader from "@/components/agent-workspace-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { GraduationCap, Plus, Search, Loader2, AlertTriangle, CheckCircle2, Trash2, KeyRound, Copy, RefreshCw, X } from "lucide-react";
import { format, differenceInDays } from "date-fns";

const CERT_TYPES = ["CFI", "CFII", "MEI", "ATP", "DPE", "ATP-CTP", "Gold Seal CFI"];

const STATUS_COLORS: Record<string, string> = {
  current: "bg-green-100 text-green-800",
  expired: "bg-red-100 text-red-800",
  suspended: "bg-amber-100 text-amber-800",
};

function DaysUntil({ date }: { date: string | null }) {
  if (!date) return <span className="text-gray-400">—</span>;
  const days = differenceInDays(new Date(date), new Date());
  if (days < 0) return <span className="text-red-600 font-medium">Expired {Math.abs(days)}d ago</span>;
  if (days <= 30) return <span className="text-amber-600 font-medium">{days}d remaining</span>;
  if (days <= 90) return <span className="text-yellow-600">{days}d remaining</span>;
  return <span className="text-green-600">{days}d remaining</span>;
}

export default function Instructors() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [certType, setCertType] = useState("");
  const [certNum, setCertNum] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [currencyDate, setCurrencyDate] = useState("");
  const [status, setStatus] = useState("current");
  const [revealedKey, setRevealedKey] = useState<{ key: string; instructorName: string; expiresAt: string | null } | null>(null);
  const [keyDialogInstructor, setKeyDialogInstructor] = useState<any | null>(null);
  const [keyExpiryDays, setKeyExpiryDays] = useState("90");

  const { data: instructors = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/instructors"],
  });

  const addMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/instructors", {
      firstName, lastName, email, certificateType: certType, certificateNumber: certNum,
      issueDate: issueDate || undefined, expirationDate: expirationDate || undefined,
      currencyDate: currencyDate || undefined, status, ratings: [], trainingAuthorizations: [],
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructors"] });
      toast({ title: "Instructor added", description: `${firstName} ${lastName} record created.` });
      setAddOpen(false);
      setFirstName(""); setLastName(""); setEmail(""); setCertType(""); setCertNum(""); setIssueDate(""); setExpirationDate(""); setCurrencyDate(""); setStatus("current");
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/instructors/${id}`, undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructors"] });
      toast({ title: "Instructor removed" });
    },
  });

  // ── Instructor access keys ────────────────────────────────────────────────
  const { data: keys = [] } = useQuery<any[]>({ queryKey: ["/api/instructor-portal/keys"] });
  const keyByInstructor = new Map(keys.map((k: any) => [k.instructor_id, k]));

  const assignKeyMutation = useMutation({
    mutationFn: async ({ instructor, expiresInDays }: { instructor: any; expiresInDays: string }) => {
      const res = await apiRequest("POST", `/api/instructor-portal/keys/${instructor.id}`, {
        expiresInDays: expiresInDays === "never" ? "never" : Number(expiresInDays),
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor-portal/keys"] });
      setKeyDialogInstructor(null);
      setRevealedKey({ key: data.key, instructorName: data.instructorName, expiresAt: data.expiresAt ?? null });
    },
    onError: (err: any) => toast({ title: "Failed to assign key", description: err.message, variant: "destructive" }),
  });

  const renewKeyMutation = useMutation({
    mutationFn: async (instructorId: string) => {
      const res = await apiRequest("POST", `/api/instructor-portal/keys/${instructorId}/renew`, { expiresInDays: 90 });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor-portal/keys"] });
      toast({ title: "Key renewed", description: `New expiry: ${format(new Date(data.expiresAt), "MMM d, yyyy")}` });
    },
    onError: (err: any) => toast({ title: "Failed to renew key", description: err.message, variant: "destructive" }),
  });

  const revokeKeyMutation = useMutation({
    mutationFn: (instructorId: string) => apiRequest("DELETE", `/api/instructor-portal/keys/${instructorId}`, undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor-portal/keys"] });
      toast({ title: "Key revoked", description: "The instructor can no longer access the portal with the old key." });
    },
    onError: (err: any) => toast({ title: "Failed to revoke key", description: err.message, variant: "destructive" }),
  });

  const filtered = instructors.filter(i => {
    const name = `${i.first_name} ${i.last_name}`.toLowerCase();
    return !search || name.includes(search.toLowerCase()) || (i.certificate_number || "").toLowerCase().includes(search.toLowerCase());
  });

  const expiringSoon = instructors.filter(i => {
    if (!i.expiration_date) return false;
    return differenceInDays(new Date(i.expiration_date), new Date()) <= 90;
  });

  return (
    <div className="space-y-6">
      <AgentWorkspaceHeader agentId="compliance-watchdog" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Instructor Roster</h1>
          <p className="text-slate-600">Track instructor certificates, ratings, and currency (Part 141.10)</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Instructor
        </Button>
      </div>

      {/* Expiry alerts */}
      {expiringSoon.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-amber-800">{expiringSoon.length} instructor certificate{expiringSoon.length > 1 ? "s" : ""} expiring within 90 days</p>
            <p className="text-sm text-amber-700 mt-0.5">
              {expiringSoon.map(i => `${i.first_name} ${i.last_name} (${i.certificate_type})`).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: instructors.length, color: "text-blue-600" },
          { label: "Current", value: instructors.filter(i => i.status === "current").length, color: "text-green-600" },
          { label: "Expired", value: instructors.filter(i => i.status === "expired").length, color: "text-red-600" },
          { label: "Expiring Soon", value: expiringSoon.length, color: "text-amber-600" },
        ].map(({ label, value, color }) => (
          <Card key={label}><CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-sm text-gray-600">{label}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input placeholder="Search by name or cert #…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Instructor Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Instructor Certificates ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <GraduationCap className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No instructor records</p>
              <p className="text-sm mt-1">Add your first instructor to meet Part 141.10 requirements.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium">Instructor</th>
                    <th className="text-left py-3 px-4 font-medium">Certificate Type</th>
                    <th className="text-left py-3 px-4 font-medium">Cert #</th>
                    <th className="text-left py-3 px-4 font-medium">Issue Date</th>
                    <th className="text-left py-3 px-4 font-medium">Expiration</th>
                    <th className="text-left py-3 px-4 font-medium">Currency</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Portal Key</th>
                    <th className="py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((i: any) => (
                    <tr key={i.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium">{i.first_name} {i.last_name}</p>
                        <p className="text-xs text-gray-400">{i.email || "—"}</p>
                      </td>
                      <td className="py-3 px-4"><Badge variant="outline">{i.certificate_type}</Badge></td>
                      <td className="py-3 px-4 font-mono text-xs">{i.certificate_number}</td>
                      <td className="py-3 px-4 text-gray-600">{i.issue_date ? format(new Date(i.issue_date), "MMM d, yyyy") : "—"}</td>
                      <td className="py-3 px-4">
                        {i.expiration_date ? (
                          <div>
                            <p className="text-gray-600">{format(new Date(i.expiration_date), "MMM d, yyyy")}</p>
                            <DaysUntil date={i.expiration_date} />
                          </div>
                        ) : "—"}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{i.currency_date ? format(new Date(i.currency_date), "MMM d, yyyy") : "—"}</td>
                      <td className="py-3 px-4"><Badge className={STATUS_COLORS[i.status] || ""}>{i.status}</Badge></td>
                      <td className="py-3 px-4">
                        {keyByInstructor.has(i.id) ? (
                          <div className="flex items-center gap-1.5">
                            {(() => {
                              const k = keyByInstructor.get(i.id);
                              const exp = k?.expires_at ? new Date(k.expires_at) : null;
                              const days = exp ? differenceInDays(exp, new Date()) : null;
                              if (exp && days !== null && days < 0) {
                                return (
                                  <div className="flex items-center gap-1.5">
                                    <Badge className="bg-red-100 text-red-800">
                                      <KeyRound className="h-3 w-3 mr-1" /> Expired
                                    </Badge>
                                    <Button
                                      variant="outline" size="sm" className="h-7 text-xs"
                                      disabled={renewKeyMutation.isPending}
                                      onClick={() => renewKeyMutation.mutate(i.id)}
                                    >
                                      Renew
                                    </Button>
                                  </div>
                                );
                              }
                              return (
                                <div>
                                  <Badge className={days !== null && days <= 14 ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}>
                                    <KeyRound className="h-3 w-3 mr-1" /> Assigned
                                  </Badge>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {exp ? `Expires ${format(exp, "MMM d, yyyy")}` : "Never expires"}
                                  </p>
                                </div>
                              );
                            })()}
                            {(() => {
                              const k = keyByInstructor.get(i.id);
                              const exp = k?.expires_at ? new Date(k.expires_at) : null;
                              const days = exp ? differenceInDays(exp, new Date()) : null;
                              return exp && days !== null && days >= 0 && days <= 14 ? (
                                <Button
                                  variant="ghost" size="sm" className="h-7 px-1.5 text-amber-600 hover:text-amber-700 text-xs"
                                  title="Renew key (extends expiry 90 days)"
                                  disabled={renewKeyMutation.isPending}
                                  onClick={() => renewKeyMutation.mutate(i.id)}
                                >
                                  Renew
                                </Button>
                              ) : null;
                            })()}
                            <Button
                              variant="ghost" size="sm" className="h-7 px-1.5 text-slate-400 hover:text-blue-600"
                              title="Regenerate key (old key stops working)"
                              disabled={assignKeyMutation.isPending}
                              onClick={() => { setKeyExpiryDays("90"); setKeyDialogInstructor(i); }}
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="sm" className="h-7 px-1.5 text-slate-400 hover:text-red-600"
                              title="Revoke key"
                              disabled={revokeKeyMutation.isPending}
                              onClick={() => { if (confirm(`Revoke portal access for ${i.first_name} ${i.last_name}?`)) revokeKeyMutation.mutate(i.id); }}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline" size="sm" className="h-7 text-xs"
                            disabled={assignKeyMutation.isPending}
                            onClick={() => { setKeyExpiryDays("90"); setKeyDialogInstructor(i); }}
                          >
                            <KeyRound className="h-3.5 w-3.5 mr-1" /> Assign Key
                          </Button>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600" onClick={() => { if (confirm(`Remove ${i.first_name} ${i.last_name}?`)) deleteMutation.mutate(i.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Instructor Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Add Instructor Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>First Name *</Label><Input value={firstName} onChange={e => setFirstName(e.target.value)} /></div>
              <div><Label>Last Name *</Label><Input value={lastName} onChange={e => setLastName(e.target.value)} /></div>
            </div>
            <div><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="instructor@org.com" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Certificate Type *</Label>
                <Select value={certType} onValueChange={setCertType}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{CERT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Certificate # *</Label><Input value={certNum} onChange={e => setCertNum(e.target.value)} placeholder="e.g. 1234567" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Issue Date</Label><Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} /></div>
              <div><Label>Expiration Date</Label><Input type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Currency Date</Label><Input type="date" value={currencyDate} onChange={e => setCurrencyDate(e.target.value)} /></div>
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Current</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending || !firstName || !lastName || !certType || !certNum}>
              {addMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : "Add Instructor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign / regenerate key dialog (pick expiry) */}
      <Dialog open={!!keyDialogInstructor} onOpenChange={(v) => !v && setKeyDialogInstructor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-blue-600" />
              {keyByInstructor.has(keyDialogInstructor?.id) ? "Regenerate" : "Assign"} Portal Key
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {keyByInstructor.has(keyDialogInstructor?.id) && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                The existing key for {keyDialogInstructor?.first_name} {keyDialogInstructor?.last_name} will stop working.
              </div>
            )}
            <div>
              <Label>Key expires after</Label>
              <Select value={keyExpiryDays} onValueChange={setKeyExpiryDays}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days (default)</SelectItem>
                  <SelectItem value="180">180 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKeyDialogInstructor(null)}>Cancel</Button>
            <Button
              disabled={assignKeyMutation.isPending}
              onClick={() => assignKeyMutation.mutate({ instructor: keyDialogInstructor, expiresInDays: keyExpiryDays })}
            >
              {assignKeyMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</> : "Generate Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* One-time key reveal dialog */}
      <Dialog open={!!revealedKey} onOpenChange={(v) => !v && setRevealedKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-blue-600" /> Portal Key for {revealedKey?.instructorName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              This key is shown only once. Copy it now and share it securely with the instructor.
            </div>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
              <code className="text-sm font-mono flex-1 break-all">{revealedKey?.key}</code>
              <Button
                variant="outline" size="sm"
                onClick={() => {
                  if (revealedKey) navigator.clipboard.writeText(revealedKey.key);
                  toast({ title: "Key copied to clipboard" });
                }}
              >
                <Copy className="h-3.5 w-3.5 mr-1" /> Copy
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              The instructor signs in with this key at <span className="font-mono">{window.location.origin}/instructor</span>
            </p>
            <p className="text-xs text-slate-500">
              {revealedKey?.expiresAt
                ? `This key expires on ${format(new Date(revealedKey.expiresAt), "MMM d, yyyy")}.`
                : "This key never expires."}
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setRevealedKey(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
