import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router, Route, Switch } from 'wouter';
import { Toaster } from '@/components/ui/toaster';
import Dashboard from './pages/Dashboard';
import FleetManagement from './pages/FleetManagement';
import Analytics from './pages/Analytics';
import MaintenanceSchedule from './pages/MaintenanceSchedule';
import Layout from './components/Layout';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Layout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/fleet" component={FleetManagement} />
            <Route path="/analytics" component={Analytics} />
            <Route path="/maintenance" component={MaintenanceSchedule} />
            <Route>
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Page Not Found
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    The page you're looking for doesn't exist.
                  </p>
                </div>
              </div>
            </Route>
          </Switch>
        </Layout>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;