import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, Clock, FileText, Brain, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

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

      {/* Document Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Document Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documentSummary ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{documentSummary.totalDocuments}</div>
                <div className="text-sm text-gray-600">Total Documents</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{documentSummary.documentTypes.length}</div>
                <div className="text-sm text-gray-600">Document Types</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {documentSummary.documents.reduce((sum: number, doc: any) => sum + doc.extractedFields, 0)}
                </div>
                <div className="text-sm text-gray-600">Extracted Fields</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No documents analyzed yet</p>
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
  );
}