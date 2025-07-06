import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileText, 
  ExternalLink,
  Bell,
  Download,
  Eye,
  CheckSquare
} from 'lucide-react';
import { format } from 'date-fns';

interface ChecklistChange {
  type: 'addition' | 'modification' | 'deletion';
  area: string;
  itemNumber: string;
  description: string;
  newRequirement?: string;
  oldRequirement?: string;
  effectiveDate: string;
  reference: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  actionRequired: string;
}

interface RegulatoryAlert {
  id: string;
  type: 'checklist-update' | 'compliance-deadline' | 'new-requirement' | 'equipment-standard';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  checklistItems?: string[];
  dueDate?: string;
  actionItems: string[];
  createdAt: Date;
  acknowledged: boolean;
  source: string;
  regulation: string;
  checklistChanges?: ChecklistChange[];
}

const mockAlerts: RegulatoryAlert[] = [
  {
    id: 'alert-1',
    type: 'checklist-update',
    title: 'Part 142 Checklist Update: Quality Control Measures',
    description: 'ADDITION: New risk management system requirement for Area 10 - Quality Control Measures',
    severity: 'critical',
    checklistItems: ['10-03'],
    dueDate: '2025-12-31',
    actionItems: [
      'Implement risk management system documentation',
      'Update quality control procedures',
      'Train quality control personnel',
      'Review and update training specifications'
    ],
    createdAt: new Date('2025-07-06'),
    acknowledged: false,
    source: 'FAA',
    regulation: '14-CFR-142',
    checklistChanges: [
      {
        type: 'addition',
        area: 'Area 10 - Quality Control Measures',
        itemNumber: '10-03',
        description: 'Risk management system requirement',
        newRequirement: 'Does the center maintain a risk management system for quality control? Training centers must implement and maintain a documented risk management system as part of their quality control program, including risk assessment procedures, mitigation strategies, and regular review processes.',
        effectiveDate: '2025-09-01',
        reference: '142.11(f), V2 C10 S1 P2-1155',
        impact: 'high',
        actionRequired: 'Implement risk management system documentation and procedures'
      }
    ]
  },
  {
    id: 'alert-2',
    type: 'checklist-update',
    title: 'Part 142 Checklist Update: English Proficiency Requirements',
    description: 'MODIFICATION: Updated English proficiency standards for management and training personnel',
    severity: 'warning',
    checklistItems: ['1-05'],
    dueDate: '2025-09-01',
    actionItems: [
      'Update English proficiency testing procedures',
      'Assess current personnel against ICAO Level 4 standards',
      'Document proficiency assessments',
      'Update training specifications'
    ],
    createdAt: new Date('2025-07-06'),
    acknowledged: false,
    source: 'FAA',
    regulation: '14-CFR-142',
    checklistChanges: [
      {
        type: 'modification',
        area: 'Area 1 - Management and Administration',
        itemNumber: '1-05',
        description: 'English proficiency requirements updated',
        oldRequirement: 'Does each management representative, and all personnel who conduct direct student training, understand, read, write, and fluently speak English?',
        newRequirement: 'Does each management representative, and all personnel who conduct direct student training, demonstrate English proficiency meeting ICAO Level 4 standards in reading, writing, speaking, and listening comprehension?',
        effectiveDate: '2025-09-01',
        reference: '142.13(d), V3 C54 S2 P3-4354',
        impact: 'medium',
        actionRequired: 'Update English proficiency testing and documentation procedures'
      }
    ]
  },
  {
    id: 'alert-3',
    type: 'compliance-deadline',
    title: 'Equipment Calibration Deadline Approaching',
    description: 'Annual calibration requirements for flight training devices due within 30 days',
    severity: 'warning',
    checklistItems: ['7-01', '7-02'],
    dueDate: '2025-08-05',
    actionItems: [
      'Schedule equipment calibration',
      'Coordinate with approved calibration facility',
      'Update equipment maintenance records',
      'Prepare calibration documentation'
    ],
    createdAt: new Date('2025-07-05'),
    acknowledged: true,
    source: 'FAA',
    regulation: '14-CFR-142'
  }
];

export default function RegulatoryAlerts() {
  const [alerts, setAlerts] = useState<RegulatoryAlert[]>(mockAlerts);
  const [selectedAlert, setSelectedAlert] = useState<RegulatoryAlert | null>(null);
  const [filter, setFilter] = useState<'all' | 'unacknowledged' | 'checklist-updates'>('all');

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Bell className="h-4 w-4 text-blue-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getChangeTypeIcon = (type: string) => {
    switch (type) {
      case 'addition':
        return <div className="w-2 h-2 bg-green-500 rounded-full" />;
      case 'modification':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full" />;
      case 'deletion':
        return <div className="w-2 h-2 bg-red-500 rounded-full" />;
      default:
        return <div className="w-2 h-2 bg-gray-500 rounded-full" />;
    }
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      )
    );
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'unacknowledged') return !alert.acknowledged;
    if (filter === 'checklist-updates') return alert.type === 'checklist-update';
    return true;
  });

  const unacknowledgedCount = alerts.filter(alert => !alert.acknowledged).length;
  const checklistUpdateCount = alerts.filter(alert => alert.type === 'checklist-update').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Regulatory Alerts</h1>
          <p className="text-gray-600 mt-2">Monitor regulatory changes and audit checklist updates</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button>
            <Eye className="h-4 w-4 mr-2" />
            View History
          </Button>
        </div>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Unacknowledged Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{unacknowledgedCount}</div>
            <p className="text-xs text-gray-600 mt-1">Require immediate attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Checklist Updates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{checklistUpdateCount}</div>
            <p className="text-xs text-gray-600 mt-1">Audit checklist changes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Compliance Deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {alerts.filter(alert => alert.type === 'compliance-deadline').length}
            </div>
            <p className="text-xs text-gray-600 mt-1">Upcoming deadlines</p>
          </CardContent>
        </Card>
      </div>

      {/* Alert Filters */}
      <Tabs value={filter} onValueChange={(value) => setFilter(value as any)}>
        <TabsList>
          <TabsTrigger value="all">All Alerts ({alerts.length})</TabsTrigger>
          <TabsTrigger value="unacknowledged">Unacknowledged ({unacknowledgedCount})</TabsTrigger>
          <TabsTrigger value="checklist-updates">Checklist Updates ({checklistUpdateCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="space-y-4">
          {filteredAlerts.map((alert) => (
            <Card key={alert.id} className={`${!alert.acknowledged ? 'border-l-4 border-l-red-500' : ''}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(alert.severity)}
                    <div className="flex-1">
                      <CardTitle className="text-lg">{alert.title}</CardTitle>
                      <CardDescription className="mt-1">{alert.description}</CardDescription>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">{alert.source}</Badge>
                        <Badge variant="outline">{alert.regulation}</Badge>
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                        {alert.dueDate && (
                          <Badge variant="outline">
                            Due: {format(new Date(alert.dueDate), 'MMM dd, yyyy')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!alert.acknowledged && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => acknowledgeAlert(alert.id)}
                      >
                        <CheckSquare className="h-4 w-4 mr-2" />
                        Acknowledge
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedAlert(alert)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {alert.checklistChanges && alert.checklistChanges.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Checklist Changes:</h4>
                    {alert.checklistChanges.map((change, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          {getChangeTypeIcon(change.type)}
                          <span className="font-medium capitalize">{change.type}</span>
                          <Badge variant="outline">{change.itemNumber}</Badge>
                          <Badge variant="outline">{change.area}</Badge>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{change.description}</p>
                        {change.newRequirement && (
                          <div className="bg-green-50 p-2 rounded text-sm">
                            <strong>New Requirement:</strong> {change.newRequirement}
                          </div>
                        )}
                        {change.oldRequirement && (
                          <div className="bg-yellow-50 p-2 rounded text-sm mt-2">
                            <strong>Previous Requirement:</strong> {change.oldRequirement}
                          </div>
                        )}
                        <div className="flex justify-between items-center mt-2 text-sm text-gray-600">
                          <span>Effective: {format(new Date(change.effectiveDate), 'MMM dd, yyyy')}</span>
                          <span>Reference: {change.reference}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {alert.actionItems && alert.actionItems.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Action Items:</h4>
                    <ul className="space-y-1">
                      {alert.actionItems.map((item, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {filteredAlerts.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No alerts found</h3>
            <p className="text-gray-600">All regulatory requirements are up to date.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}