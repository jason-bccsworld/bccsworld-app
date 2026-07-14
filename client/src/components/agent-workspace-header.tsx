import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bot, Play, Loader2, ArrowRight, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

/* ── Shared types for the agent workforce API ────────────────────────────── */
export interface AgentRun {
  id: string;
  org_id: string | null;
  status: "running" | "success" | "failed" | "interrupted";
  started_at: string;
  finished_at: string | null;
  items_processed: number | null;
  findings_count: number | null;
  summary: string | null;
}

export interface AgentInfo {
  id: string;
  name: string;
  mission: string;
  domainPath: string;
  schedule: string;
  capabilities: string[];
  manuallyRunnable: boolean;
  scope: "org" | "global";
  lastRun: AgentRun | null;
  openFindings: number;
  severeFindings: number;
}

export interface AgentRoster {
  agents: AgentInfo[];
  runsLast24h: number;
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "never";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export const RUN_STATUS_STYLE: Record<string, { label: string; className: string }> = {
  running: { label: "Working now", className: "bg-blue-100 text-blue-800 border-blue-200" },
  success: { label: "On duty", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  failed: { label: "Last run failed", className: "bg-red-100 text-red-800 border-red-200" },
  interrupted: { label: "Run interrupted", className: "bg-amber-100 text-amber-800 border-amber-200" },
};

export function useRunAgent() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (agentId: string) => {
      const res = await apiRequest("POST", `/api/agents/${agentId}/run`);
      return res.json();
    },
    onSuccess: (data: { message?: string }) => {
      toast({ title: "Agent dispatched", description: data?.message ?? "The agent is on it." });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
        queryClient.invalidateQueries({ queryKey: ["/api/agents/findings"] });
      }, 1200);
    },
    onError: (err: Error) => {
      toast({
        title: "Could not start the agent",
        description: err.message.replace(/^\d+:\s*/, ""),
        variant: "destructive",
      });
    },
  });
}

/**
 * Banner that sits at the top of a domain page and shows which agent runs
 * this workspace, what it did last, and (when allowed) a Run Now button.
 */
export default function AgentWorkspaceHeader({ agentId }: { agentId: string }) {
  const { data } = useQuery<AgentRoster>({
    queryKey: ["/api/agents"],
    refetchInterval: 15000,
  });
  const runAgent = useRunAgent();

  const agent = data?.agents.find((a) => a.id === agentId);
  if (!agent) return null;

  const status = agent.lastRun ? RUN_STATUS_STYLE[agent.lastRun.status] : null;

  return (
    <div
      className="mb-6 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 p-4"
      data-testid={`agent-workspace-header-${agent.id}`}
    >
      <div className="flex flex-wrap items-start gap-3">
        <div className="p-2.5 rounded-lg bg-indigo-600 text-white flex-shrink-0">
          <Bot className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-[240px]">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-800">{agent.name}</p>
            {status && <Badge className={`${status.className} border text-xs`}>{status.label}</Badge>}
            {agent.openFindings > 0 && (
              <Badge className="bg-orange-100 text-orange-800 border border-orange-200 text-xs gap-1">
                <AlertTriangle className="h-3 w-3" />
                {agent.openFindings} open finding{agent.openFindings === 1 ? "" : "s"}
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-600 mt-0.5">{agent.mission}</p>
          <p className="text-xs text-slate-500 mt-1">
            {agent.lastRun?.summary
              ? `Last run ${timeAgo(agent.lastRun.started_at)} — ${agent.lastRun.summary}`
              : `Runs: ${agent.schedule}. No runs recorded yet.`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {agent.manuallyRunnable && (
            <Button
              size="sm"
              onClick={() => runAgent.mutate(agent.id)}
              disabled={runAgent.isPending || agent.lastRun?.status === "running"}
              data-testid={`button-run-agent-${agent.id}`}
            >
              {runAgent.isPending ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-1.5" />
              )}
              Run now
            </Button>
          )}
          <Link href="/agents">
            <Button size="sm" variant="outline" data-testid="link-command-center">
              Command Center
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
