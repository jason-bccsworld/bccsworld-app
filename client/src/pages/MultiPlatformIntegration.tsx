import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plane,
  Shield,
  Database,
  ArrowRightLeft,
  CheckCircle,
  AlertTriangle,
  Users,
  Building,
  FileText,
  Globe,
  Clock,
  Download,
  Upload,
  Search,
  Link
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TrainingCenter {
  id: string;
  name: string;
  type: string; // 'Part 142', 'Part 141', 'International ATO', etc.
  country: string;
  blockchainId: string;
  status: 'connected' | 'pending' | 'disconnected';
  recordCount: number;
  lastSync: string;
  certificateLevel: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
}

interface PilotRecord {
  pilotId: string;
  pilotName: string;
  pilotEmail: string;
  trainingCenterId: string;
  trainingCenterName: string;
  records: Array<{
    id: string;
    type: string;
    title: string;
    date: string;
    status: 'verified' | 'pending_transfer' | 'transferred';
    blockchainHash?: string;
  }>;
  totalHours: number;
  certificatesEarned: number;
  requestedTransfer: boolean;
}

interface DataTransferRequest {
  id: string;
  pilotId: string;
  pilotName: string;
  pilotEmail: string;
  trainingCenterId: string;
  trainingCenterName: string;
  recordsRequested: number;
  status: 'pending_pilot_verification' | 'pending_center_approval' | 'in_progress' | 'completed' | 'rejected';
  requestedDate: string;
  estimatedCompletion?: string;
  pilotPrivateKey: string;
  blockchainVerificationHash?: string;
}

export default function MultiPlatformIntegration() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPilot, setSelectedPilot] = useState<string>('');
  const [selectedCenter, setSelectedCenter] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mock data for development
  const mockTrainingCenters: TrainingCenter[] = [
    {
      id: 'tc_001',
      name: 'Skyward Flight Training',
      type: 'Part 142',
      country: 'United States',
      blockchainId: 'bc_sky_001',
      status: 'connected',
      recordCount: 1247,
      lastSync: '2024-08-09T18:30:00Z',
      certificateLevel: 'Platinum'
    },
    {
      id: 'tc_002', 
      name: 'European Aviation Academy',
      type: 'EASA ATO',
      country: 'Germany',
      blockchainId: 'bc_eaa_002',
      status: 'connected',
      recordCount: 892,
      lastSync: '2024-08-09T16:45:00Z',
      certificateLevel: 'Gold'
    },
    {
      id: 'tc_003',
      name: 'Metro Flight College',
      type: 'Part 141',
      country: 'United States', 
      blockchainId: 'bc_mfc_003',
      status: 'pending',
      recordCount: 634,
      lastSync: '2024-08-07T12:20:00Z',
      certificateLevel: 'Silver'
    },
    {
      id: 'tc_004',
      name: 'Sahara Aviation Training',
      type: 'ICAO ATO',
      country: 'South Africa',
      blockchainId: 'bc_sat_004', 
      status: 'disconnected',
      recordCount: 0,
      lastSync: 'Never',
      certificateLevel: 'Bronze'
    }
  ];

  const mockPilotRecords: PilotRecord[] = [
    {
      pilotId: 'plt_001',
      pilotName: 'Captain Sarah Mitchell',
      pilotEmail: 'sarah.mitchell@airline.com',
      trainingCenterId: 'tc_001',
      trainingCenterName: 'Skyward Flight Training',
      totalHours: 3500,
      certificatesEarned: 12,
      requestedTransfer: true,
      records: [
        {
          id: 'rec_001',
          type: 'Type Rating',
          title: 'Boeing 737-800 Type Rating',
          date: '2024-06-15',
          status: 'verified',
          blockchainHash: '0x8a7f2e4d...'
        },
        {
          id: 'rec_002', 
          type: 'Recurrent Training',
          title: 'Annual Recurrent Training',
          date: '2024-03-22',
          status: 'pending_transfer'
        },
        {
          id: 'rec_003',
          type: 'Instrument Rating',
          title: 'Instrument Rating Renewal',
          date: '2024-01-10', 
          status: 'transferred',
          blockchainHash: '0x9b8c3f5e...'
        }
      ]
    },
    {
      pilotId: 'plt_002',
      pilotName: 'First Officer Marcus Chen',
      pilotEmail: 'marcus.chen@pilot.com',
      trainingCenterId: 'tc_002',
      trainingCenterName: 'European Aviation Academy', 
      totalHours: 1850,
      certificatesEarned: 8,
      requestedTransfer: false,
      records: [
        {
          id: 'rec_004',
          type: 'ATPL Theory',
          title: 'ATPL Theory Completion',
          date: '2024-05-20',
          status: 'verified',
          blockchainHash: '0x7c6d2a3b...'
        }
      ]
    }
  ];

  const mockTransferRequests: DataTransferRequest[] = [
    {
      id: 'req_001',
      pilotId: 'plt_001',
      pilotName: 'Captain Sarah Mitchell',
      pilotEmail: 'sarah.mitchell@airline.com',
      trainingCenterId: 'tc_001',
      trainingCenterName: 'Skyward Flight Training',
      recordsRequested: 15,
      status: 'pending_center_approval',
      requestedDate: '2024-08-08T14:30:00Z',
      estimatedCompletion: '2024-08-12T17:00:00Z',
      pilotPrivateKey: 'bccs_key_plt_001_verified'
    },
    {
      id: 'req_002',
      pilotId: 'plt_003',
      pilotName: 'Captain James Rodriguez',
      pilotEmail: 'james.rodriguez@freight.com',
      trainingCenterId: 'tc_001', 
      trainingCenterName: 'Skyward Flight Training',
      recordsRequested: 22,
      status: 'in_progress',
      requestedDate: '2024-08-06T09:15:00Z',
      estimatedCompletion: '2024-08-10T16:30:00Z',
      pilotPrivateKey: 'bccs_key_plt_003_verified',
      blockchainVerificationHash: '0x4f2a8e7c...'
    }
  ];

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'disconnected': return 'bg-red-500';
      case 'verified': return 'bg-green-500';
      case 'pending_transfer': return 'bg-yellow-500';
      case 'transferred': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'pending_pilot_verification': return 'bg-orange-500';
      case 'pending_center_approval': return 'bg-purple-500';
      case 'rejected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getCertificateBadgeColor = (level: string) => {
    switch (level) {
      case 'Platinum': return 'bg-purple-500';
      case 'Gold': return 'bg-yellow-500';
      case 'Silver': return 'bg-gray-400';
      case 'Bronze': return 'bg-orange-600';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Multi-Platform Integration Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage training center connections and pilot record transfers across the global BCCS ecosystem
        </p>
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 text-sm">
            <strong>Pilot-Driven Adoption:</strong> Individual pilots can request their training records be transferred 
            from training centers to their personal blockchain identity, creating market pressure for training centers to join BCCS.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="overview">Platform Overview</TabsTrigger>
          <TabsTrigger value="centers">Training Centers</TabsTrigger>
          <TabsTrigger value="pilots">Pilot Records</TabsTrigger>
          <TabsTrigger value="transfers">Transfer Requests</TabsTrigger>
          <TabsTrigger value="integration">Connect Platform</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Connected Centers</p>
                    <p className="text-2xl font-bold">2</p>
                  </div>
                  <Building className="h-8 w-8 text-blue-500" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">+1 pending approval</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Pilots</p>
                    <p className="text-2xl font-bold">847</p>
                  </div>
                  <Users className="h-8 w-8 text-green-500" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Across all platforms</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Blockchain Records</p>
                    <p className="text-2xl font-bold">2,139</p>
                  </div>
                  <Database className="h-8 w-8 text-purple-500" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Verified & secure</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Transfer Requests</p>
                    <p className="text-2xl font-bold">12</p>
                  </div>
                  <ArrowRightLeft className="h-8 w-8 text-orange-500" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Pending processing</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest integration events across the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Captain Sarah Mitchell requested record transfer</p>
                    <p className="text-xs text-muted-foreground">From Skyward Flight Training • 2 hours ago</p>
                  </div>
                  <Badge variant="outline" className="text-xs">15 Records</Badge>
                </div>
                
                <div className="flex items-center gap-4">
                  <ArrowRightLeft className="h-5 w-5 text-blue-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">European Aviation Academy sync completed</p>
                    <p className="text-xs text-muted-foreground">892 records verified • 4 hours ago</p>
                  </div>
                  <Badge variant="outline" className="text-xs">Completed</Badge>
                </div>
                
                <div className="flex items-center gap-4">
                  <Building className="h-5 w-5 text-purple-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Metro Flight College requesting platform access</p>
                    <p className="text-xs text-muted-foreground">Part 141 training center • 1 day ago</p>
                  </div>
                  <Badge variant="outline" className="text-xs">Pending</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="centers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Connected Training Centers
              </CardTitle>
              <CardDescription>
                Training organizations integrated with the BCCS ecosystem
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockTrainingCenters.map((center) => (
                  <div key={center.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Building className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{center.name}</h3>
                          <p className="text-sm text-muted-foreground">{center.type} • {center.country}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-white ${getCertificateBadgeColor(center.certificateLevel)}`}>
                          {center.certificateLevel}
                        </Badge>
                        <Badge className={`text-white ${getStatusBadgeColor(center.status)}`}>
                          {center.status}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Records</p>
                        <p className="font-semibold">{center.recordCount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Blockchain ID</p>
                        <p className="font-mono text-xs">{center.blockchainId}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last Sync</p>
                        <p className="text-xs">
                          {center.lastSync === 'Never' 
                            ? 'Never' 
                            : new Date(center.lastSync).toLocaleString()
                          }
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline">
                        <Link className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      {center.status === 'connected' && (
                        <Button size="sm" variant="outline">
                          <ArrowRightLeft className="h-4 w-4 mr-2" />
                          Sync Records
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pilots" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Pilot Training Records
              </CardTitle>
              <CardDescription>
                Individual pilot records across training platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="pilot-search">Search Pilots</Label>
                  <Input 
                    id="pilot-search"
                    placeholder="Search by name, email, or ID..."
                    className="mt-1"
                  />
                </div>
                <div className="w-48">
                  <Label htmlFor="center-filter">Filter by Center</Label>
                  <Select>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="All Centers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Centers</SelectItem>
                      {mockTrainingCenters.map((center) => (
                        <SelectItem key={center.id} value={center.id}>
                          {center.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                {mockPilotRecords.map((pilot) => (
                  <div key={pilot.pilotId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Plane className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{pilot.pilotName}</h3>
                          <p className="text-sm text-muted-foreground">{pilot.pilotEmail}</p>
                          <p className="text-xs text-muted-foreground">Training at {pilot.trainingCenterName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {pilot.requestedTransfer && (
                          <Badge className="bg-orange-500 text-white">
                            Transfer Requested
                          </Badge>
                        )}
                        <Button size="sm" variant="outline">
                          View Records
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-muted-foreground">Total Hours</p>
                        <p className="font-semibold">{pilot.totalHours.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Certificates</p>
                        <p className="font-semibold">{pilot.certificatesEarned}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Records</p>
                        <p className="font-semibold">{pilot.records.length}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Recent Training Records:</p>
                      {pilot.records.slice(0, 3).map((record) => (
                        <div key={record.id} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <span>{record.title}</span>
                            <span className="text-muted-foreground">• {record.date}</span>
                          </div>
                          <Badge className={`text-white text-xs ${getStatusBadgeColor(record.status)}`}>
                            {record.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5" />
                Data Transfer Requests
              </CardTitle>
              <CardDescription>
                Pilot requests to transfer training records to personal blockchain identity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockTransferRequests.map((request) => (
                  <div key={request.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{request.pilotName}</h3>
                          <p className="text-sm text-muted-foreground">{request.pilotEmail}</p>
                          <p className="text-xs text-muted-foreground">
                            From {request.trainingCenterName} • {new Date(request.requestedDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge className={`text-white ${getStatusBadgeColor(request.status)}`}>
                        {request.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-muted-foreground">Records Requested</p>
                        <p className="font-semibold">{request.recordsRequested}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Pilot Key Status</p>
                        <p className="font-semibold text-green-600">Verified</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Estimated Completion</p>
                        <p className="font-semibold">
                          {request.estimatedCompletion 
                            ? new Date(request.estimatedCompletion).toLocaleDateString()
                            : 'Pending'
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Progress</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress 
                            value={
                              request.status === 'completed' ? 100 :
                              request.status === 'in_progress' ? 75 :
                              request.status === 'pending_center_approval' ? 50 : 25
                            } 
                            className="h-2 flex-1" 
                          />
                          <span className="text-xs">
                            {request.status === 'completed' ? '100%' :
                             request.status === 'in_progress' ? '75%' :
                             request.status === 'pending_center_approval' ? '50%' : '25%'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {request.blockchainVerificationHash && (
                      <Alert className="mb-4">
                        <Shield className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-1">
                            <span className="font-semibold">Blockchain Verification Hash:</span>
                            <div className="font-mono text-xs bg-gray-100 p-2 rounded break-all">
                              {request.blockchainVerificationHash}
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <FileText className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      {request.status === 'pending_center_approval' && (
                        <>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve Transfer
                          </Button>
                          <Button size="sm" variant="destructive">
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Request More Info
                          </Button>
                        </>
                      )}
                      {request.status === 'completed' && (
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4 mr-2" />
                          Download Certificate
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="h-5 w-5" />
                Connect New Training Platform
              </CardTitle>
              <CardDescription>
                Integrate a new training center or aviation organization into the BCCS ecosystem
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="org-name">Organization Name</Label>
                    <Input id="org-name" placeholder="e.g., Metro Aviation Academy" />
                  </div>
                  <div>
                    <Label htmlFor="org-type">Organization Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="part142">Part 142 Training Center</SelectItem>
                        <SelectItem value="part141">Part 141 Pilot School</SelectItem>
                        <SelectItem value="part121">Part 121 Airline</SelectItem>
                        <SelectItem value="part135">Part 135 Operator</SelectItem>
                        <SelectItem value="easa-ato">EASA Approved Training Organization</SelectItem>
                        <SelectItem value="icao-ato">ICAO Training Organization</SelectItem>
                        <SelectItem value="military">Military Training</SelectItem>
                        <SelectItem value="university">University Aviation Program</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="country">Country/Region</Label>
                    <Input id="country" placeholder="e.g., United States" />
                  </div>
                  <div>
                    <Label htmlFor="contact-email">Primary Contact Email</Label>
                    <Input id="contact-email" type="email" placeholder="admin@organization.com" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="cert-number">Certification Number</Label>
                    <Input id="cert-number" placeholder="e.g., FAA Certificate #ABCD123" />
                  </div>
                  <div>
                    <Label htmlFor="est-records">Estimated Record Count</Label>
                    <Input id="est-records" placeholder="e.g., 1200" />
                  </div>
                  <div>
                    <Label htmlFor="legacy-system">Current Record System</Label>
                    <Input id="legacy-system" placeholder="e.g., CATS, FlightDeck Solutions, Paper records" />
                  </div>
                  <div>
                    <Label htmlFor="integration-priority">Integration Priority</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urgent">Urgent (1-2 weeks)</SelectItem>
                        <SelectItem value="high">High (2-4 weeks)</SelectItem>
                        <SelectItem value="normal">Normal (4-8 weeks)</SelectItem>
                        <SelectItem value="low">Low (8+ weeks)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Alert>
                <Globe className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <span className="font-semibold">Integration Process:</span>
                    <ol className="text-sm list-decimal list-inside space-y-1 ml-4">
                      <li>Submit integration request and provide organization verification</li>
                      <li>BCCS team reviews certification and conducts compliance audit</li>
                      <li>Blockchain identity created and private keys generated</li>
                      <li>Legacy data export and AI-powered conversion to BCCS format</li>
                      <li>Pilot verification and individual key assignment</li>
                      <li>Go-live with full ecosystem integration</li>
                    </ol>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="flex gap-4">
                <Button className="flex-1">
                  <Upload className="h-4 w-4 mr-2" />
                  Submit Integration Request
                </Button>
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Download Requirements
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Integration Benefits</CardTitle>
              <CardDescription>
                Why training centers choose to join the BCCS ecosystem
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-semibold">Pilot-Driven Demand</p>
                      <p className="text-sm text-muted-foreground">Pilots increasingly request blockchain-verified records for career portability</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-semibold">Regulatory Compliance</p>
                      <p className="text-sm text-muted-foreground">Automated compliance monitoring across multiple aviation authorities</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-semibold">Competitive Advantage</p>
                      <p className="text-sm text-muted-foreground">Attract top pilots with cutting-edge blockchain credential management</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-semibold">Operational Efficiency</p>
                      <p className="text-sm text-muted-foreground">Streamlined record management and automated regulatory reporting</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-semibold">Global Recognition</p>
                      <p className="text-sm text-muted-foreground">International verification across all major aviation markets</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-semibold">Revenue Opportunities</p>
                      <p className="text-sm text-muted-foreground">30% commission on pilot subscription conversions</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}