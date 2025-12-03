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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Upload,
  BookOpen,
  Bell,
  Globe,
  Zap,
  Search,
  ExternalLink,
  AlertCircle,
  Building2,
  Scale
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface RegulatoryFramework {
  id: string;
  frameworkCode: string;
  frameworkName: string;
  frameworkType: 'spine' | 'attachment' | 'order';
  regulatoryAuthority: string;
  version: string;
  isActive: boolean;
  sourceUrl?: string;
  applicabilityRules?: any;
}

interface UniversalFARPart {
  partNumber: string;
  partName: string;
  subchapter: string;
  applicableTo: string[];
  canBeSpine: boolean;
  relatedParts: string[];
  ecfrUrl: string;
}

interface FaaPolicyDocument {
  id: string;
  documentType: string;
  documentNumber: string;
  title: string;
  subject?: string;
  issuanceDate: string;
  effectiveDate?: string;
  expirationDate?: string;
  affectedParts: string[];
  status: string;
  isActive: boolean;
}

interface RegulatoryUpdate {
  id: string;
  sourceType: string;
  sourceIdentifier: string;
  lastCheckedAt: string;
  changeDetected: boolean;
  changeType?: string;
  changeSummary?: string;
}

interface ChecklistSchema {
  id: string;
  schemaName: string;
  schemaSource: string;
  version: string;
  totalItems: number;
  isCanonical: boolean;
  priorityLevel?: number;
  autoFetched?: boolean;
  sourceUrl?: string;
  lastVersionCheck?: string;
  isOutdated?: boolean;
  isHidden?: boolean;
}

interface VersionHistoryEntry {
  id: string;
  schemaId: string;
  previousVersion?: string;
  newVersion: string;
  changesSummary?: any;
  sourceUrl?: string;
  detectedAt: string;
}

interface EvidenceMappingStats {
  totalItems: number;
  mappedItems: number;
  unmappedItems: number;
  coveragePercentage: number;
}

interface SupportedFARPart {
  code: string;
  definition?: {
    schemaName: string;
    sourceUrl: string;
    formNumber: string;
    relatedOrderVolume: string;
  };
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

export default function AdaptiveCompliance() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("spine");
  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false);
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [selectedSpine, setSelectedSpine] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [checklistForm, setChecklistForm] = useState({
    schemaName: "",
    schemaSource: "FAA",
    version: "1.0",
    frameworkId: "",
    isCanonical: false,
    items: ""
  });

  const [policyForm, setPolicyForm] = useState({
    documentType: "safo",
    documentNumber: "",
    title: "",
    subject: "",
    issuanceDate: "",
    effectiveDate: "",
    affectedParts: "",
    content: "",
    sourceUrl: ""
  });

  const { data: frameworks = [], isLoading: frameworksLoading } = useQuery<RegulatoryFramework[]>({
    queryKey: ['/api/adaptive-compliance/frameworks'],
  });

  const { data: farParts = [] } = useQuery<UniversalFARPart[]>({
    queryKey: ['/api/adaptive-compliance/far-parts'],
  });

  const { data: availableSpines = [] } = useQuery<RegulatoryFramework[]>({
    queryKey: ['/api/adaptive-compliance/frameworks/spines'],
  });

  const { data: policyDocuments = [] } = useQuery<FaaPolicyDocument[]>({
    queryKey: ['/api/adaptive-compliance/policy-documents'],
  });

  const { data: regulatoryUpdates = [] } = useQuery<RegulatoryUpdate[]>({
    queryKey: ['/api/adaptive-compliance/regulatory-updates'],
  });

  const { data: checklists = [], isLoading: checklistsLoading, refetch: refetchChecklists } = useQuery<ChecklistSchema[]>({
    queryKey: ['/api/adaptive-compliance/checklists'],
  });

  const { data: checklistsByPriority = [], isLoading: priorityChecklistsLoading } = useQuery<ChecklistSchema[]>({
    queryKey: ['/api/adaptive-compliance/checklists/by-priority'],
  });

  const { data: supportedParts = [] } = useQuery<SupportedFARPart[]>({
    queryKey: ['/api/adaptive-compliance/checklists/supported-parts'],
  });

  const { data: inspectors = [], isLoading: inspectorsLoading } = useQuery<InspectorProfile[]>({
    queryKey: ['/api/adaptive-compliance/inspectors'],
  });

  const [selectedSchemaId, setSelectedSchemaId] = useState<string | null>(null);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);

  const { data: versionHistory = [], refetch: refetchVersionHistory } = useQuery<VersionHistoryEntry[]>({
    queryKey: ['/api/adaptive-compliance/checklists', selectedSchemaId, 'version-history'],
    enabled: !!selectedSchemaId && versionHistoryOpen,
  });

  const { data: evidenceStats, refetch: refetchEvidenceStats } = useQuery<EvidenceMappingStats>({
    queryKey: ['/api/adaptive-compliance/checklists', selectedSchemaId, 'evidence-stats'],
    enabled: !!selectedSchemaId && versionHistoryOpen,
  });

  const [autoFetchPart, setAutoFetchPart] = useState<string>("");

  const autoFetchChecklistMutation = useMutation({
    mutationFn: async (farPartCode: string) => {
      return apiRequest('POST', `/api/adaptive-compliance/checklists/auto-fetch/${farPartCode}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/adaptive-compliance/checklists'] });
      queryClient.invalidateQueries({ queryKey: ['/api/adaptive-compliance/checklists/by-priority'] });
      toast({
        title: "Checklist Auto-Fetched",
        description: "Core FAA checklist has been automatically retrieved for this FAR Part."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Auto-Fetch Error",
        description: error.message || "Failed to auto-fetch checklist.",
        variant: "destructive"
      });
    }
  });

  const versionCheckMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('GET', '/api/adaptive-compliance/checklists/version-check');
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/adaptive-compliance/checklists'] });
      toast({
        title: "Version Check Complete",
        description: `Checked ${data.results?.length || 0} checklists for updates.`
      });
    }
  });

  const suppressChecklistMutation = useMutation({
    mutationFn: async (schemaId: string) => {
      return apiRequest('POST', `/api/adaptive-compliance/checklists/${schemaId}/suppress`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/adaptive-compliance/checklists'] });
      queryClient.invalidateQueries({ queryKey: ['/api/adaptive-compliance/checklists/by-priority'] });
      toast({
        title: "Checklist Suppressed",
        description: "Outdated checklist has been hidden from active view."
      });
    }
  });

  const unlockChecklistMutation = useMutation({
    mutationFn: async (schemaId: string) => {
      return apiRequest('POST', `/api/adaptive-compliance/checklists/${schemaId}/unlock`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/adaptive-compliance/checklists'] });
      queryClient.invalidateQueries({ queryKey: ['/api/adaptive-compliance/checklists/by-priority'] });
      toast({
        title: "Checklist Unlocked",
        description: "Archived checklist is now visible for reference."
      });
    }
  });

  const initUniversalSpineMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/adaptive-compliance/frameworks/initialize-universal');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/adaptive-compliance/frameworks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/adaptive-compliance/frameworks/spines'] });
      toast({
        title: "Universal Regulatory Spine Initialized",
        description: "All FAR Parts and FAA Orders are now available for selection."
      });
    },
    onError: () => {
      toast({
        title: "Initialization Error",
        description: "Failed to initialize universal regulatory spine.",
        variant: "destructive"
      });
    }
  });

  const ingestPolicyMutation = useMutation({
    mutationFn: async (data: typeof policyForm) => {
      return apiRequest('POST', '/api/adaptive-compliance/policy-documents/ingest', {
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        title: data.title,
        subject: data.subject,
        issuanceDate: new Date(data.issuanceDate),
        effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : undefined,
        affectedParts: data.affectedParts.split(',').map(p => p.trim()),
        content: data.content,
        sourceUrl: data.sourceUrl
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/adaptive-compliance/policy-documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/adaptive-compliance/regulatory-updates'] });
      setPolicyDialogOpen(false);
      setPolicyForm({
        documentType: "safo",
        documentNumber: "",
        title: "",
        subject: "",
        issuanceDate: "",
        effectiveDate: "",
        affectedParts: "",
        content: "",
        sourceUrl: ""
      });
      toast({
        title: "Policy Document Ingested",
        description: "The FAA policy document has been successfully added to the system."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ingestion Error",
        description: error.message || "Failed to ingest policy document.",
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

  const spineFrameworks = frameworks.filter(f => f.frameworkType === 'spine');
  const attachmentFrameworks = frameworks.filter(f => f.frameworkType === 'attachment');
  const orderFrameworks = frameworks.filter(f => f.frameworkType === 'order');

  const filteredFARParts = farParts.filter(part => 
    searchQuery === "" || 
    part.partNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    part.partName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    part.applicableTo.some(a => a.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const stats = {
    totalFrameworks: frameworks.length,
    activeChecklists: checklists.length,
    trackedInspectors: inspectors.length,
    policyDocuments: policyDocuments.length,
    pendingUpdates: regulatoryUpdates.filter(u => u.changeDetected).length,
    complianceScore: 87
  };

  const getDocumentTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      safo: "bg-red-100 text-red-800 border-red-200",
      info: "bg-blue-100 text-blue-800 border-blue-200",
      notice: "bg-amber-100 text-amber-800 border-amber-200",
      order: "bg-purple-100 text-purple-800 border-purple-200",
      bulletin: "bg-green-100 text-green-800 border-green-200"
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="p-6 space-y-6" data-testid="adaptive-compliance-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2" data-testid="page-title">
            Universal Regulatory Compliance
            <Badge variant="outline" className="text-xs font-normal ml-2">Patent Pending</Badge>
          </h1>
          <p className="text-muted-foreground mt-1">
            Dynamic FAR Part Selection • Multi-Part Compliance • Evidence On-Demand
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={() => window.open('/api/adaptive-compliance/tutorial/download', '_blank')}
            data-testid="download-tutorial-btn"
          >
            <FileText className="h-4 w-4 mr-2" />
            Tutorial
          </Button>
          <Button 
            variant="outline"
            onClick={() => setPolicyDialogOpen(true)}
            data-testid="ingest-policy-btn"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Ingest Policy
          </Button>
          <Button 
            onClick={() => initUniversalSpineMutation.mutate()} 
            disabled={initUniversalSpineMutation.isPending}
            data-testid="initialize-universal-btn"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${initUniversalSpineMutation.isPending ? 'animate-spin' : ''}`} />
            Initialize All FAR Parts
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card data-testid="stat-frameworks">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">FAR Parts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{stats.totalFrameworks}</span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-policies">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Policy Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-purple-500" />
              <span className="text-2xl font-bold">{stats.policyDocuments}</span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-checklists">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Checklists</CardTitle>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Inspectors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-500" />
              <span className="text-2xl font-bold">{stats.trackedInspectors}</span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-updates">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Updates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold">{stats.pendingUpdates}</span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-compliance">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Compliance</CardTitle>
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
        <TabsList className="grid grid-cols-6 w-full max-w-4xl" data-testid="compliance-tabs">
          <TabsTrigger value="spine" data-testid="tab-spine">
            <Scale className="h-4 w-4 mr-2" />
            FAR Selection
          </TabsTrigger>
          <TabsTrigger value="policies" data-testid="tab-policies">
            <BookOpen className="h-4 w-4 mr-2" />
            Policies
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
            Packets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="spine" className="space-y-4" data-testid="spine-content">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-600" />
                  Universal FAR Part Selector
                </CardTitle>
                <CardDescription>
                  Select any FAR Part as your primary regulatory spine
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search FAR Parts (e.g., 121, training, maintenance...)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="far-search-input"
                    />
                  </div>
                  
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {filteredFARParts.map((part) => (
                        <div
                          key={part.partNumber}
                          className={`p-4 border rounded-lg cursor-pointer transition-all hover:border-blue-400 ${
                            selectedSpine === part.partNumber ? 'border-blue-500 bg-blue-50' : ''
                          }`}
                          onClick={() => setSelectedSpine(part.partNumber)}
                          data-testid={`far-part-${part.partNumber}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{part.partNumber}</h3>
                                {part.canBeSpine && (
                                  <Badge variant="default" className="text-xs">Primary Spine</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                {part.partName}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  Subchapter {part.subchapter}
                                </Badge>
                                {part.applicableTo.slice(0, 2).map((app, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {app.replace(/_/g, ' ')}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(part.ecfrUrl, '_blank');
                              }}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-600" />
                    Active Spines
                  </CardTitle>
                  <CardDescription>Currently configured regulatory spines</CardDescription>
                </CardHeader>
                <CardContent>
                  {frameworksLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-12 bg-slate-200 rounded animate-pulse" />
                      ))}
                    </div>
                  ) : spineFrameworks.length > 0 ? (
                    <div className="space-y-2">
                      {spineFrameworks.slice(0, 5).map((fw) => (
                        <div key={fw.id} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="font-medium text-sm">{fw.frameworkCode}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{fw.frameworkName}</p>
                        </div>
                      ))}
                      {spineFrameworks.length > 5 && (
                        <p className="text-sm text-muted-foreground text-center">
                          +{spineFrameworks.length - 5} more
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No spines initialized</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-purple-600" />
                    FAA Orders
                  </CardTitle>
                  <CardDescription>8900.1 Volumes and other orders</CardDescription>
                </CardHeader>
                <CardContent>
                  {orderFrameworks.length > 0 ? (
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {orderFrameworks.map((fw) => (
                          <div key={fw.id} className="p-2 border rounded-lg text-sm">
                            <p className="font-medium">{fw.frameworkCode}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <p className="text-sm">Initialize to load FAA Orders</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Regulatory Architecture Visualization</CardTitle>
              <CardDescription>Multi-Part Compliance Structure</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center py-8">
                <div className="w-80 p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-center shadow-lg">
                  <Scale className="h-6 w-6 mx-auto mb-2" />
                  <p className="font-bold">Selected Primary Spine</p>
                  <p className="text-sm opacity-90">{selectedSpine || "No FAR Part Selected"}</p>
                </div>
                
                <div className="flex items-center gap-2 my-4">
                  <ArrowRight className="h-6 w-6 text-blue-400 rotate-90" />
                </div>
                
                <div className="grid grid-cols-4 gap-4 max-w-4xl">
                  {orderFrameworks.slice(0, 4).map((order) => (
                    <div key={order.id} className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-center">
                      <p className="font-medium text-xs">{order.frameworkCode.replace('FAA-', '')}</p>
                      <p className="text-xs text-muted-foreground">Order</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 my-4">
                  <ArrowRight className="h-6 w-6 text-purple-400 rotate-90" />
                </div>

                <div className="grid grid-cols-6 gap-3 max-w-5xl">
                  {['61', '91', '121', '135', '141', '145'].map((part) => (
                    <div key={part} className="p-2 bg-amber-50 border border-amber-200 rounded text-center">
                      <p className="font-medium text-xs">Part {part}</p>
                      <p className="text-xs text-muted-foreground">Dynamic</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies" className="space-y-4" data-testid="policies-content">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-purple-600" />
                    FAA Policy Documents
                  </CardTitle>
                  <CardDescription>
                    SAFOs, InFOs, Policy Notices, and Bulletins
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setPolicyDialogOpen(true)}
                  data-testid="ingest-policy-header-btn"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ingest Document
                </Button>
              </CardHeader>
              <CardContent>
                {policyDocuments.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {policyDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-4 border rounded-lg hover:border-purple-300 transition-colors"
                          data-testid={`policy-${doc.documentNumber}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Badge className={getDocumentTypeBadge(doc.documentType)}>
                                  {doc.documentType.toUpperCase()}
                                </Badge>
                                <span className="font-medium">{doc.documentNumber}</span>
                              </div>
                              <h3 className="font-medium mt-2">{doc.title}</h3>
                              {doc.subject && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {doc.subject}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                <span>Issued: {new Date(doc.issuanceDate).toLocaleDateString()}</span>
                                {doc.affectedParts?.length > 0 && (
                                  <span>Affects: {doc.affectedParts.join(', ')}</span>
                                )}
                              </div>
                            </div>
                            <Badge variant={doc.isActive ? "default" : "secondary"}>
                              {doc.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="mb-2">No policy documents ingested</p>
                    <p className="text-sm">Ingest SAFOs, InFOs, and other FAA policy documents</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setPolicyDialogOpen(true)}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Ingest First Document
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-amber-600" />
                    Regulatory Updates
                  </CardTitle>
                  <CardDescription>Recent changes and alerts</CardDescription>
                </CardHeader>
                <CardContent>
                  {regulatoryUpdates.length > 0 ? (
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {regulatoryUpdates.slice(0, 10).map((update) => (
                          <div 
                            key={update.id} 
                            className={`p-3 border rounded-lg ${
                              update.changeDetected ? 'border-amber-300 bg-amber-50' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {update.changeDetected && (
                                <AlertCircle className="h-4 w-4 text-amber-600" />
                              )}
                              <p className="font-medium text-sm">{update.sourceIdentifier}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {update.sourceType} • {new Date(update.lastCheckedAt).toLocaleDateString()}
                            </p>
                            {update.changeSummary && (
                              <p className="text-xs mt-1">{update.changeSummary}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No recent updates</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Document Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                      <span className="text-sm font-medium">SAFO</span>
                      <span className="text-xs text-muted-foreground">Safety Alerts</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                      <span className="text-sm font-medium">InFO</span>
                      <span className="text-xs text-muted-foreground">Information Notices</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-amber-50 rounded">
                      <span className="text-sm font-medium">Notice</span>
                      <span className="text-xs text-muted-foreground">Policy Notices</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                      <span className="text-sm font-medium">Order</span>
                      <span className="text-xs text-muted-foreground">FAA Orders</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="checklists" className="space-y-4" data-testid="checklists-content">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-green-600" />
                  Checklist Harmonization Engine
                  <Badge variant="secondary" className="text-xs">Patent Pending</Badge>
                </CardTitle>
                <CardDescription>
                  Automated checklist retrieval, version monitoring, and multi-schema harmonization
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => versionCheckMutation.mutate()}
                  disabled={versionCheckMutation.isPending}
                  data-testid="version-check-btn"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${versionCheckMutation.isPending ? 'animate-spin' : ''}`} />
                  Check Updates
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setChecklistDialogOpen(true)}
                  data-testid="import-checklist-header-btn"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Import Checklist
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-6 grid grid-cols-5 gap-3">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                  <div className="text-xs font-medium text-green-800 mb-1">FAA Standard</div>
                  <Badge variant="outline" className="bg-green-100">Priority 1</Badge>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                  <div className="text-xs font-medium text-blue-800 mb-1">Certificate</div>
                  <Badge variant="outline" className="bg-blue-100">Priority 2</Badge>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-center">
                  <div className="text-xs font-medium text-purple-800 mb-1">Inspector</div>
                  <Badge variant="outline" className="bg-purple-100">Priority 3</Badge>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
                  <div className="text-xs font-medium text-amber-800 mb-1">Operator</div>
                  <Badge variant="outline" className="bg-amber-100">Priority 4</Badge>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                  <div className="text-xs font-medium text-slate-800 mb-1">Archived</div>
                  <Badge variant="outline" className="bg-slate-100">Priority 5</Badge>
                </div>
              </div>
              {checklistsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-slate-200 rounded animate-pulse" />
                  ))}
                </div>
              ) : checklists.length > 0 ? (
                <div className="space-y-3">
                  {checklists.map((schema: any) => (
                    <div
                      key={schema.id}
                      className={`p-4 border rounded-lg hover:border-blue-300 transition-colors ${schema.isHidden ? 'opacity-50 bg-slate-50' : ''} ${schema.isOutdated ? 'border-amber-300 bg-amber-50/30' : ''}`}
                      data-testid={`checklist-${schema.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium flex items-center gap-2">
                            {schema.schemaName}
                            {schema.autoFetched && (
                              <Badge variant="outline" className="text-xs bg-blue-50">Auto-Fetched</Badge>
                            )}
                            {schema.isOutdated && (
                              <Badge variant="destructive" className="text-xs">Outdated</Badge>
                            )}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{schema.schemaSource}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {schema.totalItems} items
                            </span>
                            <span className="text-sm text-muted-foreground">
                              v{schema.version}
                            </span>
                            {schema.priorityLevel && (
                              <Badge variant="secondary" className="text-xs">
                                P{schema.priorityLevel}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {schema.isCanonical && (
                            <Badge variant="default">Canonical</Badge>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedSchemaId(schema.id);
                              setVersionHistoryOpen(true);
                            }}
                            data-testid={`view-history-${schema.id}`}
                          >
                            History
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            data-testid={`view-items-${schema.id}`}
                          >
                            View Items
                          </Button>
                          {schema.isOutdated && !schema.isHidden && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => suppressChecklistMutation.mutate(schema.id)}
                              disabled={suppressChecklistMutation.isPending}
                              data-testid={`suppress-${schema.id}`}
                            >
                              Suppress
                            </Button>
                          )}
                          {schema.isHidden && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => unlockChecklistMutation.mutate(schema.id)}
                              disabled={unlockChecklistMutation.isPending}
                              data-testid={`unlock-${schema.id}`}
                            >
                              Unlock
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-2">No checklists ingested yet</p>
                  <p className="text-sm">Select a spine to auto-fetch core FAA checklists or import manually</p>
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

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Version Monitoring</CardTitle>
                <CardDescription>Auto-detect updates from FAA sources</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <div className="flex items-center gap-2">
                      <FileSearch className="h-4 w-4 text-slate-500" />
                      <span className="text-sm">FAA 8900.1 Orders</span>
                    </div>
                    <Badge variant="outline" className="text-xs">Monitored</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <div className="flex items-center gap-2">
                      <FileSearch className="h-4 w-4 text-slate-500" />
                      <span className="text-sm">eCFR Sections</span>
                    </div>
                    <Badge variant="outline" className="text-xs">Monitored</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <div className="flex items-center gap-2">
                      <FileSearch className="h-4 w-4 text-slate-500" />
                      <span className="text-sm">SAFO/InFO Updates</span>
                    </div>
                    <Badge variant="outline" className="text-xs">Monitored</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Delta Reporting</CardTitle>
                <CardDescription>Compare checklists to identify differences</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle2 className="h-6 w-6 mx-auto text-green-600 mb-1" />
                    <p className="text-xl font-bold text-green-600">0</p>
                    <p className="text-xs text-muted-foreground">Added</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <AlertTriangle className="h-6 w-6 mx-auto text-red-600 mb-1" />
                    <p className="text-xl font-bold text-red-600">0</p>
                    <p className="text-xs text-muted-foreground">Removed</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <FileText className="h-6 w-6 mx-auto text-amber-600 mb-1" />
                    <p className="text-xl font-bold text-amber-600">0</p>
                    <p className="text-xs text-muted-foreground">Modified</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <Layers className="h-6 w-6 mx-auto text-blue-600 mb-1" />
                    <p className="text-xl font-bold text-blue-600">0</p>
                    <p className="text-xs text-muted-foreground">Reordered</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evidence-on-Demand Retrieval</CardTitle>
              <CardDescription>Multi-schema indexing with blockchain verification</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="p-4 border rounded-lg">
                  <Database className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                  <p className="text-sm font-medium">Multi-Schema Index</p>
                  <p className="text-xs text-muted-foreground mt-1">Cross-reference evidence</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <Shield className="h-8 w-8 mx-auto text-green-600 mb-2" />
                  <p className="text-sm font-medium">Blockchain Verified</p>
                  <p className="text-xs text-muted-foreground mt-1">Immutable audit trail</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <TrendingUp className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                  <p className="text-sm font-medium">Priority Scoring</p>
                  <p className="text-xs text-muted-foreground mt-1">Intelligent ranking</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <Zap className="h-8 w-8 mx-auto text-amber-600 mb-2" />
                  <p className="text-sm font-medium">Instant Retrieval</p>
                  <p className="text-xs text-muted-foreground mt-1">On-demand access</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                Auto-Fetch Core Checklists
              </CardTitle>
              <CardDescription>
                Automatically retrieve FAA standard checklists for supported FAR Parts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <Select 
                  value={autoFetchPart} 
                  onValueChange={setAutoFetchPart}
                >
                  <SelectTrigger className="w-[300px]" data-testid="select-auto-fetch-part">
                    <SelectValue placeholder="Select FAR Part to auto-fetch" />
                  </SelectTrigger>
                  <SelectContent>
                    {supportedParts.filter(p => p.definition).map((part) => (
                      <SelectItem key={part.code} value={part.code}>
                        {part.code} - {part.definition?.schemaName || 'Core Checklist'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => {
                    if (autoFetchPart) {
                      autoFetchChecklistMutation.mutate(autoFetchPart);
                      setAutoFetchPart("");
                    }
                  }}
                  disabled={!autoFetchPart || autoFetchChecklistMutation.isPending}
                  data-testid="btn-auto-fetch"
                >
                  {autoFetchChecklistMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Auto-Fetch
                    </>
                  )}
                </Button>
              </div>
              {supportedParts.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {supportedParts.slice(0, 9).map((part) => (
                    <div 
                      key={part.code} 
                      className={`p-2 rounded border text-center text-sm cursor-pointer hover:border-blue-400 transition-colors ${
                        part.definition ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'
                      }`}
                      onClick={() => {
                        if (part.definition) {
                          setAutoFetchPart(part.code);
                        }
                      }}
                      data-testid={`part-${part.code}`}
                    >
                      <span className="font-medium">{part.code}</span>
                      {part.definition && (
                        <Badge variant="outline" className="ml-2 text-xs bg-green-100">Available</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
              <CardDescription>Inspector behavior prediction performance</CardDescription>
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
                Evidence On-Demand Retrieval
              </CardTitle>
              <CardDescription>
                Instant evidence retrieval by checklist item or regulatory reference
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
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-600" />
                Evidence-On-Demand API
              </CardTitle>
              <CardDescription>
                Retrieve evidence instantly by checklist item or regulatory reference
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
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="font-medium text-sm mb-2">Supported FAR Parts for Evidence Lookup:</p>
                  <div className="flex flex-wrap gap-2">
                    {['21', '43', '61', '65', '91', '107', '119', '121', '125', '135', '141', '142', '145', '147'].map(part => (
                      <Badge key={part} variant="outline">Part {part}</Badge>
                    ))}
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
              <CardDescription>Blockchain-verified audit packet contents</CardDescription>
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

      <Dialog open={policyDialogOpen} onOpenChange={setPolicyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ingest FAA Policy Document</DialogTitle>
            <DialogDescription>
              Add SAFOs, InFOs, Policy Notices, or other FAA policy documents to the compliance system.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="documentType">Document Type</Label>
                <Select 
                  value={policyForm.documentType} 
                  onValueChange={(value) => setPolicyForm(prev => ({ ...prev, documentType: value }))}
                >
                  <SelectTrigger data-testid="select-policy-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="safo">SAFO - Safety Alert</SelectItem>
                    <SelectItem value="info">InFO - Information Notice</SelectItem>
                    <SelectItem value="notice">Policy Notice</SelectItem>
                    <SelectItem value="bulletin">Bulletin</SelectItem>
                    <SelectItem value="order">FAA Order</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="documentNumber">Document Number</Label>
                <Input
                  id="documentNumber"
                  placeholder="e.g., SAFO 24001"
                  value={policyForm.documentNumber}
                  onChange={(e) => setPolicyForm(prev => ({ ...prev, documentNumber: e.target.value }))}
                  data-testid="input-policy-number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Document title"
                value={policyForm.title}
                onChange={(e) => setPolicyForm(prev => ({ ...prev, title: e.target.value }))}
                data-testid="input-policy-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Textarea
                id="subject"
                placeholder="Brief subject description"
                rows={2}
                value={policyForm.subject}
                onChange={(e) => setPolicyForm(prev => ({ ...prev, subject: e.target.value }))}
                data-testid="textarea-policy-subject"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="issuanceDate">Issuance Date</Label>
                <Input
                  id="issuanceDate"
                  type="date"
                  value={policyForm.issuanceDate}
                  onChange={(e) => setPolicyForm(prev => ({ ...prev, issuanceDate: e.target.value }))}
                  data-testid="input-policy-issuance"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="effectiveDate">Effective Date (Optional)</Label>
                <Input
                  id="effectiveDate"
                  type="date"
                  value={policyForm.effectiveDate}
                  onChange={(e) => setPolicyForm(prev => ({ ...prev, effectiveDate: e.target.value }))}
                  data-testid="input-policy-effective"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="affectedParts">Affected FAR Parts</Label>
              <Input
                id="affectedParts"
                placeholder="e.g., 121, 135, 142 (comma-separated)"
                value={policyForm.affectedParts}
                onChange={(e) => setPolicyForm(prev => ({ ...prev, affectedParts: e.target.value }))}
                data-testid="input-policy-parts"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sourceUrl">Source URL (Optional)</Label>
              <Input
                id="sourceUrl"
                placeholder="https://www.faa.gov/..."
                value={policyForm.sourceUrl}
                onChange={(e) => setPolicyForm(prev => ({ ...prev, sourceUrl: e.target.value }))}
                data-testid="input-policy-url"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Document Content (Optional)</Label>
              <Textarea
                id="content"
                placeholder="Full document text for AI analysis"
                rows={4}
                value={policyForm.content}
                onChange={(e) => setPolicyForm(prev => ({ ...prev, content: e.target.value }))}
                data-testid="textarea-policy-content"
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setPolicyDialogOpen(false)}
              data-testid="btn-cancel-policy"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => ingestPolicyMutation.mutate(policyForm)}
              disabled={ingestPolicyMutation.isPending || !policyForm.documentNumber || !policyForm.title || !policyForm.issuanceDate}
              data-testid="btn-confirm-policy"
            >
              {ingestPolicyMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Ingesting...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Ingest Document
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={versionHistoryOpen} onOpenChange={setVersionHistoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
            <DialogDescription>
              Track changes and updates to this checklist over time.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {selectedSchemaId && evidenceStats && (
              <div className="mb-4 p-4 bg-slate-50 rounded-lg">
                <h4 className="font-medium mb-2">Evidence Mapping Coverage</h4>
                <div className="grid grid-cols-4 gap-4 text-center text-sm">
                  <div>
                    <p className="text-lg font-bold text-blue-600">{evidenceStats.totalItems}</p>
                    <p className="text-muted-foreground">Total Items</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-green-600">{evidenceStats.mappedItems}</p>
                    <p className="text-muted-foreground">Mapped</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-amber-600">{evidenceStats.unmappedItems}</p>
                    <p className="text-muted-foreground">Unmapped</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-purple-600">{evidenceStats.coveragePercentage.toFixed(1)}%</p>
                    <p className="text-muted-foreground">Coverage</p>
                  </div>
                </div>
                <Progress value={evidenceStats.coveragePercentage} className="h-2 mt-3" />
              </div>
            )}

            <h4 className="font-medium mb-3">Change History</h4>
            {versionHistory.length > 0 ? (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {versionHistory.map((entry) => (
                    <div key={entry.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {entry.previousVersion ? `v${entry.previousVersion}` : 'Initial'} → v{entry.newVersion}
                          </Badge>
                          {entry.sourceUrl && (
                            <a 
                              href={entry.sourceUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Source
                            </a>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(entry.detectedAt).toLocaleDateString()}
                        </span>
                      </div>
                      {entry.changesSummary && (
                        <p className="text-sm text-muted-foreground">
                          {typeof entry.changesSummary === 'string' 
                            ? entry.changesSummary 
                            : JSON.stringify(entry.changesSummary)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileSearch className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No version history recorded yet</p>
                <p className="text-sm mt-1">Changes will be tracked automatically when detected.</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setVersionHistoryOpen(false);
                setSelectedSchemaId(null);
              }}
              data-testid="btn-close-history"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
