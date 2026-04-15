import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, Plus, Search, Loader2, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
  suspended: "bg-red-100 text-red-800",
};

export default function Students() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [certNum, setCertNum] = useState("");
  const [expectedCompletion, setExpectedCompletion] = useState("");
  const [notes, setNotes] = useState("");

  const { data: students = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/students"],
  });

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/training-events"],
  });

  const addMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/students", {
      firstName, lastName, email, phone, certificateNumber: certNum,
      expectedCompletion: expectedCompletion || undefined, notes,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      toast({ title: "Student added", description: `${firstName} ${lastName} enrolled.` });
      setAddOpen(false);
      setFirstName(""); setLastName(""); setEmail(""); setPhone(""); setCertNum(""); setExpectedCompletion(""); setNotes("");
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/students/${id}`, undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      toast({ title: "Student removed" });
    },
    onError: () => toast({ title: "Failed to remove student", variant: "destructive" }),
  });

  const eventCountByStudent = (name: string) =>
    events.filter(e => (e.student_name || e.studentName) === `${name}`).length;

  const filtered = students.filter(s => {
    const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
    const matchSearch = !search || fullName.includes(search.toLowerCase()) || (s.email || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Student Roster</h1>
          <p className="text-slate-600">Manage enrolled students and track training progress</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Student
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Enrolled", value: students.length, color: "text-blue-600" },
          { label: "Active", value: students.filter(s => s.status === "active").length, color: "text-green-600" },
          { label: "Completed", value: students.filter(s => s.status === "completed").length, color: "text-purple-600" },
          { label: "Suspended", value: students.filter(s => s.status === "suspended").length, color: "text-red-600" },
        ].map(({ label, value, color }) => (
          <Card key={label}><CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-sm text-gray-600">{label}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Student Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Students ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No students found</p>
              <p className="text-sm mt-1">{students.length === 0 ? "Add your first student to get started." : "Adjust search or filter."}</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((s: any) => {
                const fullName = `${s.first_name} ${s.last_name}`;
                const evCount = eventCountByStudent(fullName);
                const isExpiringSoon = s.expected_completion && new Date(s.expected_completion) < new Date(Date.now() + 30 * 86400000);
                return (
                  <div key={s.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-sm flex-shrink-0">
                      {s.first_name[0]}{s.last_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900">{fullName}</p>
                        <Badge className={STATUS_COLORS[s.status] || "bg-gray-100 text-gray-700"}>{s.status}</Badge>
                        {isExpiringSoon && <Badge className="bg-amber-100 text-amber-700">Completion Soon</Badge>}
                      </div>
                      <p className="text-sm text-gray-500">{s.email || "No email"} {s.certificate_number ? `· Cert: ${s.certificate_number}` : ""}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Enrolled: {s.enrollment_date ? format(new Date(s.enrollment_date), "MMM d, yyyy") : "—"}
                        {s.expected_completion ? ` · Expected completion: ${format(new Date(s.expected_completion), "MMM d, yyyy")}` : ""}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-medium text-blue-600">{evCount} events</p>
                      <p className="text-xs text-gray-400">logged</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-600 flex-shrink-0"
                      onClick={() => { if (confirm(`Remove ${fullName}?`)) deleteMutation.mutate(s.id); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Student Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Add Student</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>First Name *</Label><Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First" /></div>
              <div><Label>Last Name *</Label><Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last" /></div>
            </div>
            <div><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="student@org.com" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" /></div>
              <div><Label>Certificate #</Label><Input value={certNum} onChange={e => setCertNum(e.target.value)} placeholder="If applicable" /></div>
            </div>
            <div><Label>Expected Completion</Label><Input type="date" value={expectedCompletion} onChange={e => setExpectedCompletion(e.target.value)} /></div>
            <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any enrollment notes…" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending || !firstName || !lastName}>
              {addMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding…</> : "Add Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
