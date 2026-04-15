import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { CloudUpload, FileText, CheckCircle, AlertCircle, X } from "lucide-react";

interface UploadFile {
  id: string;
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

export default function DocumentUpload() {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
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
      toast({
        title: "Upload successful",
        description: `${file.name} has been uploaded and is being processed.`,
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
        description: `Failed to upload ${file.name}`,
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
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxFileSize: 10 * 1024 * 1024, // 10MB
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
      <CardHeader>
        <CardTitle>AI-Powered Document Import</CardTitle>
        <CardDescription>
          Upload training documents for automatic processing and field extraction
        </CardDescription>
      </CardHeader>
      <CardContent>
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
            Supports PDF, XLSX, CSV, JPEG, PNG up to 10MB
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
