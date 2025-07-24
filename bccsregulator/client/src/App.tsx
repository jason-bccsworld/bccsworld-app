import { Route, Router } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { RegulatoryDashboard } from "@/pages/RegulatoryDashboard";
import { OrganizationDetail } from "@/pages/OrganizationDetail";
import { ComplianceAnalytics } from "@/pages/ComplianceAnalytics";
import { TrendAnalysis } from "@/pages/TrendAnalysis";
import { AlertsCenter } from "@/pages/AlertsCenter";
import { DataFeeds } from "@/pages/DataFeeds";
import { AuditManagement } from "@/pages/AuditManagement";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Route path="/" component={RegulatoryDashboard} />
        <Route path="/organization/:id" component={OrganizationDetail} />
        <Route path="/analytics" component={ComplianceAnalytics} />
        <Route path="/trends" component={TrendAnalysis} />
        <Route path="/alerts" component={AlertsCenter} />
        <Route path="/data-feeds" component={DataFeeds} />
        <Route path="/audits" component={AuditManagement} />
        
        <Toaster />
      </div>
    </Router>
  );
}

export default App;