import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Database, Users, FileText, CheckCircle, Clock } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-aviation-blue rounded-xl flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            BCCS142 - Aviation Compliance Platform
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
            Efficient. Transparent. Secure. Aviation compliance tracking with AI-powered document processing.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-aviation-blue hover:bg-blue-700 text-white px-8 py-3"
              onClick={() => window.location.href = "/api/login"}
            >
              Start Free Trial
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="px-8 py-3"
              onClick={() => window.location.href = "/pricing"}
            >
              View Pricing
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center">
            <CardHeader>
              <FileText className="w-12 h-12 text-aviation-blue mx-auto mb-4" />
              <CardTitle>AI-Powered Document Processing</CardTitle>
              <CardDescription>
                Automated OCR and NLP extraction from training documents with confidence scoring
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Database className="w-12 h-12 text-aviation-blue mx-auto mb-4" />
              <CardTitle>Immutable Records</CardTitle>
              <CardDescription>
                Blockchain-secured training events and compliance records for complete transparency
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Users className="w-12 h-12 text-aviation-blue mx-auto mb-4" />
              <CardTitle>Role-Based Access</CardTitle>
              <CardDescription>
                Admin, Instructor, Auditor, and Viewer roles with appropriate permissions
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Benefits Section */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">
            Why Choose BCCS?
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-6 h-6 text-emerald-500 mt-1" />
              <div>
                <h3 className="font-semibold text-slate-900">Reduce Audit Prep Time</h3>
                <p className="text-slate-600">Automated compliance tracking and real-time status monitoring</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-6 h-6 text-emerald-500 mt-1" />
              <div>
                <h3 className="font-semibold text-slate-900">Tamper-Proof Records</h3>
                <p className="text-slate-600">Blockchain technology ensures data integrity and auditability</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-6 h-6 text-emerald-500 mt-1" />
              <div>
                <h3 className="font-semibold text-slate-900">Smart Document Processing</h3>
                <p className="text-slate-600">AI extracts key information from PDFs, images, and spreadsheets</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-6 h-6 text-emerald-500 mt-1" />
              <div>
                <h3 className="font-semibold text-slate-900">Regulatory Compliance</h3>
                <p className="text-slate-600">Built for aviation training organizations and regulatory requirements</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            Ready to Transform Your Compliance Process?
          </h2>
          <p className="text-slate-600 mb-8">
            Join leading aviation training organizations using BCCS for efficient compliance management.
          </p>
          <Button 
            size="lg" 
            className="bg-aviation-blue hover:bg-blue-700 text-white px-8 py-3"
            onClick={() => window.location.href = "/api/login"}
          >
            Start Free Trial
          </Button>
        </div>
      </div>
    </div>
  );
}
