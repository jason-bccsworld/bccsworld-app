import { useEffect } from "react";
import AgentWorkspaceHeader from "@/components/agent-workspace-header";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import MLTrainingDashboard from "@/components/ml-training-dashboard";

export default function MLTraining() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/login";
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading || !isAuthenticated) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <AgentWorkspaceHeader agentId="extraction-learning" />
      <MLTrainingDashboard />
    </div>
  );
}