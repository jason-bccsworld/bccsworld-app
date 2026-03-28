import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plane, DollarSign, Shield, TrendingUp, Users, Globe, CheckCircle, Star, FileText } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Plane className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  BCCS-US
                </div>
                <div className="text-xs text-slate-500">
                  Patent Pending
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <Button 
                variant="ghost" 
                onClick={() => window.location.href = "/pricing"}
              >
                Pricing
              </Button>
              <Button 
                variant="ghost"
                onClick={() => window.location.href = "/tutorials"}
              >
                Documentation
              </Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => window.location.href = "/login"}
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <Badge className="mb-6 bg-green-100 text-green-800 border-green-200">
            Aviation Compliance Platform
          </Badge>
          <h1 className="text-5xl font-bold text-slate-900 mb-6">
            Blockchain-Based Compliance Tracking for 
            <span className="text-blue-600"> Aviation Organizations</span>
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8">
            BCCS-US provides immutable document and records logging and AI-powered compliance monitoring for aviation organizations. 
            Streamline regulatory compliance with tamper-proof records and automated audit trails.
          </p>
          
          <div className="flex justify-center gap-4 mb-12">
            <Button 
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 px-8 py-4 text-lg"
              onClick={() => window.location.href = "/login"}
            >
              Access Platform
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="px-8 py-4 text-lg"
              onClick={() => window.location.href = "/tutorials"}
            >
              View Demo
            </Button>
          </div>

          {/* Platform Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">98.5%</div>
              <div className="text-sm text-slate-600">AI Accuracy Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">24/7</div>
              <div className="text-sm text-slate-600">Compliance Monitoring</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">100%</div>
              <div className="text-sm text-slate-600">Tamper-proof Records</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">12 Weeks</div>
              <div className="text-sm text-slate-600">Implementation Time</div>
            </div>
          </div>
        </div>

        {/* Core Features */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
            Complete Aviation Compliance Platform
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Plane className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle>BCCS-US Compliance</CardTitle>
                <CardDescription>
                  AI-powered document processing and blockchain-secured compliance records
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Immutable training records
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Blockchain audit trails
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    FAR compliance monitoring
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Role-based access control
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>AI Document Processing</CardTitle>
                <CardDescription>
                  AI-powered document import with OCR and NLP validation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    OCR text extraction
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    NLP data validation
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Automated field mapping
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Multi-format support
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle>Regulatory Monitoring</CardTitle>
                <CardDescription>
                  Automated monitoring of regulatory changes and compliance alerts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    FAR regulation tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Real-time compliance alerts
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Link health monitoring
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Impact assessments
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Platform Benefits */}
        <div className="mb-20">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Complete Compliance Solution</h2>
              <p className="text-xl text-blue-100 max-w-3xl mx-auto">
                Streamline compliance with blockchain technology and AI automation
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">Training Organizations</h3>
                <p className="text-blue-100 mb-4">Comprehensive compliance tracking</p>
                <ul className="text-sm text-blue-100 space-y-1">
                  <li>• Training event logging</li>
                  <li>• Student record management</li>
                  <li>• Instructor qualifications</li>
                </ul>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">Regulators</h3>
                <p className="text-blue-100 mb-4">Real-time oversight capabilities</p>
                <ul className="text-sm text-blue-100 space-y-1">
                  <li>• Audit trail transparency</li>
                  <li>• Compliance verification</li>
                  <li>• Risk assessment tools</li>
                </ul>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plane className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">Pilots</h3>
                <p className="text-blue-100 mb-4">Portable career credentials</p>
                <ul className="text-sm text-blue-100 space-y-1">
                  <li>• Blockchain certificates</li>
                  <li>• Training verification</li>
                  <li>• Career progression</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Industry Impact */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
            Transforming Aviation Compliance
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Global Aviation Industry</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  <span className="text-slate-700">ATOs & TRTOs worldwide</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                  <span className="text-slate-700">Aviation personnel qualification tracking</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                  <span className="text-slate-700">Personnel record management</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-orange-600 rounded-full"></div>
                  <span className="text-slate-700">Regulatory audit compliance</span>
                </div>
              </div>
            </div>
            
            <Card className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">78%</div>
                <div className="text-lg font-medium text-blue-800 mb-4">Global Pilot Penetration</div>
                <p className="text-sm text-blue-700 mb-6">
                  Target market penetration across international aviation training
                </p>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-700">Training Centers:</span>
                    <span className="font-medium text-blue-800">12,000+</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-700">Active Pilots:</span>
                    <span className="font-medium text-blue-800">200,000+</span>
                  </div>
                  <div className="border-t border-blue-200 pt-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-blue-800">Market Coverage:</span>
                      <span className="font-bold text-blue-900">196 Countries</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center bg-slate-900 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Streamline Aviation Compliance?</h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Join the revolution in aviation compliance and ensure regulatory adherence with blockchain technology
          </p>
          
          <div className="flex justify-center gap-4">
            <Button 
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 px-8 py-4 text-lg"
              onClick={() => window.location.href = "/login"}
            >
              Get Started Today
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="px-8 py-4 text-lg border-slate-600 text-slate-300 hover:bg-slate-800"
              onClick={() => window.location.href = "/pricing"}
            >
              View Demo
            </Button>
          </div>
          
          <div className="flex justify-center items-center gap-2 mt-8 text-sm text-slate-400">
            <Star className="w-4 h-4 text-yellow-500 fill-current" />
            <span>Trusted by training organizations worldwide</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Plane className="w-6 h-6 text-blue-500" />
                <span className="text-lg font-bold text-white">BCCS-US</span>
              </div>
              <p className="text-sm">
                Revolutionary blockchain-powered compliance platform for aviation organizations
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-white mb-4">Platform</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="/compliance-checklist" className="hover:text-white">Part 142 Checklist</a></li>
                <li><a href="/document-import" className="hover:text-white">Document Import</a></li>
                <li><a href="/regulatory-compliance" className="hover:text-white">Regulatory Monitor</a></li>
                <li><a href="/compliance-records" className="hover:text-white">Training Records</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-white mb-4">Resources</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="/documentation" className="hover:text-white">Documentation</a></li>
                <li><a href="/api" className="hover:text-white">API Reference</a></li>
                <li><a href="/tutorials" className="hover:text-white">Tutorials</a></li>
                <li><a href="/support" className="hover:text-white">Support</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-white mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="/about" className="hover:text-white">About</a></li>
                <li><a href="/contact" className="hover:text-white">Contact</a></li>
                <li><a href="/privacy" className="hover:text-white">Privacy</a></li>
                <li><a href="/terms" className="hover:text-white">Terms</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm">
            <p>&copy; 2025 BCCS-US. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}