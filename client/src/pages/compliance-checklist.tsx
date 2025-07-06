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
      },
      {
        id: '1-06',
        number: '1-06',
        description: 'Has the training center certificate been properly issued and does it contain all business names under which the certificate holder may conduct operations and the address of each business office used?',
        reference: '142.5(b) and 142.11(d), V2 C10 S1 P2-1153',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '1-07',
        number: '1-07',
        description: 'Is the training center certificate prominently displayed in a place accessible to the public in the principal business office?',
        reference: '142.27(a)',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '1-08',
        number: '1-08',
        description: 'Has the training center been properly issued training specifications?',
        reference: '142.5(b), V6 C8 S1 P6-1603',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '1-09',
        number: '1-09',
        description: 'Are all exemptions, deviations or waivers properly approved and contained in the center\'s training specifications paragraph A005?',
        reference: '142.9 and 142.11(d)(2)(vi), TSpec A005',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '1-10',
        number: '1-10',
        description: 'Does the training center comply with all conditions and provisions of any exemptions, deviations, or waivers?',
        reference: 'applicable training center written procedures',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '1-11',
        number: '1-11',
        description: 'Does the training center conduct, or advertise to conduct, any training, testing, or checking that is designed to satisfy part 142 requirements that is not approved by the FAA?',
        reference: '142.31(a), V6 C8 S1',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '1-12',
        number: '1-12',
        description: 'Does the training center make any statement in its advertising relating to its certification and ratings that is false or designed to mislead?',
        reference: '142.31, V6 C8 S1 P6-1602',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '1-13',
        number: '1-13',
        description: 'Does the training center, in its advertising, differentiate between courses that have been FAA approved and those that have not?',
        reference: '142.31, V6 C8 S1 P6-1602',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '1-14',
        number: '1-14',
        description: 'If the training center utilizes a part 141 pilot school to provide training, testing, or checking, is there a training agreement between the school and the training center?',
        reference: '142.33(a), V2 C10 S1 P2-1153',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '1-15',
        number: '1-15',
        description: 'Are the training course outlines used by each such part 141 pilot school under the training agreement FAA approved?',
        reference: '142.33(c), V2 C10 S1 P2-1153',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '1-16',
        number: '1-16',
        description: 'Does the training center have written procedures to ensure management control of its personnel at satellite centers and/or remote sites?',
        reference: '142.17, V3 C54 S1 P3-4334',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '1-17',
        number: '1-17',
        description: 'Based upon review of leases, agreements and contracts, does the training center have exclusive use of flight training equipment?',
        reference: '142.15(d), V2 C10 S1 P2-1153',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '1-18',
        number: '1-18',
        description: 'Does the center conduct training for part 91 subpart K and/or part 119 air carriers?',
        reference: 'V3 C20, V3 C54 and OpSpec A031 issued to the air carrier',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '1-18-1',
        number: '1-18-1',
        description: 'If so, does the center have a procedure to advise the air carrier of changes to its core or other curriculums on which the carrier\'s programs are based?',
        reference: 'V3 C54 S5 P3-4416',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '1-18-2',
        number: '1-18-2',
        description: 'Does the center provide a means to enable contract instructors to have updated information concerning assigned operators (read files or electronic system)?',
        reference: 'V3 C54 S5 P3-4414',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '1-18-3',
        number: '1-18-3',
        description: 'Does the center provide written procedures that direct their instructors/evaluators to review a customers "read file" prior to conducting any instruction or evaluations?',
        reference: 'V3 C54 S5 P3-4414',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '1-18-4',
        number: '1-18-4',
        description: 'Does the center have or participate in standardization programs with their 91K and/or air carrier customers?',
        reference: 'V3 C54 S5 P3-4416',
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
      },
      {
        id: '2-04',
        number: '2-04',
        description: 'Are the training specifications kept current and amended as necessary?',
        reference: '142.5(c), V6 C8 S1 P6-1603',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '2-05',
        number: '2-05',
        description: 'Are the training specifications maintained at the principal business office of the training center and made available for inspection upon request?',
        reference: '142.5(d)',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '2-06',
        number: '2-06',
        description: 'Does the training center operate in accordance with the training specifications?',
        reference: '142.5(e)',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '2-07',
        number: '2-07',
        description: 'Are satellite training centers properly authorized in the training specifications?',
        reference: '142.17(a)(4) and (b)',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '2-08',
        number: '2-08',
        description: 'Do the training specifications contain the appropriate authorizations for each curriculum offered?',
        reference: '142.11(d)(2)(i), V6 C8 S1 P6-1603',
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
        description: 'Does the training center have FAA approved courseware for each approved curriculum?',
        reference: '142.39(a), V6 C8 S2 P6-1618',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '3-02',
        number: '3-02',
        description: 'Does the courseware contain a curriculum or syllabus and the minimum aircraft and flight training equipment requirements?',
        reference: '142.39(b)(1-2), V6 C8 S2 P6-1618',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '3-03',
        number: '3-03',
        description: 'Does the courseware contain minimum instructor and evaluator qualifications for each curriculum?',
        reference: '142.39(b)(3), V6 C8 S2 P6-1618',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '3-04',
        number: '3-04',
        description: 'Does the courseware contain a curriculum outline with objectives, standards, and criteria for each stage of training?',
        reference: '142.39(b)(4), V6 C8 S2 P6-1618',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '3-05',
        number: '3-05',
        description: 'Does the courseware contain the minimum equipment and facilities requirements for each curriculum?',
        reference: '142.39(b)(5), V6 C8 S2 P6-1618',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '3-06',
        number: '3-06',
        description: 'Does the courseware contain the minimum personnel requirements for each curriculum?',
        reference: '142.39(b)(6), V6 C8 S2 P6-1618',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '3-07',
        number: '3-07',
        description: 'Does the courseware contain a detailed description of the training program, including the expected accomplishments and standards for each stage of training?',
        reference: '142.39(b)(7), V6 C8 S2 P6-1618',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '3-08',
        number: '3-08',
        description: 'Does the courseware contain the expected accomplishments and standards for each stage of training?',
        reference: '142.39(b)(8), V6 C8 S2 P6-1618',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '3-09',
        number: '3-09',
        description: 'Does the courseware contain a description of the checks and tests to be used to measure a student\'s accomplishments for each stage of training?',
        reference: '142.39(b)(9), V6 C8 S2 P6-1618',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '3-10',
        number: '3-10',
        description: 'Is the courseware maintained in a condition that does not detract from the intent of the approved curriculum?',
        reference: '142.39(c), V6 C8 S2 P6-1618',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '3-11',
        number: '3-11',
        description: 'Are revisions to courseware submitted to the FAA for approval?',
        reference: '142.39(d), V6 C8 S2 P6-1618',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '3-12',
        number: '3-12',
        description: 'Are computer-based training programs used in a manner consistent with the approved curriculum?',
        reference: '142.39(e), V6 C8 S2 P6-1618',
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
        description: 'Does the training center conduct training programs in accordance with each approved curriculum?',
        reference: '142.35(a), V6 C8 S2 P6-1612',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '4-02',
        number: '4-02',
        description: 'Are initial, upgrade, recurrent, and differences training programs conducted in accordance with the approved curriculum?',
        reference: '142.35(b), V6 C8 S2 P6-1612',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '4-03',
        number: '4-03',
        description: 'Are training programs conducted by qualified instructors and evaluators?',
        reference: '142.35(c), V6 C8 S2 P6-1612',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '4-04',
        number: '4-04',
        description: 'Are training programs conducted using appropriate aircraft and flight training equipment?',
        reference: '142.35(d), V6 C8 S2 P6-1612',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '4-05',
        number: '4-05',
        description: 'Are training programs conducted in adequate facilities?',
        reference: '142.35(e), V6 C8 S2 P6-1612',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '4-06',
        number: '4-06',
        description: 'Does the training center maintain training records for each student?',
        reference: '142.35(f), V6 C8 S2 P6-1612',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '4-07',
        number: '4-07',
        description: 'Are students provided with appropriate courseware and training materials?',
        reference: '142.35(g), V6 C8 S2 P6-1612',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '4-08',
        number: '4-08',
        description: 'Are graduation certificates issued to students who successfully complete training programs?',
        reference: '142.35(h), V6 C8 S2 P6-1612',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '4-09',
        number: '4-09',
        description: 'Does the training center conduct ground training in accordance with approved curricula?',
        reference: '142.37(a), V6 C8 S2 P6-1615',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '4-10',
        number: '4-10',
        description: 'Does the training center conduct flight training in accordance with approved curricula?',
        reference: '142.37(b), V6 C8 S2 P6-1615',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '4-11',
        number: '4-11',
        description: 'Are training programs conducted within the limitations specified in the approved curriculum?',
        reference: '142.37(c), V6 C8 S2 P6-1615',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '4-12',
        number: '4-12',
        description: 'Are students evaluated in accordance with the standards specified in the approved curriculum?',
        reference: '142.37(d), V6 C8 S2 P6-1615',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      }
    ]
  },
  {
    id: 'area5',
    name: 'Instructor and Evaluator Training and Qualification',
    icon: Users,
    description: 'Review of instructor and evaluator qualifications',
    items: [
      {
        id: '5-01',
        number: '5-01',
        description: 'Does each instructor have an appropriate instructor certificate with required ratings?',
        reference: '142.47(a)(1), V3 C54 S3 P3-4364',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '5-02',
        number: '5-02',
        description: 'Does each instructor have appropriate training and experience in the aircraft type for which instruction is being given?',
        reference: '142.47(a)(2), V3 C54 S3 P3-4364',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '5-03',
        number: '5-03',
        description: 'Does each instructor have experience training students in the aircraft type for which instruction is being given?',
        reference: '142.47(a)(3), V3 C54 S3 P3-4364',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '5-04',
        number: '5-04',
        description: 'Does each instructor have satisfactorily completed an approved instructor training program?',
        reference: '142.47(a)(4), V3 C54 S3 P3-4364',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '5-05',
        number: '5-05',
        description: 'Does each evaluator hold the certificates and ratings required for the type of aircraft used for instruction?',
        reference: '142.49(a)(1), V3 C54 S4 P3-4372',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '5-06',
        number: '5-06',
        description: 'Does each evaluator have training and experience in conducting the types of checks for which the evaluator is authorized?',
        reference: '142.49(a)(2), V3 C54 S4 P3-4372',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '5-07',
        number: '5-07',
        description: 'Has each evaluator satisfactorily completed an approved evaluator training program?',
        reference: '142.49(a)(3), V3 C54 S4 P3-4372',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '5-08',
        number: '5-08',
        description: 'Are instructor training records maintained that document qualification requirements?',
        reference: '142.47(b), V3 C54 S3 P3-4370',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '5-09',
        number: '5-09',
        description: 'Are evaluator training records maintained that document qualification requirements?',
        reference: '142.49(b), V3 C54 S4 P3-4375',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '5-10',
        number: '5-10',
        description: 'Do instructors and evaluators receive recurrent training to maintain proficiency?',
        reference: '142.47(c) and 142.49(c), V3 C54 S3 P3-4370',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '5-11',
        number: '5-11',
        description: 'Are instructors and evaluators supervised by qualified training center management personnel?',
        reference: '142.47(d) and 142.49(d), V3 C54 S3 P3-4370',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '5-12',
        number: '5-12',
        description: 'Are instructor and evaluator qualification records kept current and available for inspection?',
        reference: '142.47(e) and 142.49(e), V3 C54 S3 P3-4370',
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
        description: 'Does the training center have adequate facilities for each approved curriculum?',
        reference: '142.15(a), V3 C54 S7 P3-4440',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '6-02',
        number: '6-02',
        description: 'Are training facilities properly heated, lighted, and ventilated to conform to local building, sanitation, and health codes?',
        reference: '142.15(b), V3 C54 S7 P3-4440',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '6-03',
        number: '6-03',
        description: 'Are training facilities properly equipped with furniture that is suitable for the type of training provided?',
        reference: '142.15(c), V3 C54 S7 P3-4440',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '6-04',
        number: '6-04',
        description: 'Does the training center have exclusive use of at least one classroom or training space for each curriculum offered?',
        reference: '142.15(d), V3 C54 S7 P3-4440',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '6-05',
        number: '6-05',
        description: 'Are training facilities located in buildings that meet all applicable local zoning, health, and safety requirements?',
        reference: '142.15(e), V3 C54 S7 P3-4440',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '6-06',
        number: '6-06',
        description: 'Does the training center have adequate restroom facilities that are properly maintained?',
        reference: '142.15(f), V3 C54 S7 P3-4440',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '6-07',
        number: '6-07',
        description: 'Are training facilities maintained in a manner that does not detract from instruction or student learning?',
        reference: '142.15(g), V3 C54 S7 P3-4440',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '6-08',
        number: '6-08',
        description: 'Does the training center provide adequate storage facilities for training records, courseware, and equipment?',
        reference: '142.15(h), V3 C54 S7 P3-4440',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '6-09',
        number: '6-09',
        description: 'Are satellite training center facilities adequate for the approved curricula conducted at those locations?',
        reference: '142.17(c), V3 C54 S7 P3-4440',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '6-10',
        number: '6-10',
        description: 'Do facilities provide adequate space for the number of students trained simultaneously?',
        reference: '142.15(i), V3 C54 S7 P3-4440',
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
        description: 'Does the training center have adequate flight training equipment for each approved curriculum?',
        reference: '142.15(a), V3 C54 S8 P3-4445',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '7-02',
        number: '7-02',
        description: 'Is flight training equipment maintained in accordance with applicable maintenance requirements?',
        reference: '142.15(b), V3 C54 S8 P3-4445',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '7-03',
        number: '7-03',
        description: 'Are flight simulators and training devices approved for the specific training programs?',
        reference: '142.15(c), V3 C54 S8 P3-4445',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '7-04',
        number: '7-04',
        description: 'Does the training center have exclusive use of flight training equipment during training operations?',
        reference: '142.15(d), V3 C54 S8 P3-4445',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '7-05',
        number: '7-05',
        description: 'Are flight training devices properly certified and meet the requirements for their intended use?',
        reference: '142.15(e), V3 C54 S8 P3-4445',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '7-06',
        number: '7-06',
        description: 'Is flight training equipment calibrated and maintained according to manufacturer specifications?',
        reference: '142.15(f), V3 C54 S8 P3-4445',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '7-07',
        number: '7-07',
        description: 'Are maintenance records for flight training equipment properly maintained and current?',
        reference: '142.15(g), V3 C54 S8 P3-4445',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '7-08',
        number: '7-08',
        description: 'Does flight training equipment meet the performance standards specified in the approved curriculum?',
        reference: '142.15(h), V3 C54 S8 P3-4445',
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
        description: 'Does the training center maintain student training records as required?',
        reference: '142.73(a), V3 C54 S9 P3-4450',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '8-02',
        number: '8-02',
        description: 'Are student training records maintained for the required retention period?',
        reference: '142.73(b), V3 C54 S9 P3-4450',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '8-03',
        number: '8-03',
        description: 'Do student training records contain all required information and documentation?',
        reference: '142.73(c), V3 C54 S9 P3-4450',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '8-04',
        number: '8-04',
        description: 'Are instructor and evaluator qualification records maintained and current?',
        reference: '142.71(a), V3 C54 S9 P3-4450',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '8-05',
        number: '8-05',
        description: 'Are training center records maintained in a secure location and properly organized?',
        reference: '142.71(b), V3 C54 S9 P3-4450',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '8-06',
        number: '8-06',
        description: 'Are graduation certificates issued properly and records maintained?',
        reference: '142.71(c), V3 C54 S9 P3-4450',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '8-07',
        number: '8-07',
        description: 'Are training records made available for inspection by the FAA upon request?',
        reference: '142.71(d), V3 C54 S9 P3-4450',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '8-08',
        number: '8-08',
        description: 'Does the training center maintain records of courseware revisions and approvals?',
        reference: '142.71(e), V3 C54 S9 P3-4450',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '8-09',
        number: '8-09',
        description: 'Are records of training center operations and activities properly documented?',
        reference: '142.71(f), V3 C54 S9 P3-4450',
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
        description: 'Are training operations conducted in accordance with the approved training specifications?',
        reference: '142.35(a), V3 C54 S10 P3-4455',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '9-02',
        number: '9-02',
        description: 'Does the training center conduct operations under the supervision of qualified management personnel?',
        reference: '142.35(b), V3 C54 S10 P3-4455',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '9-03',
        number: '9-03',
        description: 'Are training operations conducted using approved courseware and training materials?',
        reference: '142.35(c), V3 C54 S10 P3-4455',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '9-04',
        number: '9-04',
        description: 'Do training operations comply with all applicable safety and operational requirements?',
        reference: '142.35(d), V3 C54 S10 P3-4455',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '9-05',
        number: '9-05',
        description: 'Are training operations properly documented and recorded?',
        reference: '142.35(e), V3 C54 S10 P3-4455',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '9-06',
        number: '9-06',
        description: 'Does the training center maintain adequate operational control over all training activities?',
        reference: '142.35(f), V3 C54 S10 P3-4455',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '9-07',
        number: '9-07',
        description: 'Are training operations conducted within the scope of the training center\'s authorization?',
        reference: '142.35(g), V3 C54 S10 P3-4455',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '9-08',
        number: '9-08',
        description: 'Does the training center have procedures to ensure quality and consistency of training operations?',
        reference: '142.35(h), V3 C54 S10 P3-4455',
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
      },
      {
        id: '10-03',
        number: '10-03',
        description: 'Does the quality control system provide for effective oversight of training operations?',
        reference: '142.11(d)(3), V2 C10 S1 P2-1153',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '10-04',
        number: '10-04',
        description: 'Are quality control personnel properly qualified and independent from line training operations?',
        reference: '142.11(d)(3), V2 C10 S1 P2-1153',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '10-05',
        number: '10-05',
        description: 'Does the quality control system include regular audits of training center operations?',
        reference: '142.11(d)(3), V2 C10 S1 P2-1153',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '10-06',
        number: '10-06',
        description: 'Are quality control audit findings properly documented and corrective actions implemented?',
        reference: '142.11(d)(3), V2 C10 S1 P2-1153',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '10-07',
        number: '10-07',
        description: 'Does the quality control system provide for monitoring instructor and evaluator performance?',
        reference: '142.11(d)(3), V2 C10 S1 P2-1153',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '10-08',
        number: '10-08',
        description: 'Are quality control records maintained and available for FAA inspection?',
        reference: '142.11(d)(3), V2 C10 S1 P2-1153',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '10-09',
        number: '10-09',
        description: 'Does the quality control system address compliance with all applicable regulations?',
        reference: '142.11(d)(3), V2 C10 S1 P2-1153',
        status: 'pending',
        comments: '',
        findings: '',
        evidence: []
      },
      {
        id: '10-10',
        number: '10-10',
        description: 'Are quality control procedures regularly reviewed and updated as necessary?',
        reference: '142.11(d)(3), V2 C10 S1 P2-1153',
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