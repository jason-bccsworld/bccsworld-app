import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, TrendingUp, Users, FileText, Download, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function FlightSchoolDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/login";
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: stats } = useQuery({
    queryKey: ["/api/flight-school/stats"],
    enabled: isAuthenticated,
  });

  const { data: trainingRecords } = useQuery({
    queryKey: ["/api/training-records"],
    enabled: isAuthenticated,
  });

  if (isLoading || !isAuthenticated) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Flight School Dashboard</h1>
          <p className="text-slate-600">Training operations and compliance monitoring</p>
        </div>
        <Button>
          <Download className="w-4 h-4 mr-2" />
          Export Reports
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">AI Confidence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-emerald-600">85%</div>
                <p className="text-xs text-slate-600">Average accuracy</p>
              </div>
              <TrendingUp className="w-8 h-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-amber-600">7</div>
                <p className="text-xs text-slate-600">Training due soon (3)</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">156</div>
                <p className="text-xs text-slate-600">Active students</p>
              </div>
              <Users className="w-8 h-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">1,247</div>
                <p className="text-xs text-slate-600">Processed this month</p>
              </div>
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Training Records */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Training Records</CardTitle>
              <CardDescription>Recent training events and certifications</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Sample training record - using your real data */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <FileText className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="font-medium">Frederick Nichols</div>
                  <div className="text-sm text-slate-600">Certificate: 2044918</div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm font-medium">ATP</div>
                  <div className="text-xs text-slate-600">5 JUN 1953</div>
                </div>
                <Badge variant="secondary">Validated</Badge>
                <div className="text-xs text-slate-600">04/18/2025</div>
              </div>
            </div>

            {/* Additional sample records */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium">John Smith</div>
                  <div className="text-sm text-slate-600">Certificate: 1234567</div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm font-medium">Private Pilot</div>
                  <div className="text-xs text-slate-600">15 MAR 1985</div>
                </div>
                <Badge variant="outline">Pending Review</Badge>
                <div className="text-xs text-slate-600">04/17/2025</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="font-medium">Sarah Johnson</div>
                  <div className="text-sm text-slate-600">Certificate: 9876543</div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm font-medium">Instrument Rating</div>
                  <div className="text-xs text-slate-600">22 SEP 1990</div>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800">Completed</Badge>
                <div className="text-xs text-slate-600">04/16/2025</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts & Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Alerts & Notifications</CardTitle>
          <CardDescription>Training due dates and compliance alerts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <div className="flex-1">
                <div className="font-medium text-amber-800">Training Due Soon</div>
                <div className="text-sm text-amber-700">3 students have training due within 30 days</div>
              </div>
              <Button variant="outline" size="sm">View Details</Button>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div className="flex-1">
                <div className="font-medium text-blue-800">Upcoming Recertification</div>
                <div className="text-sm text-blue-700">Instructor certification expires in 60 days</div>
              </div>
              <Button variant="outline" size="sm">Schedule</Button>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <div className="flex-1">
                <div className="font-medium text-emerald-800">AI Accuracy Improving</div>
                <div className="text-sm text-emerald-700">Document processing accuracy increased to 85%</div>
              </div>
              <Button variant="outline" size="sm">View Report</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}