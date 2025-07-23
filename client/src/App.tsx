import React from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Pricing from "@/pages/pricing";
import Tutorials from "@/pages/tutorials";
import Dashboard from "@/pages/dashboard";
import DocumentImport from "@/pages/document-import";
import ComplianceRecords from "@/pages/compliance-records";
import AuditTrail from "@/pages/audit-trail";
import AdminDashboard from "@/pages/admin-dashboard";
import FlightSchoolDashboard from "@/pages/flight-school-dashboard";
import RegulatorDashboard from "@/pages/regulator-dashboard";
import MLTraining from "@/pages/ml-training";
import AnalyticsDashboard from "@/pages/analytics-dashboard";
import MobileField from "@/pages/mobile-field";
import IntegrationsDashboard from "@/pages/integrations-dashboard";
import RegulatoryCompliancePage from "@/pages/regulatory-compliance";
import RegulatoryAlerts from "@/pages/regulatory-alerts";
import LinkMonitor from "@/pages/link-monitor";
import ComplianceChecklist from "@/pages/compliance-checklist";
import TestChecklist from "@/pages/test-checklist";
import WorkingComplianceChecklist from "@/pages/working-compliance-checklist";
import Support from "@/pages/support";
import Settings from "@/pages/settings";
import FieldMapping from "@/pages/field-mapping";
import FARCompliancePage from "@/pages/far-compliance";
import TestFARRoute from "@/pages/test-far-route";
import DebugSidebar from "@/pages/debug-sidebar";
import AIAuditCompliance from "@/pages/ai-audit-compliance";
import DocumentGeneration from "@/pages/DocumentGeneration";
import BCCSMaintDashboard from "@/pages/BCCSMaintDashboard";
import NotFound from "@/pages/not-found";
import DashboardLayout from "@/layouts/dashboard-layout";
import SupportChat from "@/components/support-chat";
import { useIsMobile } from "@/hooks/use-mobile";
import ErrorBoundary from "@/components/error-boundary";
import { CacheBuster } from "@/components/cache-buster";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const isMobile = useIsMobile();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-aviation-blue"></div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/home">
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-green-600 mb-4">✅ HOME ROUTE WORKING</h1>
            <p className="text-lg text-gray-600 mb-4">The /home route is functional!</p>
            <button 
              onClick={() => window.location.href = "/dashboard"}
              className="px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </Route>
      <Route path="/pricing" component={Pricing} />
      <Route path="/tutorials" component={Tutorials} />
      <Route path="/debug-sidebar" component={DebugSidebar} />
      
      {/* Dashboard routes - available when authenticated */}
      <Route path="/dashboard">
        {!isAuthenticated ? (
          <Landing />
        ) : isMobile ? (
          <MobileField />
        ) : (
          <DashboardLayout>
            <Dashboard />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path="/far-compliance">
        {!isAuthenticated ? (
          <Landing />
        ) : (
          <DashboardLayout>
            <FARCompliancePage />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path="/ai-audit-compliance">
        {!isAuthenticated ? (
          <Landing />
        ) : (
          <DashboardLayout>
            <AIAuditCompliance />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path="/document-generation">
        {!isAuthenticated ? (
          <Landing />
        ) : (
          <DashboardLayout>
            <DocumentGeneration />
          </DashboardLayout>
        )}
      </Route>

      <Route path="/bccsmaint">
        {!isAuthenticated ? (
          <Landing />
        ) : (
          <DashboardLayout>
            <BCCSMaintDashboard />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path="/test-checklist" component={TestChecklist} />

      <Route path="/document-import">
        {!isAuthenticated ? (
          <Landing />
        ) : (
          <DashboardLayout>
            <DocumentImport />
          </DashboardLayout>
        )}
      </Route>

      <Route path="/compliance-records">
        {!isAuthenticated ? (
          <Landing />
        ) : (
          <DashboardLayout>
            <ComplianceRecords />
          </DashboardLayout>
        )}
      </Route>

      <Route path="/admin-dashboard">
        {!isAuthenticated ? (
          <Landing />
        ) : (
          <DashboardLayout>
            <AdminDashboard />
          </DashboardLayout>
        )}
      </Route>

      <Route path="/regulatory-compliance">
        {!isAuthenticated ? (
          <Landing />
        ) : (
          <DashboardLayout>
            <RegulatoryCompliancePage />
          </DashboardLayout>
        )}
      </Route>

      <Route path="/regulatory-alerts">
        {!isAuthenticated ? (
          <Landing />
        ) : (
          <DashboardLayout>
            <RegulatoryAlerts />
          </DashboardLayout>
        )}
      </Route>

      <Route path="/link-monitor">
        {!isAuthenticated ? (
          <Landing />
        ) : (
          <DashboardLayout>
            <LinkMonitor />
          </DashboardLayout>
        )}
      </Route>

      <Route path="/compliance-checklist">
        {!isAuthenticated ? (
          <Landing />
        ) : (
          <DashboardLayout>
            <ComplianceChecklist />
          </DashboardLayout>
        )}
      </Route>

      <Route path="/support">
        {!isAuthenticated ? (
          <Landing />
        ) : (
          <DashboardLayout>
            <Support />
          </DashboardLayout>
        )}
      </Route>

      <Route path="/settings">
        {!isAuthenticated ? (
          <Landing />
        ) : (
          <DashboardLayout>
            <Settings />
          </DashboardLayout>
        )}
      </Route>

      <Route path="/mobile-field" component={MobileField} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  try {
    return (
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Router />
            <SupportChat />
          </TooltipProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error("App rendering error:", error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Application Error</h1>
          <p className="text-gray-600 mb-4">The application encountered an error during initialization.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }
}

export default App;