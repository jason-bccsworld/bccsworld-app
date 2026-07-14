import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Flag, Bot, FileText, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface DocumentRow {
  id: string;
  fileName: string;
  documentType: string;
  status: string;
  overallConfidence: number | null;
  blockchainHash: string | null;
  errorMessage: string | null;
  uploadedAt: string;
}

interface ExtractedFieldRow {
  id: string;
  fieldName: string;
  extractedValue: string | null;
  correctedValue: string | null;
  confidenceScore: number | null;
  status: string;
}

const TYPE_LABELS: Record<string, string> = {
  pilot_record: "Pilot Training Record",
  certificate: "Certificate",
  faa_audit: "FAA Audit / Inspection",
};

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  uploaded: { label: "Queued", className: "bg-slate-100 text-slate-700" },
  processing: { label: "AI Processing…", className: "bg-blue-100 text-blue-800" },
  auto_approved: { label: "Auto-Approved", className: "bg-emerald-100 text-emerald-800" },
  needs_review: { label: "Needs Review", className: "bg-amber-100 text-amber-800" },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
  failed: { label: "Failed", className: "bg-red-100 text-red-700" },
};

function confidenceBadgeClass(score: number | null) {
  if (score == null) return "bg-slate-100 text-slate-600";
  if (score >= 85) return "bg-emerald-100 text-emerald-800";
  if (score >= 60) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-700";
}

function fieldLabel(fieldName: string) {
  return fieldName
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

export default function DocumentValidation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [corrections, setCorrections] = useState<Record<string, string>>({});

  const { data: documents = [] } = useQuery<DocumentRow[]>({
    queryKey: ["/api/documents"],
    refetchInterval: (query) => {
      const docs = (query.state.data ?? []) as DocumentRow[];
      return docs.some((d) => d.status === "uploaded" || d.status === "processing") ? 2500 : false;
    },
  });

  const reviewQueue = documents.filter((d) => d.status === "needs_review");
  const processingCount = documents.filter((d) => d.status === "uploaded" || d.status === "processing").length;

  // Selection: explicit pick → first needs_review → most recent processed doc
  const selectedDoc = useMemo(() => {
    if (selectedId) {
      const found = documents.find((d) => d.id === selectedId);
      if (found) return found;
    }
    return reviewQueue[0] ?? documents.find((d) => ["auto_approved", "approved"].includes(d.status)) ?? null;
  }, [selectedId, documents, reviewQueue]);

  const { data: extractedData = [], isLoading: fieldsLoading } = useQuery<ExtractedFieldRow[]>({
    queryKey: ["/api/documents", selectedDoc?.id, "extracted-data"],
    enabled: !!selectedDoc?.id,
    queryFn: async () => {
      const res = await fetch(`/api/documents/${selectedDoc!.id}/extracted-data`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch extracted data");
      return res.json();
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    queryClient.invalidateQueries({ queryKey: ["/api/ml/metrics"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    queryClient.invalidateQueries({ queryKey: ["/api/governance/agent-feed"] });
  };

  const reviewMutation = useMutation({
    mutationFn: async ({ action }: { action: "approve" | "reject" }) => {
      const res = await apiRequest("POST", `/api/documents/${selectedDoc!.id}/review`, {
        action,
        corrections: action === "approve" ? corrections : {},
      });
      return res.json();
    },
    onSuccess: (data, { action }) => {
      setCorrections({});
      setSelectedId(null);
      invalidateAll();
      toast({
        title: action === "approve" ? "Document approved" : "Document rejected",
        description:
          action === "approve"
            ? data.corrections > 0
              ? `${data.corrections} correction${data.corrections === 1 ? "" : "s"} recorded — the AI will learn from them.`
              : "Approved with no corrections and anchored to the blockchain."
            : "The extraction was discarded.",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Review failed", description: err.message, variant: "destructive" });
    },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/documents/seed-demo");
      return res.json();
    },
    onSuccess: () => {
      invalidateAll();
      toast({
        title: "Demo documents created",
        description: "The AI agent is processing 3 sample documents — watch them flow through the pipeline.",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Could not create demo documents", description: err.message, variant: "destructive" });
    },
  });

  const isReviewable = selectedDoc?.status === "needs_review";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-600" />
              AI Document Validation
            </CardTitle>
            <CardDescription>
              High-confidence documents are auto-approved by the agent — only exceptions land here for human review.
            </CardDescription>
          </div>
          {selectedDoc && (
            <div className="flex items-center gap-2">
              <Badge className={STATUS_BADGES[selectedDoc.status]?.className ?? "bg-slate-100 text-slate-700"}>
                {STATUS_BADGES[selectedDoc.status]?.label ?? selectedDoc.status}
              </Badge>
              {selectedDoc.overallConfidence != null && (
                <Badge className={confidenceBadgeClass(selectedDoc.overallConfidence)}>
                  {selectedDoc.overallConfidence}% confidence
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <Sparkles className="w-10 h-10 mx-auto mb-3 text-blue-300" />
            <p className="font-medium text-slate-700">No documents in the pipeline yet</p>
            <p className="text-sm mt-1 mb-4">
              Upload a document above, or generate sample documents to see the AI agent in action.
            </p>
            <Button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
              {seedMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Run Demo Documents
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pipeline / review queue */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-slate-900">Review Queue</h4>
                {processingCount > 0 && (
                  <span className="flex items-center gap-1.5 text-xs text-blue-600">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Agent processing {processingCount} document{processingCount === 1 ? "" : "s"}…
                  </span>
                )}
              </div>
              {reviewQueue.length === 0 ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm text-emerald-800 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    Review queue is clear — the agent is handling everything. Auto-approved documents are
                    blockchain-anchored without human action.
                  </span>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {reviewQueue.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => { setSelectedId(doc.id); setCorrections({}); }}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedDoc?.id === doc.id
                          ? "border-blue-400 bg-blue-50"
                          : "border-slate-200 hover:border-blue-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="font-medium text-sm text-slate-800 truncate">{doc.fileName}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="outline" className="text-xs">
                          {TYPE_LABELS[doc.documentType] ?? doc.documentType}
                        </Badge>
                        <Badge className={`text-xs ${confidenceBadgeClass(doc.overallConfidence)}`}>
                          {doc.overallConfidence ?? 0}%
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedDoc && selectedDoc.blockchainHash && (
                <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
                  <span className="font-medium text-slate-700">Blockchain hash: </span>
                  <span className="font-mono break-all">{selectedDoc.blockchainHash}</span>
                </div>
              )}
            </div>

            {/* Extracted fields */}
            <div>
              <h4 className="font-medium text-slate-900 mb-3">
                Extracted Data{selectedDoc ? ` — ${selectedDoc.fileName}` : ""}
              </h4>
              {!selectedDoc ? (
                <p className="text-sm text-slate-500">Select a document from the queue.</p>
              ) : fieldsLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500 py-6">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading extracted fields…
                </div>
              ) : extractedData.length === 0 ? (
                <div className="py-6 space-y-4">
                  <p className="text-sm text-slate-500">
                    No fields were extracted from this document.
                  </p>
                  {isReviewable && (
                    <Button
                      variant="outline"
                      onClick={() => reviewMutation.mutate({ action: "reject" })}
                      disabled={reviewMutation.isPending}
                    >
                      {reviewMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Flag className="w-4 h-4 mr-2" />
                      )}
                      Reject Document
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {extractedData.map((field) => (
                    <div key={field.id}>
                      <Label htmlFor={`field-${field.id}`}>{fieldLabel(field.fieldName)}</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Input
                          id={`field-${field.id}`}
                          value={
                            corrections[field.fieldName] !== undefined
                              ? corrections[field.fieldName]
                              : field.correctedValue ?? field.extractedValue ?? ""
                          }
                          readOnly={!isReviewable}
                          onChange={(e) =>
                            setCorrections((prev) => ({ ...prev, [field.fieldName]: e.target.value }))
                          }
                          className={`flex-1 ${
                            corrections[field.fieldName] !== undefined &&
                            corrections[field.fieldName] !== (field.extractedValue ?? "")
                              ? "border-amber-400 bg-amber-50"
                              : ""
                          }`}
                        />
                        <Badge className={`text-xs ${confidenceBadgeClass(field.confidenceScore)}`}>
                          {field.confidenceScore ?? 0}%
                        </Badge>
                      </div>
                    </div>
                  ))}

                  {isReviewable ? (
                    <div className="flex space-x-3 pt-4">
                      <Button
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                        onClick={() => reviewMutation.mutate({ action: "approve" })}
                        disabled={reviewMutation.isPending}
                      >
                        {reviewMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        Approve & Submit
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => reviewMutation.mutate({ action: "reject" })}
                        disabled={reviewMutation.isPending}
                      >
                        <Flag className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <div className="pt-3 text-xs text-slate-500 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      {selectedDoc.status === "auto_approved"
                        ? "Auto-approved by the AI agent under GATE governance — no human action needed."
                        : "This document has already been reviewed."}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
