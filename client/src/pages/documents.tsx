import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileText, Search, Filter, Upload, Download, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Link } from "wouter";

const TYPE_LABELS: Record<string, string> = {
  training_manual: "Training Manual",
  ops_spec: "Operations Specification",
  certificate: "Certificate",
  checklist: "Checklist",
  policy: "Policy",
  general: "General",
};

const MIME_ICONS: Record<string, string> = {
  "application/pdf": "PDF",
  "image/png": "PNG",
  "image/jpeg": "JPG",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/msword": "DOC",
};

function formatBytes(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts: string) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function Documents() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: docs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/documents"],
  });

  const filtered = docs.filter(d => {
    const matchSearch = !search || d.fileName?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || d.documentType === typeFilter;
    return matchSearch && matchType;
  });

  const allTypes = [...new Set(docs.map(d => d.documentType || "general"))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Document Library</h1>
          <p className="text-gray-600 mt-1">All uploaded compliance documents and training records</p>
        </div>
        <Link href="/">
          <Button className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Document
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{docs.length}</p>
            <p className="text-sm text-gray-600">Total Documents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {docs.filter(d => d.blockchainHash).length}
            </p>
            <p className="text-sm text-gray-600">Blockchain Verified</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {docs.filter(d => !d.blockchainHash).length}
            </p>
            <p className="text-sm text-gray-600">Pending Verification</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{allTypes.length}</p>
            <p className="text-sm text-gray-600">Document Types</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by file name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {allTypes.map(t => (
                <SelectItem key={t} value={t}>{TYPE_LABELS[t] || t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Document Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" />
              Loading documents…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No documents found</p>
              <p className="text-sm mt-1">
                {docs.length === 0
                  ? "Upload your first document from the Dashboard."
                  : "Try adjusting your search or filter."}
              </p>
              {docs.length === 0 && (
                <Link href="/">
                  <Button className="mt-4">Go to Dashboard</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map(doc => (
                <div key={doc.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-blue-700">
                      {MIME_ICONS[doc.mimeType] || "FILE"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{doc.fileName}</p>
                    <p className="text-sm text-gray-500">
                      {formatBytes(doc.fileSize)} · Uploaded {formatDate(doc.uploadedAt)}
                    </p>
                  </div>
                  <div className="hidden sm:flex flex-col items-end gap-1">
                    <Badge variant="outline" className="text-xs">
                      {TYPE_LABELS[doc.documentType] || doc.documentType}
                    </Badge>
                    {doc.blockchainHash ? (
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle2 className="h-3 w-3" /> Verified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-amber-500">
                        <Clock className="h-3 w-3" /> Pending
                      </span>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="flex-shrink-0" title="Download">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
