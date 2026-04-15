import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ExternalLink, AlertTriangle, FileText, RefreshCw } from "lucide-react";
import { format } from "date-fns";

const TYPE_LABELS: Record<string, string> = {
  safo: "SAFO",
  info: "InFO",
  notice: "Policy Notice",
  bulletin: "Bulletin",
  advisory_circular: "Advisory Circular",
};

const TYPE_COLORS: Record<string, string> = {
  safo: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
  notice: "bg-amber-100 text-amber-800",
  bulletin: "bg-purple-100 text-purple-700",
  advisory_circular: "bg-green-100 text-green-700",
};

const PRIORITY_COLORS: Record<string, string> = {
  immediate: "bg-red-100 text-red-700",
  urgent: "bg-orange-100 text-orange-700",
  routine: "bg-gray-100 text-gray-700",
};

// Fallback seed data for when no docs are in DB yet
const FALLBACK_DOCS = [
  {
    id: 1, document_number: "SAFO 22012", title: "Crew Resource Management Training Requirements", document_type: "safo",
    priority: "urgent", published_date: "2022-09-15", effective_date: "2022-10-01",
    summary: "Clarifies CRM training requirements for Part 121 and Part 135 operators including simulator requirements.",
    url: "https://www.faa.gov/other_visit/aviation_industry/airline_operators/airline_safety/safo/all_safos/media/2022/SAFO22012.pdf",
    is_active: true, far_parts: ["121", "135"],
  },
  {
    id: 2, document_number: "InFO 22019", title: "Winter Operations Safety Reminder", document_type: "info",
    priority: "routine", published_date: "2022-11-01", effective_date: "2022-11-01",
    summary: "Reminds pilots and operators of requirements related to ground deicing and anti-icing procedures.",
    url: "https://www.faa.gov/other_visit/aviation_industry/airline_operators/airline_safety/info/all_infos/media/2022/IN22019.pdf",
    is_active: true, far_parts: ["121", "135", "91"],
  },
  {
    id: 3, document_number: "SAFO 23003", title: "Runway Incursion Prevention Program Updates", document_type: "safo",
    priority: "urgent", published_date: "2023-02-20", effective_date: "2023-03-01",
    summary: "Updated guidance on runway safety procedures including hotspot awareness and LAHSO operations.",
    url: "https://www.faa.gov/other_visit/aviation_industry/airline_operators/airline_safety/safo/all_safos/media/2023/SAFO23003.pdf",
    is_active: true, far_parts: ["91", "121", "135", "141"],
  },
  {
    id: 4, document_number: "AC 61-65J", title: "Certification: Pilots and Flight and Ground Instructors", document_type: "advisory_circular",
    priority: "routine", published_date: "2023-08-01", effective_date: "2023-08-15",
    summary: "Provides revised guidance to FAA Aviation Safety Inspectors (ASIs) and applicants seeking pilot certificates.",
    url: "https://www.faa.gov/regulations_policies/advisory_circulars/index.cfm/go/document.information/documentID/1042507",
    is_active: true, far_parts: ["61", "141"],
  },
  {
    id: 5, document_number: "InFO 23011", title: "Pilot Proficiency and Currency Requirements Review", document_type: "info",
    priority: "routine", published_date: "2023-06-12", effective_date: "2023-06-12",
    summary: "Guidance for operators and pilots on maintaining proficiency and currency in modern aircraft systems.",
    url: "https://www.faa.gov/other_visit/aviation_industry/airline_operators/airline_safety/info/all_infos/media/2023/IN23011.pdf",
    is_active: true, far_parts: ["61", "135"],
  },
  {
    id: 6, document_number: "SAFO 23009", title: "Aircraft Performance Data Verification Requirements", document_type: "safo",
    priority: "immediate", published_date: "2023-09-10", effective_date: "2023-10-01",
    summary: "Immediate action required for all Part 121 and 135 operators to verify takeoff and landing performance data.",
    url: "https://www.faa.gov/other_visit/aviation_industry/airline_operators/airline_safety/safo/all_safos/media/2023/SAFO23009.pdf",
    is_active: true, far_parts: ["121", "135"],
  },
];

export default function SafoInfo() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const { data: apiDocs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/policy-documents", typeFilter],
    queryFn: async () => {
      const url = typeFilter === "all" ? "/api/policy-documents" : `/api/policy-documents?type=${typeFilter}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const docs = apiDocs.length > 0 ? apiDocs : FALLBACK_DOCS;

  const filtered = docs.filter(d => {
    const title = (d.title || "").toLowerCase();
    const docNum = (d.document_number || d.documentNumber || "").toLowerCase();
    const type = d.document_type || d.documentType || "";
    const priority = (d.priority || "").toLowerCase();
    const matchSearch = !search || title.includes(search.toLowerCase()) || docNum.includes(search.toLowerCase());
    const matchType = typeFilter === "all" || type === typeFilter;
    const matchPriority = priorityFilter === "all" || priority === priorityFilter;
    return matchSearch && matchType && matchPriority;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">SAFO / InFO Dashboard</h1>
          <p className="text-slate-600">FAA Safety Alerts, Information Notices, and Policy Documents</p>
        </div>
        {apiDocs.length === 0 && (
          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
            <AlertTriangle className="h-3 w-3 mr-1" /> Demo data — sync coming soon
          </Badge>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(TYPE_LABELS).map(([type, label]) => (
          <Card key={type}
            className={`cursor-pointer transition-all hover:shadow-md ${typeFilter === type ? "ring-2 ring-blue-500" : ""}`}
            onClick={() => setTypeFilter(typeFilter === type ? "all" : type)}
          >
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold">{docs.filter(d => (d.document_type || d.documentType) === type).length}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Immediate action items */}
      {docs.filter(d => d.priority === "immediate").length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-800">Immediate Action Required</p>
            <p className="text-sm text-red-700 mt-1">
              {docs.filter(d => d.priority === "immediate").map(d => d.document_number || d.documentNumber).join(", ")} require immediate review and action.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search documents…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="immediate">Immediate</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="routine">Routine</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Document List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">Loading documents…</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>No documents found</p>
          </div>
        ) : (
          filtered.map((doc: any) => {
            const type = doc.document_type || doc.documentType || "notice";
            const docNum = doc.document_number || doc.documentNumber || "";
            const priority = doc.priority || "routine";
            const pubDate = doc.published_date || doc.publishedDate;
            const parts = Array.isArray(doc.far_parts || doc.farParts) ? (doc.far_parts || doc.farParts) : [];

            return (
              <Card key={doc.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge className={`${TYPE_COLORS[type] || ""} border-0 text-xs`}>{TYPE_LABELS[type] || type}</Badge>
                        <Badge className={`${PRIORITY_COLORS[priority] || ""} border-0 text-xs`}>{priority}</Badge>
                        <span className="font-mono text-sm font-semibold text-gray-700">{docNum}</span>
                        {pubDate && <span className="text-xs text-gray-400">{format(new Date(pubDate), "MMM d, yyyy")}</span>}
                      </div>
                      <h3 className="font-semibold text-gray-900 leading-tight">{doc.title}</h3>
                      {doc.summary && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{doc.summary}</p>}
                      {parts.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {parts.map((p: string) => (
                            <Badge key={p} variant="outline" className="text-xs">FAR Part {p}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    {(doc.url || doc.sourceUrl) && (
                      <a href={doc.url || doc.sourceUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="flex-shrink-0">
                          <ExternalLink className="h-3 w-3 mr-1" /> View
                        </Button>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
