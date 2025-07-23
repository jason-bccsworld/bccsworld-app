import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Wrench, User, DollarSign } from 'lucide-react';

async function fetchMaintenanceSchedule() {
  const response = await fetch('/api/maintenance/schedule');
  if (!response.ok) throw new Error('Failed to fetch maintenance schedule');
  return response.json();
}

function MaintenanceSchedule() {
  const { data: schedule, isLoading } = useQuery({
    queryKey: ['maintenance-schedule'],
    queryFn: fetchMaintenanceSchedule,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-500 text-white';
      case 'HIGH': return 'bg-orange-500 text-white';
      case 'MEDIUM': return 'bg-yellow-500 text-white';
      case 'LOW': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getTaskIcon = (taskType: string) => {
    switch (taskType) {
      case 'Inspection': return <Calendar className="h-5 w-5 text-blue-600" />;
      case 'Replacement': return <Wrench className="h-5 w-5 text-red-600" />;
      case 'Routine': return <Clock className="h-5 w-5 text-green-600" />;
      default: return <Wrench className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Maintenance Schedule
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          AI-optimized maintenance planning and task management
        </p>
      </div>

      <div className="space-y-4">
        {schedule?.map((task: any) => (
          <Card key={task.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getTaskIcon(task.taskType)}
                  <div>
                    <CardTitle className="text-lg">{task.aircraftId} - {task.taskType}</CardTitle>
                    <CardDescription>{task.description}</CardDescription>
                  </div>
                </div>
                <Badge className={getPriorityColor(task.priority)}>
                  {task.priority}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="text-sm text-gray-500">Scheduled Date</div>
                    <div className="font-semibold">{task.scheduledDate}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="text-sm text-gray-500">Duration</div>
                    <div className="font-semibold">{task.estimatedDuration} hours</div>
                  </div>
                </div>

                {task.technician && (
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="text-sm text-gray-500">Technician</div>
                      <div className="font-semibold">{task.technician}</div>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="text-sm text-gray-500">Estimated Cost</div>
                    <div className="font-semibold">${task.estimatedCost?.toLocaleString()}</div>
                  </div>
                </div>
              </div>

              {task.partsRequired && task.partsRequired.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Required Parts:</h4>
                  <div className="flex flex-wrap gap-2">
                    {task.partsRequired.map((part: string, index: number) => (
                      <Badge key={index} variant="outline">
                        {part}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule Summary</CardTitle>
          <CardDescription>
            Overview of upcoming maintenance activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {schedule?.filter((t: any) => t.priority === 'CRITICAL').length || 0}
              </div>
              <div className="text-sm text-gray-500">Critical Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {schedule?.filter((t: any) => t.priority === 'HIGH').length || 0}
              </div>
              <div className="text-sm text-gray-500">High Priority</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {schedule?.filter((t: any) => t.taskType === 'Routine').length || 0}
              </div>
              <div className="text-sm text-gray-500">Routine Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                ${schedule?.reduce((sum: number, t: any) => sum + (t.estimatedCost || 0), 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">Total Cost</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MaintenanceSchedule;