import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import DocumentImport from "@/pages/document-import";
import ComplianceRecords from "@/pages/compliance-records";
import AuditTrail from "@/pages/audit-trail";
import AdminDashboard from "@/pages/admin-dashboard";
import FlightSchoolDashboard from "@/pages/flight-school-dashboard";
import RegulatorDashboard from "@/pages/regulator-dashboard";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/sidebar";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-aviation-blue"></div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <div className="flex h-screen bg-slate-50">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Route path="/" component={Dashboard} />
            <Route path="/document-import" component={DocumentImport} />
            <Route path="/compliance-records" component={ComplianceRecords} />
            <Route path="/audit-trail" component={AuditTrail} />
            <Route path="/admin-dashboard" component={AdminDashboard} />
            <Route path="/flight-school-dashboard" component={FlightSchoolDashboard} />
            <Route path="/regulator-dashboard" component={RegulatorDashboard} />
          </div>
        </div>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
