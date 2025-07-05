import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Upload, RotateCcw, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSafeRef } from "@/hooks/use-safe-ref";

interface MobileCameraProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export default function MobileCamera({ onCapture, onClose }: MobileCameraProps) {
  const [isCamera, setIsCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useSafeRef<HTMLVideoElement>(null);
  const canvasRef = useSafeRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCamera(true);
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCamera(false);
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0);
    
    // Convert to blob and create URL
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        setCapturedImage(url);
        stopCamera();
      }
    }, 'image/jpeg', 0.8);
  }, [stopCamera]);

  const confirmCapture = useCallback(() => {
    if (!capturedImage || !canvasRef.current) return;

    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const file = new File([blob], `bccs-field-capture-${timestamp}.jpg`, {
          type: 'image/jpeg'
        });
        onCapture(file);
        onClose();
      }
    }, 'image/jpeg', 0.8);
  }, [capturedImage, onCapture, onClose]);

  const retakePhoto = useCallback(() => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
      setCapturedImage(null);
    }
    startCamera();
  }, [capturedImage, startCamera]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onCapture(file);
      onClose();
    }
  }, [onCapture, onClose]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black text-white">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-white hover:bg-gray-800"
        >
          <X className="w-5 h-5" />
        </Button>
        <h2 className="text-lg font-semibold">Capture Document</h2>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Camera/Preview Area */}
      <div className="flex-1 relative overflow-hidden">
        {!isCamera && !capturedImage && (
          <div className="h-full flex flex-col items-center justify-center p-8 text-white bg-gray-900">
            <Camera className="w-16 h-16 mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold mb-2">Document Capture</h3>
            <p className="text-gray-400 text-center mb-8">
              Capture aviation documents for instant processing and compliance verification
            </p>
            <div className="space-y-4 w-full max-w-sm">
              <Button
                onClick={startCamera}
                size="lg"
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Camera className="w-5 h-5 mr-2" />
                Use Camera
              </Button>
              <label htmlFor="file-upload">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  asChild
                >
                  <span>
                    <Upload className="w-5 h-5 mr-2" />
                    Upload from Gallery
                  </span>
                </Button>
              </label>
              <input
                id="file-upload"
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>
        )}

        {isCamera && (
          <div className="h-full relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Camera overlay with guidelines */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="h-full flex items-center justify-center">
                <div className="border-2 border-white border-dashed rounded-lg w-4/5 aspect-[4/3] flex items-center justify-center">
                  <span className="text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded">
                    Position document within frame
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {capturedImage && (
          <div className="h-full">
            <img
              src={capturedImage}
              alt="Captured document"
              className="w-full h-full object-contain bg-black"
            />
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      <div className="p-6 bg-black">
        {isCamera && (
          <div className="flex items-center justify-center">
            <Button
              onClick={capturePhoto}
              size="lg"
              className="w-20 h-20 rounded-full bg-white text-black hover:bg-gray-200"
            >
              <div className="w-16 h-16 rounded-full border-4 border-black" />
            </Button>
          </div>
        )}

        {capturedImage && (
          <div className="flex space-x-4">
            <Button
              onClick={retakePhoto}
              variant="outline"
              size="lg"
              className="flex-1"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Retake
            </Button>
            <Button
              onClick={confirmCapture}
              size="lg"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              <Check className="w-5 h-5 mr-2" />
              Use Photo
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}