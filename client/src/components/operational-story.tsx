import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  DecisionCard,
  RecallList,
  ApexSummaryCards,
  AgentFeed,
  type GateDecision,
  type RecallDecision,
} from "@/components/governance-widgets";
import {
  MessageCircleQuestion,
  ShieldCheck,
  Gavel,
  LayoutDashboard,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  FileCheck2,
} from "lucide-react";

interface AskResult {
  question: string;
  matchedActionType: string | null;
  matchedVia: string;
  decision: GateDecision;
  recall: RecallDecision[];
}

interface EvidenceResult {
  integrity: { total: number; signed: number; verified: number; unsigned: number };
  trainingEvents: any[];
  governanceDecisions: any[];
}

const STEPS = [
  { n: 1, label: "Ask", hint: "Pose an action", icon: MessageCircleQuestion },
  { n: 2, label: "Evidence", hint: "Prove the record", icon: FileCheck2 },
  { n: 3, label: "Governance", hint: "Human decision", icon: Gavel },
  { n: 4, label: "Enterprise", hint: "Board-level view", icon: LayoutDashboard },
];

export function OperationalStoryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [question, setQuestion] = useState("Can an instructor waive required training hours?");
  const [authority, setAuthority] = useState("instructor");
  const [askResult, setAskResult] = useState<AskResult | null>(null);
  const [evidence, setEvidence] = useState<EvidenceResult | null>(null);
  const [resolvedAction, setResolvedAction] = useState<"approve" | "reject" | null>(null);

  // Fresh run every time the dialog opens.
  useEffect(() => {
    if (open) {
      setStep(1);
      setAskResult(null);
      setEvidence(null);
      setResolvedAction(null);
    }
  }, [open]);

  const askMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/governance/ask", {
        question,
        asAuthority: authority,
      });
      return res.json() as Promise<AskResult>;
    },
    onSuccess: (data) => {
      setAskResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/governance/apex-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/governance/agent-events"] });
    },
    onError: (err: any) =>
      toast({ title: "Could not run compliance check", description: err.message, variant: "destructive" }),
  });

  const evidenceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/governance/evidence");
      return res.json() as Promise<EvidenceResult>;
    },
    onSuccess: (data) => setEvidence(data),
    onError: (err: any) =>
      toast({ title: "Could not pull evidence", description: err.message, variant: "destructive" }),
  });

  const escalationId = askResult?.decision?.escalationId;

  const { data: escalations = [], isLoading: escLoading } = useQuery<any[]>({
    queryKey: ["/api/governance/escalations"],
    enabled: open && step === 3,
    refetchInterval: step === 3 ? 4000 : false,
  });

  const matchedEscalation = escalations.find((e) => e.id === escalationId);

  const resolveMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approve" | "reject" }) =>
      apiRequest("POST", `/api/governance/escalations/${id}/resolve`, {
        action,
        note: "Resolved via Operational Story walkthrough.",
      }),
    onSuccess: (_d, vars) => {
      setResolvedAction(vars.action);
      queryClient.invalidateQueries({ queryKey: ["/api/governance/escalations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/governance/apex-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/governance/agent-events"] });
      toast({
        title: vars.action === "approve" ? "Escalation approved" : "Escalation rejected",
        description: "Recorded in the audit trail.",
      });
    },
    onError: (err: any) =>
      toast({ title: "Could not resolve", description: err.message, variant: "destructive" }),
  });

  // Auto-pull evidence when landing on step 2.
  useEffect(() => {
    if (open && step === 2 && !evidence && !evidenceMutation.isPending) {
      evidenceMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step]);

  const outcome = askResult?.decision?.decision;
  const isEscalated = outcome === "escalated";
  const canAdvance =
    step === 1
      ? !!askResult
      : step === 2
        ? !!evidence
        : step === 3
          ? !isEscalated || !!resolvedAction || (!!matchedEscalation && matchedEscalation.status !== "pending")
          : true;

  const goNext = () => setStep((s) => Math.min(4, s + 1));
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            Complete Operational Story
          </DialogTitle>
          <DialogDescription>
            One end-to-end narrative: a real action is checked, proven with evidence, routed for a human
            decision, and folded into enterprise-wide visibility — nothing mocked.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-between px-1 py-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = step === s.n;
            const done = step > s.n;
            return (
              <div key={s.n} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center text-center">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${
                      done
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : active
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-white border-slate-300 text-slate-400"
                    }`}
                  >
                    {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <p className={`text-[11px] mt-1 font-medium ${active ? "text-blue-700" : "text-slate-500"}`}>
                    {s.label}
                  </p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-2 ${step > s.n ? "bg-emerald-400" : "bg-slate-200"}`} />
                )}
              </div>
            );
          })}
        </div>

        <div className="min-h-[240px] py-2">
          {/* STEP 1 — ASK */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-1">Step 1 — Ask before you act</p>
                <p className="text-sm text-slate-500">
                  Someone wants to take an action. Before it runs, the GATE checks whether it is admissible
                  under FAA policy.
                </p>
              </div>
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={2}
                data-testid="input-story-question"
              />
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-slate-600">Requesting as:</span>
                <Select value={authority} onValueChange={setAuthority}>
                  <SelectTrigger className="w-48 h-9" data-testid="select-story-authority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instructor">Instructor</SelectItem>
                    <SelectItem value="auditor">Auditor</SelectItem>
                    <SelectItem value="admin">Admin (accountable manager)</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => askMutation.mutate()}
                  disabled={askMutation.isPending || !question.trim()}
                  data-testid="button-story-ask"
                >
                  {askMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Checking…</>
                  ) : (
                    <><ShieldCheck className="h-4 w-4 mr-2" /> Run Compliance Check</>
                  )}
                </Button>
              </div>

              {askResult && (
                <div className="space-y-3 pt-1" data-testid="story-ask-result">
                  <DecisionCard decision={askResult.decision} />
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-1.5">
                      Enterprise Memory — what we've decided before
                    </p>
                    <RecallList items={askResult.recall} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2 — EVIDENCE */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-1">Step 2 — Prove it with evidence</p>
                <p className="text-sm text-slate-500">
                  The same records behind that decision are assembled into a verifiable evidence package —
                  each signature is cryptographically re-checked on the server.
                </p>
              </div>
              {evidenceMutation.isPending || !evidence ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="space-y-3" data-testid="story-evidence-result">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: "Records", value: evidence.integrity.total, color: "text-slate-800" },
                      { label: "Signed", value: evidence.integrity.signed, color: "text-blue-600" },
                      { label: "Verified", value: evidence.integrity.verified, color: "text-emerald-600" },
                      { label: "Unsigned", value: evidence.integrity.unsigned, color: "text-amber-600" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-lg border bg-slate-50 p-2 text-center">
                        <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                        <div className="text-[11px] text-slate-500">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3 text-sm text-slate-700 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    {evidence.integrity.verified === evidence.integrity.signed && evidence.integrity.signed > 0
                      ? `All ${evidence.integrity.signed} signed records passed cryptographic verification — audit-ready.`
                      : `${evidence.integrity.verified} of ${evidence.integrity.signed} signed records verified.`}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3 — GOVERNANCE */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-1">Step 3 — Route to a human</p>
                <p className="text-sm text-slate-500">
                  {isEscalated
                    ? "Because the action wasn't auto-admissible, the GATE refused to run it and escalated it here for the accountable manager to decide."
                    : "Escalations that need a human decision land here. This particular action was resolved by the GATE on its own, so there's nothing to approve."}
                </p>
              </div>

              {outcome === "allowed" ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-slate-700 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  That action was auto-admitted by the GATE — it met policy, so no human escalation was required.
                  This is the clean-path outcome.
                </div>
              ) : outcome === "refused" ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-slate-700 flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                  The GATE refused this action outright — it violates a protected policy, so there is no human
                  override path. The refusal itself is the governed outcome, recorded in the audit trail.
                </div>
              ) : escLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : matchedEscalation ? (
                <div
                  className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-3"
                  data-testid="story-escalation"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-800 capitalize">
                        {String(matchedEscalation.action_type || "").replace(/_/g, " ")}
                      </p>
                      <p className="text-sm text-slate-600">{matchedEscalation.action_description}</p>
                    </div>
                    <Badge
                      className={
                        matchedEscalation.status === "pending"
                          ? "bg-amber-100 text-amber-800"
                          : matchedEscalation.status === "approved"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                      }
                    >
                      {matchedEscalation.status}
                    </Badge>
                  </div>
                  {matchedEscalation.regulatory_basis && (
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Gavel className="h-3 w-3" /> {matchedEscalation.regulatory_basis}
                    </p>
                  )}
                  {matchedEscalation.status === "pending" ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => resolveMutation.mutate({ id: matchedEscalation.id, action: "approve" })}
                        disabled={resolveMutation.isPending}
                        data-testid="button-story-approve"
                      >
                        {resolveMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => resolveMutation.mutate({ id: matchedEscalation.id, action: "reject" })}
                        disabled={resolveMutation.isPending}
                        data-testid="button-story-reject"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" /> Decision recorded — your authority is final.
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border bg-slate-50 p-4 text-sm text-slate-500">
                  Locating the escalated action…
                </div>
              )}
            </div>
          )}

          {/* STEP 4 — ENTERPRISE */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-1">Step 4 — Enterprise visibility</p>
                <p className="text-sm text-slate-500">
                  Every decision above rolls up here in real time — the board-level view of governance health,
                  refusals, approvals, and the live agent network.
                </p>
              </div>
              <ApexSummaryCards pollMs={4000} />
              <AgentFeed pollMs={4000} limit={6} />
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between border-t pt-3">
          <Button variant="ghost" size="sm" onClick={goBack} disabled={step === 1} data-testid="button-story-back">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="flex items-center gap-2">
            {step === 4 ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setStep(1)} data-testid="button-story-restart">
                  <RotateCcw className="h-4 w-4 mr-1" /> Restart
                </Button>
                <Button size="sm" onClick={() => onOpenChange(false)} data-testid="button-story-finish">
                  Finish
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={goNext} disabled={!canAdvance} data-testid="button-story-next">
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
