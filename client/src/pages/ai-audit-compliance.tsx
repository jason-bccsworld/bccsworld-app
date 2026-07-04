import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle, Clock, FileText, Brain, AlertTriangle, Gavel, Sparkles, History } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { FeatureGate } from '@/components/feature-gate';
import { DecisionCard, RecallList, type GateDecision, type RecallDecision } from '@/components/governance-widgets';

interface ComplianceAnalysis {
  checklistItemId: string;
  requirement: string;
  preliminaryResponse: string;
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL' | 'INSUFFICIENT_DATA';
  confidenceScore: number;
  supportingDocuments: string[];
  recommendations: string[];
  requiredActions: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedTimeToCompliance: string;
  additionalDocumentsNeeded: string[];
}

interface ComplianceReport {
  documentCount: number;
  checklistItems: number;
  analyses: ComplianceAnalysis[];
  complianceReport: string;
  summary: {
    compliant: number;
    nonCompliant: number;
    partial: number;
    insufficientData: number;
    criticalIssues: number;
    highRiskIssues: number;
  };
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'COMPLIANT': return 'bg-green-100 text-green-800';
    case 'NON_COMPLIANT': return 'bg-red-100 text-red-800';
    case 'PARTIAL': return 'bg-yellow-100 text-yellow-800';
    case 'INSUFFICIENT_DATA': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getRiskColor = (risk: string) => {
  switch (risk) {
    case 'CRITICAL': return 'bg-red-100 text-red-800';
    case 'HIGH': return 'bg-orange-100 text-orange-800';
    case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
    case 'LOW': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'COMPLIANT': return <CheckCircle className="w-4 h-4 text-green-600" />;
    case 'NON_COMPLIANT': return <AlertCircle className="w-4 h-4 text-red-600" />;
    case 'PARTIAL': return <Clock className="w-4 h-4 text-yellow-600" />;
    case 'INSUFFICIENT_DATA': return <FileText className="w-4 h-4 text-gray-600" />;
    default: return <FileText className="w-4 h-4 text-gray-600" />;
  }
};

export default function AIAuditCompliance() {
  const [selectedAnalysis, setSelectedAnalysis] = useState<ComplianceAnalysis | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch document summary
  const { data: documentSummary } = useQuery({
    queryKey: ['audit-document-summary'],
    queryFn: async () => {
      const response = await fetch('/api/audit/document-summary', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch document summary');
      return response.json();
    },
  });

  // Analyze compliance mutation
  const analyzeComplianceMutation = useMutation({
    mutationFn: async (): Promise<ComplianceReport> => {
      const response = await fetch('/api/audit/analyze-compliance', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to analyze compliance');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Compliance Analysis Complete",
        description: `Analyzed ${data.checklistItems} requirements across ${data.documentCount} documents`,
      });
      queryClient.invalidateQueries({ queryKey: ['compliance-analysis'] });
    },
    onError: (error) => {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Store analysis results
  const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null);

  // ── Governance Q&A (runtime admissibility check) ──────────────────────────
  const [question, setQuestion] = useState('');
  const [askAuthority, setAskAuthority] = useState('instructor');
  const [askResult, setAskResult] = useState<{
    matchedActionType: string | null;
    matchedVia: 'keyword' | 'ai' | 'none';
    decision: GateDecision;
    recall: RecallDecision[];
  } | null>(null);

  const askMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/governance/ask', {
        question,
        asAuthority: askAuthority,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setAskResult(data);
      queryClient.invalidateQueries({ queryKey: ['/api/governance/agent-events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/governance/apex-summary'] });
    },
    onError: (error: any) => {
      toast({ title: 'Could not evaluate', description: error.message, variant: 'destructive' });
    },
  });

  // ── Enterprise Memory recall (backward-looking precedent search) ──────────
  const [memoryQuery, setMemoryQuery] = useState('');
  const [memoryResult, setMemoryResult] = useState<{
    summary: string;
    aiPowered: boolean;
    decisions: RecallDecision[];
  } | null>(null);

  const memoryMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/governance/memory-recall', { query: memoryQuery });
      return res.json();
    },
    onSuccess: (data) => setMemoryResult(data),
    onError: (error: any) => {
      toast({ title: 'Could not recall memory', description: error.message, variant: 'destructive' });
    },
  });

  const EXAMPLE_MEMORY_QUERIES = [
    'What have we decided about waiving training hours?',
    'How do we handle requests to modify evidence?',
    'Have we ever refused to issue a certificate?',
    'What is our precedent on exporting compliance data?',
  ];

  const handleRecall = () => {
    if (!memoryQuery.trim()) return;
    memoryMutation.mutate();
  };

  const EXAMPLE_QUESTIONS = [
    'Can an instructor waive required training hours?',
    'Is it OK to delete an audit-trail record?',
    'Can I export our compliance data for an auditor?',
    'May I modify a signed evidence record?',
  ];

  const handleAsk = () => {
    if (!question.trim()) return;
    askMutation.mutate();
  };

  const handleAnalyzeCompliance = async () => {
    try {
      const result = await analyzeComplianceMutation.mutateAsync();
      setComplianceReport(result);
    } catch (error) {
      console.error('Analysis failed:', error);
    }
  };

  const getCompliancePercentage = () => {
    if (!complianceReport) return 0;
    const total = complianceReport.summary.compliant + complianceReport.summary.partial;
    return Math.round((total / complianceReport.checklistItems) * 100);
  };

  return (
    <FeatureGate feature="aiDocumentProcessing" featureLabel="AI Audit Compliance Assistant">
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Audit Compliance Assistant</h1>
          <p className="text-gray-600 mt-2">
            Automated analysis of your documents against FAA Part 142 requirements
          </p>
        </div>
        <Button 
          onClick={handleAnalyzeCompliance}
          disabled={analyzeComplianceMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {analyzeComplianceMutation.isPending ? (
            <>
              <Brain className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Brain className="w-4 h-4 mr-2" />
              Analyze Compliance
            </>
          )}
        </Button>
      </div>

      {/* Governance Q&A — runtime admissibility check */}
      <Card className="border-emerald-100">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Gavel className="w-5 h-5 mr-2 text-emerald-600" />
            Ask Before You Act
          </CardTitle>
          <p className="text-sm text-gray-500">
            Ask a compliance question in plain English. The governance engine proves whether the
            action is <span className="font-medium">admissible</span> — before anyone does it.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setQuestion(q)}
                className="text-xs px-2.5 py-1 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
                data-testid="button-example-question"
              >
                {q}
              </button>
            ))}
          </div>
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Can an instructor waive required training hours for a student?"
            rows={2}
            data-testid="input-governance-question"
          />
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Acting as</span>
              <Select value={askAuthority} onValueChange={setAskAuthority}>
                <SelectTrigger className="w-44" data-testid="select-ask-authority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="instructor">Instructor</SelectItem>
                  <SelectItem value="auditor">Auditor</SelectItem>
                  <SelectItem value="support_admin">Support Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleAsk}
              disabled={askMutation.isPending || !question.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              data-testid="button-ask-governance"
            >
              {askMutation.isPending ? (
                <>
                  <Brain className="w-4 h-4 mr-2 animate-spin" /> Checking…
                </>
              ) : (
                <>
                  <Gavel className="w-4 h-4 mr-2" /> Check Admissibility
                </>
              )}
            </Button>
          </div>

          {askResult && (
            <div className="space-y-4 pt-2">
              <DecisionCard decision={askResult.decision} />
              <div className="flex items-center gap-2 text-xs text-slate-400">
                {askResult.matchedVia === 'ai' && (
                  <span className="flex items-center gap-1 text-purple-500">
                    <Sparkles className="h-3.5 w-3.5" /> matched by AI
                  </span>
                )}
                {askResult.matchedVia === 'keyword' && <span>matched by policy keyword</span>}
                {askResult.matchedVia === 'none' && (
                  <span className="text-amber-500">no known policy — safely escalated</span>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">
                  Enterprise Memory — prior rulings on this action
                </p>
                <RecallList items={askResult.recall} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enterprise Memory — backward-looking precedent recall */}
      <Card className="border-indigo-100">
        <CardHeader>
          <CardTitle className="flex items-center">
            <History className="w-5 h-5 mr-2 text-indigo-600" />
            Enterprise Memory
          </CardTitle>
          <p className="text-sm text-gray-500">
            Ask what the organization has decided before. The engine searches every prior governance
            ruling and shows the <span className="font-medium">precedent</span> — so decisions stay consistent.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_MEMORY_QUERIES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setMemoryQuery(q)}
                className="text-xs px-2.5 py-1 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
                data-testid="button-example-memory"
              >
                {q}
              </button>
            ))}
          </div>
          <Textarea
            value={memoryQuery}
            onChange={(e) => setMemoryQuery(e.target.value)}
            placeholder="e.g. What have we decided about waiving required training hours?"
            rows={2}
            data-testid="input-memory-query"
          />
          <Button
            onClick={handleRecall}
            disabled={memoryMutation.isPending || !memoryQuery.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            data-testid="button-recall-memory"
          >
            {memoryMutation.isPending ? (
              <>
                <Brain className="w-4 h-4 mr-2 animate-spin" /> Searching…
              </>
            ) : (
              <>
                <History className="w-4 h-4 mr-2" /> Recall Precedent
              </>
            )}
          </Button>

          {memoryResult && (
            <div className="space-y-4 pt-2" data-testid="memory-result">
              <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-indigo-800">What we've decided before</p>
                  {memoryResult.aiPowered && (
                    <span className="inline-flex items-center gap-1 text-xs text-purple-600">
                      <Sparkles className="h-3.5 w-3.5" /> AI synthesis
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700">{memoryResult.summary}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">Cited prior rulings</p>
                <RecallList items={memoryResult.decisions} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Document Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documentSummary && documentSummary.documentCount > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{documentSummary.documentCount ?? 0}</div>
                <div className="text-sm text-gray-600">Total Documents</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {new Set((documentSummary.documents ?? []).map((d: any) => d.documentType)).size}
                </div>
                <div className="text-sm text-gray-600">Document Types</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {(documentSummary.documents ?? []).reduce((sum: number, doc: any) => sum + (doc.extractedFields ?? 0), 0)}
                </div>
                <div className="text-sm text-gray-600">Extracted Fields</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No documents analyzed yet. Upload documents to begin compliance analysis.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compliance Analysis Results */}
      {complianceReport && (
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Overall Compliance</p>
                    <p className="text-2xl font-bold">{getCompliancePercentage()}%</p>
                  </div>
                  <Progress value={getCompliancePercentage()} className="w-16" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Critical Issues</p>
                    <p className="text-2xl font-bold text-red-600">{complianceReport.summary.criticalIssues}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">High Risk</p>
                    <p className="text-2xl font-bold text-orange-600">{complianceReport.summary.highRiskIssues}</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Compliant</p>
                    <p className="text-2xl font-bold text-green-600">{complianceReport.summary.compliant}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analysis */}
          <Tabs defaultValue="requirements" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="requirements">Requirements Analysis</TabsTrigger>
              <TabsTrigger value="report">Compliance Report</TabsTrigger>
            </TabsList>
            
            <TabsContent value="requirements">
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Requirements Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Requirements List */}
                    <div>
                      <h3 className="font-semibold mb-4">Requirements ({complianceReport.analyses.length})</h3>
                      <ScrollArea className="h-96">
                        <div className="space-y-2">
                          {complianceReport.analyses.map((analysis, index) => (
                            <div
                              key={analysis.checklistItemId}
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                selectedAnalysis?.checklistItemId === analysis.checklistItemId
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => setSelectedAnalysis(analysis)}
                            >
                              <div className="flex items-start space-x-3">
                                <StatusIcon status={analysis.complianceStatus} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {analysis.requirement}
                                  </p>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <Badge className={`text-xs ${getStatusColor(analysis.complianceStatus)}`}>
                                      {analysis.complianceStatus.replace('_', ' ')}
                                    </Badge>
                                    <Badge className={`text-xs ${getRiskColor(analysis.riskLevel)}`}>
                                      {analysis.riskLevel}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>

                    {/* Detailed Analysis */}
                    <div>
                      <h3 className="font-semibold mb-4">Analysis Details</h3>
                      {selectedAnalysis ? (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">{selectedAnalysis.requirement}</CardTitle>
                            <div className="flex space-x-2">
                              <Badge className={getStatusColor(selectedAnalysis.complianceStatus)}>
                                {selectedAnalysis.complianceStatus.replace('_', ' ')}
                              </Badge>
                              <Badge className={getRiskColor(selectedAnalysis.riskLevel)}>
                                {selectedAnalysis.riskLevel} Risk
                              </Badge>
                              <Badge variant="outline">
                                {selectedAnalysis.confidenceScore}% Confidence
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <h4 className="font-medium text-sm text-gray-700 mb-2">AI Analysis</h4>
                              <p className="text-sm text-gray-600">{selectedAnalysis.preliminaryResponse}</p>
                            </div>
                            
                            {selectedAnalysis.recommendations.length > 0 && (
                              <div>
                                <h4 className="font-medium text-sm text-gray-700 mb-2">Recommendations</h4>
                                <ul className="text-sm text-gray-600 space-y-1">
                                  {selectedAnalysis.recommendations.map((rec, index) => (
                                    <li key={index} className="flex items-start">
                                      <span className="mr-2">•</span>
                                      {rec}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {selectedAnalysis.requiredActions.length > 0 && (
                              <div>
                                <h4 className="font-medium text-sm text-gray-700 mb-2">Required Actions</h4>
                                <ul className="text-sm text-gray-600 space-y-1">
                                  {selectedAnalysis.requiredActions.map((action, index) => (
                                    <li key={index} className="flex items-start">
                                      <span className="mr-2">•</span>
                                      {action}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {selectedAnalysis.additionalDocumentsNeeded.length > 0 && (
                              <div>
                                <h4 className="font-medium text-sm text-gray-700 mb-2">Additional Documents Needed</h4>
                                <ul className="text-sm text-gray-600 space-y-1">
                                  {selectedAnalysis.additionalDocumentsNeeded.map((doc, index) => (
                                    <li key={index} className="flex items-start">
                                      <span className="mr-2">•</span>
                                      {doc}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            <div className="pt-2 border-t">
                              <p className="text-sm text-gray-600">
                                <strong>Time to Compliance:</strong> {selectedAnalysis.estimatedTimeToCompliance}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="text-center py-12">
                          <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600">Select a requirement to view detailed analysis</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="report">
              <Card>
                <CardHeader>
                  <CardTitle>Compliance Report</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <div className="whitespace-pre-wrap text-sm">
                      {complianceReport.complianceReport}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
    </FeatureGate>
  );
}