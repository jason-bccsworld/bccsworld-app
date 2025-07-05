import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, TrendingUp, Target, Zap, Download, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface TrainingMetrics {
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
    mutationFn: async () => {
      await apiRequest("/api/ml/train", {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Training Completed",
        description: "Model has been retrained with latest user feedback",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ml/metrics"] });
    },
    onError: (error) => {
      toast({
        title: "Training Failed",
        description: "Failed to trigger model training",
        variant: "destructive",
      });
    },
  });

  const exportDataMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/ml/export-data");
      return response;
    },
    onSuccess: (data) => {
      // Create download link
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ml-training-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Data Exported",
        description: "Training data downloaded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Export Failed",
        description: "Failed to export training data",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">ML Training Dashboard</h2>
          <p className="text-slate-600">Monitor and manage machine learning model improvements</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            onClick={() => exportDataMutation.mutate()}
            disabled={exportDataMutation.isPending}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
          <Button 
            onClick={() => triggerTrainingMutation.mutate()}
            disabled={triggerTrainingMutation.isPending}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${triggerTrainingMutation.isPending ? 'animate-spin' : ''}`} />
            Trigger Training
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Model Version</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{metrics?.modelVersion || "1.0.0"}</div>
                <p className="text-xs text-slate-600">Current version</p>
              </div>
              <Brain className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Corrections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-emerald-600">{metrics?.totalCorrections || 0}</div>
                <p className="text-xs text-slate-600">User feedback received</p>
              </div>
              <Target className="w-8 h-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Accuracy Improvement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {metrics?.accuracyImprovement ? `+${metrics.accuracyImprovement.toFixed(1)}%` : "0%"}
                </div>
                <p className="text-xs text-slate-600">Since last training</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Last Training</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold">
                  {metrics?.lastTrainingDate 
                    ? new Date(metrics.lastTrainingDate).toLocaleDateString()
                    : "Never"
                  }
                </div>
                <p className="text-xs text-slate-600">Training date</p>
              </div>
              <Zap className="w-8 h-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Field Accuracy Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Field Accuracy Breakdown</CardTitle>
          <CardDescription>Accuracy metrics by document field type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics?.fieldAccuracyBreakdown ? Object.entries(metrics.fieldAccuracyBreakdown).map(([field, accuracy]) => (
              <div key={field} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <Badge variant="secondary" className="text-xs">
                      {(accuracy * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <span className="text-sm text-slate-600">{(accuracy * 100).toFixed(1)}% accuracy</span>
                </div>
                <Progress value={accuracy * 100} className="h-2" />
              </div>
            )) : (
              <div className="text-center py-8 text-slate-500">
                No field accuracy data available yet. Upload and validate documents to generate metrics.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Training Status */}
      <Card>
        <CardHeader>
          <CardTitle>Training Status</CardTitle>
          <CardDescription>Current model training and feedback collection status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div>
                  <div className="font-medium text-emerald-800">Active Learning</div>
                  <div className="text-sm text-emerald-700">Model continuously learns from user corrections</div>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800">Active</Badge>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div>
                  <div className="font-medium text-blue-800">Incremental Training</div>
                  <div className="text-sm text-blue-700">Automatic retraining every 10 corrections</div>
                </div>
                <Badge className="bg-blue-100 text-blue-800">Enabled</Badge>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="font-medium mb-2">Training Progress</div>
                <div className="text-sm text-slate-600 mb-2">
                  {metrics?.totalCorrections || 0} corrections collected
                </div>
                <Progress 
                  value={((metrics?.totalCorrections || 0) % 10) * 10} 
                  className="h-2" 
                />
                <div className="text-xs text-slate-500 mt-1">
                  {10 - ((metrics?.totalCorrections || 0) % 10)} more corrections needed for next training
                </div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="font-medium mb-2">Model Performance</div>
                <div className="text-sm text-slate-600">
                  Continuously improving through user feedback loops
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}