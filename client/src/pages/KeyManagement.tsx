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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  Key, 
  Users, 
  FileCheck, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';

// Schemas
const organizationSchema = z.object({
  organizationName: z.string().min(1, 'Organization name is required'),
  organizationType: z.enum(['part_142', 'part_141', 'part_121', 'part_135', 'mro', 'atc']),
  certificateNumber: z.string().min(1, 'Certificate number is required'),
  regulatoryAuthority: z.enum(['faa', 'easa', 'transport_canada', 'casa']),
  contactInfo: z.object({
    email: z.string().email(),
    phone: z.string().optional(),
    address: z.string().optional()
  })
});

const credentialSchema = z.object({
  credentialType: z.enum(['pilot_license', 'atp', 'mechanic_license', 'controller_license']),
  licenseNumber: z.string().min(1, 'License number is required'),
  regulatoryAuthority: z.enum(['faa', 'easa', 'transport_canada', 'casa']),
  holderFirstName: z.string().min(1, 'First name is required'),
  holderLastName: z.string().min(1, 'Last name is required'),
  holderEmail: z.string().email('Valid email is required'),
  dateOfBirth: z.string(),
  issueDate: z.string(),
  expirationDate: z.string().optional()
});

const trainingRecordSchema = z.object({
  studentCredentialId: z.string().min(1, 'Student credential ID is required'),
  organizationId: z.string().min(1, 'Organization ID is required'),
  instructorCredentialId: z.string().min(1, 'Instructor credential ID is required'),
  trainingType: z.enum(['initial', 'recurrent', 'checkride', 'proficiency']),
  trainingDetails: z.object({
    course: z.string(),
    duration: z.number(),
    performance: z.string(),
    notes: z.string().optional()
  }),
  studentPrivateKey: z.string().min(1, 'Student private key is required'),
  instructorPrivateKey: z.string().min(1, 'Instructor private key is required'),
  organizationPrivateKey: z.string().min(1, 'Organization private key is required'),
  completionDate: z.string()
});

type OrganizationFormData = z.infer<typeof organizationSchema>;
type CredentialFormData = z.infer<typeof credentialSchema>;
type TrainingRecordFormData = z.infer<typeof trainingRecordSchema>;

interface PrivateKeyDisplay {
  visible: boolean;
  copied: boolean;
}

export function KeyManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('organizations');
  const [privateKeyDisplay, setPrivateKeyDisplay] = useState<PrivateKeyDisplay>({ visible: false, copied: false });
  const [lastGeneratedKey, setLastGeneratedKey] = useState<string>('');

  // Organization registration form
  const orgForm = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      organizationName: '',
      organizationType: 'part_142',
      certificateNumber: '',
      regulatoryAuthority: 'faa',
      contactInfo: { email: '', phone: '', address: '' }
    }
  });

  // Credential registration form
  const credForm = useForm<CredentialFormData>({
    resolver: zodResolver(credentialSchema),
    defaultValues: {
      credentialType: 'pilot_license',
      licenseNumber: '',
      regulatoryAuthority: 'faa',
      holderFirstName: '',
      holderLastName: '',
      holderEmail: '',
      dateOfBirth: '',
      issueDate: '',
      expirationDate: ''
    }
  });

  // Training record form
  const trainingForm = useForm<TrainingRecordFormData>({
    resolver: zodResolver(trainingRecordSchema),
    defaultValues: {
      studentCredentialId: '',
      organizationId: '',
      instructorCredentialId: '',
      trainingType: 'initial',
      trainingDetails: { course: '', duration: 0, performance: '', notes: '' },
      studentPrivateKey: '',
      instructorPrivateKey: '',
      organizationPrivateKey: '',
      completionDate: new Date().toISOString().split('T')[0]
    }
  });

  // Mutations
  const registerOrgMutation = useMutation({
    mutationFn: async (data: OrganizationFormData) => {
      const response = await apiRequest('/api/blockchain/organizations/register', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return response;
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Organization Registered',
        description: 'Training organization successfully registered with blockchain keys.',
      });
      setLastGeneratedKey(data.data.masterPrivateKey);
      setPrivateKeyDisplay({ visible: true, copied: false });
      orgForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/blockchain/organizations'] });
    },
    onError: (error) => {
      toast({
        title: 'Registration Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const registerCredMutation = useMutation({
    mutationFn: async (data: CredentialFormData) => {
      const response = await apiRequest('/api/blockchain/credentials/register', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return response;
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Credential Registered',
        description: 'Professional credential successfully registered with blockchain keys.',
      });
      setLastGeneratedKey(data.data.masterPrivateKey);
      setPrivateKeyDisplay({ visible: true, copied: false });
      credForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/blockchain/credentials'] });
    },
    onError: (error) => {
      toast({
        title: 'Registration Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const createTrainingRecordMutation = useMutation({
    mutationFn: async (data: TrainingRecordFormData) => {
      const response = await apiRequest('/api/blockchain/training-records', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: 'Training Record Created',
        description: 'Multi-signature training record successfully created on blockchain.',
      });
      trainingForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/blockchain/training-records'] });
    },
    onError: (error) => {
      toast({
        title: 'Record Creation Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Utility functions
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setPrivateKeyDisplay(prev => ({ ...prev, copied: true }));
      toast({
        title: 'Copied to Clipboard',
        description: 'Private key has been copied securely.',
      });
      setTimeout(() => setPrivateKeyDisplay(prev => ({ ...prev, copied: false })), 3000);
    } catch (err) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy to clipboard.',
        variant: 'destructive'
      });
    }
  };

  const toggleKeyVisibility = () => {
    setPrivateKeyDisplay(prev => ({ ...prev, visible: !prev.visible }));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Universal Blockchain Key Management</h1>
          <p className="text-gray-600">Professional credential management with blockchain security</p>
        </div>
      </div>

      {lastGeneratedKey && privateKeyDisplay.visible && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-3">
              <p className="font-semibold text-orange-800">
                🔐 Master Private Key Generated - Store Securely!
              </p>
              <p className="text-sm text-orange-700">
                This key will only be displayed once. Save it in a secure location immediately.
              </p>
              <div className="flex items-center gap-2 p-3 bg-white border rounded">
                <code className="flex-1 font-mono text-sm break-all">
                  {privateKeyDisplay.visible ? lastGeneratedKey : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                </code>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={toggleKeyVisibility}
                  className="shrink-0"
                >
                  {privateKeyDisplay.visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => copyToClipboard(lastGeneratedKey)}
                  className="shrink-0"
                >
                  <Copy className="h-4 w-4" />
                  {privateKeyDisplay.copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="organizations" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Organizations
          </TabsTrigger>
          <TabsTrigger value="credentials" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Credentials
          </TabsTrigger>
          <TabsTrigger value="training" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            Training Records
          </TabsTrigger>
          <TabsTrigger value="verification" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Verification
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organizations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Register Training Organization</CardTitle>
              <CardDescription>
                Register a new training organization with master blockchain keys
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...orgForm}>
                <form onSubmit={orgForm.handleSubmit((data) => registerOrgMutation.mutate(data))} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={orgForm.control}
                      name="organizationName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., FlightSafety International" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={orgForm.control}
                      name="certificateNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Certificate Number</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 142-001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={orgForm.control}
                      name="organizationType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="part_142">Part 142 Training Center</SelectItem>
                              <SelectItem value="part_141">Part 141 Flight School</SelectItem>
                              <SelectItem value="part_121">Part 121 Airline</SelectItem>
                              <SelectItem value="part_135">Part 135 Charter</SelectItem>
                              <SelectItem value="mro">MRO Facility</SelectItem>
                              <SelectItem value="atc">ATC Training Center</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={orgForm.control}
                      name="regulatoryAuthority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Regulatory Authority</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="faa">FAA (United States)</SelectItem>
                              <SelectItem value="easa">EASA (Europe)</SelectItem>
                              <SelectItem value="transport_canada">Transport Canada</SelectItem>
                              <SelectItem value="casa">CASA (Australia)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={orgForm.control}
                      name="contactInfo.email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="contact@organization.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={orgForm.control}
                      name="contactInfo.phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="+1-555-123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={orgForm.control}
                    name="contactInfo.address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Physical address of the organization" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    disabled={registerOrgMutation.isPending}
                    className="w-full"
                  >
                    {registerOrgMutation.isPending ? (
                      <>
                        <Clock className="mr-2 h-4 w-4 animate-spin" />
                        Generating Keys & Registering...
                      </>
                    ) : (
                      <>
                        <Shield className="mr-2 h-4 w-4" />
                        Register Organization
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credentials" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Register Professional Credential</CardTitle>
              <CardDescription>
                Register individual professional credentials with private keys
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...credForm}>
                <form onSubmit={credForm.handleSubmit((data) => registerCredMutation.mutate(data))} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={credForm.control}
                      name="credentialType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Credential Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pilot_license">Pilot License</SelectItem>
                              <SelectItem value="atp">Airline Transport Pilot</SelectItem>
                              <SelectItem value="mechanic_license">A&P Mechanic License</SelectItem>
                              <SelectItem value="controller_license">ATC License</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={credForm.control}
                      name="licenseNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>License Number</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 123456789" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={credForm.control}
                      name="regulatoryAuthority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Regulatory Authority</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="faa">FAA (United States)</SelectItem>
                              <SelectItem value="easa">EASA (Europe)</SelectItem>
                              <SelectItem value="transport_canada">Transport Canada</SelectItem>
                              <SelectItem value="casa">CASA (Australia)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={credForm.control}
                      name="holderFirstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={credForm.control}
                      name="holderLastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Smith" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={credForm.control}
                      name="holderEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="pilot@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={credForm.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={credForm.control}
                      name="issueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Issue Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={credForm.control}
                      name="expirationDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expiration Date (Optional)</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={registerCredMutation.isPending}
                    className="w-full"
                  >
                    {registerCredMutation.isPending ? (
                      <>
                        <Clock className="mr-2 h-4 w-4 animate-spin" />
                        Generating Keys & Registering...
                      </>
                    ) : (
                      <>
                        <Key className="mr-2 h-4 w-4" />
                        Register Credential
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Multi-Signature Training Record</CardTitle>
              <CardDescription>
                Create immutable training records with student, instructor, and organization signatures
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  This creates a permanent, tamper-proof record on the blockchain requiring signatures from all three parties.
                </AlertDescription>
              </Alert>

              <Form {...trainingForm}>
                <form onSubmit={trainingForm.handleSubmit((data) => createTrainingRecordMutation.mutate(data))} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={trainingForm.control}
                      name="studentCredentialId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Student Credential ID</FormLabel>
                          <FormControl>
                            <Input placeholder="Student's credential UUID" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={trainingForm.control}
                      name="organizationId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization ID</FormLabel>
                          <FormControl>
                            <Input placeholder="Training organization UUID" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={trainingForm.control}
                      name="instructorCredentialId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Instructor Credential ID</FormLabel>
                          <FormControl>
                            <Input placeholder="Instructor's credential UUID" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={trainingForm.control}
                      name="trainingType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Training Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="initial">Initial Training</SelectItem>
                              <SelectItem value="recurrent">Recurrent Training</SelectItem>
                              <SelectItem value="checkride">Checkride</SelectItem>
                              <SelectItem value="proficiency">Proficiency Check</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={trainingForm.control}
                      name="completionDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Completion Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold">Training Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={trainingForm.control}
                        name="trainingDetails.course"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Course Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., B737 Type Rating" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={trainingForm.control}
                        name="trainingDetails.duration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duration (hours)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="8.5" 
                                {...field}
                                onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={trainingForm.control}
                        name="trainingDetails.performance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Performance Rating</FormLabel>
                            <FormControl>
                              <Input placeholder="Satisfactory/Unsatisfactory" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={trainingForm.control}
                      name="trainingDetails.notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Notes (Optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Any additional training notes or observations" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-red-600">🔐 Private Keys Required for Signatures</h4>
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Each party must provide their private key to create their digital signature. Keys are not stored.
                      </AlertDescription>
                    </Alert>

                    <FormField
                      control={trainingForm.control}
                      name="studentPrivateKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Student Private Key</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Student's private key" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={trainingForm.control}
                      name="instructorPrivateKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Instructor Private Key</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Instructor's private key" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={trainingForm.control}
                      name="organizationPrivateKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Private Key</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Organization's private key" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={createTrainingRecordMutation.isPending}
                    className="w-full"
                  >
                    {createTrainingRecordMutation.isPending ? (
                      <>
                        <Clock className="mr-2 h-4 w-4 animate-spin" />
                        Creating Multi-Signature Record...
                      </>
                    ) : (
                      <>
                        <FileCheck className="mr-2 h-4 w-4" />
                        Create Training Record
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
              <CardTitle>Cross-Platform Credential Verification</CardTitle>
              <CardDescription>
                Verify professional credentials across all BCCS platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-semibold">BCCS142</p>
                      <p className="text-sm text-gray-600">Training Platform</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-semibold">BCCSMAINT</p>
                      <p className="text-sm text-gray-600">Maintenance Platform</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-semibold">BCCSREG</p>
                      <p className="text-sm text-gray-600">Registry Platform</p>
                    </div>
                  </div>
                </Card>
              </div>

              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Universal blockchain key management enables seamless verification across all platforms while maintaining professional credential integrity.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}