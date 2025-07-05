import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Shield, AlertCircle, CheckCircle, FileText, Building } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function RegulatorDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: complianceStats } = useQuery({
    queryKey: ["/api/regulator/compliance-stats"],
    enabled: isAuthenticated,
  });

  const { data: organizations } = useQuery({
    queryKey: ["/api/regulator/organizations"],
    enabled: isAuthenticated,
  });

  if (isLoading || !isAuthenticated) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Regulator Dashboard</h1>
          <p className="text-slate-600">Compliance oversight and organizational monitoring</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search organizations..." 
              className="pl-9 w-64"
            />
          </div>
          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            View Report
          </Button>
        </div>
      </div>

      {/* Compliance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-emerald-600">94%</div>
                <p className="text-xs text-slate-600">Overall compliance</p>
              </div>
              <Shield className="w-8 h-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">247</div>
                <p className="text-xs text-slate-600">Under supervision</p>
              </div>
              <Building className="w-8 h-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-amber-600">12</div>
                <p className="text-xs text-slate-600">Pending investigation</p>
              </div>
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Audits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">1,847</div>
                <p className="text-xs text-slate-600">Completed this year</p>
              </div>
              <CheckCircle className="w-8 h-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Organizations Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Organizations</CardTitle>
              <CardDescription>Training organizations and their compliance status</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <FileText className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Certification</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Last Audit</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Sample organizations with realistic data */}
                <tr className="border-b">
                  <td className="py-3 px-4">
                    <div className="font-medium">BCCS Flight Training</div>
                    <div className="text-sm text-slate-600">Primary Training Center</div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge className="bg-emerald-100 text-emerald-800">Up to date</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="secondary">Active</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm">15 MAR 2025</div>
                  </td>
                  <td className="py-3 px-4">
                    <Button variant="outline" size="sm">View Details</Button>
                  </td>
                </tr>
                
                <tr className="border-b">
                  <td className="py-3 px-4">
                    <div className="font-medium">Skyline Aviation Academy</div>
                    <div className="text-sm text-slate-600">Commercial Training</div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge className="bg-amber-100 text-amber-800">Pending</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="secondary">Active</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm">02 JAN 2025</div>
                  </td>
                  <td className="py-3 px-4">
                    <Button variant="outline" size="sm">Investigate</Button>
                  </td>
                </tr>
                
                <tr className="border-b">
                  <td className="py-3 px-4">
                    <div className="font-medium">Eagle Wings Flight School</div>
                    <div className="text-sm text-slate-600">Private Pilot Training</div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge className="bg-emerald-100 text-emerald-800">Up to date</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="secondary">Active</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm">28 FEB 2025</div>
                  </td>
                  <td className="py-3 px-4">
                    <Button variant="outline" size="sm">View Details</Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Insights</CardTitle>
          <CardDescription>Key compliance metrics and trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Document Processing Accuracy</div>
                <div className="text-sm text-slate-600">85%</div>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '85%' }}></div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Audit Completion Rate</div>
                <div className="text-sm text-slate-600">94%</div>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '94%' }}></div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Blockchain Integrity</div>
                <div className="text-sm text-slate-600">100%</div>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <div className="font-medium">Recent Improvements</div>
                </div>
                <div className="text-sm text-slate-600 mt-1">
                  AI processing accuracy increased by 12% over last quarter
                </div>
              </div>
              
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <div className="font-medium">Areas for Attention</div>
                </div>
                <div className="text-sm text-slate-600 mt-1">
                  12 organizations require manual review for compliance
                </div>
              </div>
              
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <div className="font-medium">Security Status</div>
                </div>
                <div className="text-sm text-slate-600 mt-1">
                  All blockchain records verified and tamper-proof
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}