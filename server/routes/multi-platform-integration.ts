import { Router } from 'express';
import { isAuthenticated } from '../replitAuth';

const router = Router();

// Apply authentication to all multi-platform integration routes
router.use(isAuthenticated);

interface TrainingCenter {
  id: string;
  name: string;
  type: string;
  country: string;
  blockchainId: string;
  status: 'connected' | 'pending' | 'disconnected';
  recordCount: number;
  lastSync: string;
  certificateLevel: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  contactEmail: string;
  certificationNumber: string;
  legacySystem: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PilotRecord {
  id: string;
  pilotId: string;
  pilotName: string;
  pilotEmail: string;
  pilotPrivateKey: string;
  trainingCenterId: string;
  trainingCenterName: string;
  records: Array<{
    id: string;
    type: string;
    title: string;
    date: string;
    status: 'verified' | 'pending_transfer' | 'transferred';
    blockchainHash?: string;
    metadata?: Record<string, any>;
  }>;
  totalHours: number;
  certificatesEarned: number;
  requestedTransfer: boolean;
  createdAt: Date;
  updatedAt: Date;
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
  requestedDate: Date;
  estimatedCompletion?: Date;
  pilotPrivateKey: string;
  blockchainVerificationHash?: string;
  transferReason?: string;
  approvalNotes?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface IntegrationRequest {
  id: string;
  organizationName: string;
  organizationType: string;
  country: string;
  contactEmail: string;
  certificationNumber: string;
  estimatedRecords: number;
  legacySystem: string;
  integrationPriority: 'urgent' | 'high' | 'normal' | 'low';
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'integration_in_progress' | 'completed';
  submissionDate: Date;
  reviewNotes?: string;
  assignedIntegrationManager?: string;
  estimatedCompletionDate?: Date;
}

// Get platform overview statistics
router.get('/overview', async (req, res) => {
  try {
    // In production, these would come from the database
    const stats = {
      connectedCenters: 2,
      pendingCenters: 1,
      activePilots: 847,
      blockchainRecords: 2139,
      transferRequests: 12,
      recentActivity: [
        {
          id: '1',
          type: 'transfer_request',
          description: 'Captain Sarah Mitchell requested record transfer',
          details: 'From Skyward Flight Training • 2 hours ago',
          badge: '15 Records',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '2', 
          type: 'sync_completed',
          description: 'European Aviation Academy sync completed',
          details: '892 records verified • 4 hours ago',
          badge: 'Completed',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '3',
          type: 'integration_request',
          description: 'Metro Flight College requesting platform access',
          details: 'Part 141 training center • 1 day ago', 
          badge: 'Pending',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        }
      ]
    };

    res.json(stats);
  } catch (error) {
    console.error('Error getting platform overview:', error);
    res.status(500).json({ error: 'Failed to get platform overview' });
  }
});

// Get all connected training centers
router.get('/training-centers', async (req, res) => {
  try {
    // Mock data for development - in production would query database
    const trainingCenters: TrainingCenter[] = [
      {
        id: 'tc_001',
        name: 'Skyward Flight Training',
        type: 'Part 142',
        country: 'United States',
        blockchainId: 'bc_sky_001',
        status: 'connected',
        recordCount: 1247,
        lastSync: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        certificateLevel: 'Platinum',
        contactEmail: 'admin@skywardflight.com',
        certificationNumber: 'FAA-142-SKY-001',
        legacySystem: 'CATS Training Management',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date()
      },
      {
        id: 'tc_002',
        name: 'European Aviation Academy',
        type: 'EASA ATO',
        country: 'Germany',
        blockchainId: 'bc_eaa_002',
        status: 'connected',
        recordCount: 892,
        lastSync: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        certificateLevel: 'Gold',
        contactEmail: 'records@euroaviation.eu',
        certificationNumber: 'EASA-ATO-DE-002',
        legacySystem: 'FlightDeck Solutions',
        createdAt: new Date('2024-02-20'),
        updatedAt: new Date()
      },
      {
        id: 'tc_003',
        name: 'Metro Flight College',
        type: 'Part 141',
        country: 'United States',
        blockchainId: 'bc_mfc_003',
        status: 'pending',
        recordCount: 634,
        lastSync: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        certificateLevel: 'Silver',
        contactEmail: 'it@metroflight.edu',
        certificationNumber: 'FAA-141-MFC-003',
        legacySystem: 'Custom Database System',
        createdAt: new Date('2024-03-10'),
        updatedAt: new Date()
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
        certificateLevel: 'Bronze',
        contactEmail: 'training@saharaaviation.co.za',
        certificationNumber: 'SACAA-ATO-004',
        legacySystem: 'Paper Records',
        createdAt: new Date('2024-04-05'),
        updatedAt: new Date()
      }
    ];

    res.json(trainingCenters);
  } catch (error) {
    console.error('Error getting training centers:', error);
    res.status(500).json({ error: 'Failed to get training centers' });
  }
});

// Get pilot records across platforms
router.get('/pilot-records', async (req, res) => {
  try {
    const { search, centerId } = req.query;
    
    // Mock data for development
    let pilotRecords: PilotRecord[] = [
      {
        id: 'pr_001',
        pilotId: 'plt_001',
        pilotName: 'Captain Sarah Mitchell',
        pilotEmail: 'sarah.mitchell@airline.com',
        pilotPrivateKey: 'bccs_key_plt_001_verified',
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
            blockchainHash: '0x8a7f2e4d9c5b1a3f...'
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
            blockchainHash: '0x9b8c3f5e7a2d4c6b...'
          }
        ],
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date()
      },
      {
        id: 'pr_002',
        pilotId: 'plt_002',
        pilotName: 'First Officer Marcus Chen',
        pilotEmail: 'marcus.chen@pilot.com',
        pilotPrivateKey: 'bccs_key_plt_002_verified',
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
            blockchainHash: '0x7c6d2a3b8e1f5c9a...'
          }
        ],
        createdAt: new Date('2024-02-20'),
        updatedAt: new Date()
      }
    ];

    // Apply filters
    if (search) {
      const searchTerm = search.toString().toLowerCase();
      pilotRecords = pilotRecords.filter(pilot => 
        pilot.pilotName.toLowerCase().includes(searchTerm) ||
        pilot.pilotEmail.toLowerCase().includes(searchTerm) ||
        pilot.pilotId.toLowerCase().includes(searchTerm)
      );
    }

    if (centerId && centerId !== 'all') {
      pilotRecords = pilotRecords.filter(pilot => pilot.trainingCenterId === centerId);
    }

    res.json(pilotRecords);
  } catch (error) {
    console.error('Error getting pilot records:', error);
    res.status(500).json({ error: 'Failed to get pilot records' });
  }
});

// Get all data transfer requests
router.get('/transfer-requests', async (req, res) => {
  try {
    // Mock data for development
    const transferRequests: DataTransferRequest[] = [
      {
        id: 'req_001',
        pilotId: 'plt_001',
        pilotName: 'Captain Sarah Mitchell',
        pilotEmail: 'sarah.mitchell@airline.com',
        trainingCenterId: 'tc_001',
        trainingCenterName: 'Skyward Flight Training',
        recordsRequested: 15,
        status: 'pending_center_approval',
        requestedDate: new Date('2024-08-08T14:30:00Z'),
        estimatedCompletion: new Date('2024-08-12T17:00:00Z'),
        pilotPrivateKey: 'bccs_key_plt_001_verified',
        transferReason: 'Career advancement - new airline requires blockchain-verified records',
        createdAt: new Date('2024-08-08T14:30:00Z'),
        updatedAt: new Date()
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
        requestedDate: new Date('2024-08-06T09:15:00Z'),
        estimatedCompletion: new Date('2024-08-10T16:30:00Z'),
        pilotPrivateKey: 'bccs_key_plt_003_verified',
        blockchainVerificationHash: '0x4f2a8e7c3d5b9a1c...',
        transferReason: 'Regulatory compliance - international operations require verified credentials',
        createdAt: new Date('2024-08-06T09:15:00Z'),
        updatedAt: new Date()
      }
    ];

    res.json(transferRequests);
  } catch (error) {
    console.error('Error getting transfer requests:', error);
    res.status(500).json({ error: 'Failed to get transfer requests' });
  }
});

// Approve a transfer request
router.post('/transfer-requests/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalNotes } = req.body;

    // In production, would update the database
    console.log(`Approving transfer request ${id} with notes: ${approvalNotes}`);
    
    // Simulate blockchain processing
    const blockchainHash = `0x${Math.random().toString(16).substring(2, 18)}...`;
    
    res.json({
      success: true,
      message: 'Transfer request approved successfully',
      blockchainHash,
      estimatedCompletion: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (error) {
    console.error('Error approving transfer request:', error);
    res.status(500).json({ error: 'Failed to approve transfer request' });
  }
});

// Reject a transfer request
router.post('/transfer-requests/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    // In production, would update the database
    console.log(`Rejecting transfer request ${id} with reason: ${rejectionReason}`);
    
    res.json({
      success: true,
      message: 'Transfer request rejected',
      rejectionReason
    });
  } catch (error) {
    console.error('Error rejecting transfer request:', error);
    res.status(500).json({ error: 'Failed to reject transfer request' });
  }
});

// Submit new integration request
router.post('/integration-requests', async (req, res) => {
  try {
    const {
      organizationName,
      organizationType,
      country,
      contactEmail,
      certificationNumber,
      estimatedRecords,
      legacySystem,
      integrationPriority
    } = req.body;

    // Validate required fields
    if (!organizationName || !organizationType || !country || !contactEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // In production, would save to database
    const integrationRequest: IntegrationRequest = {
      id: `int_${Date.now()}`,
      organizationName,
      organizationType,
      country,
      contactEmail,
      certificationNumber: certificationNumber || '',
      estimatedRecords: parseInt(estimatedRecords) || 0,
      legacySystem: legacySystem || 'Not specified',
      integrationPriority: integrationPriority || 'normal',
      status: 'submitted',
      submissionDate: new Date()
    };

    console.log('New integration request submitted:', integrationRequest);

    res.json({
      success: true,
      message: 'Integration request submitted successfully',
      requestId: integrationRequest.id,
      estimatedReviewTime: integrationPriority === 'urgent' ? '1-2 business days' : '3-5 business days'
    });
  } catch (error) {
    console.error('Error submitting integration request:', error);
    res.status(500).json({ error: 'Failed to submit integration request' });
  }
});

// Sync training center records
router.post('/training-centers/:id/sync', async (req, res) => {
  try {
    const { id } = req.params;
    
    // In production, would trigger actual sync process
    console.log(`Starting sync for training center ${id}`);
    
    // Simulate sync process
    setTimeout(() => {
      console.log(`Sync completed for training center ${id}`);
    }, 5000);

    res.json({
      success: true,
      message: 'Sync process started',
      estimatedCompletion: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    });
  } catch (error) {
    console.error('Error starting sync:', error);
    res.status(500).json({ error: 'Failed to start sync process' });
  }
});

// Get integration benefits/features
router.get('/integration-benefits', async (req, res) => {
  try {
    const benefits = {
      pilotDriven: {
        title: 'Pilot-Driven Demand',
        description: 'Pilots increasingly request blockchain-verified records for career portability',
        impact: 'High adoption pressure from individual pilots'
      },
      compliance: {
        title: 'Regulatory Compliance',
        description: 'Automated compliance monitoring across multiple aviation authorities',
        impact: 'Reduced administrative burden'
      },
      competitive: {
        title: 'Competitive Advantage',
        description: 'Attract top pilots with cutting-edge blockchain credential management',
        impact: 'Enhanced reputation and pilot recruitment'
      },
      efficiency: {
        title: 'Operational Efficiency',
        description: 'Streamlined record management and automated regulatory reporting',
        impact: 'Cost savings and reduced errors'
      },
      global: {
        title: 'Global Recognition',
        description: 'International verification across all major aviation markets',
        impact: 'Expanded training opportunities'
      },
      revenue: {
        title: 'Revenue Opportunities',
        description: '30% commission on pilot subscription conversions',
        impact: 'Additional revenue stream'
      }
    };

    res.json(benefits);
  } catch (error) {
    console.error('Error getting integration benefits:', error);
    res.status(500).json({ error: 'Failed to get integration benefits' });
  }
});

export default router;