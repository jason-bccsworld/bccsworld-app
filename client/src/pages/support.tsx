import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Phone, Mail, FileText, Clock, Users, ExternalLink, CheckCircle } from 'lucide-react';

export default function Support() {
  const openEmail = (subject = "") => {
    const to = "support@bccs142.com";
    const encodedSubject = encodeURIComponent(subject || "BCCS-US Support Request");
    const body = encodeURIComponent(
      "Organization: \nContact Name: \nPhone: \n\nDescribe your issue:\n"
    );
    window.open(`mailto:${to}?subject=${encodedSubject}&body=${body}`, "_blank");
  };

  const openEmergencyEmail = () => {
    openEmail("URGENT: Audit Support Needed");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Support Center</h1>
        <p className="text-gray-600 mt-2">Get help with BCCS-US Aviation Compliance Platform</p>
      </div>

      {/* Emergency Audit Banner */}
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-red-800 text-sm">FAA Audit in Progress?</p>
              <p className="text-red-700 text-sm">Get immediate expert assistance — we respond within 15 minutes during business hours.</p>
            </div>
            <Button
              variant="destructive"
              className="shrink-0"
              onClick={openEmergencyEmail}
            >
              <Mail className="h-4 w-4 mr-2" />
              Emergency Email
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Phone Support */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-green-600" />
              Phone Support
            </CardTitle>
            <CardDescription>
              Speak directly with our compliance experts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href="tel:+18002227287"
              className="flex items-center gap-2 font-semibold text-lg text-green-700 hover:text-green-900"
            >
              <Phone className="h-4 w-4" />
              1-800-222-BCCS
            </a>
            <p className="text-sm text-gray-600 flex items-center gap-1">
              <Clock className="h-4 w-4" />
              24/7 Emergency Support Line
            </p>
            <p className="text-xs text-gray-500">Standard hours: Mon–Fri 7 AM – 8 PM ET</p>
          </CardContent>
        </Card>

        {/* Email Support */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              Email Support
            </CardTitle>
            <CardDescription>
              Send detailed questions — response within 2 hours
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full"
              onClick={() => openEmail()}
            >
              <Mail className="h-4 w-4 mr-2" />
              Send Support Email
            </Button>
            <p className="text-xs text-gray-500 text-center">support@bccs142.com</p>
          </CardContent>
        </Card>

        {/* Live Chat */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-purple-600" />
              Live Chat
            </CardTitle>
            <CardDescription>
              Instant help via the chat bubble below
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded p-2">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
              <span>Use the blue chat button in the bottom-right corner to start a conversation now.</span>
            </div>
            <p className="text-xs text-gray-500">Available 24/7 — fastest response method</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Help Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-600" />
              Documentation & Guides
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Getting Started Guide", subject: "Getting Started Guide Request" },
              { label: "Document Upload Tutorial", subject: "Document Upload Help" },
              { label: "FAR Compliance Overview", subject: "FAR Compliance Question" },
              { label: "Mobile App Guide", subject: "Mobile App Support" },
            ].map(({ label, subject }) => (
              <Button
                key={label}
                variant="ghost"
                className="w-full justify-between"
                onClick={() => openEmail(subject)}
              >
                {label}
                <ExternalLink className="h-3 w-3 text-gray-400" />
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              Training & Onboarding
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Schedule Training Session", subject: "Training Session Request" },
              { label: "Watch Video Tutorials", subject: "Video Tutorial Access Request" },
              { label: "Download Quick Reference", subject: "Quick Reference Card Request" },
              { label: "Request Custom Training", subject: "Custom Training Request" },
            ].map(({ label, subject }) => (
              <Button
                key={label}
                variant="ghost"
                className="w-full justify-between"
                onClick={() => openEmail(subject)}
              >
                {label}
                <ExternalLink className="h-3 w-3 text-gray-400" />
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Dedicated Support Commitment */}
      <Card className="bg-blue-50 border-blue-100">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-700">24/7</p>
              <p className="text-sm text-blue-600">Emergency support line</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">&lt; 2 hrs</p>
              <p className="text-sm text-blue-600">Email response time</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">12 weeks</p>
              <p className="text-sm text-blue-600">Dedicated onboarding support</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">All systems operational</span>
            <Badge variant="outline" className="ml-auto text-xs">
              Updated {new Date().toLocaleString()}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
