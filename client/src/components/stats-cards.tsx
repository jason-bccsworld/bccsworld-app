import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { FileText, CheckCircle, Clock, Brain } from "lucide-react";

export default function StatsCards() {
  const { data: stats = {
    totalRecords: 0,
    complianceRate: 0,
    pendingReviews: 0,
    aiAccuracy: 0,
  } } = useQuery<{
    totalRecords: number;
    complianceRate: number;
    pendingReviews: number;
    aiAccuracy: number;
  }>({
    queryKey: ["/api/dashboard/stats"],
  });

  const cards = [
    {
      title: "Total Records",
      value: stats.totalRecords?.toLocaleString() || "0",
      icon: FileText,
      color: "bg-aviation-blue/10 text-aviation-blue",
      trend: "+12% from last month",
      trendColor: "text-emerald-500",
    },
    {
      title: "Compliance Rate",
      value: `${stats.complianceRate?.toFixed(1) || "0"}%`,
      icon: CheckCircle,
      color: "bg-emerald-500/10 text-emerald-500",
      trend: "+2.1% from last week",
      trendColor: "text-emerald-500",
    },
    {
      title: "Pending Reviews",
      value: stats.pendingReviews?.toString() || "0",
      icon: Clock,
      color: "bg-amber-500/10 text-amber-500",
      trend: "+5 since yesterday",
      trendColor: "text-amber-500",
    },
    {
      title: "AI Accuracy",
      value: `${stats.aiAccuracy?.toFixed(1) || "0"}%`,
      icon: Brain,
      color: "bg-purple-500/10 text-purple-500",
      trend: "+1.4% from last week",
      trendColor: "text-emerald-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm">{card.title}</p>
                  <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${card.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className={card.trendColor}>{card.trend.split(" ")[0]}</span>
                <span className="text-slate-600 ml-1">{card.trend.split(" ").slice(1).join(" ")}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
