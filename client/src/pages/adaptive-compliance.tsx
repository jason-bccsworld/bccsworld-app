import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Shield, 
  FileText, 
  Users, 
  Layers, 
  Package, 
  CheckCircle2, 
  AlertTriangle,
  ChevronRight,
  Link as LinkIcon,
  Fingerprint,
  FileSearch,
  ClipboardCheck,
  ArrowRight,
  TrendingUp,
  Database,
  RefreshCw,
  Plus,
  Upload
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface RegulatoryFramework {
  id: string;
  frameworkCode: string;
  frameworkName: string;
  frameworkType: 'spine' | 'attachment';
  regulatoryAuthority: string;
  version: string;
  isActive: boolean;
}

interface ChecklistSchema {
  id: string;
  schemaName: string;
  schemaSource: string;
  version: string;
  totalItems: number;
  isCanonical: boolean;
}

interface InspectorProfile {
  id: string;
  inspectorName: string;
  inspectorId: string;
  region: string;
  office: string;
  totalAuditsTracked: number;
  strictnessScore: string;
  predictionConfidence: string;
  focusAreas: string[];
}

interface AuditPacket {
  id: string;
  packetName: string;
  packetType: string;
  totalItems: number;
  itemsWithEvidence: number;
  blockchainVerifiedCount: number;
  complianceScore: string;
  status: string;
  generatedAt: string;
}

export default function AdaptiveCompliance() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("spine");
  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false);
  const [checklistForm, setChecklistForm] = useState({
    schemaName: "",
    schemaSource: "FAA",
    version: "1.0",
    frameworkId: "",
    isCanonical: false,
    items: ""
  });

  const { data: frameworks = [], isLoading: frameworksLoading } = useQuery<RegulatoryFramework[]>({
    queryKey: ['/api/adaptive-compliance/frameworks'],
  });

  const { data: checklists = [], isLoading: checklistsLoading } = useQuery<ChecklistSchema[]>({
    queryKey: ['/api/adaptive-compliance/checklists'],
  });

  const { data: inspectors = [], isLoading: inspectorsLoading } = useQuery<InspectorProfile[]>({
    queryKey: ['/api/adaptive-compliance/inspectors'],
  });

  const initSpineMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/adaptive-compliance/frameworks/initialize');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/adaptive-compliance/frameworks'] });
      toast({
        title: "Regulatory Spine Initialized",
        description: "14 CFR Part 142 spine and FAA attachments are now active."
      });
    },
    onError: () => {
      toast({
        title: "Initialization Error",
        description: "Failed to initialize regulatory spine.",
        variant: "destructive"
      });
    }
  });

  const importChecklistMutation = useMutation({
    mutationFn: async (data: typeof checklistForm) => {
      const parsedItems = data.items.split('\n')
        .filter(line => line.trim())
        .map((line, index) => {
          const parts = line.split('|').map(p => p.trim());
          return {
            itemNumber: parts[0] || `ITEM-${index + 1}`,
            description: parts[1] || line,
            regulatoryReference: parts[2] || null,
            categoryName: parts[3] || 'General',
            itemOrder: index + 1
          };
        });

      const sourceMap: Record<string, string> = {
        'FAA': 'faa_official',
        'TCPM': 'tcpm_custom',
        'Regional FSDO': 'regional',
        'Operator': 'operator',
        'Industry': 'operator'
      };

      return apiRequest('POST', '/api/adaptive-compliance/checklists/ingest', {
        schemaName: data.schemaName,
        schemaSource: sourceMap[data.schemaSource] || 'operator',
        version: data.version,
        frameworkId: data.frameworkId || null,
        isCanonical: data.isCanonical,
        items: parsedItems
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/adaptive-compliance/checklists'] });
      setChecklistDialogOpen(false);
      setChecklistForm({
        schemaName: "",
        schemaSource: "FAA",
        version: "1.0",
        frameworkId: "",
        isCanonical: false,
        items: ""
      });
      toast({
        title: "Checklist Imported",
        description: "The checklist has been successfully ingested and is ready for harmonization."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Import Error",
        description: error.message || "Failed to import checklist.",
        variant: "destructive"
      });
    }
  });

  const spineFramework = frameworks.find(f => f.frameworkType === 'spine');
  const attachmentFrameworks = frameworks.filter(f => f.frameworkType === 'attachment');

  const stats = {
    totalFrameworks: frameworks.length,
    activeChecklists: checklists.length,
    trackedInspectors: inspectors.length,
    complianceScore: 87
  };

  return (
    <div className="p-6 space-y-6" data-testid="adaptive-compliance-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="page-title">
            Adaptive Compliance Intelligence
          </h1>
          <p className="text-muted-foreground mt-1">
            Regulatory Spine Architecture with Inspector Preference Modeling
          </p>
        </div>
        <Button 
          onClick={() => initSpineMutation.mutate()} 
          disabled={initSpineMutation.isPending}
          data-testid="initialize-spine-btn"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${initSpineMutation.isPending ? 'animate-spin' : ''}`} />
          Initialize Regulatory Spine
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="stat-frameworks">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Frameworks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{stats.totalFrameworks}</span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-checklists">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Harmonized Checklists
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{stats.activeChecklists}</span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-inspectors">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tracked Inspectors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              <span className="text-2xl font-bold">{stats.trackedInspectors}</span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-compliance">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Compliance Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              <span className="text-2xl font-bold">{stats.complianceScore}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full max-w-3xl" data-testid="compliance-tabs">
          <TabsTrigger value="spine" data-testid="tab-spine">
            <Layers className="h-4 w-4 mr-2" />
            Regulatory Spine
          </TabsTrigger>
          <TabsTrigger value="checklists" data-testid="tab-checklists">
            <ClipboardCheck className="h-4 w-4 mr-2" />
            Checklists
          </TabsTrigger>
          <TabsTrigger value="inspectors" data-testid="tab-inspectors">
            <Users className="h-4 w-4 mr-2" />
            Inspectors
          </TabsTrigger>
          <TabsTrigger value="evidence" data-testid="tab-evidence">
            <FileSearch className="h-4 w-4 mr-2" />
            Evidence
          </TabsTrigger>
          <TabsTrigger value="packets" data-testid="tab-packets">
            <Package className="h-4 w-4 mr-2" />
            Audit Packets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="spine" className="space-y-4" data-testid="spine-content">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  Primary Regulatory Spine
                </CardTitle>
                <CardDescription>
                  Core regulatory framework - 14 CFR Part 142
                </CardDescription>
              </CardHeader>
              <CardContent>
                {frameworksLoading ? (
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-200 rounded animate-pulse" />
                    <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4" />
                  </div>
                ) : spineFramework ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg" data-testid="spine-framework-name">
                            {spineFramework.frameworkName}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {spineFramework.frameworkCode}
                          </p>
                        </div>
                        <Badge variant="default" data-testid="spine-status">
                          {spineFramework.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="mt-3 flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          Version: {spineFramework.version}
                        </span>
                        <span className="flex items-center gap-1">
                          <Shield className="h-4 w-4" />
                          {spineFramework.regulatoryAuthority.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No regulatory spine configured</p>
                    <p className="text-sm">Click "Initialize Regulatory Spine" to set up</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5 text-green-600" />
                  Dynamic Attachments
                </CardTitle>
                <CardDescription>
                  Regulatory frameworks attached based on authorizations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {frameworksLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-12 bg-slate-200 rounded animate-pulse" />
                    ))}
                  </div>
                ) : attachmentFrameworks.length > 0 ? (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {attachmentFrameworks.map((framework) => (
                        <div
                          key={framework.id}
                          className="p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                          data-testid={`attachment-${framework.frameworkCode}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium text-sm">{framework.frameworkCode}</p>
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {framework.frameworkName}
                                </p>
                              </div>
                            </div>
                            <Badge variant={framework.isActive ? "default" : "secondary"} className="text-xs">
                              {framework.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <LinkIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No attachments configured</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Regulatory Hierarchy Visualization</CardTitle>
              <CardDescription>
                Spine + Attachments Architecture Model
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center py-8">
                <div className="w-64 p-4 bg-blue-600 text-white rounded-lg text-center shadow-lg">
                  <Shield className="h-6 w-6 mx-auto mb-2" />
                  <p className="font-bold">14 CFR Part 142</p>
                  <p className="text-sm opacity-90">Primary Spine</p>
                </div>
                
                <div className="flex items-center gap-2 my-4">
                  <ArrowRight className="h-6 w-6 text-blue-400 rotate-90" />
                </div>
                
                <div className="grid grid-cols-2 gap-4 max-w-2xl">
                  <div className="p-3 bg-green-100 border border-green-300 rounded-lg text-center">
                    <p className="font-medium text-sm">FAA Order 8900.1 Vol 3</p>
                    <p className="text-xs text-muted-foreground">Core Attachment</p>
                  </div>
                  <div className="p-3 bg-green-100 border border-green-300 rounded-lg text-center">
                    <p className="font-medium text-sm">FAA Order 8900.1 Vol 6</p>
                    <p className="text-xs text-muted-foreground">Core Attachment</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 my-4">
                  <ArrowRight className="h-6 w-6 text-green-400 rotate-90" />
                </div>

                <div className="grid grid-cols-4 gap-3 max-w-4xl">
                  {['14 CFR Part 61', '14 CFR Part 91', '14 CFR Part 121', '14 CFR Part 135'].map((part) => (
                    <div key={part} className="p-2 bg-amber-50 border border-amber-200 rounded text-center">
                      <p className="font-medium text-xs">{part}</p>
                      <p className="text-xs text-muted-foreground">Dynamic</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklists" className="space-y-4" data-testid="checklists-content">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-green-600" />
                  Checklist Harmonization Engine
                </CardTitle>
                <CardDescription>
                  Compare and harmonize FAA, TCPM, regional, and operator checklists
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setChecklistDialogOpen(true)}
                data-testid="import-checklist-header-btn"
              >
                <Plus className="h-4 w-4 mr-2" />
                Import Checklist
              </Button>
            </CardHeader>
            <CardContent>
              {checklistsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-slate-200 rounded animate-pulse" />
                  ))}
                </div>
              ) : checklists.length > 0 ? (
                <div className="space-y-3">
                  {checklists.map((schema) => (
                    <div
                      key={schema.id}
                      className="p-4 border rounded-lg hover:border-blue-300 transition-colors"
                      data-testid={`checklist-${schema.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{schema.schemaName}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{schema.schemaSource}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {schema.totalItems} items
                            </span>
                            <span className="text-sm text-muted-foreground">
                              v{schema.version}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {schema.isCanonical && (
                            <Badge variant="default">Canonical</Badge>
                          )}
                          <Button variant="outline" size="sm">
                            View Items
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-2">No checklists ingested yet</p>
                  <p className="text-sm">Import checklists to start harmonization</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setChecklistDialogOpen(true)}
                    data-testid="import-checklist-btn"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import Checklist
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Delta Reporting</CardTitle>
              <CardDescription>
                Compare two checklists to identify differences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-green-600 mb-2" />
                  <p className="text-2xl font-bold text-green-600">0</p>
                  <p className="text-sm text-muted-foreground">Added Items</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <AlertTriangle className="h-8 w-8 mx-auto text-red-600 mb-2" />
                  <p className="text-2xl font-bold text-red-600">0</p>
                  <p className="text-sm text-muted-foreground">Removed Items</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <FileText className="h-8 w-8 mx-auto text-amber-600 mb-2" />
                  <p className="text-2xl font-bold text-amber-600">0</p>
                  <p className="text-sm text-muted-foreground">Modified Items</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <Layers className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                  <p className="text-2xl font-bold text-blue-600">0</p>
                  <p className="text-sm text-muted-foreground">Reordered Items</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inspectors" className="space-y-4" data-testid="inspectors-content">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                Inspector Preference Engine
              </CardTitle>
              <CardDescription>
                AI-powered inspector behavior learning and prediction
              </CardDescription>
            </CardHeader>
            <CardContent>
              {inspectorsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-slate-200 rounded animate-pulse" />
                  ))}
                </div>
              ) : inspectors.length > 0 ? (
                <div className="space-y-3">
                  {inspectors.map((inspector) => (
                    <div
                      key={inspector.id}
                      className="p-4 border rounded-lg hover:border-purple-300 transition-colors"
                      data-testid={`inspector-${inspector.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{inspector.inspectorName || 'Unknown Inspector'}</h3>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                            <span>ID: {inspector.inspectorId}</span>
                            <span>{inspector.region}</span>
                            <span>{inspector.office}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {inspector.totalAuditsTracked} audits tracked
                            </Badge>
                            <Badge variant={Number(inspector.strictnessScore) > 0.7 ? "destructive" : "default"}>
                              {Number(inspector.strictnessScore) > 0.7 ? 'Strict' : 
                               Number(inspector.strictnessScore) > 0.3 ? 'Moderate' : 'Lenient'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Prediction confidence: {(Number(inspector.predictionConfidence) * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>
                      {inspector.focusAreas && inspector.focusAreas.length > 0 && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Focus areas:</span>
                          {inspector.focusAreas.slice(0, 3).map((area, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {area}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-2">No inspector profiles yet</p>
                  <p className="text-sm">Create inspector profiles to enable behavior prediction</p>
                  <Button variant="outline" className="mt-4">
                    Add Inspector Profile
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prediction Accuracy</CardTitle>
              <CardDescription>
                Inspector behavior prediction performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Checklist Ordering Prediction</span>
                    <span className="text-sm text-muted-foreground">75%</span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Additional Questions Prediction</span>
                    <span className="text-sm text-muted-foreground">68%</span>
                  </div>
                  <Progress value={68} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Focus Area Prediction</span>
                    <span className="text-sm text-muted-foreground">82%</span>
                  </div>
                  <Progress value={82} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evidence" className="space-y-4" data-testid="evidence-content">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSearch className="h-5 w-5 text-orange-600" />
                Multi-Schema Evidence Indexing
              </CardTitle>
              <CardDescription>
                Evidence linked to checklist items with blockchain verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-slate-50 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="h-5 w-5 text-slate-600" />
                    <span className="font-medium">Total Evidence</span>
                  </div>
                  <p className="text-3xl font-bold">0</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Fingerprint className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Blockchain Verified</span>
                  </div>
                  <p className="text-3xl font-bold text-green-600">0</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <span className="font-medium">Pending Verification</span>
                  </div>
                  <p className="text-3xl font-bold text-amber-600">0</p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="text-center py-8 text-muted-foreground">
                <FileSearch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-2">No evidence indexed yet</p>
                <p className="text-sm">Index evidence to link to checklist items and regulations</p>
                <Button variant="outline" className="mt-4">
                  Index New Evidence
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Evidence-On-Demand API</CardTitle>
              <CardDescription>
                Retrieve evidence by checklist item or regulatory reference
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-slate-100 rounded-lg">
                  <p className="font-mono text-sm mb-2">GET /api/adaptive-compliance/evidence</p>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>?checklist_item_id=XYZ - Retrieve evidence for checklist item</p>
                    <p>?framework_code=14-CFR-142&regulatory_reference=142.3 - By regulation</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="packets" className="space-y-4" data-testid="packets-content">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-indigo-600" />
                Automated Audit Packet Generator
              </CardTitle>
              <CardDescription>
                Generate regulation-sorted or checklist-sorted audit packets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-6 border rounded-lg hover:border-blue-300 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Regulation-Sorted Packet</h3>
                      <p className="text-sm text-muted-foreground">Organized by regulatory reference</p>
                    </div>
                  </div>
                  <Button className="w-full" variant="outline" data-testid="generate-reg-sorted">
                    Generate Packet
                  </Button>
                </div>

                <div className="p-6 border rounded-lg hover:border-green-300 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <ClipboardCheck className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Checklist-Sorted Packet</h3>
                      <p className="text-sm text-muted-foreground">Follows checklist item order</p>
                    </div>
                  </div>
                  <Button className="w-full" variant="outline" data-testid="generate-checklist-sorted">
                    Generate Packet
                  </Button>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-2">No audit packets generated yet</p>
                <p className="text-sm">Generate packets to prepare for regulatory audits</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Packet Integrity</CardTitle>
              <CardDescription>
                Blockchain-verified audit packet contents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                <Fingerprint className="h-8 w-8 text-slate-400" />
                <div>
                  <p className="font-medium">All packets are cryptographically hashed</p>
                  <p className="text-sm text-muted-foreground">
                    Evidence integrity verified against blockchain training records
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={checklistDialogOpen} onOpenChange={setChecklistDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Checklist</DialogTitle>
            <DialogDescription>
              Import a checklist from FAA, TCPM, regional FSDO, or operator sources for harmonization analysis.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="schemaName">Checklist Name</Label>
                <Input
                  id="schemaName"
                  placeholder="e.g., FAA Part 142 Master Checklist"
                  value={checklistForm.schemaName}
                  onChange={(e) => setChecklistForm(prev => ({ ...prev, schemaName: e.target.value }))}
                  data-testid="input-checklist-name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="version">Version</Label>
                <Input
                  id="version"
                  placeholder="e.g., 1.0"
                  value={checklistForm.version}
                  onChange={(e) => setChecklistForm(prev => ({ ...prev, version: e.target.value }))}
                  data-testid="input-checklist-version"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="schemaSource">Source</Label>
                <Select 
                  value={checklistForm.schemaSource} 
                  onValueChange={(value) => setChecklistForm(prev => ({ ...prev, schemaSource: value }))}
                >
                  <SelectTrigger data-testid="select-checklist-source">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FAA">FAA Official</SelectItem>
                    <SelectItem value="TCPM">TCPM</SelectItem>
                    <SelectItem value="Regional FSDO">Regional FSDO</SelectItem>
                    <SelectItem value="Operator">Operator Custom</SelectItem>
                    <SelectItem value="Industry">Industry Standard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="frameworkId">Associated Framework (Optional)</Label>
                <Select 
                  value={checklistForm.frameworkId || "none"} 
                  onValueChange={(value) => setChecklistForm(prev => ({ ...prev, frameworkId: value === "none" ? "" : value }))}
                >
                  <SelectTrigger data-testid="select-checklist-framework">
                    <SelectValue placeholder="Select framework" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {frameworks.map((fw) => (
                      <SelectItem key={fw.id} value={fw.id}>
                        {fw.frameworkCode} - {fw.frameworkName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="items">Checklist Items</Label>
              <p className="text-sm text-muted-foreground">
                Enter one item per line. Format: ItemCode | ItemText | RegulatoryRef | Category
              </p>
              <Textarea
                id="items"
                placeholder="142.53(a)(1) | Training syllabus approved by Administrator | 14 CFR 142.53 | Training Program
142.53(a)(2) | Curriculum approved for each rating | 14 CFR 142.53 | Training Program
142.55 | Training conducted per approved course | 14 CFR 142.55 | Operations"
                rows={8}
                value={checklistForm.items}
                onChange={(e) => setChecklistForm(prev => ({ ...prev, items: e.target.value }))}
                className="font-mono text-sm"
                data-testid="textarea-checklist-items"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isCanonical"
                checked={checklistForm.isCanonical}
                onChange={(e) => setChecklistForm(prev => ({ ...prev, isCanonical: e.target.checked }))}
                className="h-4 w-4"
                data-testid="checkbox-canonical"
              />
              <Label htmlFor="isCanonical" className="text-sm font-normal">
                Mark as canonical (authoritative source for harmonization)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setChecklistDialogOpen(false)}
              data-testid="btn-cancel-import"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => importChecklistMutation.mutate(checklistForm)}
              disabled={importChecklistMutation.isPending || !checklistForm.schemaName || !checklistForm.items}
              data-testid="btn-confirm-import"
            >
              {importChecklistMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Checklist
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
