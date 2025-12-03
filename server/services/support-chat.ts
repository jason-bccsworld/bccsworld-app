import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null;

export interface ChatRequest {
  message: string;
  sessionId?: string;
  userContext?: {
    isAuthenticated: boolean;
    role?: string;
    organizationId?: string;
  };
}

export interface ChatResponse {
  content: string;
  type: 'bot' | 'escalation';
  options?: { text: string; action: string }[];
  needsHumanSupport?: boolean;
}

const SYSTEM_PROMPT = `You are a helpful support assistant for BCCS-US, an aviation compliance platform. 

Key facts about BCCS-US:
- Aviation training organization compliance platform
- AI-powered document processing (OCR/NLP)
- Supports Part 142 training centers
- Mobile app for field operations
- Blockchain-secured audit trails
- User roles: Admin, Instructor, Auditor, Viewer
- Pricing: Free trial (30 days), Training Center ($299/mo), Enterprise ($799/mo), Regulatory ($1499/mo)

Common tasks users need help with:
1. Document upload and processing
2. User management and permissions
3. Compliance report generation
4. Mobile app usage
5. Technical issues

Guidelines:
- Keep responses simple and clear for non-technical aviation professionals
- Offer specific step-by-step instructions
- When uncertain, offer to connect with human support
- If technical issues persist, escalate to human support
- Always maintain professional, helpful tone
- For complex compliance questions, recommend human expert consultation

Respond in a helpful, professional manner. If you can't provide a complete answer, offer to connect the user with our support team.`;

const escalationKeywords = [
  'bug', 'error', 'broken', 'not working', 'crash', 'problem',
  'billing', 'payment', 'account', 'refund', 'cancel',
  'urgent', 'emergency', 'critical', 'important',
  'speak to', 'talk to', 'human', 'person', 'representative',
  'compliance officer', 'legal', 'regulation', 'audit preparation'
];

const quickResponses = {
  greeting: {
    content: "Hi! I'm here to help you with BCCS-US. I can assist with document processing, user management, compliance reports, and more. What can I help you with today?",
    options: [
      { text: "How do I upload documents?", action: "upload-help" },
      { text: "User management help", action: "users-help" },
      { text: "Compliance reports", action: "reports-help" },
      { text: "Talk to a human", action: "escalate" }
    ]
  },
  upload: {
    content: "To upload documents in BCCS-US:\n\n1. Go to 'Document Import' in the left menu\n2. Click 'Choose File' or drag and drop\n3. Supported formats: PDF, JPG, PNG, DOCX\n4. Wait for processing (usually 30-60 seconds)\n5. Review the extracted data\n\nTip: Clear, high-quality scans work best for accuracy.",
    options: [
      { text: "Document not processing?", action: "processing-issues" },
      { text: "Mobile document scanning", action: "mobile-upload" },
      { text: "Still need help", action: "escalate" }
    ]
  },
  users: {
    content: "To manage users in BCCS-US:\n\n1. Go to 'Admin Dashboard' (Admin role required)\n2. Click 'Manage Users'\n3. Click 'Add User' for new members\n4. Enter email and select role:\n   • Admin: Full access\n   • Instructor: Upload & view\n   • Auditor: View-only all records\n   • Viewer: Limited access\n\nUsers get email invitations automatically.",
    options: [
      { text: "I don't see Admin Dashboard", action: "admin-access" },
      { text: "Role permissions explained", action: "role-permissions" },
      { text: "Still need help", action: "escalate" }
    ]
  }
};

export class SupportChatService {
  async handleChatMessage(request: ChatRequest): Promise<ChatResponse> {
    const { message, userContext } = request;
    const lowerMessage = message.toLowerCase();

    // Check for escalation keywords
    if (escalationKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return {
        content: "I understand you need specialized help. Let me connect you with our support team who can provide expert assistance.",
        type: 'escalation',
        needsHumanSupport: true,
        options: [
          { text: "Schedule a call", action: "schedule-call" },
          { text: "Email support", action: "email-support" },
          { text: "Urgent - call now", action: "phone-support" }
        ]
      };
    }

    // Quick pattern matching for common questions
    if (lowerMessage.includes('upload') || lowerMessage.includes('document')) {
      return { ...quickResponses.upload, type: 'bot' };
    }
    
    if (lowerMessage.includes('user') || lowerMessage.includes('team') || lowerMessage.includes('member')) {
      return { ...quickResponses.users, type: 'bot' };
    }

    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('help')) {
      return { ...quickResponses.greeting, type: 'bot' };
    }

    // Use OpenAI for more complex queries if available
    if (openai) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: message }
          ],
          max_tokens: 300,
          temperature: 0.3
        });

        const response = completion.choices[0]?.message?.content || '';
        
        // Check if AI response suggests escalation
        const needsEscalation = escalationKeywords.some(keyword => 
          response.toLowerCase().includes(keyword)
        ) || response.toLowerCase().includes('contact support');

        return {
          content: response,
          type: needsEscalation ? 'escalation' : 'bot',
          needsHumanSupport: needsEscalation,
          options: needsEscalation ? [
            { text: "Talk to support team", action: "escalate" },
            { text: "Back to main menu", action: "reset" }
          ] : [
            { text: "Anything else?", action: "reset" }
          ]
        };
      } catch (error) {
        console.error('OpenAI API error:', error);
        // Fall through to default response
      }
    }

    // Default response when AI is not available
    return {
      content: "I'd be happy to help! For detailed assistance with your specific question, I recommend connecting with our support team who can provide personalized guidance.",
      type: 'escalation',
      needsHumanSupport: true,
      options: [
        { text: "Common questions", action: "reset" },
        { text: "Talk to support team", action: "escalate" }
      ]
    };
  }

  async logSupportInteraction(sessionId: string, message: string, response: ChatResponse, userContext?: any) {
    // Log support interactions for analytics and improvement
    // This could be saved to database for quality monitoring
    const logEntry = {
      sessionId,
      timestamp: new Date(),
      userMessage: message,
      botResponse: response.content,
      escalated: response.needsHumanSupport,
      userContext
    };

    console.log('Support chat interaction:', logEntry);
    // TODO: Save to database for analytics
  }
}

export const supportChatService = new SupportChatService();