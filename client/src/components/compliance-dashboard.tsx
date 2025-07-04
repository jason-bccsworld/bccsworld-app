import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  FileText,
  Users,
  Calendar
} from "lucide-react";
import { format } from "date-fns";

interface ComplianceMetric {
  title: string;
  value: string | number;
  trend: {
    direction: "up" | "down";
    percentage: number;
    period: string;
  };
  icon: React.ComponentType<any>;
  color: string;
}

export default function ComplianceDashboard() {
  const { data: stats = {
    totalRecords: 0,
    complianceRate: 0,
    pendingReviews: 0,
    aiAccuracy: 0,
  } } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: trainingEvents = [] } = useQuery({
    queryKey: ["/api/training-events"],
    select: (data) => data.slice(0, 5), // Show recent events
  });

  const metrics: ComplianceMetric[] = [
    {
      title: "Overall Compliance",
      value: `${stats.complianceRate?.toFixed(1) || 0}%`,
      trend: { direction: "up", percentage: 2.1, period: "vs last week" },
      icon: CheckCircle,
      color: "text-emerald-500",
    },
    {
      title: "Active Students",
      value: "247",
      trend: { direction: "up", percentage: 8.2, period: "vs last month" },
      icon: Users,
      color: "text-aviation-blue",
    },
    {
      title: "Training Events",
      value: stats.totalRecords || 0,
      trend: { direction: "up", percentage: 12.5, period: "vs last month" },
      icon: Calendar,
      color: "text-purple-500",
    },
    {
      title: "Pending Actions",
      value: stats.pendingReviews || 0,
      trend: { direction: "down", percentage: 5.3, period: "vs last week" },
      icon: Clock,
      color: "text-amber-500",
    },
  ];

  const upcomingExpirations = [
    {
      id: 1,
      studentName: "Sarah Johnson",
      licenseType: "Private Pilot",
      expirationDate: new Date("2024-02-15"),
      daysUntilExpiration: 15,
      severity: "medium" as const,
    },
    {
      id: 2,
      studentName: "Michael Chen",
      licenseType: "Flight Review",
      expirationDate: new Date("2024-01-28"),
      daysUntilExpiration: 3,
      severity: "high" as const,
    },
    {
      id: 3,
      studentName: "Emily Rodriguez",
      licenseType: "Instrument Rating",
      expirationDate: new Date("2024-03-10"),
      daysUntilExpiration: 45,
      severity: "low" as const,
    },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "low":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "high":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "medium":
        return <Clock className="w-4 h-4 text-amber-500" />;
      case "low":
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const TrendIcon = metric.trend.direction === "up" ? TrendingUp : TrendingDown;
          const trendColor = metric.trend.direction === "up" ? "text-emerald-500" : "text-red-500";
          
          return (
            <Card key={metric.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${metric.color}`} />
                  </div>
                  <div className={`flex items-center space-x-1 text-sm ${trendColor}`}>
                    <TrendIcon className="w-4 h-4" />
                    <span>{metric.trend.percentage}%</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">{metric.value}</h3>
                  <p className="text-sm text-slate-600">{metric.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{metric.trend.period}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Compliance Progress</CardTitle>
            <CardDescription>Current compliance status by category</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Training Records</span>
                <span className="text-sm text-slate-600">94%</span>
              </div>
              <Progress value={94} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">License Renewals</span>
                <span className="text-sm text-slate-600">87%</span>
              </div>
              <Progress value={87} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Medical Certificates</span>
                <span className="text-sm text-slate-600">91%</span>
              </div>
              <Progress value={91} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Flight Reviews</span>
                <span className="text-sm text-slate-600">78%</span>
              </div>
              <Progress value={78} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Expirations */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Expirations</CardTitle>
            <CardDescription>Licenses and certifications requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingExpirations.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border ${getSeverityColor(item.severity)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getSeverityIcon(item.severity)}
                      <div>
                        <p className="font-medium text-sm">{item.studentName}</p>
                        <p className="text-xs opacity-75">{item.licenseType}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{item.daysUntilExpiration} days</p>
                      <p className="text-xs opacity-75">
                        {format(item.expirationDate, "MMM dd")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4">
              View All Expirations
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Training Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Training Events</CardTitle>
          <CardDescription>Latest completed and pending training activities</CardDescription>
        </CardHeader>
        <CardContent>
          {trainingEvents.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>No recent training events</p>
            </div>
          ) : (
            <div className="space-y-4">
              {trainingEvents.map((event: any) => (
                <div key={event.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-aviation-blue rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900">{event.studentName}</h4>
                      <p className="text-sm text-slate-600">{event.eventType}</p>
                      <p className="text-xs text-slate-500">
                        {format(new Date(event.eventDate), "MMM dd, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge 
                      className={
                        event.status === "completed"
                          ? "bg-emerald-100 text-emerald-800"
                          : event.status === "pending"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-800"
                      }
                    >
                      {event.status}
                    </Badge>
                    {event.blockchainHash && (
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">
                        {event.blockchainHash}
                      </code>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
