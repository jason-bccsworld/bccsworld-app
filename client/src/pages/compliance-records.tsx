import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { Eye, Download, Filter, Search } from "lucide-react";
import { format } from "date-fns";

export default function ComplianceRecords() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/login";
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: trainingEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/training-events"],
    enabled: isAuthenticated,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-100 text-emerald-800";
      case "pending":
        return "bg-amber-100 text-amber-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-aviation-blue"></div>
      </div>
    );
  }

  return (
    <>
      <Header 
        title="Compliance Records"
        description="View and manage training compliance records"
      />
      
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Training Events</CardTitle>
                <CardDescription>
                  Immutable training records secured on blockchain
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Search records..."
                    className="pl-10 w-64"
                  />
                </div>
                <Button variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aviation-blue"></div>
              </div>
            ) : trainingEvents.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>No training events found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-medium text-slate-900">Student</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900">Event Type</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900">Blockchain Hash</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {trainingEvents.map((event: any) => (
                      <tr key={event.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">{event.studentName}</div>
                          {event.licenseNumber && (
                            <div className="text-sm text-slate-500">{event.licenseNumber}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{event.eventType}</td>
                        <td className="py-3 px-4 text-slate-600">
                          {format(new Date(event.eventDate), "MMM dd, yyyy")}
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={getStatusColor(event.status)}>
                            {event.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          {event.blockchainHash ? (
                            <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">
                              {event.blockchainHash}
                            </code>
                          ) : (
                            <span className="text-slate-400 text-xs">Not submitted</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
