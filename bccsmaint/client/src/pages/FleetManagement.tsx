import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plane, AlertTriangle, Wrench, Clock } from 'lucide-react';

async function fetchFleetStatus() {
  const response = await fetch('/api/fleet/status');
  if (!response.ok) throw new Error('Failed to fetch fleet status');
  return response.json();
}

function FleetManagement() {
  const { data: fleetStatus, isLoading } = useQuery({
    queryKey: ['fleet-status'],
    queryFn: fetchFleetStatus,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPERATIONAL': return 'text-green-600 bg-green-100';
      case 'MAINTENANCE': return 'text-yellow-600 bg-yellow-100';
      case 'GROUNDED': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPERATIONAL': return <Plane className="h-5 w-5 text-green-600" />;
      case 'MAINTENANCE': return <Wrench className="h-5 w-5 text-yellow-600" />;
      case 'GROUNDED': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default: return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Fleet Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive aircraft monitoring and health management
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {fleetStatus?.map((aircraft: any) => (
          <Card key={aircraft.aircraftId} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(aircraft.status)}
                  <CardTitle className="text-lg">{aircraft.aircraftId}</CardTitle>
                </div>
                <Badge className={getStatusColor(aircraft.status)}>
                  {aircraft.status}
                </Badge>
              </div>
              <CardDescription>{aircraft.model}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Health Score</span>
                  <span className="font-semibold">{aircraft.healthScore}%</span>
                </div>
                <Progress value={aircraft.healthScore} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Flight Hours</span>
                  <div className="font-semibold">{aircraft.flightHours?.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-gray-500">Engine Cycles</span>
                  <div className="font-semibold">{aircraft.engineCycles?.toLocaleString()}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Next Maintenance</span>
                  <span className="font-medium">{aircraft.nextMaintenance}</span>
                </div>
                
                {aircraft.location && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Location</span>
                    <span className="font-medium">{aircraft.location}</span>
                  </div>
                )}
              </div>

              {aircraft.criticalAlerts > 0 && (
                <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                  <div className="flex items-center text-red-600 text-sm">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Critical Alerts
                  </div>
                  <Badge variant="destructive">{aircraft.criticalAlerts}</Badge>
                </div>
              )}

              <div className="text-xs text-gray-500">
                Last updated: {new Date(aircraft.lastUpdate).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default FleetManagement;