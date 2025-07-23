import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Wrench, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Zap,
  Cpu,
  Target,
  BarChart3,
  Settings,
  Plane,
  Brain,
  Network,
  ShieldCheck
} from 'lucide-react';

interface MaintenanceMetrics {
  totalAircraft: number;
  predictiveAccuracy: number;
  costReduction: number;
  uptimeImprovement: number;
  criticalAlerts: number;
  predictedFailures: number;
  preventedDowntime: number;
  networkIntelligence: number;
}

interface PredictiveAlert {
  id: string;
  aircraftId: string;
  component: string;
  prediction: string;
  confidence: number;
  timeToFailure: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendedAction: string;
}

interface FleetStatus {
  aircraftId: string;
  model: string;
  status: 'OPERATIONAL' | 'MAINTENANCE' | 'GROUNDED' | 'INSPECTION';
  healthScore: number;
  nextMaintenance: string;
  criticalAlerts: number;
  lastUpdate: string;
}

export default function BCCSMaintDashboard() {
  const [selectedAircraft, setSelectedAircraft] = useState<string | null>(null);

  // Mock data - would come from real APIs
  const { data: metrics } = useQuery({
    queryKey: ['/api/maintenance/metrics'],
    queryFn: async (): Promise<MaintenanceMetrics> => {
      return {
        totalAircraft: 247,
        predictiveAccuracy: 96.8,
        costReduction: 43.2,
        uptimeImprovement: 28.5,
        criticalAlerts: 7,
        predictedFailures: 23,
        preventedDowntime: 156,
        networkIntelligence: 94.3
      };
    }
  });

  const { data: alerts } = useQuery({
    queryKey: ['/api/maintenance/alerts'],
    queryFn: async (): Promise<PredictiveAlert[]> => {
      return [
        {
          id: 'alert-001',
          aircraftId: 'N8742K',
          component: 'Left Engine Turbine Blade',
          prediction: 'Fatigue crack development detected',
          confidence: 94.7,
          timeToFailure: '18-22 flight hours',
          severity: 'HIGH',
          recommendedAction: 'Schedule borescope inspection within 5 flights'
        },
        {
          id: 'alert-002',
          aircraftId: 'N5639M',
          component: 'Landing Gear Hydraulic System',
          prediction: 'Pressure seal degradation',
          confidence: 87.3,
          timeToFailure: '45-60 flight hours',
          severity: 'MEDIUM',
          recommendedAction: 'Monitor pressure readings, schedule maintenance'
        },
        {
          id: 'alert-003',
          aircraftId: 'N2847L',
          component: 'Avionics Cooling Fan',
          prediction: 'Bearing wear exceeding limits',
          confidence: 91.2,
          timeToFailure: '8-12 flight hours',
          severity: 'CRITICAL',
          recommendedAction: 'Ground aircraft, replace cooling fan immediately'
        }
      ];
    }
  });

  const { data: fleetStatus } = useQuery({
    queryKey: ['/api/maintenance/fleet'],
    queryFn: async (): Promise<FleetStatus[]> => {
      return [
        {
          aircraftId: 'N8742K',
          model: 'Cessna Citation CJ3+',
          status: 'OPERATIONAL',
          healthScore: 87.4,
          nextMaintenance: '2025-02-15',
          criticalAlerts: 1,
          lastUpdate: '2025-01-23T10:30:00Z'
        },
        {
          aircraftId: 'N5639M',
          model: 'Piper Seminole',
          status: 'MAINTENANCE',
          healthScore: 76.2,
          nextMaintenance: '2025-01-25',
          criticalAlerts: 0,
          lastUpdate: '2025-01-23T09:15:00Z'
        },
        {
          aircraftId: 'N2847L',
          model: 'Beechcraft King Air 350',
          status: 'GROUNDED',
          healthScore: 45.1,
          nextMaintenance: 'IMMEDIATE',
          criticalAlerts: 2,
          lastUpdate: '2025-01-23T11:45:00Z'
        }
      ];
    }
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPERATIONAL': return 'bg-green-100 text-green-800';
      case 'MAINTENANCE': return 'bg-yellow-100 text-yellow-800';
      case 'GROUNDED': return 'bg-red-100 text-red-800';
      case 'INSPECTION': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!metrics) return <div>Loading BCCSMaint dashboard...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <Wrench className="mr-3 h-8 w-8 text-blue-600" />
            BCCSMaint
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            AI-Powered Predictive Maintenance Intelligence
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className="bg-purple-100 text-purple-800">
            <Brain className="mr-1 h-3 w-3" />
            AI-Powered
          </Badge>
          <Badge className="bg-blue-100 text-blue-800">
            <Network className="mr-1 h-3 w-3" />
            Cross-Fleet Intelligence
          </Badge>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Target className="mr-2 h-4 w-4 text-green-500" />
              Prediction Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {metrics.predictiveAccuracy}%
            </div>
            <p className="text-sm text-gray-600">vs 60% industry standard</p>
            <Progress value={metrics.predictiveAccuracy} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="mr-2 h-4 w-4 text-blue-500" />
              Cost Reduction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {metrics.costReduction}%
            </div>
            <p className="text-sm text-gray-600">average per aircraft</p>
            <div className="text-xs text-green-600 mt-1">
              ${(metrics.totalAircraft * 125000 * metrics.costReduction / 100).toLocaleString()} saved
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Clock className="mr-2 h-4 w-4 text-purple-500" />
              Uptime Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {metrics.uptimeImprovement}%
            </div>
            <p className="text-sm text-gray-600">reduced downtime</p>
            <div className="text-xs text-green-600 mt-1">
              {metrics.preventedDowntime} hours prevented
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <AlertTriangle className="mr-2 h-4 w-4 text-red-500" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {metrics.criticalAlerts}
            </div>
            <p className="text-sm text-gray-600">requiring attention</p>
            <div className="text-xs text-blue-600 mt-1">
              {metrics.predictedFailures} predictions active
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Network Intelligence Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Network className="mr-2 h-5 w-5" />
            Cross-Fleet Intelligence Network
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {metrics.networkIntelligence}%
              </div>
              <p className="text-sm text-gray-600">
                Learning from {metrics.totalAircraft} aircraft across the network
              </p>
            </div>
            <Badge className="bg-green-100 text-green-800">
              Network Effect Active
            </Badge>
          </div>
          <Progress value={metrics.networkIntelligence} className="mb-2" />
          <p className="text-xs text-gray-500">
            Each connected aircraft improves predictions for the entire network
          </p>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts">Predictive Alerts</TabsTrigger>
          <TabsTrigger value="fleet">Fleet Status</TabsTrigger>
          <TabsTrigger value="analytics">AI Analytics</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="mr-2 h-5 w-5" />
                Predictive Maintenance Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alerts && alerts.length > 0 ? (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge className={getSeverityColor(alert.severity)}>
                              {alert.severity}
                            </Badge>
                            <span className="font-semibold">{alert.aircraftId}</span>
                            <span className="text-sm text-gray-500">
                              Confidence: {alert.confidence}%
                            </span>
                          </div>
                          <h4 className="font-medium text-lg mb-1">
                            {alert.component}
                          </h4>
                          <p className="text-gray-600 mb-2">{alert.prediction}</p>
                          <div className="text-sm">
                            <div className="text-red-600 font-medium">
                              Time to failure: {alert.timeToFailure}
                            </div>
                            <div className="text-blue-600 mt-1">
                              {alert.recommendedAction}
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-600">No critical alerts at this time</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fleet" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plane className="mr-2 h-5 w-5" />
                Fleet Health Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {fleetStatus && (
                <div className="space-y-4">
                  {fleetStatus.map((aircraft) => (
                    <div key={aircraft.aircraftId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="font-bold text-lg">{aircraft.aircraftId}</span>
                            <Badge className={getStatusColor(aircraft.status)}>
                              {aircraft.status}
                            </Badge>
                            {aircraft.criticalAlerts > 0 && (
                              <Badge className="bg-red-100 text-red-800">
                                {aircraft.criticalAlerts} Alert{aircraft.criticalAlerts > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                          <p className="text-gray-600 mb-2">{aircraft.model}</p>
                          <div className="flex items-center space-x-4 text-sm">
                            <div>
                              Health Score: 
                              <span className={`ml-1 font-semibold ${aircraft.healthScore >= 80 ? 'text-green-600' : aircraft.healthScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {aircraft.healthScore}%
                              </span>
                            </div>
                            <div>
                              Next Maintenance: <span className="font-medium">{aircraft.nextMaintenance}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Progress value={aircraft.healthScore} className="w-24 mb-2" />
                          <p className="text-xs text-gray-500">
                            Updated: {new Date(aircraft.lastUpdate).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="mr-2 h-5 w-5" />
                AI-Powered Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Prediction Model Performance</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Engine Components</span>
                      <span className="font-medium">97.2%</span>
                    </div>
                    <Progress value={97.2} />
                    <div className="flex justify-between">
                      <span>Hydraulic Systems</span>
                      <span className="font-medium">94.8%</span>
                    </div>
                    <Progress value={94.8} />
                    <div className="flex justify-between">
                      <span>Avionics</span>
                      <span className="font-medium">91.5%</span>
                    </div>
                    <Progress value={91.5} />
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Network Learning Impact</h4>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-600 mb-2">
                      {metrics.totalAircraft}
                    </div>
                    <p className="text-gray-600 mb-4">Aircraft contributing data</p>
                    <div className="text-lg font-semibold text-green-600">
                      +{(metrics.networkIntelligence - 85).toFixed(1)}%
                    </div>
                    <p className="text-sm text-gray-500">
                      Accuracy improvement from network effects
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                Maintenance Optimization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Clock className="h-8 w-8 text-blue-600" />
                  </div>
                  <h4 className="font-semibold mb-2">Schedule Optimization</h4>
                  <p className="text-sm text-gray-600">
                    AI-optimized maintenance windows reducing aircraft downtime by 28.5%
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <ShieldCheck className="h-8 w-8 text-green-600" />
                  </div>
                  <h4 className="font-semibold mb-2">Parts Optimization</h4>
                  <p className="text-sm text-gray-600">
                    Predictive inventory management reducing carrying costs by 35%
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-purple-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Cpu className="h-8 w-8 text-purple-600" />
                  </div>
                  <h4 className="font-semibold mb-2">Workforce Intelligence</h4>
                  <p className="text-sm text-gray-600">
                    Smart technician assignment improving productivity by 22%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}