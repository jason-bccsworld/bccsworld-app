import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  KeyRound, Loader2, GraduationCap, Users, FileText, LogOut,
  CheckCircle2, AlertTriangle, ShieldCheck,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

const KEY_STORAGE = "bccs_instructor_key";

interface PortalForm {
  id: string;
  title: string;
  description: string | null;
  fields: Array<{ id: string; label: string; type: string; required: boolean; placeholder?: string; options?: string[] }>;
}

async function portalFetch(path: string, key: string, init?: RequestInit) {
  const res = await fetch(`/api/instructor-portal${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Instructor-Key": key,
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err: any = new Error(body.message || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function CertStatus({ me }: { me: any }) {
  const days = me.expirationDate ? differenceInDays(new Date(me.expirationDate), new Date()) : null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-blue-600" /> Certificate Status
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-1.5">
        <div className="flex justify-between"><span className="text-slate-500">Certificate</span><span className="font-medium">{me.certificateType} · {me.certificateNumber}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Status</span>
          <Badge className={me.status === "current" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>{me.status}</Badge>
        </div>
        {me.expirationDate && (
          <div className="flex justify-between"><span className="text-slate-500">Expires</span>
            <span className={days != null && days < 30 ? "text-amber-600 font-medium" : ""}>
              {format(new Date(me.expirationDate), "MMM d, yyyy")}{days != null ? ` (${days}d)` : ""}
            </span>
          </div>
        )}
        {me.currencyDate && (
          <div className="flex justify-between"><span className="text-slate-500">Currency</span><span>{format(new Date(me.currencyDate), "MMM d, yyyy")}</span></div>
        )}
      </CardContent>
    </Card>
  );
}

function FormFillDialog({ form, instructorName, onClose, onSubmit, submitting }: {
  form: PortalForm;
  instructorName: string;
  onClose: () => void;
  onSubmit: (formData: Record<string, any>) => void;
  submitting: boolean;
}) {
  const [values, setValues] = useState<Record<string, any>>(() => {
    // Pre-fill instructor name where the form asks for it
    const init: Record<string, any> = {};
    for (const f of form.fields) {
      if (f.id === "instructor_name" || /instructor/i.test(f.label)) init[f.id] = instructorName;
    }
    return init;
  });

  const set = (id: string, v: any) => setValues((s) => ({ ...s, [id]: v }));

  const handleSubmit = () => {
    for (const f of form.fields) {
      if (f.required && (values[f.id] == null || values[f.id] === "")) {
        return alert(`"${f.label}" is required`);
      }
    }
    onSubmit(values);
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.title}</DialogTitle>
        </DialogHeader>
        {form.description && <p className="text-sm text-slate-500">{form.description}</p>}
        <div className="space-y-4 py-2">
          {form.fields.map((f) => (
            <div key={f.id}>
              <Label>{f.label}{f.required && <span className="text-red-500"> *</span>}</Label>
              {(f.type === "text" || f.type === "email" || f.type === "phone") && (
                <Input className="mt-1" value={values[f.id] || ""} placeholder={f.placeholder} onChange={(e) => set(f.id, e.target.value)} />
              )}
              {f.type === "number" && (
                <Input className="mt-1" type="number" value={values[f.id] ?? ""} placeholder={f.placeholder} onChange={(e) => set(f.id, e.target.value)} />
              )}
              {f.type === "date" && (
                <Input className="mt-1" type="date" value={values[f.id] || ""} onChange={(e) => set(f.id, e.target.value)} />
              )}
              {f.type === "textarea" && (
                <Textarea className="mt-1" rows={3} value={values[f.id] || ""} placeholder={f.placeholder} onChange={(e) => set(f.id, e.target.value)} />
              )}
              {f.type === "checkbox" && (
                <div className="mt-1 flex items-center gap-2">
                  <Checkbox checked={!!values[f.id]} onCheckedChange={(v) => set(f.id, v === true)} />
                  <span className="text-sm text-slate-600">Yes</span>
                </div>
              )}
              {f.type === "select" && (
                <Select value={values[f.id] || ""} onValueChange={(v) => set(f.id, v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {(f.options || []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</> : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function InstructorPortal() {
  const { toast } = useToast();
  const [key, setKey] = useState<string | null>(() => sessionStorage.getItem(KEY_STORAGE));
  const [keyInput, setKeyInput] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [me, setMe] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [forms, setForms] = useState<PortalForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeForm, setActiveForm] = useState<PortalForm | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const signOut = () => {
    sessionStorage.removeItem(KEY_STORAGE);
    setKey(null); setMe(null); setStudents([]); setForms([]);
  };

  const loadDashboard = async (k: string) => {
    setLoading(true);
    setError(null);
    try {
      const [meData, studentsData, formsData] = await Promise.all([
        portalFetch("/me", k),
        portalFetch("/students", k),
        portalFetch("/forms", k),
      ]);
      setMe(meData); setStudents(studentsData); setForms(formsData);
      sessionStorage.setItem(KEY_STORAGE, k);
      setKey(k);
    } catch (e: any) {
      if (e.status === 401) {
        sessionStorage.removeItem(KEY_STORAGE);
        setKey(null);
      }
      setError(e.message);
    } finally {
      setLoading(false);
      setChecking(false);
    }
  };

  useEffect(() => {
    if (key && !me) loadDashboard(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEnter = () => {
    if (!keyInput.trim()) return;
    setChecking(true);
    loadDashboard(keyInput.trim());
  };

  const handleFormSubmit = async (formData: Record<string, any>) => {
    if (!key || !activeForm) return;
    setSubmitting(true);
    try {
      await portalFetch(`/forms/${activeForm.id}/submit`, key, {
        method: "POST",
        body: JSON.stringify({ formData }),
      });
      toast({ title: "Form submitted", description: `"${activeForm.title}" was recorded.` });
      setActiveForm(null);
    } catch (e: any) {
      toast({ title: "Submission failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Key entry screen ──────────────────────────────────────────────────────
  if (!me) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <KeyRound className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>Instructor Portal</CardTitle>
            <CardDescription>Enter the access key provided by your organization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> {error}
              </div>
            )}
            <Input
              type="password"
              placeholder="bccs_inst_..."
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEnter()}
            />
            <Button className="w-full" onClick={handleEnter} disabled={checking || loading || !keyInput.trim()}>
              {checking || loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying…</> : "Open Dashboard"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-blue-600" />
          <div>
            <p className="font-semibold text-sm">{me.firstName} {me.lastName}</p>
            <p className="text-xs text-slate-400">Instructor Portal</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-1" /> Sign out
        </Button>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CertStatus me={me} />

          {/* Students */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" /> My Students ({students.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <p className="text-sm text-slate-400 py-2">No students linked to your training events yet.</p>
              ) : (
                <div className="divide-y">
                  {students.map((s) => (
                    <div key={s.id} className="py-2 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{s.first_name} {s.last_name}</p>
                        <p className="text-xs text-slate-400">
                          {s.event_count} event{s.event_count !== 1 ? "s" : ""}
                          {s.last_event_date ? ` · last ${format(new Date(s.last_event_date), "MMM d, yyyy")}` : ""}
                        </p>
                      </div>
                      <Badge variant="outline">{s.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Forms */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" /> Available Forms ({forms.length})
            </CardTitle>
            <CardDescription>Forms your organization has enabled for instructors</CardDescription>
          </CardHeader>
          <CardContent>
            {forms.length === 0 ? (
              <p className="text-sm text-slate-400 py-2">No forms are enabled for instructors right now.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {forms.map((f) => (
                  <div key={f.id} className="border rounded-lg p-3 flex flex-col">
                    <p className="font-medium text-sm">{f.title}</p>
                    {f.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{f.description}</p>}
                    <Button size="sm" className="mt-3 w-fit" onClick={() => setActiveForm(f)}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Fill Out
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {activeForm && (
        <FormFillDialog
          form={activeForm}
          instructorName={`${me.firstName} ${me.lastName}`}
          onClose={() => setActiveForm(null)}
          onSubmit={handleFormSubmit}
          submitting={submitting}
        />
      )}
    </div>
  );
}
