import React from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "@/pages/Landing";
import AircraftRegistry from "@/pages/AircraftRegistry";
import InsuranceMarketplace from "@/pages/InsuranceMarketplace";
import MaintenanceMarketplace from "@/pages/MaintenanceMarketplace";
import FinanceMarketplace from "@/pages/FinanceMarketplace";
import DashboardLayout from "@/layouts/dashboard-layout";
import NotFound from "@/pages/NotFound";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      
      <Route path="/aircraft-registry">
        <DashboardLayout>
          <AircraftRegistry />
        </DashboardLayout>
      </Route>

      <Route path="/insurance-marketplace">
        <DashboardLayout>
          <InsuranceMarketplace />
        </DashboardLayout>
      </Route>

      <Route path="/maintenance-marketplace">
        <DashboardLayout>
          <MaintenanceMarketplace />
        </DashboardLayout>
      </Route>

      <Route path="/finance-marketplace">
        <DashboardLayout>
          <FinanceMarketplace />
        </DashboardLayout>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;