import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Landmark,
  Plus,
  Trash2,
  ExternalLink,
  AlertTriangle,
  FileText,
  Scale,
  ClipboardCheck,
  ScrollText,
  Loader2,
  Archive,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AgentWorkspaceHeader, { timeAgo } from "@/components/agent-workspace-header";

/* ── Types ────────────────────────────────────────────────────────────────── */

interface WatchItem {
  id: string;
  kind: string;
  value: string;
  label: string | null;
  created_at: string;
}

interface Opportunity {
  id: string;
  notice_id: string;
  title: string | null;
  agency: string | null;
  naics: string | null;
  set_aside: string | null;
  notice_type: string | null;
  posted_date: string | null;
  response_deadline: string | null;
  url: string | null;
  dossier: Record<string, string> | null;
  status: string;
}

interface AwardRow {
  id: string;
  piid: string | null;
  vendor_name: string | null;
  vendor_uei: string | null;
  agency: string | null;
  naics: string | null;
  award_amount: string | null;
  start_date: string | null;
  end_date: string | null;
  modification_count: number | null;
  dossier: Record<string, unknown> | null;
  risk_flags: { key: string; label: string; points: number; veto: boolean }[] | null;
  risk_score: number;
  risk_tier: string;
  last_checked: string | null;
}

interface EvidenceRow {
  id: string;
  subject_type: string;
  subject_id: string;
  entry_type: string;
  content: string;
  source_ref: string | null;
  created_by: string | null;
  created_at: string;
}

interface ChecklistRow {
  id: string;
  subject_type: string;
  subject_id: string;
  item_key: string;
  label: string;
  status: string;
  note: string | null;
}

const KIND_LABEL: Record<string, string> = {
  agency: "Agency",
  naics: "NAICS code",
  keyword: "Keyword",
  vendor: "Vendor name",
  vendor_uei: "Vendor UEI",
  contract: "Contract # (PIID)",
};

const TIER_STYLE: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  moderate: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const CHECK_STATUS_STYLE: Record<string, string> = {
  not_started: "bg-slate-100 text-slate-600 border-slate-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  cleared: "bg-emerald-100 text-emerald-800 border-emerald-200",
  flagged: "bg-red-100 text-red-800 border-red-200",
};

function money(v: string | null): string {
  const n = Number(v ?? 0);
  if (!n) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

/* ── Watchlist panel ─────────────────────────────────────────────────────── */

function WatchlistPanel() {
  const { toast } = useToast();
  const [kind, setKind] = useState("vendor");
  const [value, setValue] = useState("");
  const { data: items = [], isLoading } = useQuery<WatchItem[]>({ queryKey: ["/api/federal-contracts/watchlist"] });

  const add = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/federal-contracts/watchlist", { kind, value });
      return res.json();
    },
    onSuccess: () => {
      setValue("");
      queryClient.invalidateQueries({ queryKey: ["/api/federal-contracts/watchlist"] });
      toast({ title: "Watch target added", description: "It will be included in the agent's next patrol." });
    },
    onError: (err: Error) => toast({ title: "Could not add target", description: err.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/federal-contracts/watchlist/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/federal-contracts/watchlist"] }),
    onError: (err: Error) => toast({ title: "Could not remove target", description: err.message, variant: "destructive" }),
  });

  return (
    <Card data-testid="panel-watchlist">
      <CardContent className="p-5">
        <p className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-indigo-600" /> Watchlist
        </p>
        <div className="flex gap-2 mb-4 flex-wrap">
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger className="w-44" data-testid="select-watch-kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(KIND_LABEL).map(([k, label]) => (
                <SelectItem key={k} value={k}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="flex-1 min-w-[180px]"
            placeholder={kind === "naics" ? "e.g. 611512" : kind === "contract" ? "e.g. FA8620-21-C-1234" : "e.g. flight training"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && value.trim() && add.mutate()}
            data-testid="input-watch-value"
          />
          <Button onClick={() => add.mutate()} disabled={!value.trim() || add.isPending} data-testid="button-add-watch">
            {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
        {isLoading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500 bg-slate-50 rounded-md p-3">
            No watch targets yet. Add vendors, contract numbers, NAICS codes, agencies, or keywords —
            the agent patrols them every 12 hours against SAM.gov and USAspending.gov.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {items.map((w) => (
              <Badge key={w.id} variant="outline" className="pl-2 pr-1 py-1 gap-1.5 text-xs" data-testid={`watch-${w.id}`}>
                <span className="text-slate-400">{KIND_LABEL[w.kind] ?? w.kind}:</span>
                <span className="font-medium">{w.value}</span>
                <button className="p-0.5 hover:text-red-600" onClick={() => remove.mutate(w.id)} data-testid={`button-remove-watch-${w.id}`}>
                  <Trash2 className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Subject filter (shared by Checklist + Evidence tabs) ────────────────── */

function SubjectFilter({
  value,
  onChange,
  subjects,
  testId,
}: {
  value: string;
  onChange: (v: string) => void;
  subjects: { type: string; id: string }[];
  testId: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 flex-shrink-0">Filter by subject:</span>
      <Select value={value || "__all__"} onValueChange={(v) => onChange(v === "__all__" ? "" : v)}>
        <SelectTrigger className="w-72 h-8 text-xs" data-testid={testId}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All subjects</SelectItem>
          {subjects.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.type}: {s.id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value && (
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onChange("")} data-testid={`${testId}-clear`}>
          Clear
        </Button>
      )}
    </div>
  );
}

/* ── Opportunities tab ───────────────────────────────────────────────────── */

function OpportunitiesTab({ onViewWorkPackage }: { onViewWorkPackage: (noticeId: string) => void }) {
  const { toast } = useToast();
  const { data: opps = [], isLoading } = useQuery<Opportunity[]>({ queryKey: ["/api/federal-contracts/opportunities"] });
  const archive = useMutation({
    mutationFn: async (id: string) => apiRequest("PATCH", `/api/federal-contracts/opportunities/${id}`, { status: "archived" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/federal-contracts/opportunities"] }),
    onError: (err: Error) => toast({ title: "Could not archive", description: err.message, variant: "destructive" }),
  });
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const generate = useMutation({
    mutationFn: async (id: string) => {
      setGeneratingId(id);
      const res = await apiRequest("POST", `/api/federal-contracts/opportunities/${id}/workpackage`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/federal-contracts/opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/federal-contracts/checklist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/federal-contracts/evidence"] });
      toast({
        title: "Work package generated",
        description: `Risk tier: ${data.risk?.tier ?? "?"} · ${data.checklistAdded} new checklist item(s)${data.evidenceSeeded ? " · evidence log started" : ""}. See the Checklist and Evidence tabs.${data.aiSkipReason ? ` ${data.aiSkipReason}` : ""}`,
      });
    },
    onError: (err: Error) => toast({ title: "Could not generate work package", description: err.message, variant: "destructive" }),
    onSettled: () => setGeneratingId(null),
  });

  if (isLoading) return <p className="text-sm text-slate-400 p-4">Loading opportunities…</p>;
  if (opps.length === 0) {
    return (
      <p className="text-sm text-slate-500 bg-slate-50 rounded-md p-4">
        No tracked opportunities yet. Add agency, NAICS, or keyword watch targets and run the agent.
        Opportunity search uses SAM.gov and requires a SAM.gov API key — if none is configured, the run summary will say so.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {opps.map((o) => (
        <Card key={o.id} data-testid={`opp-${o.id}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-slate-800">{o.title ?? o.notice_id}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {[o.agency, o.naics && `NAICS ${o.naics}`, o.set_aside, o.notice_type].filter(Boolean).join(" · ")}
                </p>
                {(o.dossier as any)?.workPackage?.risk && (
                  <div className="mt-2" data-testid={`opp-risk-${o.id}`}>
                    <Badge variant="outline" className={`text-xs ${
                      { critical: "border-red-300 bg-red-50 text-red-700", high: "border-orange-300 bg-orange-50 text-orange-700", moderate: "border-amber-300 bg-amber-50 text-amber-700", low: "border-emerald-300 bg-emerald-50 text-emerald-700" }[(o.dossier as any).workPackage.risk.tier as string] || ""
                    }`}>
                      Pursuit risk: {(o.dossier as any).workPackage.risk.tier} ({(o.dossier as any).workPackage.risk.score} pts)
                    </Badge>
                    <ul className="mt-1 space-y-0.5">
                      {((o.dossier as any).workPackage.risk.flags as any[]).map((f) => (
                        <li key={f.key} className="text-xs text-slate-500">• {f.label}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  disabled={generatingId === o.id}
                  onClick={() => generate.mutate(o.id)}
                  data-testid={`button-workpackage-${o.id}`}
                >
                  {generatingId === o.id ? (
                    <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Generating…</>
                  ) : (
                    <><ClipboardCheck className="h-3 w-3 mr-1" /> {(o.dossier as any)?.workPackage ? "Regenerate" : "Generate work package"}</>
                  )}
                </Button>
                {(o.dossier as any)?.workPackage && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => onViewWorkPackage(o.notice_id)}
                    data-testid={`button-view-workpackage-${o.id}`}
                  >
                    <ScrollText className="h-3 w-3 mr-1" /> View work package
                  </Button>
                )}
                {(o.dossier as any)?.workPackage && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => window.open(`/api/federal-contracts/opportunities/${o.id}/export`, "_blank")}
                    data-testid={`button-export-${o.id}`}
                  >
                    <FileText className="h-3 w-3 mr-1" /> Export
                  </Button>
                )}
                {o.url && (
                  <a href={o.url} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      SAM.gov <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </a>
                )}
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => archive.mutate(o.id)} data-testid={`button-archive-${o.id}`}>
                  <Archive className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="mt-2 text-xs text-slate-600 grid gap-1 sm:grid-cols-2">
              {o.posted_date && <span><span className="text-slate-400">Posted:</span> {o.posted_date}</span>}
              {o.response_deadline && <span><span className="text-slate-400">Response due:</span> {o.response_deadline}</span>}
              {o.dossier?.requirementSummary && (
                <span className="sm:col-span-2"><span className="text-slate-400">What they're buying:</span> {o.dossier.requirementSummary}</span>
              )}
              {o.dossier?.contractVehicle && o.dossier.contractVehicle !== "unknown" && (
                <span><span className="text-slate-400">Vehicle:</span> {o.dossier.contractVehicle}</span>
              )}
              {o.dossier?.incumbentSignal && o.dossier.incumbentSignal !== "none visible" && (
                <span className="text-amber-700"><span className="text-slate-400">Incumbent signal:</span> {o.dossier.incumbentSignal}</span>
              )}
              {o.dossier?.complianceObligations && o.dossier.complianceObligations !== "not stated" && (
                <span className="sm:col-span-2"><span className="text-slate-400">Compliance:</span> {o.dossier.complianceObligations}</span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ── Awards / risk scoreboard tab ────────────────────────────────────────── */

function AwardsTab() {
  const { data: awards = [], isLoading } = useQuery<AwardRow[]>({ queryKey: ["/api/federal-contracts/awards"] });

  if (isLoading) return <p className="text-sm text-slate-400 p-4">Loading award dossiers…</p>;
  if (awards.length === 0) {
    return (
      <p className="text-sm text-slate-500 bg-slate-50 rounded-md p-4">
        No award dossiers yet. Add vendor names or contract numbers to the watchlist and run the agent —
        it builds one dossier per award from USAspending data and scores each against the due-diligence rubric.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {awards.map((a) => (
        <Card key={a.id} data-testid={`award-${a.id}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="font-medium text-slate-800">
                  {a.vendor_name ?? "Unknown vendor"} <span className="text-slate-400 font-normal">· {a.piid}</span>
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {[a.agency, a.naics && `NAICS ${a.naics}`].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`${TIER_STYLE[a.risk_tier] ?? TIER_STYLE.low} border text-xs uppercase`}>
                  {a.risk_tier} · {a.risk_score} pts
                </Badge>
              </div>
            </div>
            <div className="mt-2 text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
              <span><span className="text-slate-400">Value:</span> {money(a.award_amount)}</span>
              {a.start_date && <span><span className="text-slate-400">Period:</span> {a.start_date} → {a.end_date ?? "?"}</span>}
              {a.modification_count != null && <span><span className="text-slate-400">Modifications:</span> {a.modification_count}</span>}
              {a.last_checked && <span><span className="text-slate-400">Checked:</span> {timeAgo(a.last_checked)}</span>}
            </div>
            {Array.isArray(a.risk_flags) && a.risk_flags.length > 0 && (
              <div className="mt-2 space-y-1">
                {a.risk_flags.map((f, i) => (
                  <p key={i} className={`text-xs flex items-center gap-1.5 ${f.veto ? "text-red-700 font-medium" : "text-amber-700"}`}>
                    <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                    {f.veto && "VETO FLAG: "}{f.label} (+{f.points} pts)
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ── Evidence log tab ────────────────────────────────────────────────────── */

function EvidenceTab({ filter, onFilterChange }: { filter: string; onFilterChange: (v: string) => void }) {
  const { toast } = useToast();
  const [subjectType, setSubjectType] = useState("vendor");
  const [subjectId, setSubjectId] = useState("");
  const [entryType, setEntryType] = useState("fact");
  const [content, setContent] = useState("");
  const { data: allEntries = [] } = useQuery<EvidenceRow[]>({ queryKey: ["/api/federal-contracts/evidence"] });
  const { data: filtered = [] } = useQuery<EvidenceRow[]>({
    queryKey: ["/api/federal-contracts/evidence", { subjectId: filter }],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/federal-contracts/evidence?subjectId=${encodeURIComponent(filter)}`);
      return res.json();
    },
    enabled: !!filter,
  });
  const entries = filter ? filtered : allEntries;
  const subjects = Array.from(
    new Map(allEntries.map((e) => [e.subject_id, { type: e.subject_type, id: e.subject_id }])).values(),
  ).sort((a, b) => a.id.localeCompare(b.id));

  const add = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/federal-contracts/evidence", { subjectType, subjectId, entryType, content });
      return res.json();
    },
    onSuccess: () => {
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/federal-contracts/evidence"] });
    },
    onError: (err: Error) => toast({ title: "Could not add entry", description: err.message, variant: "destructive" }),
  });

  const ENTRY_STYLE: Record<string, string> = {
    fact: "bg-slate-100 text-slate-700 border-slate-200",
    question: "bg-blue-100 text-blue-800 border-blue-200",
    flag: "bg-red-100 text-red-800 border-red-200",
  };

  return (
    <div className="space-y-4">
      {subjects.length > 0 && (
        <SubjectFilter value={filter} onChange={onFilterChange} subjects={subjects} testId="select-evidence-subject-filter" />
      )}
      <Card>
        <CardContent className="p-4 space-y-2">
          <p className="text-sm font-medium text-slate-700">Add evidence entry</p>
          <p className="text-xs text-slate-500">
            Keep facts separated from open questions and risk flags — the discipline that makes dossiers comparable.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Select value={subjectType} onValueChange={setSubjectType}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="vendor">Vendor</SelectItem>
                <SelectItem value="award">Award</SelectItem>
                <SelectItem value="opportunity">Opportunity</SelectItem>
              </SelectContent>
            </Select>
            <Input className="flex-1 min-w-[160px]" placeholder="Subject (e.g. vendor name or contract #)" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} data-testid="input-evidence-subject" />
            <Select value={entryType} onValueChange={setEntryType}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fact">Fact</SelectItem>
                <SelectItem value="question">Open question</SelectItem>
                <SelectItem value="flag">Risk flag</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Textarea placeholder="Entry content…" value={content} onChange={(e) => setContent(e.target.value)} rows={2} data-testid="input-evidence-content" />
          <Button size="sm" onClick={() => add.mutate()} disabled={!subjectId.trim() || !content.trim() || add.isPending} data-testid="button-add-evidence">
            {add.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
            Add entry
          </Button>
        </CardContent>
      </Card>
      {entries.length === 0 ? (
        <p className="text-sm text-slate-500 bg-slate-50 rounded-md p-4">
          {filter ? "No evidence entries for this subject." : "No evidence entries yet."}
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.id} className="border rounded-lg p-3 text-sm" data-testid={`evidence-${e.id}`}>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <Badge className={`${ENTRY_STYLE[e.entry_type]} border uppercase text-[10px]`}>{e.entry_type}</Badge>
                <span className="text-slate-500">{e.subject_type}: <span className="font-medium text-slate-700">{e.subject_id}</span></span>
                <span className="text-slate-400 ml-auto">{e.created_by ?? "—"} · {timeAgo(e.created_at)}</span>
              </div>
              <p className="text-slate-700 mt-1.5">{e.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Manual checklist tab ────────────────────────────────────────────────── */

function ChecklistTab({ filter, onFilterChange }: { filter: string; onFilterChange: (v: string) => void }) {
  const { toast } = useToast();
  const { data: allItems = [] } = useQuery<ChecklistRow[]>({ queryKey: ["/api/federal-contracts/checklist"] });
  const { data: filteredItems = [] } = useQuery<ChecklistRow[]>({
    queryKey: ["/api/federal-contracts/checklist", { subjectId: filter }],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/federal-contracts/checklist?subjectId=${encodeURIComponent(filter)}`);
      return res.json();
    },
    enabled: !!filter,
  });
  const items = filter ? filteredItems : allItems;
  const subjects = Array.from(
    new Map(allItems.map((i) => [i.subject_id, { type: i.subject_type, id: i.subject_id }])).values(),
  ).sort((a, b) => a.id.localeCompare(b.id));
  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/federal-contracts/checklist/${id}`, { status });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/federal-contracts/checklist"] }),
    onError: (err: Error) => toast({ title: "Could not update item", description: err.message, variant: "destructive" }),
  });

  const bySubject = items.reduce<Record<string, ChecklistRow[]>>((acc, i) => {
    (acc[i.subject_id] ??= []).push(i);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {subjects.length > 0 && (
        <SubjectFilter value={filter} onChange={onFilterChange} subjects={subjects} testId="select-checklist-subject-filter" />
      )}
      {items.length === 0 && (
        <p className="text-sm text-slate-500 bg-slate-50 rounded-md p-4">
          {filter
            ? "No checklist items for this subject."
            : "The agent seeds a manual due-diligence checklist for each tracked vendor and contract — the rubric items that need non-public sources (CPARS, DCAA audits, OCI mapping) live here for human sign-off."}
        </p>
      )}
      {Object.entries(bySubject).map(([subject, rows]) => (
        <Card key={subject}>
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-slate-700 mb-2">{subject}</p>
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="flex items-center gap-2 flex-wrap" data-testid={`check-${r.id}`}>
                  <Select value={r.status} onValueChange={(status) => update.mutate({ id: r.id, status })}>
                    <SelectTrigger className={`w-32 h-7 text-xs border ${CHECK_STATUS_STYLE[r.status]}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not started</SelectItem>
                      <SelectItem value="in_progress">In progress</SelectItem>
                      <SelectItem value="cleared">Cleared</SelectItem>
                      <SelectItem value="flagged">Flag raised</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-slate-600 flex-1 min-w-[200px]">{r.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function FederalContracts() {
  const [activeTab, setActiveTab] = useState("awards");
  const [subjectFilter, setSubjectFilter] = useState("");
  return (
    <div className="space-y-6" data-testid="page-federal-contracts">
      <AgentWorkspaceHeader agentId="federal-contracts-monitor" />
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Landmark className="h-7 w-7 text-indigo-600" />
          Federal Contracts
        </h1>
        <p className="text-slate-500 mt-1">
          US government contract monitoring — opportunity watch, award dossiers, and due-diligence risk scoring
          built on SAM.gov and USAspending.gov data.
        </p>
      </div>

      <WatchlistPanel />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="awards" data-testid="tab-awards"><Scale className="h-4 w-4 mr-1.5" /> Risk scoreboard</TabsTrigger>
          <TabsTrigger value="opportunities" data-testid="tab-opportunities"><FileText className="h-4 w-4 mr-1.5" /> Opportunities</TabsTrigger>
          <TabsTrigger value="evidence" data-testid="tab-evidence"><ScrollText className="h-4 w-4 mr-1.5" /> Evidence log</TabsTrigger>
          <TabsTrigger value="checklist" data-testid="tab-checklist"><ClipboardCheck className="h-4 w-4 mr-1.5" /> Manual checklist</TabsTrigger>
        </TabsList>
        <TabsContent value="awards" className="mt-4"><AwardsTab /></TabsContent>
        <TabsContent value="opportunities" className="mt-4">
          <OpportunitiesTab
            onViewWorkPackage={(noticeId) => {
              setSubjectFilter(noticeId);
              setActiveTab("checklist");
            }}
          />
        </TabsContent>
        <TabsContent value="evidence" className="mt-4"><EvidenceTab filter={subjectFilter} onFilterChange={setSubjectFilter} /></TabsContent>
        <TabsContent value="checklist" className="mt-4"><ChecklistTab filter={subjectFilter} onFilterChange={setSubjectFilter} /></TabsContent>
      </Tabs>
    </div>
  );
}
