import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Bot,
  Play,
  Loader2,
  ArrowRight,
  AlertTriangle,
  Activity,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Eye,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AgentFeed } from "@/components/governance-widgets";
import {
  type AgentRoster,
  type AgentInfo,
  RUN_STATUS_STYLE,
  timeAgo,
  useRunAgent,
} from "@/components/agent-workspace-header";

interface AgentFinding {
  id: string;
  agent_id: string;
  finding_type: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  detail: Record<string, unknown> | null;
  status: string;
  created_at: string;
}

const SEVERITY_STYLE: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-slate-100 text-slate-700 border-slate-200",
};

function AgentCard({ agent }: { agent: AgentInfo }) {
  const [expanded, setExpanded] = useState(false);
  const runAgent = useRunAgent();
  const status = agent.lastRun ? RUN_STATUS_STYLE[agent.lastRun.status] : null;

  return (
    <Card className="flex flex-col" data-testid={`card-agent-${agent.id}`}>
      <CardContent className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-600 text-white">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 leading-tight">{agent.name}</p>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                <Clock className="h-3 w-3" /> {agent.schedule}
              </p>
            </div>
          </div>
          {status ? (
            <Badge className={`${status.className} border text-xs flex-shrink-0`}>{status.label}</Badge>
          ) : (
            <Badge className="bg-slate-100 text-slate-600 border border-slate-200 text-xs flex-shrink-0">
              Standing by
            </Badge>
          )}
        </div>

        <p className="text-sm text-slate-600 mt-3">{agent.mission}</p>

        <div className="mt-3 text-xs text-slate-500 bg-slate-50 rounded-md p-2.5 min-h-[3rem]">
          {agent.lastRun?.summary ? (
            <>
              <span className="font-medium text-slate-600">
                Last run {timeAgo(agent.lastRun.started_at)}:
              </span>{" "}
              {agent.lastRun.summary}
            </>
          ) : agent.lastRun ? (
            <>Last run {timeAgo(agent.lastRun.started_at)} — {agent.lastRun.status}.</>
          ) : (
            <>No runs recorded yet. This agent reports here as soon as it works.</>
          )}
        </div>

        {agent.openFindings > 0 && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            <Badge className="bg-orange-100 text-orange-800 border border-orange-200 gap-1">
              <AlertTriangle className="h-3 w-3" />
              {agent.openFindings} open finding{agent.openFindings === 1 ? "" : "s"}
            </Badge>
            {agent.severeFindings > 0 && (
              <span className="text-red-600 font-medium">{agent.severeFindings} need urgent attention</span>
            )}
          </div>
        )}

        {expanded && (
          <ul className="mt-3 space-y-1.5">
            {agent.capabilities.map((c) => (
              <li key={c} className="text-xs text-slate-600 flex items-start gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-px" />
                {c}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 pt-3 border-t flex items-center gap-2 flex-wrap">
          {agent.manuallyRunnable && (
            <Button
              size="sm"
              onClick={() => runAgent.mutate(agent.id)}
              disabled={runAgent.isPending || agent.lastRun?.status === "running"}
              data-testid={`button-run-agent-${agent.id}`}
            >
              {runAgent.isPending || agent.lastRun?.status === "running" ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-1.5" />
              )}
              {agent.lastRun?.status === "running" ? "Working…" : "Run now"}
            </Button>
          )}
          <Link href={agent.domainPath}>
            <Button size="sm" variant="outline" data-testid={`link-workspace-${agent.id}`}>
              Workspace
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </Link>
          <button
            className="ml-auto text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
            onClick={() => setExpanded((v) => !v)}
            data-testid={`button-expand-${agent.id}`}
          >
            {expanded ? (
              <>Less <ChevronUp className="h-3.5 w-3.5" /></>
            ) : (
              <>What it does <ChevronDown className="h-3.5 w-3.5" /></>
            )}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function FindingsPanel() {
  const { toast } = useToast();
  const { data: findings = [], isLoading } = useQuery<AgentFinding[]>({
    queryKey: ["/api/agents/findings"],
    refetchInterval: 15000,
  });
  const { data: roster } = useQuery<AgentRoster>({ queryKey: ["/api/agents"] });
  const agentName = (id: string) => roster?.agents.find((a) => a.id === id)?.name ?? id;

  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/agents/findings/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents/findings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
    },
    onError: (err: Error) => {
      toast({ title: "Could not update the finding", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Card data-testid="panel-findings">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <p className="font-semibold text-slate-800">Open findings</p>
          {findings.length > 0 && (
            <Badge className="bg-orange-100 text-orange-800 border border-orange-200">{findings.length}</Badge>
          )}
        </div>
        {isLoading ? (
          <p className="text-sm text-slate-400">Checking with the team…</p>
        ) : findings.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md p-3">
            <ShieldCheck className="h-4 w-4 flex-shrink-0" />
            Nothing needs your attention right now. Your agents will flag anything they find.
          </div>
        ) : (
          <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
            {findings.map((f) => (
              <div key={f.id} className="border rounded-lg p-3" data-testid={`finding-${f.id}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`${SEVERITY_STYLE[f.severity] ?? SEVERITY_STYLE.low} border text-xs uppercase`}>
                    {f.severity}
                  </Badge>
                  <span className="text-xs text-slate-400">
                    {agentName(f.agent_id)} · {timeAgo(f.created_at)}
                  </span>
                </div>
                <p className="text-sm text-slate-700 mt-1.5">{f.title}</p>
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={update.isPending}
                    onClick={() => update.mutate({ id: f.id, status: "acknowledged" })}
                    data-testid={`button-ack-${f.id}`}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" /> Acknowledge
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                    disabled={update.isPending}
                    onClick={() => update.mutate({ id: f.id, status: "resolved" })}
                    data-testid={`button-resolve-${f.id}`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Resolved
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AgentsCommandCenter() {
  const { data, isLoading } = useQuery<AgentRoster>({
    queryKey: ["/api/agents"],
    refetchInterval: 10000,
  });

  const agents = data?.agents ?? [];
  const openFindings = agents.reduce((n, a) => n + a.openFindings, 0);
  const severeFindings = agents.reduce((n, a) => n + a.severeFindings, 0);
  const working = agents.filter((a) => a.lastRun?.status === "running").length;

  const kpis = [
    { label: "Agents on your team", value: agents.length || "—", icon: Bot, color: "text-indigo-600" },
    { label: "Runs in the last 24h", value: data?.runsLast24h ?? "—", icon: Activity, color: "text-blue-600" },
    {
      label: "Working right now",
      value: isLoading ? "—" : working,
      icon: Loader2,
      color: "text-emerald-600",
    },
    {
      label: "Open findings",
      value: isLoading ? "—" : openFindings,
      icon: AlertTriangle,
      color: severeFindings > 0 ? "text-red-600" : "text-amber-600",
    },
  ];

  return (
    <div className="space-y-6" data-testid="page-agents">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Bot className="h-7 w-7 text-indigo-600" />
          AI Agent Command Center
        </h1>
        <p className="text-slate-500 mt-1">
          Your compliance department runs itself. Seven AI agents watch regulations, process documents,
          patrol your roster, and report everything here — under GATE governance.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="kpi-strip">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500">{k.label}</p>
                    <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                  </div>
                  <Icon className={`h-7 w-7 ${k.color} opacity-70`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-5">
                    <div className="animate-pulse space-y-3">
                      <div className="h-5 bg-slate-200 rounded w-2/3" />
                      <div className="h-4 bg-slate-100 rounded w-full" />
                      <div className="h-12 bg-slate-100 rounded" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          )}
        </div>
        <div className="space-y-6">
          <FindingsPanel />
          <AgentFeed />
        </div>
      </div>
    </div>
  );
}
