import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, Download, Filter, Search, Plus, Loader2, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useEffect } from "react";

const EVENT_TYPES = [
  { value: "ground", label: "Ground Training" },
  { value: "flight", label: "Flight Training" },
  { value: "simulator", label: "Simulator Session" },
  { value: "check_ride", label: "Check Ride" },
  { value: "evaluation", label: "Evaluation" },
  { value: "proficiency_check", label: "Proficiency Check" },
  { value: "recurrent", label: "Recurrent Training" },
];

function exportCSV(events: any[]) {
  const headers = ["Student", "Instructor", "Event Type", "Date", "Duration (hrs)", "Curriculum Item", "Status", "Blockchain Hash"];
  const rows = events.map(e => [
    e.student_name || e.studentName,
    e.instructor_name || e.instructorName,
    e.event_type || e.eventType,
    e.event_date ? format(new Date(e.event_date), "yyyy-MM-dd") : "",
    e.duration_hours || e.durationHours || "",
    e.curriculum_item || e.curriculumItem || "",
    e.status,
    e.blockchain_hash || e.blockchainHash || "",
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `training-records-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function ComplianceRecords() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [logOpen, setLogOpen] = useState(false);

  // Form state
  const [studentName, setStudentName] = useState("");
  const [instructorName, setInstructorName] = useState("");
  const [eventType, setEventType] = useState("");
  const [eventDate, setEventDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [durationHours, setDurationHours] = useState("");
  const [curriculumItem, setCurriculumItem] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("completed");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) window.location.href = "/login";
  }, [isAuthenticated, isLoading]);

  const { data: trainingEvents = [], isLoading: eventsLoading } = useQuery<any[]>({
    queryKey: ["/api/training-events"],
    enabled: isAuthenticated,
  });

  const { data: students = [] } = useQuery<any[]>({
    queryKey: ["/api/students"],
    enabled: isAuthenticated,
  });

  const logMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/training-events", {
      studentName, instructorName, eventType, eventDate, durationHours, curriculumItem, notes, status
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Training event logged", description: "Record saved with blockchain hash." });
      setLogOpen(false);
      setStudentName(""); setInstructorName(""); setEventType(""); setDurationHours(""); setCurriculumItem(""); setNotes("");
    },
    onError: (err: any) => {
      toast({ title: "Failed to log event", description: err.message, variant: "destructive" });
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-emerald-100 text-emerald-800";
      case "pending": return "bg-amber-100 text-amber-800";
      case "failed": return "bg-red-100 text-red-800";
      default: return "bg-slate-100 text-slate-800";
    }
  };

  const filtered = trainingEvents.filter(e => {
    const name = (e.student_name || e.studentName || "").toLowerCase();
    const instructor = (e.instructor_name || e.instructorName || "").toLowerCase();
    const type = e.event_type || e.eventType || "";
    const matchSearch = !search || name.includes(search.toLowerCase()) || instructor.includes(search.toLowerCase());
    const matchType = typeFilter === "all" || type === typeFilter;
    return matchSearch && matchType;
  });

  if (isLoading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Training Records</h1>
          <p className="text-slate-600">Immutable training records secured on blockchain</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportCSV(filtered)} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button onClick={() => setLogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Log Training Event
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{trainingEvents.length}</p>
          <p className="text-sm text-gray-600">Total Events</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{trainingEvents.filter(e => (e.status || '') === 'completed').length}</p>
          <p className="text-sm text-gray-600">Completed</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{trainingEvents.filter(e => (e.status || '') === 'pending').length}</p>
          <p className="text-sm text-gray-600">Pending</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{[...new Set(trainingEvents.map(e => e.student_name || e.studentName))].length}</p>
          <p className="text-sm text-gray-600">Students</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle>Training Events ({filtered.length})</CardTitle>
              <CardDescription>All logged training sessions and evaluations</CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input placeholder="Search by name…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-52" />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Event type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {eventsLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Clock className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-lg font-medium">No training events found</p>
              <p className="text-sm mt-1">Use "Log Training Event" to create the first record.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium">Student</th>
                    <th className="text-left py-3 px-4 font-medium">Instructor</th>
                    <th className="text-left py-3 px-4 font-medium">Event Type</th>
                    <th className="text-left py-3 px-4 font-medium">Date</th>
                    <th className="text-left py-3 px-4 font-medium">Duration</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Blockchain</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((event: any) => (
                    <tr key={event.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium">{event.student_name || event.studentName}</td>
                      <td className="py-3 px-4 text-slate-600">{event.instructor_name || event.instructorName}</td>
                      <td className="py-3 px-4 text-slate-600 capitalize">{(event.event_type || event.eventType || "").replace("_", " ")}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {event.event_date ? format(new Date(event.event_date), "MMM dd, yyyy") : "—"}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{event.duration_hours || event.durationHours || "—"} hrs</td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusColor(event.status)}>{event.status}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        {(event.blockchain_hash || event.blockchainHash) ? (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle2 className="h-3 w-3" />
                            <code className="text-xs">{(event.blockchain_hash || event.blockchainHash).slice(0, 18)}…</code>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Training Event Dialog */}
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" /> Log Training Event
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Student Name *</Label>
                <Input
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  placeholder="Student full name"
                  list="student-names"
                />
                <datalist id="student-names">
                  {students.map((s: any) => (
                    <option key={s.id} value={`${s.first_name} ${s.last_name}`} />
                  ))}
                </datalist>
              </div>
              <div>
                <Label>Instructor Name *</Label>
                <Input value={instructorName} onChange={e => setInstructorName(e.target.value)} placeholder="Instructor name" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Event Type *</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date *</Label>
                <Input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Duration (hours)</Label>
                <Input value={durationHours} onChange={e => setDurationHours(e.target.value)} placeholder="e.g. 1.5" type="number" step="0.5" />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Curriculum Item / Topic</Label>
              <Input value={curriculumItem} onChange={e => setCurriculumItem(e.target.value)} placeholder="e.g. Part 61.109 – Pre-solo hours" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observations, performance notes…" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => logMutation.mutate()}
              disabled={logMutation.isPending || !studentName || !instructorName || !eventType || !eventDate}
            >
              {logMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Logging…</> : "Log Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
