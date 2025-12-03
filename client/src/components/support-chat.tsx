import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot, 
  User, 
  Phone, 
  Mail, 
  ExternalLink,
  Minimize2,
  Maximize2
} from "lucide-react";

interface ChatMessage {
  id: string;
  type: 'user' | 'bot' | 'system';
  content: string;
  timestamp: Date;
  options?: { text: string; action: string }[];
}

const quickHelp = [
  { text: "How do I upload a document?", action: "upload-help" },
  { text: "Why is my document not processing?", action: "processing-help" },
  { text: "How do I add team members?", action: "users-help" },
  { text: "I need help with compliance reports", action: "reports-help" },
  { text: "Talk to a human", action: "escalate" }
];

const responses = {
  "upload-help": {
    content: "To upload a document:\n\n1. Click 'Document Import' in the left menu\n2. Drag and drop your file or click 'Choose File'\n3. Wait for the green checkmark\n4. Review the extracted data\n\nSupported formats: PDF, JPG, PNG, DOCX\n\nNeed more help?",
    options: [
      { text: "Show me a video tutorial", action: "video-upload" },
      { text: "I'm still having trouble", action: "escalate" }
    ]
  },
  "processing-help": {
    content: "If your document isn't processing:\n\n1. Check the file is under 10MB\n2. Make sure it's a supported format (PDF, JPG, PNG)\n3. Try refreshing the page\n4. Clear images work better than blurry scans\n\nStill stuck?",
    options: [
      { text: "Try uploading again", action: "upload-help" },
      { text: "Get technical support", action: "escalate" }
    ]
  },
  "users-help": {
    content: "To add team members:\n\n1. Go to 'Admin Dashboard' (if you're an admin)\n2. Click 'Manage Users'\n3. Click 'Add User'\n4. Enter their email and select their role\n5. They'll get an email invitation\n\nNeed help with permissions?",
    options: [
      { text: "Explain user roles", action: "roles-help" },
      { text: "I don't see Admin Dashboard", action: "escalate" }
    ]
  },
  "reports-help": {
    content: "To generate compliance reports:\n\n1. Go to 'Compliance Records'\n2. Select your date range\n3. Choose report type (Summary, Detailed, Audit)\n4. Click 'Generate Report'\n5. Download as PDF or Excel\n\nWhat specific report do you need?",
    options: [
      { text: "Audit preparation report", action: "audit-report" },
      { text: "Monthly compliance summary", action: "monthly-report" },
      { text: "Custom reporting needs", action: "escalate" }
    ]
  },
  "roles-help": {
    content: "User roles in BCCS-US:\n\n• **Admin**: Full access, manage users, settings\n• **Instructor**: Upload documents, view student records\n• **Auditor**: View-only access to all records\n• **Viewer**: Limited access to assigned records\n\nNeed to change someone's role?",
    options: [
      { text: "How to change user roles", action: "change-roles" },
      { text: "I need custom permissions", action: "escalate" }
    ]
  },
  "escalate": {
    content: "I'll connect you with our support team! Choose your preferred method:",
    options: [
      { text: "Schedule a call (recommended)", action: "schedule-call" },
      { text: "Email support", action: "email-support" },
      { text: "Urgent - call now", action: "phone-support" }
    ]
  },
  "schedule-call": {
    content: "Perfect! I'll open our scheduling system where you can pick a time that works for you. Our aviation specialists typically respond within 2-3 hours.",
    options: [
      { text: "Open scheduling (calendly.com)", action: "external-calendar" },
      { text: "Back to main menu", action: "reset" }
    ]
  },
  "email-support": {
    content: "I'll open your email client with a pre-filled support request. Include screenshots if possible - they really help our team understand your issue!",
    options: [
      { text: "Open email client", action: "external-email" },
      { text: "Copy email address", action: "copy-email" }
    ]
  },
  "phone-support": {
    content: "For urgent issues, call our support line:\n\n📞 **1-800-BCCS-142**\n\nAvailable 24/7 for customers\nAverage wait time: 2-3 minutes\n\nHave your account email ready!",
    options: [
      { text: "Copy phone number", action: "copy-phone" },
      { text: "Back to main menu", action: "reset" }
    ]
  }
};

export default function SupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'bot',
      content: "Hi! I'm your BCCS-US support assistant. I can help you with common questions or connect you with our team. What can I help you with today?",
      timestamp: new Date(),
      options: quickHelp
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = (content: string, isQuickAction = false) => {
    if (!content.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate bot response delay
    setTimeout(() => {
      handleBotResponse(content, isQuickAction);
      setIsTyping(false);
    }, 1000);
  };

  const handleBotResponse = async (userInput: string, isQuickAction = false) => {
    // For quick actions, use local responses for immediate feedback
    if (isQuickAction && responses[userInput as keyof typeof responses]) {
      const response = responses[userInput as keyof typeof responses];
      const botMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'bot',
        content: response.content,
        timestamp: new Date(),
        options: response.options
      };
      setMessages(prev => [...prev, botMessage]);
      return;
    }

    // For natural language, try the AI backend first
    try {
      const sessionId = `session_${Date.now()}`;
      const apiResponse = await fetch('/api/support/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userInput,
          sessionId
        })
      });

      if (apiResponse.ok) {
        const aiResponse = await apiResponse.json();
        const botMessage: ChatMessage = {
          id: Date.now().toString(),
          type: 'bot',
          content: aiResponse.content,
          timestamp: new Date(),
          options: aiResponse.options
        };
        setMessages(prev => [...prev, botMessage]);
        return;
      }
    } catch (error) {
      console.error('AI chat API error:', error);
      // Fall through to local fallback
    }

    // Fallback to local responses if AI fails
    let response;
    const lowerInput = userInput.toLowerCase();
    if (lowerInput.includes('upload') || lowerInput.includes('document')) {
      response = responses['upload-help'];
    } else if (lowerInput.includes('user') || lowerInput.includes('team') || lowerInput.includes('member')) {
      response = responses['users-help'];
    } else if (lowerInput.includes('report') || lowerInput.includes('compliance')) {
      response = responses['reports-help'];
    } else if (lowerInput.includes('help') || lowerInput.includes('support') || lowerInput.includes('human')) {
      response = responses['escalate'];
    } else {
      response = {
        content: "I understand you need help with that. Let me connect you with the right resources:",
        options: [
          { text: "Document processing help", action: "upload-help" },
          { text: "User management help", action: "users-help" },
          { text: "Compliance reports help", action: "reports-help" },
          { text: "Talk to a human", action: "escalate" }
        ]
      };
    }

    const botMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'bot',
      content: response.content,
      timestamp: new Date(),
      options: response.options
    };

    setMessages(prev => [...prev, botMessage]);
  };

  const handleQuickAction = (action: string, text: string) => {
    if (action === 'reset') {
      setMessages([
        {
          id: Date.now().toString(),
          type: 'bot',
          content: "How else can I help you today?",
          timestamp: new Date(),
          options: quickHelp
        }
      ]);
      return;
    }

    if (action === 'external-calendar') {
      window.open('https://calendly.com/bccs142-support', '_blank');
      return;
    }

    if (action === 'external-email') {
      window.location.href = 'mailto:support@bccs142.com?subject=BCCS-US Support Request&body=Please describe your issue in detail. Include screenshots if possible.';
      return;
    }

    if (action === 'copy-email') {
      navigator.clipboard.writeText('support@bccs142.com');
      alert('Email copied to clipboard!');
      return;
    }

    if (action === 'copy-phone') {
      navigator.clipboard.writeText('1-800-BCCS-142');
      alert('Phone number copied to clipboard!');
      return;
    }

    handleSendMessage(action, true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage(inputValue);
    }
  };

  if (!isOpen) {
    return (
      <Button
        className="fixed bottom-4 right-4 rounded-full w-14 h-14 bg-aviation-blue hover:bg-blue-700 shadow-lg z-50"
        onClick={() => setIsOpen(true)}
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
    );
  }

  return (
    <Card className={`fixed bottom-4 right-4 w-80 shadow-2xl z-50 transition-all duration-300 ${
      isMinimized ? 'h-14' : 'h-96'
    }`}>
      <CardHeader className="pb-2 bg-aviation-blue text-white rounded-t-lg">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bot className="w-4 h-4" />
            BCCS-US Support
            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
              Online
            </Badge>
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-white hover:bg-blue-600"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-white hover:bg-blue-600"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="flex flex-col h-80 p-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((message) => (
              <div key={message.id} className="space-y-2">
                <div className={`flex items-start gap-2 ${
                  message.type === 'user' ? 'flex-row-reverse' : ''
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    message.type === 'user' 
                      ? 'bg-aviation-blue text-white' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {message.type === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                  </div>
                  <div className={`max-w-[70%] p-2 rounded-lg text-sm ${
                    message.type === 'user'
                      ? 'bg-aviation-blue text-white ml-auto'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <div className="whitespace-pre-line">{message.content}</div>
                  </div>
                </div>
                
                {message.options && (
                  <div className="flex flex-wrap gap-1 ml-8">
                    {message.options.map((option, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 text-aviation-blue border-aviation-blue hover:bg-aviation-blue hover:text-white"
                        onClick={() => handleQuickAction(option.action, option.text)}
                      >
                        {option.text}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            {isTyping && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                  <Bot className="w-3 h-3 text-gray-600" />
                </div>
                <div className="bg-gray-100 p-2 rounded-lg">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t p-3">
            <div className="flex gap-2">
              <Input
                ref={chatInputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your question..."
                className="flex-1 text-sm"
              />
              <Button
                size="sm"
                onClick={() => handleSendMessage(inputValue)}
                disabled={!inputValue.trim() || isTyping}
                className="bg-aviation-blue hover:bg-blue-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}