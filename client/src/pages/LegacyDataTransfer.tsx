import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  Upload,
  FileText,
  Scan,
  Brain,
  CheckCircle,
  AlertTriangle,
  Clock,
  Download,
  Zap,
  Shield,
  Database,
  Sparkles
} from 'lucide-react';

// Validation schemas
const uploadSchema = z.object({
  organizationName: z.string().min(1, 'Organization name is required'),
  dataType: z.enum(['pilot_logbooks', 'training_records', 'maintenance_logs', 'regulatory_documents', 'mixed_aviation_data']),
  estimatedRecords: z.string().min(1, 'Estimated records count is required'),
  legacySystemType: z.string().min(1, 'Legacy system type is required'),
  contactEmail: z.string().email('Valid email is required'),
  urgencyLevel: z.enum(['standard', 'expedited', 'emergency']),
  specialInstructions: z.string().optional(),
  files: z.string().min(1, 'File upload is required') // In production, this would be File objects
});

const processingOptionsSchema = z.object({
  ocrAccuracyLevel: z.enum(['standard', 'high', 'maximum']),
  aiValidationLevel: z.enum(['basic', 'comprehensive', 'forensic']),
  blockchainVerification: z.boolean().default(true),
  qualityAssuranceLevel: z.enum(['automated', 'hybrid', 'full_manual']),
  outputFormat: z.enum(['bccs_native', 'json', 'csv', 'pdf_reports']),
  encryptionLevel: z.enum(['standard', 'enhanced', 'military_grade'])
});

type UploadFormData = z.infer<typeof uploadSchema>;
type ProcessingOptionsData = z.infer<typeof processingOptionsSchema>;

interface ProcessingStatus {
  id: string;
  status: 'uploaded' | 'processing' | 'ai_analysis' | 'blockchain_verification' | 'completed' | 'failed';
  progress: number;
  currentStage: string;
  estimatedCompletion: string;
  recordsProcessed: number;
  totalRecords: number;
  aiConfidenceScore: number;
  qualityMetrics: {
    ocrAccuracy: number;
    dataCompleteness: number;
    validationPassed: number;
    duplicatesFound: number;
  };
  blockchainHash?: string;
  downloadLinks?: string[];
  alerts: string[];
}

export default function LegacyDataTransfer() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('upload');
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  // Form setup
  const uploadForm = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      organizationName: '',
      dataType: 'pilot_logbooks',
      estimatedRecords: '',
      legacySystemType: '',
      contactEmail: '',
      urgencyLevel: 'standard',
      specialInstructions: '',
      files: ''
    }
  });

  const optionsForm = useForm<ProcessingOptionsData>({
    resolver: zodResolver(processingOptionsSchema),
    defaultValues: {
      ocrAccuracyLevel: 'high',
      aiValidationLevel: 'comprehensive',
      blockchainVerification: true,
      qualityAssuranceLevel: 'hybrid',
      outputFormat: 'bccs_native',
      encryptionLevel: 'enhanced'
    }
  });

  // Mutations
  const uploadMutation = useMutation({
    mutationFn: async (data: UploadFormData & ProcessingOptionsData) => {
      const response = await apiRequest('/api/legacy-data-transfer/upload', 'POST', data);
      return response;
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Data Transfer Initiated',
        description: `Your legacy data transfer job has been started with ID: ${data.data.jobId}`
      });
      setCurrentJobId(data?.data?.jobId || null);
      setActiveTab('processing');
      uploadForm.reset();
      optionsForm.reset();
    },
    onError: (error) => {
      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Get processing status
  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/legacy-data-transfer/status', currentJobId],
    enabled: !!currentJobId,
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  const handleUpload = () => {
    const uploadData = uploadForm.getValues();
    const optionsData = optionsForm.getValues();
    uploadMutation.mutate({ ...uploadData, ...optionsData });
  };

  const processingStatus = statusData?.data as ProcessingStatus | undefined;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">AI-Powered Legacy Data Transfer</h1>
        <p className="text-muted-foreground mt-2">
          Transform your legacy aviation records into BCCS blockchain-verified digital format
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload">Data Upload</TabsTrigger>
          <TabsTrigger value="options">Processing Options</TabsTrigger>
          <TabsTrigger value="processing">Processing Status</TabsTrigger>
          <TabsTrigger value="results">Results & Download</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Legacy Data Upload
              </CardTitle>
              <CardDescription>
                Upload your legacy aviation documents for AI-powered conversion to BCCS format
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...uploadForm}>
                <form className="space-y-6">
                  
                  {/* Organization Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={uploadForm.control}
                      name="organizationName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Skyward Flight Training" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={uploadForm.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="admin@organization.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Data Classification */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={uploadForm.control}
                      name="dataType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pilot_logbooks">Pilot Logbooks</SelectItem>
                              <SelectItem value="training_records">Training Records</SelectItem>
                              <SelectItem value="maintenance_logs">Maintenance Logs</SelectItem>
                              <SelectItem value="regulatory_documents">Regulatory Documents</SelectItem>
                              <SelectItem value="mixed_aviation_data">Mixed Aviation Data</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={uploadForm.control}
                      name="estimatedRecords"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estimated Records</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 1500" {...field} />
                          </FormControl>
                          <FormDescription>Approximate number of records/entries</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={uploadForm.control}
                      name="urgencyLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Processing Priority</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="standard">Standard (5-7 days)</SelectItem>
                              <SelectItem value="expedited">Expedited (2-3 days)</SelectItem>
                              <SelectItem value="emergency">Emergency (24-48 hours)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={uploadForm.control}
                    name="legacySystemType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Legacy System Type</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Paper logbooks, Excel spreadsheets, PDF documents, Legacy training software" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>Describe your current data format</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={uploadForm.control}
                    name="files"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>File Upload</FormLabel>
                        <FormControl>
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                            <div className="text-center">
                              <Upload className="mx-auto h-12 w-12 text-gray-400" />
                              <div className="mt-4">
                                <Textarea
                                  placeholder="In production, this would be a drag-and-drop file upload interface supporting PDF, images, Excel, Word documents, etc."
                                  className="min-h-[100px]"
                                  {...field}
                                />
                              </div>
                              <p className="mt-2 text-sm text-gray-500">
                                Supported formats: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX (Max 100MB per file)
                              </p>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={uploadForm.control}
                    name="specialInstructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Special Instructions (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Any specific requirements, data field mapping, or processing instructions..."
                            className="min-h-[80px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="button" 
                    onClick={() => setActiveTab('options')}
                    className="w-full"
                    size="lg"
                  >
                    Continue to Processing Options
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="options" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI Processing Configuration
              </CardTitle>
              <CardDescription>
                Configure how our AI system processes your legacy data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...optionsForm}>
                <form className="space-y-6">
                  
                  {/* OCR and AI Configuration */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Scan className="h-4 w-4" />
                        OCR Processing
                      </h3>
                      
                      <FormField
                        control={optionsForm.control}
                        name="ocrAccuracyLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>OCR Accuracy Level</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="standard">Standard (Fast, 95% accuracy)</SelectItem>
                                <SelectItem value="high">High (Balanced, 98% accuracy)</SelectItem>
                                <SelectItem value="maximum">Maximum (Slow, 99.5% accuracy)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>Higher accuracy takes longer but provides better results</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        AI Validation
                      </h3>
                      
                      <FormField
                        control={optionsForm.control}
                        name="aiValidationLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>AI Validation Level</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="basic">Basic (Data format validation)</SelectItem>
                                <SelectItem value="comprehensive">Comprehensive (Logic validation)</SelectItem>
                                <SelectItem value="forensic">Forensic (Full audit trail)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>Comprehensive analysis of data integrity and compliance</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Security and Output Configuration */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Security & Blockchain
                      </h3>
                      
                      <FormField
                        control={optionsForm.control}
                        name="blockchainVerification"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="mt-1"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Enable Blockchain Verification</FormLabel>
                              <FormDescription>
                                Creates immutable hash records for data integrity
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={optionsForm.control}
                        name="encryptionLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Encryption Level</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="standard">Standard (AES-256)</SelectItem>
                                <SelectItem value="enhanced">Enhanced (AES-256 + Key rotation)</SelectItem>
                                <SelectItem value="military_grade">Military Grade (Multi-layer encryption)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Output & Quality
                      </h3>
                      
                      <FormField
                        control={optionsForm.control}
                        name="qualityAssuranceLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quality Assurance</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="automated">Automated (AI-only review)</SelectItem>
                                <SelectItem value="hybrid">Hybrid (AI + Human spot-checks)</SelectItem>
                                <SelectItem value="full_manual">Full Manual (Complete human review)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={optionsForm.control}
                        name="outputFormat"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Output Format</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="bccs_native">BCCS Native Format</SelectItem>
                                <SelectItem value="json">JSON Export</SelectItem>
                                <SelectItem value="csv">CSV Spreadsheet</SelectItem>
                                <SelectItem value="pdf_reports">PDF Reports</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setActiveTab('upload')}
                      className="flex-1"
                    >
                      Back to Upload
                    </Button>
                    <Button 
                      type="button" 
                      onClick={handleUpload}
                      disabled={uploadMutation.isPending}
                      className="flex-1"
                      size="lg"
                    >
                      {uploadMutation.isPending ? (
                        <>
                          <Clock className="mr-2 h-4 w-4 animate-spin" />
                          Starting AI Processing...
                        </>
                      ) : (
                        <>
                          <Zap className="mr-2 h-4 w-4" />
                          Start AI Data Transfer
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI Processing Status
              </CardTitle>
              <CardDescription>
                Real-time monitoring of your legacy data conversion
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentJobId ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Job ID:</span>
                    <code className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                      {currentJobId}
                    </code>
                  </div>

                  {processingStatus && (
                    <>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">Overall Progress:</span>
                          <span>{processingStatus.progress}% Complete</span>
                        </div>
                        <Progress value={processingStatus.progress} className="w-full" />
                        
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>Current Stage: {processingStatus.currentStage}</span>
                          <span>ETA: {processingStatus.estimatedCompletion}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold mb-3">Processing Metrics</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Records Processed:</span>
                              <span>{processingStatus.recordsProcessed} / {processingStatus.totalRecords}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>AI Confidence Score:</span>
                              <Badge variant={processingStatus.aiConfidenceScore > 0.9 ? 'default' : 'secondary'}>
                                {Math.round(processingStatus.aiConfidenceScore * 100)}%
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>Status:</span>
                              <Badge variant={processingStatus.status === 'completed' ? 'default' : 'secondary'}>
                                {processingStatus.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-3">Quality Metrics</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>OCR Accuracy:</span>
                              <span>{Math.round(processingStatus.qualityMetrics.ocrAccuracy * 100)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Data Completeness:</span>
                              <span>{Math.round(processingStatus.qualityMetrics.dataCompleteness * 100)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Validation Passed:</span>
                              <span>{Math.round(processingStatus.qualityMetrics.validationPassed * 100)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Duplicates Found:</span>
                              <span>{processingStatus.qualityMetrics.duplicatesFound}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {processingStatus.blockchainHash && (
                        <Alert>
                          <Shield className="h-4 w-4" />
                          <AlertDescription>
                            <div className="space-y-2">
                              <span className="font-semibold">Blockchain Verification:</span>
                              <div className="font-mono text-sm bg-gray-100 p-2 rounded break-all">
                                {processingStatus.blockchainHash}
                              </div>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      {processingStatus.alerts.length > 0 && (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="space-y-2">
                              <span className="font-semibold">Processing Alerts:</span>
                              {processingStatus.alerts.map((alert: string, index: number) => (
                                <div key={index} className="text-sm">• {alert}</div>
                              ))}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      {processingStatus.status === 'completed' && (
                        <Button 
                          onClick={() => setActiveTab('results')}
                          className="w-full"
                          size="lg"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          View Results & Download
                        </Button>
                      )}
                    </>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No active processing job. Please upload data first.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Processing Results & Downloads
              </CardTitle>
              <CardDescription>
                Access your converted data and processing reports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {processingStatus?.status === 'completed' ? (
                <>
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Your legacy data has been successfully converted to BCCS format with blockchain verification.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3">Final Processing Summary</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Total Records Processed:</span>
                          <span className="font-semibold">{processingStatus.totalRecords}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Successfully Converted:</span>
                          <span className="font-semibold text-green-600">{processingStatus.recordsProcessed}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Final AI Confidence:</span>
                          <span className="font-semibold">{Math.round(processingStatus.aiConfidenceScore * 100)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Blockchain Verified:</span>
                          <span className="font-semibold text-blue-600">✓ Complete</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">Data Quality Assessment</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>OCR Accuracy:</span>
                          <Badge variant={processingStatus.qualityMetrics.ocrAccuracy > 0.95 ? 'default' : 'secondary'}>
                            {Math.round(processingStatus.qualityMetrics.ocrAccuracy * 100)}%
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Data Integrity:</span>
                          <Badge variant={processingStatus.qualityMetrics.dataCompleteness > 0.95 ? 'default' : 'secondary'}>
                            {Math.round(processingStatus.qualityMetrics.dataCompleteness * 100)}%
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Compliance Check:</span>
                          <Badge variant={processingStatus.qualityMetrics.validationPassed > 0.95 ? 'default' : 'secondary'}>
                            {Math.round(processingStatus.qualityMetrics.validationPassed * 100)}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Download Files</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {processingStatus.downloadLinks?.map((link, index) => (
                        <Button key={index} variant="outline" className="justify-start">
                          <FileText className="mr-2 h-4 w-4" />
                          Download Report {index + 1}
                        </Button>
                      )) || (
                        <>
                          <Button variant="outline" className="justify-start">
                            <FileText className="mr-2 h-4 w-4" />
                            BCCS Native Format Data
                          </Button>
                          <Button variant="outline" className="justify-start">
                            <FileText className="mr-2 h-4 w-4" />
                            Processing Quality Report
                          </Button>
                          <Button variant="outline" className="justify-start">
                            <Shield className="mr-2 h-4 w-4" />
                            Blockchain Verification Certificate
                          </Button>
                          <Button variant="outline" className="justify-start">
                            <Database className="mr-2 h-4 w-4" />
                            Data Migration Summary
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <Alert>
                    <Zap className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <span className="font-semibold">Next Steps:</span>
                        <div className="text-sm">
                          1. Download your converted data files<br/>
                          2. Import into your BCCS system<br/>
                          3. Verify data integrity using blockchain certificates<br/>
                          4. Contact support if you need assistance with integration
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                </>
              ) : (
                <div className="text-center py-8">
                  <Download className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Results will be available once processing is complete.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}