import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Phone, Mail, FileText, Clock, Users } from 'lucide-react';

export default function Support() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Support Center</h1>
        <p className="text-gray-600 mt-2">Get help with BCCS142 Aviation Compliance Platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Live Chat */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              Live Chat Support
            </CardTitle>
            <CardDescription>
              Get instant help from our aviation compliance experts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">
              Start Live Chat
            </Button>
            <p className="text-sm text-gray-500 mt-2">Available 24/7</p>
          </CardContent>
        </Card>

        {/* Phone Support */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-green-600" />
              Phone Support
            </CardTitle>
            <CardDescription>
              Speak directly with our support team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-lg">1-800-BCCS142</p>
            <p className="text-sm text-gray-600">
              <Clock className="inline h-4 w-4 mr-1" />
              24/7 Emergency Support
            </p>
          </CardContent>
        </Card>

        {/* Email Support */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-purple-600" />
              Email Support
            </CardTitle>
            <CardDescription>
              Send detailed questions to our team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              support@bccs142.com
            </Button>
            <p className="text-sm text-gray-500 mt-2">Response within 2 hours</p>
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
          <CardContent className="space-y-3">
            <Button variant="ghost" className="w-full justify-start">
              Getting Started Guide
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              Document Upload Tutorial
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              FAR Compliance Overview
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              Mobile App Guide
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              Training & Onboarding
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="ghost" className="w-full justify-start">
              Schedule Training Session
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              Watch Video Tutorials
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              Download Quick Reference
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              Request Custom Training
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">All systems operational</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Last updated: {new Date().toLocaleString()}</p>
        </CardContent>
      </Card>
    </div>
  );
}