import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, FileText, Database, Eye, Download } from "lucide-react";

interface FieldMapping {
  farSection: string;
  fieldName: string;
  description: string;
  required: boolean;
  dataType: string;
  extractionMethod: string;
  sampleValue: string;
  retentionPeriod: string;
}

const FIELD_MAPPINGS: FieldMapping[] = [
  // FAR 142.73(a)(1) - Instructor Records
  {
    farSection: "14 CFR 142.73(a)(1)",
    fieldName: "instructor_name",
    description: "Full legal name of the instructor",
    required: true,
    dataType: "Text",
    extractionMethod: "OCR + NLP Name Detection",
    sampleValue: "John A. Smith",
    retentionPeriod: "1 year after termination"
  },
  {
    farSection: "14 CFR 142.73(a)(1)",
    fieldName: "certificate_number",
    description: "FAA Certificate Number",
    required: true,
    dataType: "Alphanumeric",
    extractionMethod: "Pattern Recognition",
    sampleValue: "1234567CFI",
    retentionPeriod: "1 year after termination"
  },
  {
    farSection: "14 CFR 142.73(a)(1)",
    fieldName: "certificate_type",
    description: "Type of instructor certificate",
    required: true,
    dataType: "Text",
    extractionMethod: "NLP Classification",
    sampleValue: "Certified Flight Instructor",
    retentionPeriod: "1 year after termination"
  },
  {
    farSection: "14 CFR 142.73(a)(1)",
    fieldName: "ratings_held",
    description: "Aircraft ratings on certificate",
    required: true,
    dataType: "Array",
    extractionMethod: "Pattern Recognition + NLP",
    sampleValue: "Airplane Single Engine Land, Instrument",
    retentionPeriod: "1 year after termination"
  },
  {
    farSection: "14 CFR 142.73(a)(1)",
    fieldName: "medical_certificate_class",
    description: "Class of medical certificate",
    required: true,
    dataType: "Text",
    extractionMethod: "Pattern Recognition",
    sampleValue: "Second Class",
    retentionPeriod: "1 year after termination"
  },
  {
    farSection: "14 CFR 142.73(a)(1)",
    fieldName: "medical_expiration_date",
    description: "Medical certificate expiration date",
    required: true,
    dataType: "Date",
    extractionMethod: "Date Pattern Recognition",
    sampleValue: "12/31/2025",
    retentionPeriod: "1 year after termination"
  },
  {
    farSection: "14 CFR 142.73(a)(1)",
    fieldName: "flight_experience_hours",
    description: "Total flight hours as pilot",
    required: true,
    dataType: "Number",
    extractionMethod: "Numeric Pattern Recognition",
    sampleValue: "1,250.5",
    retentionPeriod: "1 year after termination"
  },
  {
    farSection: "14 CFR 142.73(a)(1)",
    fieldName: "ground_instruction_experience",
    description: "Ground instruction experience hours",
    required: true,
    dataType: "Number",
    extractionMethod: "Numeric Pattern Recognition",
    sampleValue: "450.0",
    retentionPeriod: "1 year after termination"
  },
  // FAR 142.73(a)(2) - Student Records
  {
    farSection: "14 CFR 142.73(a)(2)",
    fieldName: "student_name",
    description: "Full legal name of the student",
    required: true,
    dataType: "Text",
    extractionMethod: "OCR + NLP Name Detection",
    sampleValue: "Jane B. Johnson",
    retentionPeriod: "5 years"
  },
  {
    farSection: "14 CFR 142.73(a)(2)",
    fieldName: "student_certificate_number",
    description: "Student pilot certificate number",
    required: true,
    dataType: "Alphanumeric",
    extractionMethod: "Pattern Recognition",
    sampleValue: "4567890123",
    retentionPeriod: "5 years"
  },
  {
    farSection: "14 CFR 142.73(a)(2)",
    fieldName: "course_name",
    description: "Name of training course",
    required: true,
    dataType: "Text",
    extractionMethod: "NLP Course Recognition",
    sampleValue: "Private Pilot Course",
    retentionPeriod: "5 years"
  },
  {
    farSection: "14 CFR 142.73(a)(2)",
    fieldName: "course_start_date",
    description: "Course start date",
    required: true,
    dataType: "Date",
    extractionMethod: "Date Pattern Recognition",
    sampleValue: "01/15/2024",
    retentionPeriod: "5 years"
  },
  {
    farSection: "14 CFR 142.73(a)(2)",
    fieldName: "course_completion_date",
    description: "Course completion date",
    required: true,
    dataType: "Date",
    extractionMethod: "Date Pattern Recognition",
    sampleValue: "06/30/2024",
    retentionPeriod: "5 years"
  },
  {
    farSection: "14 CFR 142.73(a)(2)",
    fieldName: "training_hours_completed",
    description: "Total training hours completed",
    required: true,
    dataType: "Number",
    extractionMethod: "Numeric Pattern Recognition",
    sampleValue: "65.5",
    retentionPeriod: "5 years"
  },
  // FAR 142.73(a)(3) - Course Records
  {
    farSection: "14 CFR 142.73(a)(3)",
    fieldName: "faa_approval_number",
    description: "FAA course approval number",
    required: true,
    dataType: "Alphanumeric",
    extractionMethod: "Pattern Recognition",
    sampleValue: "BCCS-PP-2024-001",
    retentionPeriod: "Current plus 1 year"
  },
  {
    farSection: "14 CFR 142.73(a)(3)",
    fieldName: "curriculum_hours",
    description: "Total curriculum hours",
    required: true,
    dataType: "Number",
    extractionMethod: "Numeric Pattern Recognition",
    sampleValue: "65.0",
    retentionPeriod: "Current plus 1 year"
  },
  {
    farSection: "14 CFR 142.73(a)(3)",
    fieldName: "ground_training_hours",
    description: "Ground training hours in curriculum",
    required: true,
    dataType: "Number",
    extractionMethod: "Numeric Pattern Recognition",
    sampleValue: "40.0",
    retentionPeriod: "Current plus 1 year"
  },
  {
    farSection: "14 CFR 142.73(a)(3)",
    fieldName: "flight_training_hours",
    description: "Flight training hours in curriculum",
    required: true,
    dataType: "Number",
    extractionMethod: "Numeric Pattern Recognition",
    sampleValue: "25.0",
    retentionPeriod: "Current plus 1 year"
  },
  // FAR 142.73(a)(4) - Facility Records
  {
    farSection: "14 CFR 142.73(a)(4)",
    fieldName: "facility_name",
    description: "Name of training facility",
    required: true,
    dataType: "Text",
    extractionMethod: "OCR + NLP Entity Recognition",
    sampleValue: "BCCS Flight Training Center",
    retentionPeriod: "Current plus 1 year"
  },
  {
    farSection: "14 CFR 142.73(a)(4)",
    fieldName: "facility_address",
    description: "Physical address of facility",
    required: true,
    dataType: "Text",
    extractionMethod: "OCR + NLP Address Recognition",
    sampleValue: "123 Airport Road, Cityville, ST 12345",
    retentionPeriod: "Current plus 1 year"
  },
  {
    farSection: "14 CFR 142.73(a)(4)",
    fieldName: "faa_certificate_number",
    description: "FAA training center certificate number",
    required: true,
    dataType: "Alphanumeric",
    extractionMethod: "Pattern Recognition",
    sampleValue: "BCCS142TC",
    retentionPeriod: "Current plus 1 year"
  },
  {
    farSection: "14 CFR 142.73(a)(4)",
    fieldName: "equipment_inventory",
    description: "Training equipment inventory",
    required: true,
    dataType: "Array",
    extractionMethod: "NLP List Recognition",
    sampleValue: "Cessna 172 Simulator, Flight Training Device",
    retentionPeriod: "Current plus 1 year"
  }
];

export default function FieldMapping() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedField, setSelectedField] = useState<FieldMapping | null>(null);

  const categories = [
    { id: 'all', name: 'All Fields', section: 'All' },
    { id: 'instructor', name: 'Instructor Records', section: '14 CFR 142.73(a)(1)' },
    { id: 'student', name: 'Student Records', section: '14 CFR 142.73(a)(2)' },
    { id: 'course', name: 'Course Records', section: '14 CFR 142.73(a)(3)' },
    { id: 'facility', name: 'Facility Records', section: '14 CFR 142.73(a)(4)' }
  ];

  const filteredFields = selectedCategory === 'all' 
    ? FIELD_MAPPINGS 
    : FIELD_MAPPINGS.filter(field => field.farSection.includes(`(a)(${categories.find(c => c.id === selectedCategory)?.section.slice(-2) || ''})`));

  const exportFieldMapping = () => {
    const dataStr = JSON.stringify(FIELD_MAPPINGS, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'bccs142-field-mapping.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">FAR 142.73 Field Mapping</h1>
          <p className="text-gray-600 mt-2">
            Complete mapping of required fields for Part 142 compliance with extraction methods
          </p>
        </div>
        <Button onClick={exportFieldMapping} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Mapping
        </Button>
      </div>

      <Alert>
        <Database className="h-4 w-4" />
        <AlertDescription>
          <strong>Regulatory Compliance:</strong> All fields listed below are required by FAR 142.73 
          for Part 142 training centers. BCCS142 automatically extracts these fields from your documents 
          and stores them in blockchain-secured records for audit purposes.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="table" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="table">Field Mapping Table</TabsTrigger>
          <TabsTrigger value="categories">By Category</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Complete Field Mapping ({FIELD_MAPPINGS.length} fields)</CardTitle>
              <CardDescription>
                All required fields for FAR 142.73 compliance with extraction methods and retention periods
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 p-3 text-left">FAR Section</th>
                      <th className="border border-gray-200 p-3 text-left">Field Name</th>
                      <th className="border border-gray-200 p-3 text-left">Description</th>
                      <th className="border border-gray-200 p-3 text-left">Data Type</th>
                      <th className="border border-gray-200 p-3 text-left">Extraction Method</th>
                      <th className="border border-gray-200 p-3 text-left">Sample Value</th>
                      <th className="border border-gray-200 p-3 text-left">Retention</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FIELD_MAPPINGS.map((field, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="border border-gray-200 p-3">
                          <Badge variant="outline" className="text-xs">
                            {field.farSection}
                          </Badge>
                        </td>
                        <td className="border border-gray-200 p-3 font-mono text-sm">
                          {field.fieldName}
                        </td>
                        <td className="border border-gray-200 p-3">
                          {field.description}
                        </td>
                        <td className="border border-gray-200 p-3">
                          <Badge variant="secondary">
                            {field.dataType}
                          </Badge>
                        </td>
                        <td className="border border-gray-200 p-3 text-sm">
                          {field.extractionMethod}
                        </td>
                        <td className="border border-gray-200 p-3 text-sm text-gray-600">
                          {field.sampleValue}
                        </td>
                        <td className="border border-gray-200 p-3 text-sm">
                          {field.retentionPeriod}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categories.map(category => (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? "default" : "outline"}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      {category.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="md:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {categories.find(c => c.id === selectedCategory)?.name || 'All Fields'}
                  </CardTitle>
                  <CardDescription>
                    {selectedCategory === 'all' 
                      ? `All ${FIELD_MAPPINGS.length} required fields`
                      : `${filteredFields.length} fields in this category`
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredFields.map((field, index) => (
                      <div
                        key={index}
                        className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedField(field)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium">{field.fieldName}</h3>
                          <Badge variant="secondary">{field.dataType}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{field.description}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {field.farSection}
                          </Badge>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {selectedField && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Field Details: {selectedField.fieldName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Regulatory Information</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>FAR Section:</strong> {selectedField.farSection}</div>
                  <div><strong>Required:</strong> {selectedField.required ? 'Yes' : 'No'}</div>
                  <div><strong>Retention Period:</strong> {selectedField.retentionPeriod}</div>
                  <div><strong>Description:</strong> {selectedField.description}</div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-3">Technical Information</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Data Type:</strong> {selectedField.dataType}</div>
                  <div><strong>Extraction Method:</strong> {selectedField.extractionMethod}</div>
                  <div><strong>Sample Value:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{selectedField.sampleValue}</code></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}