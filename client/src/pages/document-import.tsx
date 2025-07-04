import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import DocumentUpload from "@/components/document-upload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Download, FileText, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function DocumentImport() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: documents = [], isLoading: documentsLoading } = useQuery({
    queryKey: ["/api/documents"],
    enabled: isAuthenticated,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "uploaded":
        return <Clock className="w-4 h-4 text-amber-500" />;
      case "processing":
        return <div className="w-4 h-4 border-2 border-aviation-blue border-t-transparent rounded-full animate-spin" />;
      case "processed":
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case "validated":
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <FileText className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "uploaded":
        return "bg-amber-100 text-amber-800";
      case "processing":
        return "bg-blue-100 text-aviation-blue";
      case "processed":
        return "bg-emerald-100 text-emerald-800";
      case "validated":
        return "bg-emerald-100 text-emerald-800";
      case "error":
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
        title="Document Import"
        description="Upload and process compliance documents with AI"
      />
      
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DocumentUpload />
          
          <Card>
            <CardHeader>
              <CardTitle>Processing Guidelines</CardTitle>
              <CardDescription>
                Tips for optimal document processing results
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">High-Quality Scans</h4>
                    <p className="text-sm text-slate-600">Use 300+ DPI for optimal OCR results</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Clear Text</h4>
                    <p className="text-sm text-slate-600">Ensure text is legible and not blurred</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Standard Formats</h4>
                    <p className="text-sm text-slate-600">PDF, XLSX, CSV, JPEG, PNG supported</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Document Processing History</CardTitle>
            <CardDescription>
              Track the status of your uploaded documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {documentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aviation-blue"></div>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>No documents uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {documents.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(doc.status)}
                      <div>
                        <h4 className="font-medium text-slate-900">{doc.originalName}</h4>
                        <p className="text-sm text-slate-600">
                          {format(new Date(doc.createdAt), "MMM dd, yyyy 'at' hh:mm a")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge className={getStatusColor(doc.status)}>
                        {doc.status}
                      </Badge>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
