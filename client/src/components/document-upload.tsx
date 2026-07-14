import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { CloudUpload, FileText, CheckCircle, AlertCircle, X, BookOpen } from "lucide-react";

interface UploadFile {
  id: string;
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

const DOC_TYPES = [
  { value: "pilot_record", label: "Pilot Training Record" },
  { value: "certificate", label: "Certificate" },
  { value: "faa_audit", label: "FAA Audit / Inspection" },
];

export default function DocumentUpload() {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [documentType, setDocumentType] = useState("pilot_record");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", documentType);

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        let message = response.statusText;
        try {
          const body = await response.json();
          if (body?.message) message = body.message;
        } catch { /* not JSON */ }
        throw new Error(message);
      }

      return response.json();
    },
    onSuccess: (data, file) => {
      setUploadFiles(prev => 
        prev.map(f => 
          f.file === file 
            ? { ...f, status: "success", progress: 100 }
            : f
        )
      );
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/governance/agent-feed"] });
      toast({
        title: "Upload successful",
        description: `${file.name} is now being processed by the AI agent.`,
      });
    },
    onError: (error, file) => {
      if (isUnauthorizedError(error as Error)) {
        window.location.href = "/login";
        return;
      }

      setUploadFiles(prev => 
        prev.map(f => 
          f.file === file 
            ? { ...f, status: "error", error: (error as Error).message }
            : f
        )
      );
      toast({
        title: "Upload failed",
        description: (error as Error).message || `Failed to upload ${file.name}`,
        variant: "destructive",
      });
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      status: "pending" as const,
      progress: 0,
    }));

    setUploadFiles(prev => [...prev, ...newFiles]);

    // Start uploading files
    newFiles.forEach(uploadFile => {
      setUploadFiles(prev => 
        prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: "uploading", progress: 0 }
            : f
        )
      );
      uploadMutation.mutate(uploadFile.file);
    });
  }, [uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true,
  });

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== id));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case "uploading":
        return <div className="w-4 h-4 border-2 border-aviation-blue border-t-transparent rounded-full animate-spin" />;
      default:
        return <FileText className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle>AI-Powered Document Import</CardTitle>
          <CardDescription>
            Upload training documents for automatic processing and field extraction
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-500 shrink-0"
          onClick={() => window.open("/api/document-import/tutorial/download", "_blank")}
          data-testid="download-tutorial-btn"
        >
          <BookOpen className="h-4 w-4 mr-1.5" />
          Tutorial
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <label className="text-sm font-medium text-slate-700 block mb-1.5">Document Type</label>
          <Select value={documentType} onValueChange={setDocumentType}>
            <SelectTrigger className="w-full sm:w-72">
              <SelectValue placeholder="Select document type" />
            </SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500 mt-1">
            Tells the AI agent which fields to look for.
          </p>
        </div>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            isDragActive 
              ? "border-aviation-blue bg-blue-50" 
              : "border-slate-300 hover:border-aviation-blue"
          }`}
        >
          <input {...getInputProps()} />
          <CloudUpload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-slate-900 mb-2">
            Upload Training Documents
          </h4>
          <p className="text-slate-600 mb-4">
            Drag and drop files here or click to browse
          </p>
          <p className="text-sm text-slate-500 mb-4">
            Supports PDF, TXT, CSV, JPEG, PNG up to 10MB
          </p>
          <Button 
            type="button" 
            className="bg-aviation-blue hover:bg-blue-700"
            disabled={uploadMutation.isPending}
          >
            Select Files
          </Button>
        </div>

        {uploadFiles.length > 0 && (
          <div className="mt-6 space-y-3">
            {uploadFiles.map((uploadFile) => (
              <div
                key={uploadFile.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  uploadFile.status === "success" 
                    ? "bg-emerald-50 border border-emerald-200"
                    : uploadFile.status === "error"
                    ? "bg-red-50 border border-red-200"
                    : "bg-slate-50"
                }`}
              >
                <div className="flex items-center space-x-3 flex-1">
                  {getStatusIcon(uploadFile.status)}
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{uploadFile.file.name}</p>
                    <p className="text-sm text-slate-600">
                      {uploadFile.status === "uploading" 
                        ? "Uploading..." 
                        : uploadFile.status === "success"
                        ? "Upload complete"
                        : uploadFile.status === "error"
                        ? uploadFile.error || "Upload failed"
                        : "Ready to upload"
                      }
                    </p>
                    {uploadFile.status === "uploading" && (
                      <Progress value={uploadFile.progress} className="mt-2" />
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(uploadFile.id)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
