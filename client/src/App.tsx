import React from "react";
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
import MLTraining from "@/pages/ml-training";
import AnalyticsDashboard from "@/pages/analytics-dashboard";
import MobileField from "@/pages/mobile-field";
import IntegrationsDashboard from "@/pages/integrations-dashboard";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import ErrorBoundary from "@/components/error-boundary";

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
      {!isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route component={NotFound} />
        </>
      ) : (
        <>
          <Route path="/mobile-field" component={MobileField} />
          <Route path="/">
            {isMobile ? (
              <MobileField />
            ) : (
              <div className="flex h-screen bg-slate-50">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden p-6">
                  <Dashboard />
                </div>
              </div>
            )}
          </Route>
          <Route path="/document-import">
            <div className="flex h-screen bg-slate-50">
              <Sidebar />
              <div className="flex-1 flex flex-col overflow-hidden p-6">
                <DocumentImport />
              </div>
            </div>
          </Route>
          <Route path="/compliance-records">
            <div className="flex h-screen bg-slate-50">
              <Sidebar />
              <div className="flex-1 flex flex-col overflow-hidden p-6">
                <ComplianceRecords />
              </div>
            </div>
          </Route>
          <Route path="/audit-trail">
            <div className="flex h-screen bg-slate-50">
              <Sidebar />
              <div className="flex-1 flex flex-col overflow-hidden p-6">
                <AuditTrail />
              </div>
            </div>
          </Route>
          <Route path="/admin-dashboard">
            <div className="flex h-screen bg-slate-50">
              <Sidebar />
              <div className="flex-1 flex flex-col overflow-hidden p-6">
                <AdminDashboard />
              </div>
            </div>
          </Route>
          <Route path="/flight-school-dashboard">
            <div className="flex h-screen bg-slate-50">
              <Sidebar />
              <div className="flex-1 flex flex-col overflow-hidden p-6">
                <FlightSchoolDashboard />
              </div>
            </div>
          </Route>
          <Route path="/regulator-dashboard">
            <div className="flex h-screen bg-slate-50">
              <Sidebar />
              <div className="flex-1 flex flex-col overflow-hidden p-6">
                <RegulatorDashboard />
              </div>
            </div>
          </Route>
          <Route path="/ml-training">
            <div className="flex h-screen bg-slate-50">
              <Sidebar />
              <div className="flex-1 flex flex-col overflow-hidden p-6">
                <MLTraining />
              </div>
            </div>
          </Route>
          <Route path="/analytics">
            <div className="flex h-screen bg-slate-50">
              <Sidebar />
              <div className="flex-1 flex flex-col overflow-hidden p-6">
                <AnalyticsDashboard />
              </div>
            </div>
          </Route>
          <Route path="/integrations">
            <div className="flex h-screen bg-slate-50">
              <Sidebar />
              <div className="flex-1 flex flex-col overflow-hidden p-6">
                <IntegrationsDashboard />
              </div>
            </div>
          </Route>
          <Route component={NotFound} />
        </>
      )}
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