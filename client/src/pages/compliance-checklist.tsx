import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  FileText, 
  Users, 
  BookOpen, 
  GraduationCap,
  Building,
  Plane,
  Archive,
  PlayCircle,
  Shield,
  Download,
  Upload,
  Eye,
  ExternalLink
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  number: string;
  description: string;
  reference: string;
  status: 'compliant' | 'non-compliant' | 'pending' | 'not-applicable';
  comments: string;
  findings: string;
  evidence: string[];
}

interface InspectionArea {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  description: string;
  items: ChecklistItem[];
}

const initialData: InspectionArea[] = [
  {
    id: 'area1',
    name: 'Management and Administration',
    icon: Users,
    description: 'Management and administration of the training center',
    items: [
      {
        id: '1-01',
        number: '1-01',
        description: 'Does any person whose employment or control contributed to the revocation, suspension, or termination of a part 121, 125, 135, 141, or 142 operating certificate within the previous 5 years manage, control, or have substantial ownership of this training center?',
        reference: '142.11(e), V2 C10 S1 P2-1153',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '1-02',
        number: '1-02',
        description: 'Does the training center have a sufficient number of instructors for each curriculum?',
        reference: '142.13(a), V3 C54 S1 P3-4336',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '1-03',
        number: '1-03',
        description: 'Does the training center have a sufficient number of approved evaluators to accomplish required checks and tests within 7 calendar days of training completion?',
        reference: '142.13(b), V3 C54 S2 P3-4355',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '1-04',
        number: '1-04',
        description: 'Are the instructors and evaluators at each satellite training center under the direct supervision of management personnel of the principal training center?',
        reference: '142.17(a)(2), V3 C54 S1 P3-4334',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '1-05',
        number: '1-05',
        description: 'Does each management representative, and all personnel who conduct direct student training, understand, read, write, and fluently speak English?',
        reference: '142.13(d), V3 C54 S2 P3-4354',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      }
    ]
  },
  {
    id: 'area2',
    name: 'Training Specifications',
    icon: FileText,
    description: 'Review of training specifications content',
    items: [
      {
        id: '2-01',
        number: '2-01',
        description: 'Has the training center been properly issued training specifications?',
        reference: '142.5(a), V3 C54 S1 P3-4334, and V3 C18',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '2-02',
        number: '2-02',
        description: 'Is the information contained in Part A of the training specifications current, including names, addresses, other business names (dba), satellite center authorizations, and authorized exemptions, deviations, and waivers?',
        reference: '142.5, 142.11(d)(2)(v-vi), 142.17(a)(4) and (b)',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '2-03',
        number: '2-03',
        description: 'Does Part B of the training specifications clearly identify each approved training curriculum and the testing and/or checking authorization for each training course and location?',
        reference: '142.5(a), 142.11(d)(2)(i)',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      }
    ]
  },
  {
    id: 'area3',
    name: 'Courseware',
    icon: BookOpen,
    description: 'Review of courseware used in approved curriculums',
    items: [
      {
        id: '3-01',
        number: '3-01',
        description: 'Is the training center\'s courseware adequate to support the curriculum goals and has it been approved by the TCPM?',
        reference: 'V3 C54 S6 P3-4434',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '3-02',
        number: '3-02',
        description: 'Do lesson plans adequately describe lesson objectives, training elements, schedule, equipment, student and instructor action, and completion standards?',
        reference: 'AC 60-14, Chapter. XI, pgs. 96-102',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      }
    ]
  },
  {
    id: 'area4',
    name: 'Airman Training Programs',
    icon: GraduationCap,
    description: 'Review of airman training programs',
    items: [
      {
        id: '4-01',
        number: '4-01',
        description: 'Sample airman training program item',
        reference: 'Part 142',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      }
    ]
  },
  {
    id: 'area5',
    name: 'Instructor and Evaluator Training',
    icon: Users,
    description: 'Review of instructor and evaluator qualifications',
    items: [
      {
        id: '5-01',
        number: '5-01',
        description: 'Sample instructor qualification item',
        reference: 'Part 142',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      }
    ]
  },
  {
    id: 'area6',
    name: 'Facilities',
    icon: Building,
    description: 'Review of training facilities',
    items: [
      {
        id: '6-01',
        number: '6-01',
        description: 'Sample facilities item',
        reference: 'Part 142',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      }
    ]
  },
  {
    id: 'area7',
    name: 'Flight Training Equipment',
    icon: Plane,
    description: 'Review of flight training equipment',
    items: [
      {
        id: '7-01',
        number: '7-01',
        description: 'Sample equipment item',
        reference: 'Part 142',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      }
    ]
  },
  {
    id: 'area8',
    name: 'Records',
    icon: Archive,
    description: 'Review of record keeping requirements',
    items: [
      {
        id: '8-01',
        number: '8-01',
        description: 'Sample records item',
        reference: 'Part 142',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      }
    ]
  },
  {
    id: 'area9',
    name: 'Training Operations',
    icon: PlayCircle,
    description: 'Review of training operations',
    items: [
      {
        id: '9-01',
        number: '9-01',
        description: 'Sample training operations item',
        reference: 'Part 142',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      }
    ]
  },
  {
    id: 'area10',
    name: 'Quality Control Measures',
    icon: Shield,
    description: 'Review of quality control measures',
    items: [
      {
        id: '10-01',
        number: '10-01',
        description: 'Does the center have an approved Quality Control Program?',
        reference: '142.11, V2 C10 S1 P2-1153',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '10-02',
        number: '10-02',
        description: 'Does the Quality Program comply with the guidelines specified in Order 8900.1?',
        reference: 'V2 C10 S1 P2-1153',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      }
    ]
  }
];

// Reference URL mappings for regulatory documents
const referenceUrls: Record<string, string> = {
  '142.11': 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-142/section-142.11',
  '142.13': 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-142/section-142.13',
  '142.15': 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-142/section-142.15',
  '142.17': 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-142/section-142.17',
  '142.5': 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-142/section-142.5',
  '142.27': 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-142/section-142.27',
  '142.9': 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-142/section-142.9',
  '142.31': 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-142/section-142.31',
  '142.33': 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-142/section-142.33',
  '142.47': 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-142/section-142.47',
  '142.59': 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-142/section-142.59',
  '142.63': 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-142/section-142.63',
  '142.65': 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-142/section-142.65',
  '142.71': 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-142/section-142.71',
  '142.73': 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-142/section-142.73',
  'AC 60-14': 'https://www.faa.gov/documentlibrary/media/advisory_circular/ac_60-14.pdf',
  'V2 C10 S1': 'https://www.faa.gov/documentlibrary/media/order/8900.1/volume2/2_010_00.pdf',
  'V3 C54 S1': 'https://www.faa.gov/documentlibrary/media/order/8900.1/volume3/3_054_00.pdf',
  'V3 C54 S2': 'https://www.faa.gov/documentlibrary/media/order/8900.1/volume3/3_054_00.pdf',
  'V3 C54 S5': 'https://www.faa.gov/documentlibrary/media/order/8900.1/volume3/3_054_00.pdf',
  'V3 C54 S6': 'https://www.faa.gov/documentlibrary/media/order/8900.1/volume3/3_054_00.pdf',
  'V3 C18': 'https://www.faa.gov/documentlibrary/media/order/8900.1/volume3/3_018_00.pdf',
  'V3 C19 S6': 'https://www.faa.gov/documentlibrary/media/order/8900.1/volume3/3_019_00.pdf',
  'V3 C20': 'https://www.faa.gov/documentlibrary/media/order/8900.1/volume3/3_020_00.pdf',
  'V6 C8 S1': 'https://www.faa.gov/documentlibrary/media/order/8900.1/volume6/6_008_00.pdf',
  'Part 61': 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-61',
  '14 CFR part 60': 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-C/part-60'
};

// Function to parse reference text and create clickable links
function parseReferenceLinks(reference: string) {
  const parts = reference.split(/[,;]\s*/);
  
  return (
    <div className="space-y-1">
      {parts.map((part, index) => {
        const trimmedPart = part.trim();
        
        // Find matching URL for this reference part
        const matchingKey = Object.keys(referenceUrls).find(key => 
          trimmedPart.includes(key)
        );
        
        if (matchingKey && referenceUrls[matchingKey]) {
          return (
            <div key={index} className="flex items-center gap-2">
              <a
                href={referenceUrls[matchingKey]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
              >
                {trimmedPart}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          );
        }
        
        return (
          <div key={index} className="text-gray-600">
            {trimmedPart}
          </div>
        );
      })}
    </div>
  );
}

export default function ComplianceChecklist() {
  const [inspectionAreas, setInspectionAreas] = useState<InspectionArea[]>(initialData);
  const [selectedArea, setSelectedArea] = useState<string>('area1');
  const [inspectionDate, setInspectionDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'non-compliant':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'not-applicable':
        return <div className="h-4 w-4 bg-gray-300 rounded-full" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'compliant': 'bg-green-100 text-green-800',
      'non-compliant': 'bg-red-100 text-red-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'not-applicable': 'bg-gray-100 text-gray-800'
    };
    return (
      <Badge className={variants[status as keyof typeof variants]}>
        {status.replace('-', ' ').toUpperCase()}
      </Badge>
    );
  };

  const updateItemStatus = (areaId: string, itemId: string, field: string, value: any) => {
    setInspectionAreas(prev => 
      prev.map(area => 
        area.id === areaId 
          ? {
              ...area,
              items: area.items.map(item => 
                item.id === itemId 
                  ? { ...item, [field]: value }
                  : item
              )
            }
          : area
      )
    );
  };

  const calculateAreaProgress = (area: InspectionArea) => {
    const completedItems = area.items.filter(item => 
      item.status === 'compliant' || item.status === 'non-compliant' || item.status === 'not-applicable'
    ).length;
    return (completedItems / area.items.length) * 100;
  };

  const calculateOverallProgress = () => {
    const totalItems = inspectionAreas.reduce((sum, area) => sum + area.items.length, 0);
    const completedItems = inspectionAreas.reduce((sum, area) => 
      sum + area.items.filter(item => 
        item.status === 'compliant' || item.status === 'non-compliant' || item.status === 'not-applicable'
      ).length, 0
    );
    return (completedItems / totalItems) * 100;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Part 142 Compliance Checklist</h1>
          <p className="text-gray-600 mt-2">FAA Training Center Inspection Checklist & Job Aid</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import Checklist
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Inspection Progress</CardTitle>
          <CardDescription>Overall compliance assessment status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Overall Progress</span>
                <span>{Math.round(calculateOverallProgress())}%</span>
              </div>
              <Progress value={calculateOverallProgress()} className="h-2" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-green-600">
                  {inspectionAreas.reduce((sum, area) => 
                    sum + area.items.filter(item => item.status === 'compliant').length, 0
                  )}
                </div>
                <div className="text-gray-600">Compliant</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-red-600">
                  {inspectionAreas.reduce((sum, area) => 
                    sum + area.items.filter(item => item.status === 'non-compliant').length, 0
                  )}
                </div>
                <div className="text-gray-600">Non-Compliant</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-yellow-600">
                  {inspectionAreas.reduce((sum, area) => 
                    sum + area.items.filter(item => item.status === 'pending').length, 0
                  )}
                </div>
                <div className="text-gray-600">Pending</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-600">
                  {inspectionAreas.reduce((sum, area) => 
                    sum + area.items.filter(item => item.status === 'not-applicable').length, 0
                  )}
                </div>
                <div className="text-gray-600">N/A</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inspection Areas */}
      <Tabs value={selectedArea} onValueChange={setSelectedArea}>
        <TabsList className="grid w-full grid-cols-5 lg:grid-cols-10">
          {inspectionAreas.map((area) => (
            <TabsTrigger key={area.id} value={area.id} className="text-xs">
              Area {area.id.slice(-1)}
            </TabsTrigger>
          ))}
        </TabsList>

        {inspectionAreas.map((area) => (
          <TabsContent key={area.id} value={area.id}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <area.icon className="h-5 w-5" />
                  {area.name}
                </CardTitle>
                <CardDescription>{area.description}</CardDescription>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Area Progress</span>
                      <span>{Math.round(calculateAreaProgress(area))}%</span>
                    </div>
                    <Progress value={calculateAreaProgress(area)} className="h-1" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {area.items.map((item) => (
                    <AccordionItem key={item.id} value={item.id}>
                      <AccordionTrigger className="text-left">
                        <div className="flex items-center gap-3 w-full">
                          {getStatusIcon(item.status)}
                          <div className="flex-1">
                            <div className="font-medium">{item.number}</div>
                            <div className="text-sm text-gray-600 truncate">
                              {item.description.substring(0, 100)}...
                            </div>
                          </div>
                          {getStatusBadge(item.status)}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-4">
                          <div>
                            <h4 className="font-medium mb-2">Requirement</h4>
                            <p className="text-sm text-gray-700">{item.description}</p>
                          </div>
                          
                          <div>
                            <h4 className="font-medium mb-2">Reference</h4>
                            <div className="text-sm text-gray-600">
                              {parseReferenceLinks(item.reference)}
                            </div>
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">Compliance Status</h4>
                            <div className="flex gap-4">
                              {['compliant', 'non-compliant', 'pending', 'not-applicable'].map((status) => (
                                <label key={status} className="flex items-center gap-2 cursor-pointer">
                                  <Checkbox
                                    checked={item.status === status}
                                    onCheckedChange={() => 
                                      updateItemStatus(area.id, item.id, 'status', status)
                                    }
                                  />
                                  <span className="text-sm capitalize">
                                    {status.replace('-', ' ')}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">Comments</h4>
                            <Textarea
                              value={item.comments}
                              onChange={(e) => 
                                updateItemStatus(area.id, item.id, 'comments', e.target.value)
                              }
                              placeholder="Add comments about compliance status..."
                              className="min-h-[80px]"
                            />
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">Findings</h4>
                            <Textarea
                              value={item.findings}
                              onChange={(e) => 
                                updateItemStatus(area.id, item.id, 'findings', e.target.value)
                              }
                              placeholder="Document any findings or issues..."
                              className="min-h-[80px]"
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <FileText className="h-4 w-4 mr-2" />
                              Attach Evidence
                            </Button>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              View History
                            </Button>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}