import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Header from "@/components/header";
import StatsCards from "@/components/stats-cards";
import DocumentUpload from "@/components/document-upload";
import RecentActivity from "@/components/recent-activity";
import ComplianceAlerts from "@/components/compliance-alerts";
import DocumentValidation from "@/components/document-validation";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to login if not authenticated
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

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-aviation-blue"></div>
      </div>
    );
  }

  return (
    <>
      <Header 
        title="Compliance Dashboard"
        description="Monitor training compliance and document processing"
      />
      
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <StatsCards />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <DocumentUpload />
          </div>
          
          <div className="space-y-6">
            <RecentActivity />
            <ComplianceAlerts />
          </div>
        </div>
        
        <DocumentValidation />
      </main>
    </>
  );
}
