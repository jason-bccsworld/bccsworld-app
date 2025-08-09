import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  Key, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  FileCheck,
  Fingerprint,
  Eye,
  Phone,
  Building,
  AlertCircle,
  Lock,
  Unlock,
  UserCheck,
  Camera,
  Mic,
  Scan
} from 'lucide-react';

// Validation schemas
const keyRecoveryRequestSchema = z.object({
  credentialId: z.string().uuid('Please provide a valid credential ID'),
  requestType: z.enum(['lost_key', 'compromise', 'career_transfer', 'emergency_recovery']),
  requestReason: z.string().min(10, 'Please provide a detailed reason (minimum 10 characters)'),
  
  primaryAuthMethod: z.enum(['biometric', 'knowledge_based', 'possession_based']),
  secondaryAuthMethod: z.enum(['sms', 'email', 'authenticator_app', 'hardware_token']),
  tertiaryAuthMethod: z.enum(['government_id', 'employment_verification', 'regulatory_authority']),
  
  // Employment verification
  currentEmployer: z.string().min(1, 'Current employer is required'),
  employerVerificationCode: z.string().min(1, 'Employer verification code is required'),
  hrContactEmail: z.string().email('Valid HR contact email is required'),
  employmentStartDate: z.string(),
  positionTitle: z.string().min(1, 'Position title is required'),
  
  // Historical data
  flightHours: z.number().min(0, 'Flight hours must be positive'),
  previousEmployers: z.string(),
  requestedFromLocation: z.string().min(1, 'Request location is required'),
  
  // Emergency fields (conditional)
  emergencyType: z.enum(['medical', 'security_breach', 'natural_disaster', 'equipment_failure']).optional(),
  urgencyLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  authorizingOfficer: z.string().optional(),
  emergencyDocumentation: z.string().optional()
});

const biometricVerificationSchema = z.object({
  fingerprintData: z.string().min(1, 'Fingerprint data is required'),
  faceRecognitionData: z.string().min(1, 'Face recognition data is required'),
  voicePrintData: z.string().min(1, 'Voice print data is required'),
  retinaScanData: z.string().min(1, 'Retina scan data is required')
});

const identityDocumentSchema = z.object({
  documentType: z.enum(['passport', 'drivers_license', 'government_id', 'pilot_license']),
  documentNumber: z.string().min(1, 'Document number is required'),
  issuingAuthority: z.string().min(1, 'Issuing authority is required'),
  expirationDate: z.string(),
  documentImage: z.string().min(1, 'Document image is required')
});

type KeyRecoveryFormData = z.infer<typeof keyRecoveryRequestSchema>;
type BiometricFormData = z.infer<typeof biometricVerificationSchema>;
type IdentityDocumentFormData = z.infer<typeof identityDocumentSchema>;

interface RecoveryRequestStatus {
  requestId: string;
  status: string;
  progress: number;
  completedSteps: string[];
  pendingSteps: string[];
  estimatedCompletion: string;
  securityAlerts: string[];
}

export function AdvancedKeyRecovery() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('initiate');
  const [currentRequestId, setCurrentRequestId] = useState<string>('');
  const [recoveryStatus, setRecoveryStatus] = useState<RecoveryRequestStatus | null>(null);

  // Form initialization
  const recoveryForm = useForm<KeyRecoveryFormData>({
    resolver: zodResolver(keyRecoveryRequestSchema),
    defaultValues: {
      credentialId: '',
      requestType: 'lost_key',
      requestReason: '',
      primaryAuthMethod: 'biometric',
      secondaryAuthMethod: 'sms',
      tertiaryAuthMethod: 'government_id',
      currentEmployer: '',
      employerVerificationCode: '',
      hrContactEmail: '',
      employmentStartDate: '',
      positionTitle: '',
      flightHours: 0,
      previousEmployers: '',
      requestedFromLocation: ''
    }
  });

  const biometricForm = useForm<BiometricFormData>({
    resolver: zodResolver(biometricVerificationSchema),
    defaultValues: {
      fingerprintData: '',
      faceRecognitionData: '',
      voicePrintData: '',
      retinaScanData: ''
    }
  });

  const documentForm = useForm<IdentityDocumentFormData>({
    resolver: zodResolver(identityDocumentSchema),
    defaultValues: {
      documentType: 'passport',
      documentNumber: '',
      issuingAuthority: '',
      expirationDate: '',
      documentImage: ''
    }
  });

  // Mutations
  const initiateRecoveryMutation = useMutation({
    mutationFn: async (data: KeyRecoveryFormData) => {
      const response = await apiRequest('/api/advanced-key-recovery/initiate', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          identityDocuments: [],
          knowledgeBasedQuestions: [],
          employmentVerification: {
            currentEmployer: data.currentEmployer,
            employerVerificationCode: data.employerVerificationCode,
            hrContactEmail: data.hrContactEmail,
            employmentStartDate: new Date(data.employmentStartDate),
            positionTitle: data.positionTitle,
            managerApprovalHash: 'mock-manager-hash'
          },
          historicalTrainingRecords: [],
          previousEmployers: data.previousEmployers.split(',').map(emp => emp.trim()),
          knownAssociates: [],
          flightHours: data.flightHours,
          certificationHistory: [],
          ...(data.emergencyType && {
            emergencyProtocol: {
              emergencyType: data.emergencyType,
              urgencyLevel: data.urgencyLevel || 'medium',
              authorizingOfficer: data.authorizingOfficer || '',
              emergencyContactVerified: false,
              medicalDocumentationHash: data.emergencyDocumentation ? 'mock-emergency-hash' : undefined
            }
          }),
          geoLocationVerification: {
            requestedFrom: data.requestedFromLocation,
            historicalLocations: ['Previous Location 1', 'Previous Location 2'],
            travelPattern: 'normal'
          },
          regulatoryAuthoritiesNotified: ['FAA'],
          complianceChecksPassed: true
        })
      });
      return response;
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Recovery Request Initiated',
        description: 'Your key recovery request has been submitted and is being processed.',
      });
      setCurrentRequestId(data.data.requestId);
      setActiveTab('verification');
      recoveryForm.reset();
    },
    onError: (error) => {
      toast({
        title: 'Request Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const biometricVerificationMutation = useMutation({
    mutationFn: async (data: BiometricFormData) => {
      if (!currentRequestId) throw new Error('No active recovery request');
      
      const response = await apiRequest(`/api/advanced-key-recovery/${currentRequestId}/biometric-verification`, {
        method: 'POST',
        body: JSON.stringify({
          fingerprintHash: btoa(data.fingerprintData),
          faceRecognitionHash: btoa(data.faceRecognitionData),
          voicePrintHash: btoa(data.voicePrintData),
          retinaScanHash: btoa(data.retinaScanData)
        })
      });
      return response;
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Biometric Verification Complete',
        description: `Verification ${data.data.verified ? 'successful' : 'failed'} with ${Math.round(data.data.confidence * 100)}% confidence.`,
        variant: data.data.verified ? 'default' : 'destructive'
      });
      biometricForm.reset();
    },
    onError: (error) => {
      toast({
        title: 'Verification Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const documentVerificationMutation = useMutation({
    mutationFn: async (data: IdentityDocumentFormData) => {
      if (!currentRequestId) throw new Error('No active recovery request');
      
      const response = await apiRequest(`/api/advanced-key-recovery/${currentRequestId}/identity-verification`, {
        method: 'POST',
        body: JSON.stringify({
          documents: [{
            documentType: data.documentType,
            documentNumber: data.documentNumber,
            issuingAuthority: data.issuingAuthority,
            expirationDate: new Date(data.expirationDate),
            documentImageHash: btoa(data.documentImage),
            ocrExtractedData: {}
          }]
        })
      });
      return response;
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Document Verification Complete',
        description: `${data.data.verifiedDocuments.length} document(s) verified successfully.`,
      });
      documentForm.reset();
    },
    onError: (error) => {
      toast({
        title: 'Verification Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Get recovery status
  const { data: statusData } = useQuery({
    queryKey: ['/api/advanced-key-recovery', currentRequestId, 'status'],
    enabled: !!currentRequestId,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  const urgencyLevelColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800', 
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800'
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8 text-red-600" />
        <div>
          <h1 className="text-3xl font-bold">Advanced Key Recovery System</h1>
          <p className="text-gray-600">Secure multi-factor key recovery with biometric verification</p>
        </div>
      </div>

      {currentRequestId && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>Recovery Request ID: <code className="font-mono">{currentRequestId}</code></span>
              {statusData?.data && (
                <Badge variant="outline">
                  {statusData.data.status} - {Math.round(statusData.data.progress)}% Complete
                </Badge>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="initiate" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Initiate Recovery
          </TabsTrigger>
          <TabsTrigger value="verification" className="flex items-center gap-2">
            <Fingerprint className="h-4 w-4" />
            Biometric Verification
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            Document Verification
          </TabsTrigger>
          <TabsTrigger value="status" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recovery Status
          </TabsTrigger>
        </TabsList>

        <TabsContent value="initiate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Initiate Key Recovery Request</CardTitle>
              <CardDescription>
                Begin the secure key recovery process with multi-factor authentication
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...recoveryForm}>
                <form onSubmit={recoveryForm.handleSubmit((data) => initiateRecoveryMutation.mutate(data))} className="space-y-6">
                  
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={recoveryForm.control}
                        name="credentialId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Professional Credential ID</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 550e8400-e29b-41d4-a716-446655440000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={recoveryForm.control}
                        name="requestType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recovery Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="lost_key">Lost Private Key</SelectItem>
                                <SelectItem value="compromise">Security Compromise</SelectItem>
                                <SelectItem value="career_transfer">Career Transfer</SelectItem>
                                <SelectItem value="emergency_recovery">Emergency Recovery</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={recoveryForm.control}
                      name="requestReason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Detailed Reason for Recovery</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Please provide a detailed explanation of why you need to recover your private key..."
                              className="min-h-[100px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Authentication Methods */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Multi-Factor Authentication Preferences</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={recoveryForm.control}
                        name="primaryAuthMethod"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primary Authentication</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="biometric">Biometric Verification</SelectItem>
                                <SelectItem value="knowledge_based">Knowledge-Based Questions</SelectItem>
                                <SelectItem value="possession_based">Hardware Token</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={recoveryForm.control}
                        name="secondaryAuthMethod"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Secondary Authentication</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="sms">SMS Verification</SelectItem>
                                <SelectItem value="email">Email Verification</SelectItem>
                                <SelectItem value="authenticator_app">Authenticator App</SelectItem>
                                <SelectItem value="hardware_token">Hardware Token</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={recoveryForm.control}
                        name="tertiaryAuthMethod"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tertiary Authentication</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="government_id">Government ID</SelectItem>
                                <SelectItem value="employment_verification">Employment Verification</SelectItem>
                                <SelectItem value="regulatory_authority">Regulatory Authority</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Employment Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Employment Verification</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={recoveryForm.control}
                        name="currentEmployer"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Employer</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., United Airlines" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={recoveryForm.control}
                        name="employerVerificationCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Employer Verification Code</FormLabel>
                            <FormControl>
                              <Input placeholder="Provided by HR department" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={recoveryForm.control}
                        name="hrContactEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>HR Contact Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="hr@company.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={recoveryForm.control}
                        name="positionTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Position Title</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., First Officer" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={recoveryForm.control}
                        name="employmentStartDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Employment Start Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={recoveryForm.control}
                        name="flightHours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total Flight Hours</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="e.g., 5000" 
                                {...field}
                                onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={recoveryForm.control}
                      name="previousEmployers"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Previous Employers (comma-separated)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., American Airlines, Delta Air Lines" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={recoveryForm.control}
                      name="requestedFromLocation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Location</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Atlanta, GA" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Emergency Protocol (conditional) */}
                  {recoveryForm.watch('requestType') === 'emergency_recovery' && (
                    <div className="space-y-4 p-4 border border-red-200 rounded-lg bg-red-50">
                      <h3 className="text-lg font-semibold text-red-800">Emergency Recovery Protocol</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={recoveryForm.control}
                          name="emergencyType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Emergency Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="medical">Medical Emergency</SelectItem>
                                  <SelectItem value="security_breach">Security Breach</SelectItem>
                                  <SelectItem value="natural_disaster">Natural Disaster</SelectItem>
                                  <SelectItem value="equipment_failure">Equipment Failure</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={recoveryForm.control}
                          name="urgencyLevel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Urgency Level</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                  <SelectItem value="critical">Critical</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={recoveryForm.control}
                          name="authorizingOfficer"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Authorizing Officer</FormLabel>
                              <FormControl>
                                <Input placeholder="Name of authorizing official" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={recoveryForm.control}
                          name="emergencyDocumentation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Emergency Documentation</FormLabel>
                              <FormControl>
                                <Input placeholder="Reference number or description" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    disabled={initiateRecoveryMutation.isPending}
                    className="w-full"
                    size="lg"
                  >
                    {initiateRecoveryMutation.isPending ? (
                      <>
                        <Clock className="mr-2 h-4 w-4 animate-spin" />
                        Initiating Recovery Request...
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Initiate Key Recovery
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verification" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Multi-Modal Biometric Verification</CardTitle>
              <CardDescription>
                Complete biometric verification using multiple modalities for enhanced security
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...biometricForm}>
                <form onSubmit={biometricForm.handleSubmit((data) => biometricVerificationMutation.mutate(data))} className="space-y-6">
                  
                  <Alert>
                    <Fingerprint className="h-4 w-4" />
                    <AlertDescription>
                      Biometric verification requires access to specialized hardware. In a production environment, 
                      this would integrate with fingerprint scanners, cameras, and voice recognition systems.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Fingerprint className="h-5 w-5" />
                        <h4 className="font-semibold">Fingerprint Verification</h4>
                      </div>
                      <FormField
                        control={biometricForm.control}
                        name="fingerprintData"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fingerprint Data</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Fingerprint biometric data (simulated)" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Camera className="h-5 w-5" />
                        <h4 className="font-semibold">Face Recognition</h4>
                      </div>
                      <FormField
                        control={biometricForm.control}
                        name="faceRecognitionData"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Face Recognition Data</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Facial recognition biometric data (simulated)" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Mic className="h-5 w-5" />
                        <h4 className="font-semibold">Voice Print</h4>
                      </div>
                      <FormField
                        control={biometricForm.control}
                        name="voicePrintData"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Voice Print Data</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Voice print biometric data (simulated)" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Scan className="h-5 w-5" />
                        <h4 className="font-semibold">Retina Scan</h4>
                      </div>
                      <FormField
                        control={biometricForm.control}
                        name="retinaScanData"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Retina Scan Data</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Retina scan biometric data (simulated)" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={biometricVerificationMutation.isPending || !currentRequestId}
                    className="w-full"
                    size="lg"
                  >
                    {biometricVerificationMutation.isPending ? (
                      <>
                        <Clock className="mr-2 h-4 w-4 animate-spin" />
                        Processing Biometric Verification...
                      </>
                    ) : (
                      <>
                        <Fingerprint className="mr-2 h-4 w-4" />
                        Submit Biometric Verification
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Identity Document Verification</CardTitle>
              <CardDescription>
                Upload and verify identity documents for additional authentication
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...documentForm}>
                <form onSubmit={documentForm.handleSubmit((data) => documentVerificationMutation.mutate(data))} className="space-y-6">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={documentForm.control}
                      name="documentType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Document Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="passport">Passport</SelectItem>
                              <SelectItem value="drivers_license">Driver's License</SelectItem>
                              <SelectItem value="government_id">Government ID</SelectItem>
                              <SelectItem value="pilot_license">Pilot License</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={documentForm.control}
                      name="documentNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Document Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Document identification number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={documentForm.control}
                      name="issuingAuthority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Issuing Authority</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., US Department of State" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={documentForm.control}
                      name="expirationDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expiration Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={documentForm.control}
                    name="documentImage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Document Image Data</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="In production, this would be an image upload with OCR processing"
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    disabled={documentVerificationMutation.isPending || !currentRequestId}
                    className="w-full"
                    size="lg"
                  >
                    {documentVerificationMutation.isPending ? (
                      <>
                        <Clock className="mr-2 h-4 w-4 animate-spin" />
                        Processing Document Verification...
                      </>
                    ) : (
                      <>
                        <FileCheck className="mr-2 h-4 w-4" />
                        Submit Document Verification
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recovery Request Status</CardTitle>
              <CardDescription>
                Track the progress of your key recovery request
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentRequestId ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Request ID:</span>
                    <code className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                      {currentRequestId}
                    </code>
                  </div>

                  {statusData?.data && (
                    <>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">Progress:</span>
                          <span>{Math.round(statusData.data.progress)}% Complete</span>
                        </div>
                        <Progress value={statusData.data.progress} className="w-full" />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold mb-3">Completed Steps</h4>
                          <div className="space-y-2">
                            {statusData.data.completedSteps.map((step: string, index: number) => (
                              <div key={index} className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-sm">{step.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-3">Pending Steps</h4>
                          <div className="space-y-2">
                            {statusData.data.pendingSteps.map((step: string, index: number) => (
                              <div key={index} className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-yellow-600" />
                                <span className="text-sm">{step.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {statusData.data.securityAlerts?.length > 0 && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="space-y-2">
                              <span className="font-semibold">Security Alerts:</span>
                              {statusData.data.securityAlerts.map((alert: string, index: number) => (
                                <div key={index} className="text-sm">• {alert}</div>
                              ))}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="flex items-center justify-between pt-4 border-t">
                        <span className="font-semibold">Status:</span>
                        <Badge 
                          variant={statusData.data.status === 'completed' ? 'default' : 'secondary'}
                          className="capitalize"
                        >
                          {statusData.data.status}
                        </Badge>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No active recovery request. Please initiate a recovery request first.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}