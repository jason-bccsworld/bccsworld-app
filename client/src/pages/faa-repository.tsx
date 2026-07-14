import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AgentWorkspaceHeader from "@/components/agent-workspace-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  FileText, RefreshCw, Search, ExternalLink, CheckCircle, AlertTriangle,
  Clock, BookOpen, Shield, AlertCircle, TrendingUp, Database, Activity,
  Filter, ChevronDown, ChevronRight, Scale, Sparkles
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { AgentFeed, RecallList } from "@/components/governance-widgets";

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  cfr_part: { label: "14 CFR Part", color: "bg-blue-100 text-blue-800 border-blue-200", icon: BookOpen },
  faa_order: { label: "FAA Order", color: "bg-purple-100 text-purple-800 border-purple-200", icon: Shield },
  safo: { label: "SAFO", color: "bg-red-100 text-red-800 border-red-200", icon: AlertTriangle },
  info: { label: "InFO", color: "bg-amber-100 text-amber-800 border-amber-200", icon: AlertCircle },
  advisory_circular: { label: "Advisory Circular", color: "bg-green-100 text-green-800 border-green-200", icon: FileText },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  current: { label: "Current", color: "text-green-700 bg-green-50 border-green-200", icon: CheckCircle },
  updated: { label: "Updated", color: "text-amber-700 bg-amber-50 border-amber-200", icon: AlertTriangle },
  unknown: { label: "Checking", color: "text-gray-500 bg-gray-50 border-gray-200", icon: Clock },
  error: { label: "Error", color: "text-red-700 bg-red-50 border-red-200", icon: AlertCircle },
};

const PRIORITY_CONFIG: Record<string, string> = {
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-blue-100 text-blue-800",
  low: "bg-gray-100 text-gray-700",
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.unknown;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.color}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const cfg = TYPE_CONFIG[type] || { label: type, color: "bg-gray-100 text-gray-700 border-gray-200" };
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function DocumentCard({ doc, onAnalyze, analyzing }: { doc: any; onAnalyze?: (doc: any) => void; analyzing?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const typeCfg = TYPE_CONFIG[doc.source_type] || {};
  const TypeIcon = typeCfg.icon || FileText;

  return (
    <Card className={`border-l-4 transition-shadow hover:shadow-md ${doc.status === 'updated' ? 'border-l-amber-500' : doc.status === 'error' ? 'border-l-red-400' : 'border-l-blue-400'}`}>
      <CardContent className="py-4 px-5">
        <div className="flex items-start gap-3">
          <TypeIcon className="h-5 w-5 mt-0.5 shrink-0 text-slate-500" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <TypeBadge type={doc.source_type} />
              <StatusBadge status={doc.status} />
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_CONFIG[doc.priority] || PRIORITY_CONFIG.medium}`}>
                {doc.priority}
              </span>
            </div>

            <h3 className="font-semibold text-sm text-gray-900 leading-snug mb-1">{doc.title}</h3>

            {doc.description && (
              <p className="text-xs text-gray-500 leading-relaxed mb-2">{doc.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
              <span className="font-mono text-gray-600">{doc.source_id}</span>
              {doc.amendment_date && (
                <span>Amended: <span className="font-medium text-gray-600">{doc.amendment_date}</span></span>
              )}
              {doc.last_checked_at && (
                <span>Checked: <span className="font-medium text-gray-600">{format(parseISO(doc.last_checked_at), 'MMM d, yyyy HH:mm')}</span></span>
              )}
              {doc.far_parts?.length > 0 && (
                <span>Parts: <span className="font-medium text-gray-600">{(doc.far_parts || []).join(', ')}</span></span>
              )}
            </div>

            {doc.status === 'updated' && doc.change_summary && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                <strong>Change detected:</strong> {doc.change_summary}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-2">
              <a
                href={doc.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                View Official Document
              </a>
              {doc.last_changed_at && (
                <span className="text-xs text-amber-600">
                  Last updated {format(parseISO(doc.last_changed_at), 'MMM d, yyyy')}
                </span>
              )}
              {doc.source_type === 'cfr_part' && onAnalyze && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  onClick={() => onAnalyze(doc)}
                  disabled={analyzing}
                  data-testid={`button-analyze-impact-${doc.source_id}`}
                >
                  {analyzing ? (
                    <><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Analyzing…</>
                  ) : (
                    <><Scale className="h-3 w-3 mr-1" /> Analyze Compliance Impact</>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FAARepository() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const params = new URLSearchParams();
  if (typeFilter !== 'all') params.set('type', typeFilter);
  if (priorityFilter !== 'all') params.set('priority', priorityFilter);
  if (statusFilter !== 'all') params.set('status', statusFilter);
  if (search) params.set('search', search);
  const queryUrl = `/api/faa-repository?${params.toString()}`;

  const { data: rawDocs, isLoading, isError, refetch } = useQuery<any>({
    queryKey: [queryUrl],
    staleTime: 0,
    refetchOnMount: true,
    retry: 2,
  });
  const docs: any[] = Array.isArray(rawDocs) ? rawDocs : [];

  const { data: stats } = useQuery<any>({
    queryKey: ['/api/faa-repository/stats'],
    staleTime: 0,
    refetchOnMount: true,
    refetchInterval: 30000,
    retry: 2,
  });

  const { data: rawUpdates } = useQuery<any>({
    queryKey: ['/api/faa-repository/updates'],
    staleTime: 0,
    refetchOnMount: true,
    refetchInterval: 60000,
    retry: 2,
  });
  const updates: any[] = Array.isArray(rawUpdates) ? rawUpdates : [];

  const refreshMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/faa-repository/refresh'),
    onSuccess: () => {
      toast({ title: "Monitor check started", description: "FAA documents are being checked for updates. Results will appear within a few minutes." });
      setTimeout(() => {
        queryClient.invalidateQueries({ predicate: q => String(q.queryKey[0]).startsWith('/api/faa-repository') });
      }, 5000);
    },
    onError: () => toast({ title: "Error", description: "Could not start monitor check", variant: "destructive" }),
  });

  const groupedDocs = docs.reduce((acc: Record<string, any[]>, doc) => {
    const key = doc.source_type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(doc);
    return acc;
  }, {});

  const typeOrder = ['cfr_part', 'faa_order', 'safo', 'info', 'advisory_circular'];
  const updatedCount = Number(stats?.updated_count || 0);

  // ── Runtime Governance: regulation impact + shared awareness (Demos 7 & 8) ──
  const [impactDoc, setImpactDoc] = useState<any | null>(null);
  const [impactResult, setImpactResult] = useState<any | null>(null);
  const impactMutation = useMutation({
    mutationFn: async (doc: any) => {
      const res = await apiRequest('POST', '/api/governance/regulation-impact', {
        sourceId: doc.source_id,
        title: doc.title,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setImpactResult(data);
      queryClient.invalidateQueries({ queryKey: ['/api/governance/agent-events'] });
    },
    onError: () => toast({ title: 'Error', description: 'Could not analyze regulation impact', variant: 'destructive' }),
  });
  const handleAnalyzeImpact = (doc: any) => {
    setImpactDoc(doc);
    setImpactResult(null);
    impactMutation.mutate(doc);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      <AgentWorkspaceHeader agentId="faa-repository" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Database className="h-7 w-7 text-blue-600" />
            FAA Document Repository
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Centralized repository of FAA regulatory documents with automated change monitoring
          </p>
        </div>
        <Button
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
          {refreshMutation.isPending ? 'Checking...' : 'Check for Updates'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Documents", value: stats?.total || docs.length, icon: FileText, color: "text-blue-600" },
          { label: "Up-to-Date", value: stats?.current_count || 0, icon: CheckCircle, color: "text-green-600" },
          { label: "Changes Detected", value: stats?.updated_count || 0, icon: AlertTriangle, color: "text-amber-600" },
          { label: "CFR Parts", value: stats?.cfr_parts || 0, icon: BookOpen, color: "text-blue-600" },
          { label: "FAA Orders", value: stats?.faa_orders || 0, icon: Shield, color: "text-purple-600" },
          { label: "SAFOs / InFOs", value: Number(stats?.safos || 0) + Number(stats?.infos || 0), icon: AlertCircle, color: "text-red-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="text-center">
            <CardContent className="pt-4 pb-3">
              <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
              <div className="text-xl font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Change Alert Banner */}
      {updatedCount > 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {updatedCount} document{updatedCount !== 1 ? 's' : ''} have been updated since last check
            </p>
            <p className="text-xs text-amber-600">Review the documents marked "Updated" below for compliance impact</p>
          </div>
        </div>
      )}

      {/* Runtime Governance — Regulation Impact + Shared Awareness (Demos 7 & 8) */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-emerald-100">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-base">
              <Scale className="w-5 h-5 mr-2 text-emerald-600" />
              Regulation Impact Analysis
            </CardTitle>
            <p className="text-sm text-gray-500">
              Pick any 14 CFR Part below and click <span className="font-medium">Analyze Compliance Impact</span>.
              The governance engine measures exactly what a rule change touches — before anyone reacts.
            </p>
          </CardHeader>
          <CardContent>
            {impactMutation.isPending ? (
              <div className="space-y-3" data-testid="impact-loading">
                <div className="h-4 w-2/3 bg-gray-100 rounded animate-pulse" />
                <div className="h-16 bg-gray-100 rounded animate-pulse" />
                <div className="h-10 bg-gray-100 rounded animate-pulse" />
              </div>
            ) : impactResult ? (
              <div className="space-y-4" data-testid="impact-result">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-emerald-100 text-emerald-800">{impactResult.regulation}</Badge>
                  {impactDoc?.title && <span className="text-xs text-gray-500 truncate">{impactDoc.title}</span>}
                  {impactResult.aiPowered && (
                    <span className="inline-flex items-center gap-1 text-xs text-purple-600">
                      <Sparkles className="h-3.5 w-3.5" /> AI analysis
                    </span>
                  )}
                  {impactResult.propagated && (
                    <span className="text-xs text-emerald-600">• broadcast to enterprise agents →</span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: 'Affected policies', value: impactResult.impact.affectedPolicies.length },
                    { label: 'Protected controls', value: impactResult.impact.protectedPolicies },
                    { label: 'Prior decisions', value: impactResult.impact.priorDecisions.length },
                    { label: 'Signed records', value: impactResult.impact.signedRecordsForReview },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg border bg-slate-50 p-2 text-center">
                      <div className="text-lg font-bold text-gray-900">{s.value}</div>
                      <div className="text-[11px] text-gray-500">{s.label}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
                  <p className="text-sm text-gray-700">{impactResult.summary}</p>
                </div>

                {impactResult.recommendedActions?.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1.5">Recommended actions</p>
                    <ul className="space-y-1">
                      {impactResult.recommendedActions.map((a: string, i: number) => (
                        <li key={i} className="flex items-start text-sm text-gray-600">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500 mt-0.5 mr-2 shrink-0" />
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {impactResult.impact.affectedPolicies.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1.5">Governed actions affected</p>
                    <div className="flex flex-wrap gap-1.5">
                      {impactResult.impact.affectedPolicies.map((p: any) => (
                        <span
                          key={p.id}
                          className={`text-xs px-2 py-0.5 rounded-full border ${p.is_protected ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                        >
                          {p.label}{p.is_protected ? ' · protected' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {impactResult.impact.priorDecisions.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1.5">Prior rulings under this regulation</p>
                    <RecallList items={impactResult.impact.priorDecisions} />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-gray-400">
                <Scale className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                Select a 14 CFR Part below and click “Analyze Compliance Impact.”
              </div>
            )}
          </CardContent>
        </Card>

        <AgentFeed pollMs={5000} limit={6} />
      </div>

      {/* Last Check Info */}
      {stats?.last_check_at && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Activity className="h-3.5 w-3.5" />
          Last checked: {format(parseISO(stats.last_check_at), 'MMM d, yyyy HH:mm')} · Next check in ~6 hours · {Number(stats.unknown_count)} documents pending initial check
        </div>
      )}

      <Tabs defaultValue="repository">
        <TabsList>
          <TabsTrigger value="repository">Document Repository</TabsTrigger>
          <TabsTrigger value="updates">
            Change History
            {updatedCount > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">{updatedCount}</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="repository" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search documents..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-44">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="cfr_part">14 CFR Parts</SelectItem>
                <SelectItem value="faa_order">FAA Orders</SelectItem>
                <SelectItem value="safo">SAFOs</SelectItem>
                <SelectItem value="info">InFOs</SelectItem>
                <SelectItem value="advisory_circular">Advisory Circulars</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="current">Current</SelectItem>
                <SelectItem value="updated">Updated</SelectItem>
                <SelectItem value="unknown">Pending Check</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : isError ? (
            <Card className="border-red-200">
              <CardContent className="py-12 text-center">
                <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
                <p className="font-medium text-gray-700">Unable to load repository</p>
                <p className="text-sm text-gray-400 mt-1">Could not connect to the document repository. Please try again.</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Retry
                </Button>
              </CardContent>
            </Card>
          ) : docs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Database className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No documents found</p>
                <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filter criteria</p>
              </CardContent>
            </Card>
          ) : typeFilter === 'all' ? (
            // Grouped by category when no type filter
            <div className="space-y-6">
              {typeOrder.filter(t => groupedDocs[t]?.length > 0).map(type => {
                const cfg = TYPE_CONFIG[type];
                const Icon = cfg?.icon || FileText;
                return (
                  <div key={type}>
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="h-5 w-5 text-slate-500" />
                      <h2 className="text-sm font-semibold text-gray-700">{cfg?.label || type}</h2>
                      <span className="text-xs text-gray-400">({groupedDocs[type].length})</span>
                      {groupedDocs[type].some((d: any) => d.status === 'updated') && (
                        <span className="text-xs text-amber-600 font-medium">• Changes detected</span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {groupedDocs[type].map((doc: any) => (
                        <DocumentCard
                          key={doc.source_id}
                          doc={doc}
                          onAnalyze={handleAnalyzeImpact}
                          analyzing={impactMutation.isPending && impactDoc?.source_id === doc.source_id}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map((doc: any) => (
                <DocumentCard
                  key={doc.source_id}
                  doc={doc}
                  onAnalyze={handleAnalyzeImpact}
                  analyzing={impactMutation.isPending && impactDoc?.source_id === doc.source_id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="updates" className="space-y-4 mt-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-700">Documents with Detected Changes</h2>
          </div>

          {updates.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-3" />
                <p className="font-medium text-gray-700">No changes detected yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  The monitor checks all documents every 6 hours. Click "Check for Updates" to run an immediate check.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => refreshMutation.mutate()}
                  disabled={refreshMutation.isPending}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                  Run Check Now
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {updates.map((doc: any, i: number) => (
                <Card key={i} className="border-l-4 border-l-amber-400">
                  <CardContent className="py-3 px-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <TypeBadge type={doc.source_type} />
                          <span className="font-mono text-xs text-gray-500">{doc.source_id}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                        {doc.change_summary && (
                          <p className="text-xs text-amber-700 mt-1">{doc.change_summary}</p>
                        )}
                        {doc.amendment_date && (
                          <p className="text-xs text-gray-400 mt-1">Amendment date: {doc.amendment_date}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <StatusBadge status={doc.status} />
                        {doc.last_changed_at && (
                          <p className="text-xs text-gray-400 mt-1">{format(parseISO(doc.last_changed_at), 'MMM d, yyyy')}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Activity className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">How monitoring works</p>
                <ul className="mt-1 space-y-1 text-xs text-blue-700 list-disc list-inside">
                  <li>CFR Parts are monitored via the eCFR API — detects exact amendment dates from the federal register</li>
                  <li>FAA Orders, SAFOs, InFOs, and Advisory Circulars are checked via HTTP headers (Last-Modified, ETag)</li>
                  <li>Content hashes are stored and compared on every check to detect even minor revisions</li>
                  <li>Automated checks run every 6 hours · Manual checks available via the button above</li>
                </ul>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
