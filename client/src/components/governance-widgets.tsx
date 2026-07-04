import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Activity,
  Gavel,
  BookMarked,
  Radio,
  Layers,
  Lock,
  FileSignature,
} from "lucide-react";

/* ── Types (backend returns snake_case rows) ─────────────────────────────── */
export interface GateDecision {
  decisionId: string;
  decision: "allowed" | "refused" | "escalated";
  admissible: boolean;
  reasoning: string;
  policy: {
    id: string;
    actionType: string;
    label: string;
    requiredAuthority: string;
    decisionRule: string;
    isProtected: boolean;
    regulatoryBasis: string;
    regulatoryText: string | null;
  } | null;
  regulatoryBasis: string | null;
  escalationId?: string;
  requiredApproverRole?: string;
}

export interface AgentEvent {
  id: string;
  agent_name: string;
  event_type: string;
  message: string;
  related_event_id: string | null;
  created_at: string;
}

export interface ApexSummary {
  decisions: { allowed: number; refused: number; escalated: number };
  totalDecisions: number;
  escalations: { pending: number; approved: number; rejected: number };
  activeAgents: number;
  complianceReadiness: number;
  governanceHealth: number;
  pendingApprovals: number;
  refusals: number;
  policies: { total: number; protected: number };
  signedRecords: number;
}

/* ── Decision styling helpers ────────────────────────────────────────────── */
const DECISION_STYLE = {
  allowed: {
    label: "ADMISSIBLE",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    card: "border-emerald-200 bg-emerald-50",
    icon: ShieldCheck,
    iconColor: "text-emerald-600",
  },
  refused: {
    label: "REFUSED",
    badge: "bg-red-100 text-red-800 border-red-200",
    card: "border-red-200 bg-red-50",
    icon: ShieldX,
    iconColor: "text-red-600",
  },
  escalated: {
    label: "ESCALATED",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    card: "border-amber-200 bg-amber-50",
    icon: ShieldAlert,
    iconColor: "text-amber-600",
  },
} as const;

export function DecisionBadge({ decision }: { decision: GateDecision["decision"] }) {
  const s = DECISION_STYLE[decision];
  const Icon = s.icon;
  return (
    <Badge className={`${s.badge} border font-semibold gap-1`} data-testid={`badge-decision-${decision}`}>
      <Icon className="h-3.5 w-3.5" />
      {s.label}
    </Badge>
  );
}

/* Full decision card — decision + reasoning + regulatory basis + authority. */
export function DecisionCard({ decision }: { decision: GateDecision }) {
  const s = DECISION_STYLE[decision.decision];
  const Icon = s.icon;
  return (
    <div className={`rounded-lg border p-4 ${s.card}`} data-testid="card-gate-decision">
      <div className="flex items-start gap-3">
        <Icon className={`h-6 w-6 flex-shrink-0 ${s.iconColor}`} />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <DecisionBadge decision={decision.decision} />
            {decision.policy && (
              <span className="text-sm font-semibold text-slate-800">{decision.policy.label}</span>
            )}
            {decision.policy?.isProtected && (
              <Badge variant="outline" className="text-xs border-red-300 text-red-700">
                Protected State
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">{decision.reasoning}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500 pt-1">
            {decision.regulatoryBasis && (
              <span className="flex items-center gap-1">
                <Gavel className="h-3.5 w-3.5" /> {decision.regulatoryBasis}
              </span>
            )}
            {decision.policy && (
              <span>
                Requires authority:{" "}
                <span className="font-medium text-slate-700">
                  {decision.policy.requiredAuthority.replace(/_/g, " ")}
                </span>
              </span>
            )}
            {decision.decision === "escalated" && decision.requiredApproverRole && (
              <span>
                Approver:{" "}
                <span className="font-medium text-amber-700">
                  {decision.requiredApproverRole.replace(/_/g, " ")}
                </span>
              </span>
            )}
          </div>
          {decision.policy?.regulatoryText && (
            <p className="text-xs text-slate-400 italic border-l-2 border-slate-200 pl-2 mt-1">
              {decision.policy.regulatoryText}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* Recall list — prior decisions on record (Enterprise Memory). */
export interface RecallDecision {
  id: string;
  action_type: string;
  requester_authority: string;
  decision: GateDecision["decision"];
  reasoning: string;
  regulatory_basis: string | null;
  created_at: string;
}

export function RecallList({ items }: { items: RecallDecision[] }) {
  if (!items || items.length === 0) {
    return (
      <p className="text-sm text-slate-400 flex items-center gap-2">
        <BookMarked className="h-4 w-4" /> No prior decisions on record for this action yet.
      </p>
    );
  }
  return (
    <div className="space-y-2" data-testid="list-recall">
      {items.map((d) => (
        <div key={d.id} className="flex items-start gap-2 text-sm border rounded-md p-2 bg-white">
          <DecisionBadge decision={d.decision} />
          <div className="flex-1 min-w-0">
            <p className="text-slate-600 truncate">{d.reasoning}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {d.requester_authority.replace(/_/g, " ")} ·{" "}
              {new Date(d.created_at).toLocaleDateString()}
              {d.regulatory_basis ? ` · ${d.regulatory_basis}` : ""}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── APEX rollup cards (self-fetching) ───────────────────────────────────── */
export function ApexSummaryCards({ pollMs = 8000 }: { pollMs?: number }) {
  const { data, isLoading } = useQuery<ApexSummary>({
    queryKey: ["/api/governance/apex-summary"],
    refetchInterval: pollMs,
  });

  const cards = [
    {
      label: "Audit Readiness",
      value: data ? `${data.complianceReadiness}%` : "—",
      hint: "actions admitted without refusal",
      color: "text-emerald-600",
      icon: ShieldCheck,
    },
    {
      label: "Actions Refused",
      value: data ? data.refusals : "—",
      hint: "inadmissible / protected state",
      color: "text-red-600",
      icon: ShieldX,
    },
    {
      label: "Pending Approvals",
      value: data ? data.pendingApprovals : "—",
      hint: "awaiting human sovereign",
      color: "text-amber-600",
      icon: ShieldAlert,
    },
    {
      label: "Active Agents",
      value: data ? data.activeAgents : "—",
      hint: "governance network online",
      color: "text-blue-600",
      icon: Activity,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="apex-summary">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">{c.label}</p>
                  <p className={`text-2xl font-bold ${c.color}`}>{isLoading ? "…" : c.value}</p>
                </div>
                <Icon className={`h-7 w-7 ${c.color} opacity-70`} />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{c.hint}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/* ── APEX detail strip: decision mix, escalation status, enterprise scope ── */
export function ApexDetailStrip({ pollMs = 8000 }: { pollMs?: number }) {
  const { data } = useQuery<ApexSummary>({
    queryKey: ["/api/governance/apex-summary"],
    refetchInterval: pollMs,
  });

  const d = data?.decisions ?? { allowed: 0, refused: 0, escalated: 0 };
  const total = d.allowed + d.refused + d.escalated;
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
  const esc = data?.escalations ?? { pending: 0, approved: 0, rejected: 0 };

  const scope = [
    { label: "Policies governed", value: data?.policies?.total ?? 0, icon: Layers, color: "text-blue-600" },
    { label: "Protected controls", value: data?.policies?.protected ?? 0, icon: Lock, color: "text-red-600" },
    { label: "Signed records", value: data?.signedRecords ?? 0, icon: FileSignature, color: "text-emerald-600" },
    { label: "Governance health", value: data ? `${data.governanceHealth}%` : "—", icon: Activity, color: "text-teal-600" },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-3" data-testid="apex-detail-strip">
      {/* Decision mix + escalation status */}
      <Card className="lg:col-span-2">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-slate-700">Runtime decisions</p>
            <p className="text-xs text-slate-400">
              {total} governed {total === 1 ? "action" : "actions"}
            </p>
          </div>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="bg-emerald-500" style={{ width: `${pct(d.allowed)}%` }} />
            <div className="bg-amber-500" style={{ width: `${pct(d.escalated)}%` }} />
            <div className="bg-red-500" style={{ width: `${pct(d.refused)}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Admitted{" "}
              <span className="font-semibold text-slate-700">{d.allowed}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Escalated{" "}
              <span className="font-semibold text-slate-700">{d.escalated}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Refused{" "}
              <span className="font-semibold text-slate-700">{d.refused}</span>
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge className="bg-amber-100 text-amber-800">Escalations pending: {esc.pending}</Badge>
            <Badge className="bg-emerald-100 text-emerald-800">Approved: {esc.approved}</Badge>
            <Badge className="bg-red-100 text-red-800">Rejected: {esc.rejected}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Enterprise scope */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">Enterprise scope</p>
          <div className="grid grid-cols-2 gap-3">
            {scope.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${s.color} opacity-70`} />
                  <div>
                    <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[11px] text-slate-400 leading-tight">{s.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Multi-agent awareness feed (self-fetching, live-polling) ────────────── */
const AGENT_DOT: Record<string, string> = {
  action_allowed: "bg-emerald-500",
  action_refused: "bg-red-500",
  action_escalated: "bg-amber-500",
  detected_change: "bg-purple-500",
  updated_checklist: "bg-blue-500",
  flagged_records: "bg-orange-500",
  policy_synced: "bg-teal-500",
  dashboard_synced: "bg-slate-400",
};

export function AgentFeed({ pollMs = 5000, limit = 8 }: { pollMs?: number; limit?: number }) {
  const { data: events = [], isLoading } = useQuery<AgentEvent[]>({
    queryKey: ["/api/governance/agent-events"],
    refetchInterval: pollMs,
  });

  return (
    <Card data-testid="agent-feed">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg">
          <Radio className="mr-2 h-5 w-5 text-blue-600" />
          Agent Awareness Feed
          <span className="ml-2 flex items-center gap-1 text-xs font-normal text-emerald-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> live
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-slate-400">Loading agent activity…</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-slate-400">No agent activity yet.</p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {events.slice(0, limit).map((e) => (
              <div key={e.id} className="flex items-start gap-3 text-sm">
                <span
                  className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${
                    AGENT_DOT[e.event_type] ?? "bg-slate-300"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800">{e.agent_name}</p>
                  <p className="text-slate-600">{e.message}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {new Date(e.created_at).toLocaleString()}
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
