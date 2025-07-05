import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import TestRef from "@/components/test-ref";
import MobileNav from "@/components/mobile-nav";
import { 
  Camera, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Upload,
  Wifi,
  WifiOff,
  RotateCcw,
  User
} from "lucide-react";

export default function MobileField() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  
  const [showCamera, setShowCamera] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<File | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [inspectionNotes, setInspectionNotes] = useState("");

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Get current location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log("Location access denied or unavailable");
        }
      );
    }
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access field operations",
        variant: "destructive",
      });
      window.location.href = "/api/login";
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: recentDocuments } = useQuery({
    queryKey: ["/api/documents"],
    enabled: isAuthenticated,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('document', file);
      
      if (location) {
        formData.append('metadata', JSON.stringify({
          location: location,
          timestamp: new Date().toISOString(),
          inspector: user?.email || 'Unknown',
          notes: inspectionNotes
        }));
      }

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Document Uploaded",
        description: "Processing started. Results will appear shortly.",
      });
      setSelectedDocument(null);
      setInspectionNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
    },
  });

  const handleCameraCapture = (file: File) => {
    setSelectedDocument(file);
  };

  const handleUpload = () => {
    if (selectedDocument) {
      uploadMutation.mutate(selectedDocument);
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading field operations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <div className="bg-deep-navy text-white p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-aviation-blue rounded-full flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-semibold text-sm">Field Operations</h1>
              <p className="text-xs text-slate-300">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-emerald-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-400" />
            )}
            {location && (
              <MapPin className="w-4 h-4 text-blue-400" />
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Document Capture</CardTitle>
            <CardDescription>Capture and process aviation documents on-site</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedDocument ? (
              <Button 
                onClick={() => setShowCamera(true)}
                size="lg"
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Camera className="w-5 h-5 mr-2" />
                Capture Document
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <div className="flex-1">
                    <p className="font-medium text-emerald-800">Document Ready</p>
                    <p className="text-sm text-emerald-700">{selectedDocument.name}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Inspection Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any relevant notes about this inspection..."
                    value={inspectionNotes}
                    onChange={(e) => setInspectionNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedDocument(null)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleUpload}
                    disabled={uploadMutation.isPending || !isOnline}
                    className="flex-1"
                  >
                    {uploadMutation.isPending ? (
                      <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    {isOnline ? 'Process' : 'Offline'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Today</p>
                  <p className="text-xs text-slate-600">
                    {new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                {isOnline ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="text-sm font-medium">Online</p>
                      <p className="text-xs text-slate-600">Connected</p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="text-sm font-medium">Offline</p>
                      <p className="text-xs text-slate-600">Limited</p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Documents */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Recent Uploads</CardTitle>
            <CardDescription>Latest processed documents</CardDescription>
          </CardHeader>
          <CardContent>
            {recentDocuments && recentDocuments.length > 0 ? (
              <div className="space-y-3">
                {recentDocuments.slice(0, 3).map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{doc.filename}</p>
                      <p className="text-xs text-slate-600">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={
                      doc.status === 'processed' ? 'default' :
                      doc.status === 'processing' ? 'secondary' : 'destructive'
                    }>
                      {doc.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500">
                <Camera className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p className="text-sm">No documents uploaded yet</p>
                <p className="text-xs">Start by capturing a document</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location Info */}
        {location && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Current Location</p>
                  <p className="text-xs text-slate-600">
                    {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mobile Navigation */}
      <MobileNav />

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg">
            <TestRef />
            <button onClick={() => setShowCamera(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}