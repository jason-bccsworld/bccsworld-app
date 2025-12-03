import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  PlayCircle, 
  FileText, 
  Users, 
  Shield, 
  CheckCircle, 
  Clock,
  HelpCircle,
  Smartphone,
  Upload,
  Eye,
  Settings
} from "lucide-react";

const tutorialVideos = [
  {
    id: "getting-started",
    title: "Getting Started with BCCS-US",
    duration: "5 min",
    description: "Complete walkthrough of your first login and dashboard overview",
    thumbnail: "/api/placeholder/320/180",
    difficulty: "Beginner",
    topics: ["Login", "Dashboard", "Navigation"]
  },
  {
    id: "document-upload",
    title: "Uploading Your First Document",
    duration: "3 min",
    description: "Step-by-step guide to uploading and processing pilot certificates",
    thumbnail: "/api/placeholder/320/180",
    difficulty: "Beginner",
    topics: ["Upload", "OCR", "Data Review"]
  },
  {
    id: "mobile-app",
    title: "Using BCCS-US on Mobile",
    duration: "7 min",
    description: "Field operations with camera scanning and offline capabilities",
    thumbnail: "/api/placeholder/320/180",
    difficulty: "Beginner",
    topics: ["Mobile", "Camera", "Offline"]
  },
  {
    id: "data-validation",
    title: "Reviewing and Validating Data",
    duration: "4 min",
    description: "How to check AI-extracted information and make corrections",
    thumbnail: "/api/placeholder/320/180",
    difficulty: "Intermediate",
    topics: ["Validation", "Corrections", "Quality Control"]
  },
  {
    id: "compliance-reports",
    title: "Generating Compliance Reports",
    duration: "6 min",
    description: "Creating audit-ready reports for regulatory inspections",
    thumbnail: "/api/placeholder/320/180",
    difficulty: "Intermediate",
    topics: ["Reports", "Compliance", "Audits"]
  },
  {
    id: "user-management",
    title: "Managing Your Team",
    duration: "5 min",
    description: "Adding instructors, setting permissions, and role management",
    thumbnail: "/api/placeholder/320/180",
    difficulty: "Advanced",
    topics: ["Users", "Permissions", "Roles"]
  }
];

const quickStartSteps = [
  {
    step: 1,
    title: "Create Your Account",
    description: "Click 'Start Free Trial' and sign in with your email",
    icon: <Users className="w-5 h-5" />,
    time: "2 minutes"
  },
  {
    step: 2,
    title: "Upload a Test Document",
    description: "Try uploading a pilot certificate or training record",
    icon: <Upload className="w-5 h-5" />,
    time: "3 minutes"
  },
  {
    step: 3,
    title: "Review the Results",
    description: "Check how our AI extracted the information",
    icon: <Eye className="w-5 h-5" />,
    time: "2 minutes"
  },
  {
    step: 4,
    title: "Explore Your Dashboard",
    description: "Familiarize yourself with the compliance tracking features",
    icon: <Settings className="w-5 h-5" />,
    time: "5 minutes"
  }
];

const faqItems = [
  {
    category: "Getting Started",
    questions: [
      {
        q: "Do I need any special software installed?",
        a: "No! BCCS-US works entirely in your web browser. Just visit the website and sign in. For mobile use, you can add it to your home screen like an app."
      },
      {
        q: "What documents can I upload?",
        a: "You can upload pilot certificates, medical certificates, training records, logbooks, and any aviation-related PDFs or images. The system works with photos taken on your phone too."
      },
      {
        q: "How do I get help if I'm stuck?",
        a: "Use the help chat in the bottom right corner, email support@bccs142.com, or schedule a free 15-minute training call with our team."
      }
    ]
  },
  {
    category: "Document Processing",
    questions: [
      {
        q: "How accurate is the document scanning?",
        a: "Our AI achieves 95%+ accuracy on standard aviation documents. You can always review and correct any information before saving."
      },
      {
        q: "What if the AI makes a mistake?",
        a: "Simply click on any field to edit it. Your corrections help train the system to be more accurate for similar documents."
      },
      {
        q: "Can I scan documents with my phone?",
        a: "Yes! The mobile version includes a camera scanner that works great for certificates and paper documents."
      }
    ]
  },
  {
    category: "Compliance & Security",
    questions: [
      {
        q: "Is my data secure?",
        a: "Yes. We use bank-level encryption and blockchain technology to secure your records. Your data is never shared with third parties."
      },
      {
        q: "Does this meet FAA requirements?",
        a: "BCCS-US is designed for full Part 142 compliance and includes all required recordkeeping features for training centers."
      },
      {
        q: "Can I export my data?",
        a: "Yes, you can export reports and data at any time. You own your data and can take it with you."
      }
    ]
  },
  {
    category: "Billing & Plans",
    questions: [
      {
        q: "How does the free trial work?",
        a: "Get 30 days of full access with up to 5 users and 100 documents. No credit card required to start."
      },
      {
        q: "Can I change plans later?",
        a: "Yes, you can upgrade or downgrade at any time. Changes take effect immediately."
      },
      {
        q: "What if I need more than what's included?",
        a: "Contact us for custom pricing. We work with training centers of all sizes."
      }
    ]
  }
];

export default function Tutorials() {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Getting Started with BCCS-US
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Everything you need to know to start using BCCS-US for your aviation compliance needs.
            No technical experience required!
          </p>
        </div>

        <Tabs defaultValue="quickstart" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="quickstart">Quick Start</TabsTrigger>
            <TabsTrigger value="videos">Video Tutorials</TabsTrigger>
            <TabsTrigger value="faq">FAQ</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
          </TabsList>

          {/* Quick Start Guide */}
          <TabsContent value="quickstart" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  12-Minute Quick Start
                </CardTitle>
                <CardDescription>
                  Follow these simple steps to get up and running
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {quickStartSteps.map((step) => (
                  <div key={step.step} className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-aviation-blue text-white rounded-full flex items-center justify-center font-semibold">
                      {step.step}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {step.icon}
                        <h3 className="font-semibold text-slate-900">{step.title}</h3>
                        <Badge variant="outline" className="text-xs">
                          {step.time}
                        </Badge>
                      </div>
                      <p className="text-slate-600">{step.description}</p>
                    </div>
                  </div>
                ))}
                <div className="mt-6 p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-green-800">You're Ready!</h3>
                  </div>
                  <p className="text-green-700">
                    After completing these steps, you'll be ready to start processing your aviation documents 
                    and maintaining compliance records.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Video Tutorials */}
          <TabsContent value="videos" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tutorialVideos.map((video) => (
                <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative">
                    <img 
                      src={video.thumbnail} 
                      alt={video.title}
                      className="w-full h-48 object-cover bg-slate-200"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                      <Button
                        variant="ghost"
                        size="lg"
                        className="text-white hover:bg-white hover:bg-opacity-20"
                        onClick={() => setSelectedVideo(video.id)}
                      >
                        <PlayCircle className="w-12 h-12" />
                      </Button>
                    </div>
                    <Badge 
                      className="absolute top-2 right-2 bg-black bg-opacity-70 text-white"
                    >
                      {video.duration}
                    </Badge>
                  </div>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{video.title}</CardTitle>
                      <Badge variant="outline">{video.difficulty}</Badge>
                    </div>
                    <CardDescription>{video.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {video.topics.map((topic) => (
                        <Badge key={topic} variant="secondary" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* FAQ */}
          <TabsContent value="faq" className="space-y-6">
            {faqItems.map((category) => (
              <Card key={category.category}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5" />
                    {category.category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {category.questions.map((item, index) => (
                      <AccordionItem key={index} value={`item-${index}`}>
                        <AccordionTrigger className="text-left">
                          {item.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-slate-600">
                          {item.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Support */}
          <TabsContent value="support" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Documentation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-slate-600">
                    Detailed guides for every feature and common workflows.
                  </p>
                  <Button variant="outline" className="w-full">
                    Browse Documentation
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Live Training
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-slate-600">
                    Schedule a free 15-minute training session with our team.
                  </p>
                  <Button variant="outline" className="w-full">
                    Schedule Training
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5" />
                    Chat Support
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-slate-600">
                    Get instant help with the chat widget in the bottom right corner.
                  </p>
                  <div className="flex gap-2">
                    <Badge variant="outline">Available 24/7</Badge>
                    <Badge variant="outline">Usually responds in 2-3 minutes</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Email Support
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-slate-600">
                    Send detailed questions or screenshots to our support team.
                  </p>
                  <Button variant="outline" className="w-full">
                    <a href="mailto:support@bccs142.com">support@bccs142.com</a>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Onboarding Promise */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-900">Our Onboarding Promise</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-blue-800 mb-4">
                  We know aviation professionals have better things to do than struggle with software. 
                  That's why we provide:
                </p>
                <ul className="space-y-2 text-blue-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    Free training sessions for all new customers
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    Dedicated support during your first 30 days
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    Help importing your existing records
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    Custom setup assistance for your specific needs
                  </li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Back to App */}
        <div className="text-center mt-12">
          <Button 
            size="lg" 
            className="bg-aviation-blue hover:bg-blue-700"
            onClick={() => window.location.href = "/"}
          >
            Back to BCCS-US
          </Button>
        </div>
      </div>
    </div>
  );
}