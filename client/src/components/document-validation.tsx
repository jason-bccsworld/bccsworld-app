import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Flag } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function DocumentValidation() {
  // Fetch latest processed document and its extracted data
  const { data: documents } = useQuery({
    queryKey: ["/api/documents"],
  });

  const { data: extractedData } = useQuery({
    queryKey: ["/api/documents", documents?.[0]?.id, "extracted-data"],
    enabled: !!documents?.[0]?.id,
    queryFn: async () => {
      const response = await fetch(`/api/documents/${documents[0].id}/extracted-data`);
      if (!response.ok) throw new Error('Failed to fetch extracted data');
      return response.json();
    }
  });

  // Parse extracted data into fields
  const getFieldValue = (fieldName: string) => {
    return extractedData?.find(item => item.fieldName === fieldName);
  };

  const studentName = getFieldValue('studentName');
  const licenseNumber = getFieldValue('licenseNumber');
  const certificateType = getFieldValue('certificateType');
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Document Validation</CardTitle>
            <CardDescription>Review and validate AI-extracted data</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-600">Confidence Score:</span>
            <Badge className="bg-emerald-100 text-emerald-800">87%</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Document Preview */}
          <div>
            <h4 className="font-medium text-slate-900 mb-3">Original Document</h4>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="aspect-video bg-slate-200 rounded-lg flex items-center justify-center">
                <span className="text-slate-500">Document preview would appear here</span>
              </div>
            </div>
          </div>
          
          {/* Extracted Data */}
          <div>
            <h4 className="font-medium text-slate-900 mb-3">Extracted Data</h4>
            <div className="space-y-4">
              <div>
                <Label htmlFor="studentName">Student Name</Label>
                <div className="flex items-center space-x-2">
                  <Input 
                    id="studentName"
                    defaultValue={studentName?.extractedValue || ""}
                    className="flex-1"
                  />
                  <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                    {studentName?.confidenceScore || 0}%
                  </Badge>
                </div>
              </div>
              
              <div>
                <Label htmlFor="licenseNumber">License Number</Label>
                <div className="flex items-center space-x-2">
                  <Input 
                    id="licenseNumber"
                    defaultValue={licenseNumber?.extractedValue || ""}
                    className="flex-1"
                  />
                  <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                    {licenseNumber?.confidenceScore || 0}%
                  </Badge>
                </div>
              </div>
              
              <div>
                <Label htmlFor="certificateType">Certificate Type</Label>
                <div className="flex items-center space-x-2">
                  <Input 
                    id="certificateType"
                    defaultValue={certificateType?.extractedValue || ""}
                    className="flex-1"
                  />
                  <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                    {certificateType?.confidenceScore || 0}%
                  </Badge>
                </div>
              </div>
              
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <div className="flex items-center space-x-2">
                  <Input 
                    id="dateOfBirth"
                    defaultValue={getFieldValue('dateOfBirth')?.extractedValue || ""}
                    className="flex-1"
                  />
                  <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                    {getFieldValue('dateOfBirth')?.confidenceScore || 0}%
                  </Badge>
                </div>
              </div>
              
              <div>
                <Label htmlFor="address">Address</Label>
                <div className="flex items-center space-x-2">
                  <Input 
                    id="address"
                    defaultValue={getFieldValue('address')?.extractedValue || ""}
                    className="flex-1"
                  />
                  <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                    {getFieldValue('address')?.confidenceScore || 0}%
                  </Badge>
                </div>
              </div>
              
              <div>
                <Label htmlFor="instructor">Instructor</Label>
                <div className="flex items-center space-x-2">
                  <Input 
                    id="instructor"
                    defaultValue="David Wilson, CFI"
                    className="flex-1"
                  />
                  <Badge className="bg-emerald-100 text-emerald-800 text-xs">94%</Badge>
                </div>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <Button className="flex-1 bg-emerald-500 hover:bg-emerald-600">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve & Submit
                </Button>
                <Button variant="outline" className="flex-1">
                  <Flag className="w-4 h-4 mr-2" />
                  Flag for Review
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
