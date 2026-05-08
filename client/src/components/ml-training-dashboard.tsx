import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, TrendingUp, Target, Zap, Download, RefreshCw, Users, FileText, GraduationCap, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface TrainingMetrics {
  totalFormSubmissions: number;
  totalTrainingEvents: number;
  totalStudents: number;
  totalInstructors: number;
  totalTemplates: number;
  totalCorrections: number;
  accuracyImprovement: number;
  fieldAccuracyBreakdown: Record<string, number>;
  modelVersion: string;
  lastTrainingDate: string;
}

export default function MLTrainingDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: metrics, isLoading } = useQuery<TrainingMetrics>({
    queryKey: ["/api/ml/metrics"],
  });

  const triggerTrainingMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/ml/train"),
    onSuccess: () => {
      toast({ title: "Training Run Recorded", description: "Model version updated with current dataset." });
      queryClient.invalidateQueries({ queryKey: ["/api/ml/metrics"] });
    },
    onError: () => {
      toast({ title: "Training Failed", description: "Could not record training run.", variant: "destructive" });
    },
  });

  const handleExport = () => {
    const a = document.createElement("a");
    a.href = "/api/ml/export-data";
    a.download = `ml-training-data-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast({ title: "Downloading", description: "Training data export started." });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded mb-4 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-28 bg-slate-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalSamples = (metrics?.totalFormSubmissions ?? 0) + (metrics?.totalTrainingEvents ?? 0);
  const fieldEntries = Object.entries(metrics?.fieldAccuracyBreakdown ?? {}).slice(0, 10);
  const lastTrained = metrics?.lastTrainingDate && metrics.lastTrainingDate !== "Not yet trained"
    ? new Date(metrics.lastTrainingDate).toLocaleString()
    : "Not yet trained";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">ML Training Data</h2>
          <p className="text-slate-600">All platform data available for model training and export</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
          <Button
            onClick={() => triggerTrainingMutation.mutate()}
            disabled={triggerTrainingMutation.isPending}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${triggerTrainingMutation.isPending ? "animate-spin" : ""}`} />
            Record Training Run
          </Button>
        </div>
      </div>

      {/* Data Sources */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide">Form Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-blue-600">{metrics?.totalFormSubmissions ?? 0}</div>
                <p className="text-xs text-slate-500 mt-0.5">Completed form records</p>
              </div>
              <FileText className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide">Training Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-emerald-600">{metrics?.totalTrainingEvents ?? 0}</div>
                <p className="text-xs text-slate-500 mt-0.5">Compliance records</p>
              </div>
              <Target className="w-8 h-8 text-emerald-200" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide">Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-purple-600">{metrics?.totalStudents ?? 0}</div>
                <p className="text-xs text-slate-500 mt-0.5">Enrolled profiles</p>
              </div>
              <BookOpen className="w-8 h-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide">Instructors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-amber-600">{metrics?.totalInstructors ?? 0}</div>
                <p className="text-xs text-slate-500 mt-0.5">Active records</p>
              </div>
              <GraduationCap className="w-8 h-8 text-amber-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Model Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Training Samples</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Brain className="w-8 h-8 text-blue-600 flex-shrink-0" />
              <div>
                <div className="text-2xl font-bold text-blue-600">{totalSamples.toLocaleString()}</div>
                <p className="text-xs text-slate-500">Forms + events combined</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Model Version</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-amber-500 flex-shrink-0" />
              <div>
                <div className="text-lg font-bold font-mono">{metrics?.modelVersion ?? "baseline-v0"}</div>
                <p className="text-xs text-slate-500">Last trained: {lastTrained}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Projected Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-emerald-600 flex-shrink-0" />
              <div>
                <div className="text-2xl font-bold text-emerald-600">
                  {metrics?.accuracyImprovement?.toFixed(1) ?? "60.0"}%
                </div>
                <p className="text-xs text-slate-500">Improves as data grows</p>
              </div>
            </div>
            <Progress value={metrics?.accuracyImprovement ?? 60} className="mt-2 h-1.5" />
          </CardContent>
        </Card>
      </div>

      {/* Field Coverage from Approved Submissions */}
      <Card>
        <CardHeader>
          <CardTitle>Form Field Coverage</CardTitle>
          <CardDescription>
            Fields present in approved form submissions — these become labeled training samples.
            {fieldEntries.length === 0 && " Approve some form submissions to see field coverage."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {fieldEntries.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <FileText size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No approved submissions yet</p>
              <p className="text-sm mt-1">Go to Digital Forms → Document Repository → approve a submission to generate field data.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {fieldEntries.map(([field, pct]) => (
                <div key={field} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium capitalize text-slate-700">
                      {field.replace(/_/g, " ").replace(/([A-Z])/g, " $1").trim()}
                    </span>
                    <Badge variant="secondary">{pct}% filled</Badge>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* What gets exported */}
      <Card>
        <CardHeader>
          <CardTitle>What's Included in Export</CardTitle>
          <CardDescription>The JSON export bundles all platform data into a structured format for ML training pipelines.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { label: "Form Submissions", desc: `${metrics?.totalFormSubmissions ?? 0} records with all field values, template context, and FAA source`, icon: FileText },
              { label: "Training Events", desc: `${metrics?.totalTrainingEvents ?? 0} compliance records with student, instructor, and curriculum data`, icon: Target },
              { label: "Student Profiles", desc: `${metrics?.totalStudents ?? 0} enrolled student records`, icon: BookOpen },
              { label: "Instructor Records", desc: `${metrics?.totalInstructors ?? 0} instructor records with certifications`, icon: GraduationCap },
            ].map(({ label, desc, icon: Icon }) => (
              <div key={label} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50">
                <Icon className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-sm text-slate-800">{label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
