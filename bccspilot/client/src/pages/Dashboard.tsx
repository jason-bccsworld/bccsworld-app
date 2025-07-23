import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Plane, 
  TrendingUp, 
  AlertTriangle, 
  Calendar,
  DollarSign,
  Clock,
  Target
} from "lucide-react";
import { Link } from "wouter";

interface DashboardStats {
  totalAirlines: number;
  totalPilots: number;
  pendingRetirements: number;
  activeAlerts: number;
  marketTrend: string;
  avgSalary: number;
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
    initialData: {
      totalAirlines: 5,
      totalPilots: 1247,
      pendingRetirements: 89,
      activeAlerts: 12,
      marketTrend: 'Severe Shortage',
      avgSalary: 375000
    }
  });

  const { data: marketAnalysis, isLoading: marketLoading } = useQuery({
    queryKey: ['/api/market-analysis'],
    initialData: {
      salaryTrends: {
        'Captain_B737': 420000,
        'Captain_A320': 415000,
        'FirstOfficer_B737': 210000,
        'FirstOfficer_A320': 205000
      },
      competitorActivity: [
        'American Airlines: Hiring 1,500+ pilots in 2025',
        'Delta: Planning 500+ hires with normalized tempo',
        'United: Targeting 10,000 pilots by 2032'
      ],
      trainingCapacity: {
        'ATP_Flight_School': 891,
        'CAE_Training': 650,
        'FlightSafety': 500
      }
    }
  });

  const statCards = [
    {
      title: "Total Airlines",
      value: stats?.totalAirlines || 0,
      icon: Plane,
      description: "Active airline clients",
      trend: "+2 this month"
    },
    {
      title: "Pilot Workforce",
      value: stats?.totalPilots || 0,
      icon: Users,
      description: "Total pilots tracked",
      trend: "+1.2% this quarter"
    },
    {
      title: "Retirement Risk",
      value: stats?.pendingRetirements || 0,
      icon: Clock,
      description: "Retiring in next 12 months",
      trend: "Critical period ahead"
    },
    {
      title: "Active Alerts",
      value: stats?.activeAlerts || 0,
      icon: AlertTriangle,
      description: "Requiring attention",
      trend: stats?.activeAlerts && stats.activeAlerts > 0 ? "Action needed" : "All clear"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Pilot Workforce Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            AI-powered insights for aviation workforce planning
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="destructive" className="text-sm">
            <TrendingUp className="w-4 h-4 mr-1" />
            {stats?.marketTrend || 'Loading...'}
          </Badge>
          <Link href="/forecasts">
            <Button>
              <Calendar className="w-4 h-4 mr-2" />
              Generate Forecast
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.title}
                  </CardTitle>
                  <Icon className="w-5 h-5 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {stat.description}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                  {stat.trend}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Market Intelligence Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              Salary Trends
            </CardTitle>
            <CardDescription>
              Current market compensation by position
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {marketAnalysis?.salaryTrends && Object.entries(marketAnalysis.salaryTrends).map(([position, salary]) => (
                <div key={position} className="flex justify-between items-center">
                  <span className="text-sm font-medium">
                    {position.replace('_', ' ')}
                  </span>
                  <span className="text-sm text-green-600 font-semibold">
                    ${(salary as number).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="w-5 h-5 mr-2" />
              Competitor Activity
            </CardTitle>
            <CardDescription>
              Current hiring activities in the market
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {marketAnalysis?.competitorActivity?.map((activity, index) => (
                <div key={index} className="text-sm">
                  <span className="font-medium">
                    {activity.split(':')[0]}:
                  </span>
                  <span className="text-gray-600 dark:text-gray-400 ml-2">
                    {activity.split(':')[1]}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Training Capacity Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Training Pipeline Capacity
          </CardTitle>
          <CardDescription>
            Current capacity at major training providers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {marketAnalysis?.trainingCapacity && Object.entries(marketAnalysis.trainingCapacity).map(([provider, capacity]) => (
              <div key={provider} className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {(capacity as number).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {provider.replace('_', ' ')}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common workforce planning tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/workforce">
              <Button variant="outline" className="w-full justify-start">
                <Users className="w-4 h-4 mr-2" />
                Analyze Pilot Workforce
              </Button>
            </Link>
            <Link href="/forecasts">
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="w-4 h-4 mr-2" />
                Create Hiring Forecast
              </Button>
            </Link>
            <Link href="/market">
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="w-4 h-4 mr-2" />
                View Market Intelligence
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}