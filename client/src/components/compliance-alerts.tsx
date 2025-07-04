import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, ArrowRight } from "lucide-react";

export default function ComplianceAlerts() {
  // In a real app, this would come from an API
  const alerts = [
    {
      id: 1,
      type: "overdue",
      title: "3 overdue certifications",
      description: "Action required",
      severity: "high",
    },
    {
      id: 2,
      type: "expiring",
      title: "5 expiring soon",
      description: "Next 30 days",
      severity: "medium",
    },
  ];

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-50 border-red-200 text-red-600";
      case "medium":
        return "bg-amber-50 border-amber-200 text-amber-600";
      default:
        return "bg-slate-50 border-slate-200 text-slate-600";
    }
  };

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case "high":
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case "medium":
        return <Clock className="w-5 h-5 text-amber-500" />;
      default:
        return <Clock className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compliance Alerts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${getAlertColor(alert.severity)}`}
            >
              <div className="flex items-center space-x-3">
                {getAlertIcon(alert.severity)}
                <div>
                  <p className="font-medium text-sm">{alert.title}</p>
                  <p className="text-xs">{alert.description}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className={`hover:bg-opacity-20 ${
                  alert.severity === "high" 
                    ? "hover:bg-red-500 text-red-600" 
                    : "hover:bg-amber-500 text-amber-600"
                }`}
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
