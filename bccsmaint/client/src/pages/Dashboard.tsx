import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Wrench, DollarSign, TrendingUp, Plane, Settings } from 'lucide-react';

async function fetchFleetMetrics() {
  const response = await fetch('/api/fleet/metrics');
  if (!response.ok) throw new Error('Failed to fetch fleet metrics');
  return response.json();
}

async function fetchAlerts() {
  const response = await fetch('/api/alerts');
  if (!response.ok) throw new Error('Failed to fetch alerts');
  return response.json();
}

async function fetchFleetStatus() {
  const response = await fetch('/api/fleet/status');
  if (!response.ok) throw new Error('Failed to fetch fleet status');
  return response.json();
}

function Dashboard() {
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['fleet-metrics'],
    queryFn: fetchFleetMetrics,
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: fetchAlerts,
  });

  const { data: fleetStatus, isLoading: fleetLoading } = useQuery({
    queryKey: ['fleet-status'],
    queryFn: fetchFleetStatus,
  });

  if (metricsLoading || alertsLoading || fleetLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'LOW': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPERATIONAL': return 'text-green-600 bg-green-100';
      case 'MAINTENANCE': return 'text-yellow-600 bg-yellow-100';
      case 'GROUNDED': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            BCCSMaint Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            AI-Powered Predictive Maintenance Intelligence
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          Network Intelligence: {metrics?.networkIntelligence}%
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fleet Status</CardTitle>
            <Plane className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalAircraft}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.operationalAircraft} operational, {metrics?.maintenanceAircraft} in maintenance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prediction Accuracy</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.predictiveAccuracy}%</div>
            <Progress value={metrics?.predictiveAccuracy} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Reduction</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.costReduction}%</div>
            <p className="text-xs text-muted-foreground">
              ${metrics?.preventedDowntime}K downtime prevented
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics?.criticalAlerts}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.predictedFailures} failures predicted
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
          <TabsTrigger value="fleet">Fleet Overview</TabsTrigger>
          <TabsTrigger value="intelligence">Network Intelligence</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Predictive Maintenance Alerts</CardTitle>
              <CardDescription>
                AI-powered failure predictions requiring immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts?.map((alert: any) => (
                  <div key={alert.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                    <div className={`w-3 h-3 rounded-full ${getSeverityColor(alert.severity)} mt-2`}></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{alert.aircraftId} - {alert.component}</h4>
                        <Badge variant="outline">{alert.confidence}% confidence</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{alert.prediction}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-orange-600">
                          Time to failure: {alert.timeToFailure}
                        </span>
                        <span className="text-sm text-gray-500">
                          Cost impact: ${alert.costImpact?.toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                        <strong>Recommended Action:</strong> {alert.recommendedAction}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fleet" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fleet Overview</CardTitle>
              <CardDescription>
                Real-time status and health scores for all aircraft
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {fleetStatus?.map((aircraft: any) => (
                  <div key={aircraft.aircraftId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{aircraft.aircraftId}</h4>
                      <Badge className={getStatusColor(aircraft.status)}>
                        {aircraft.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{aircraft.model}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Health Score:</span>
                        <span className="font-medium">{aircraft.healthScore}%</span>
                      </div>
                      <Progress value={aircraft.healthScore} className="h-2" />
                      <div className="flex justify-between text-sm">
                        <span>Next Maintenance:</span>
                        <span>{aircraft.nextMaintenance}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Flight Hours:</span>
                        <span>{aircraft.flightHours?.toLocaleString()}</span>
                      </div>
                      {aircraft.criticalAlerts > 0 && (
                        <div className="flex items-center text-red-600 text-sm">
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          {aircraft.criticalAlerts} critical alert(s)
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="intelligence" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Network Intelligence</CardTitle>
              <CardDescription>
                Cross-fleet learning and predictive analytics performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Intelligence Metrics</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Cross-Fleet Learning:</span>
                      <span className="font-medium">{metrics?.networkIntelligence}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pattern Recognition:</span>
                      <span className="font-medium">94.2%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Failure Prediction:</span>
                      <span className="font-medium">{metrics?.predictiveAccuracy}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cost Optimization:</span>
                      <span className="font-medium">{metrics?.costReduction}%</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-semibold">Network Effects</h4>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm">
                      <strong>BCCSMaint Network Intelligence</strong> leverages data from 
                      {' '}{metrics?.totalAircraft} aircraft across your fleet to improve 
                      prediction accuracy by {(metrics?.networkIntelligence - 85).toFixed(1)}% 
                      compared to single-aircraft analysis.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Data Points Analyzed:</span>
                      <span>2.4M+</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Maintenance Events:</span>
                      <span>15,670</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Prediction Models:</span>
                      <span>47 active</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Dashboard;