import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import { storage } from "../storage";
import { processDocumentOCR } from "./ocr";
import { documentGenerator } from "./document-generator";

// Load environment variables
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  for (const line of envLines) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  }
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export interface AuditChecklistItem {
  id: string;
  category: string;
  requirement: string;
  description: string;
  references: string[];
}

export interface ComplianceAnalysis {
  checklistItemId: string;
  requirement: string;
  preliminaryResponse: string;
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL' | 'INSUFFICIENT_DATA';
  confidenceScore: number;
  supportingDocuments: string[];
  recommendations: string[];
  requiredActions: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedTimeToCompliance: string;
  additionalDocumentsNeeded: string[];
}

export interface DocumentContent {
  filename: string;
  extractedText: string;
  documentType: string;
  metadata: any;
}

export class AuditComplianceAI {
  private documentContents: DocumentContent[] = [];
  
  async analyzeUploadedDocuments(userId: string): Promise<DocumentContent[]> {
    try {
      // Get all processed documents for the user
      const documents = await storage.getDocumentsByUser(userId);
      const documentContents: DocumentContent[] = [];
      
      for (const doc of documents) {
        if (doc.status === 'processed' && doc.filename) {
          try {
            // Extract text from document
            const filePath = path.join(process.cwd(), 'uploads', doc.filename);
            const extractedText = await processDocumentOCR(filePath);
            
            // Get extracted data from database
            const extractedData = await storage.getExtractedDataByDocument(doc.id);
            const metadata = extractedData.reduce((acc: any, item) => {
              acc[item.fieldName] = item.extractedValue;
              return acc;
            }, {});
            
            documentContents.push({
              filename: doc.originalName,
              extractedText,
              documentType: doc.fileType,
              metadata
            });
          } catch (error) {
            console.error(`Error processing document ${doc.originalName}:`, error);
          }
        }
      }
      
      this.documentContents = documentContents;
      return documentContents;
    } catch (error) {
      console.error('Error analyzing uploaded documents:', error);
      return [];
    }
  }
  
  async analyzeChecklistCompliance(checklistItems: AuditChecklistItem[]): Promise<ComplianceAnalysis[]> {
    const analyses: ComplianceAnalysis[] = [];
    
    for (const item of checklistItems) {
      try {
        const analysis = await this.analyzeIndividualRequirement(item);
        analyses.push(analysis);
      } catch (error) {
        console.error(`Error analyzing checklist item ${item.id}:`, error);
        // Create fallback analysis
        analyses.push({
          checklistItemId: item.id,
          requirement: item.requirement,
          preliminaryResponse: 'Error analyzing requirement - manual review required',
          complianceStatus: 'INSUFFICIENT_DATA',
          confidenceScore: 0,
          supportingDocuments: [],
          recommendations: ['Manual review required due to system error'],
          requiredActions: ['Contact technical support'],
          riskLevel: 'MEDIUM',
          estimatedTimeToCompliance: 'Unknown',
          additionalDocumentsNeeded: []
        });
      }
    }
    
    return analyses;
  }
  
  private async analyzeIndividualRequirement(item: AuditChecklistItem): Promise<ComplianceAnalysis> {
    const documentSummary = this.documentContents.map(doc => 
      `Document: ${doc.filename} (${doc.documentType})\nContent: ${doc.extractedText.substring(0, 1000)}...\nMetadata: ${JSON.stringify(doc.metadata)}`
    ).join('\n\n');
    
    const prompt = `
You are an expert FAA Part 142 compliance auditor analyzing training center documentation. 

AUDIT REQUIREMENT TO ANALYZE:
Category: ${item.category}
Requirement: ${item.requirement}
Description: ${item.description}
References: ${item.references.join(', ')}

AVAILABLE DOCUMENTATION:
${documentSummary}

ANALYSIS INSTRUCTIONS:
1. Carefully review the requirement and available documentation
2. Determine if the training center has adequate documentation to meet this requirement
3. Identify gaps, deficiencies, or missing elements
4. Provide specific, actionable recommendations
5. Assess risk level and estimated time to achieve compliance

Please provide a comprehensive analysis in the following JSON format:
{
  "preliminaryResponse": "Detailed analysis of current compliance status",
  "complianceStatus": "COMPLIANT|NON_COMPLIANT|PARTIAL|INSUFFICIENT_DATA",
  "confidenceScore": 0-100,
  "supportingDocuments": ["list of relevant documents found"],
  "recommendations": ["specific actionable recommendations"],
  "requiredActions": ["immediate actions needed"],
  "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "estimatedTimeToCompliance": "time estimate with explanation",
  "additionalDocumentsNeeded": ["specific documents or evidence needed"]
}

COMPLIANCE CRITERIA:
- COMPLIANT: All requirements met with adequate documentation
- PARTIAL: Some requirements met but with gaps or deficiencies
- NON_COMPLIANT: Clear violations or missing critical elements
- INSUFFICIENT_DATA: Cannot determine compliance due to lack of documentation

RISK ASSESSMENT:
- LOW: Minor gaps, easy to resolve
- MEDIUM: Moderate deficiencies requiring attention
- HIGH: Significant compliance gaps with potential regulatory impact
- CRITICAL: Immediate action required to prevent regulatory violations
`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert FAA Part 142 compliance auditor with decades of experience in aviation training center audits. Provide thorough, accurate, and actionable compliance analysis."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.1 // Low temperature for consistent, factual analysis
      });
      
      const analysisText = response.choices[0]?.message?.content || '';
      
      // Parse JSON response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        return {
          checklistItemId: item.id,
          requirement: item.requirement,
          preliminaryResponse: analysis.preliminaryResponse,
          complianceStatus: analysis.complianceStatus,
          confidenceScore: analysis.confidenceScore,
          supportingDocuments: analysis.supportingDocuments || [],
          recommendations: analysis.recommendations || [],
          requiredActions: analysis.requiredActions || [],
          riskLevel: analysis.riskLevel,
          estimatedTimeToCompliance: analysis.estimatedTimeToCompliance,
          additionalDocumentsNeeded: analysis.additionalDocumentsNeeded || []
        };
      }
      
      // Fallback if JSON parsing fails
      return {
        checklistItemId: item.id,
        requirement: item.requirement,
        preliminaryResponse: analysisText,
        complianceStatus: 'INSUFFICIENT_DATA',
        confidenceScore: 50,
        supportingDocuments: [],
        recommendations: ['Manual review recommended'],
        requiredActions: ['Review AI analysis and validate findings'],
        riskLevel: 'MEDIUM',
        estimatedTimeToCompliance: 'Requires manual assessment',
        additionalDocumentsNeeded: []
      };
      
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }
  
  async generateComplianceReport(analyses: ComplianceAnalysis[]): Promise<string> {
    const compliantCount = analyses.filter(a => a.complianceStatus === 'COMPLIANT').length;
    const nonCompliantCount = analyses.filter(a => a.complianceStatus === 'NON_COMPLIANT').length;
    const partialCount = analyses.filter(a => a.complianceStatus === 'PARTIAL').length;
    const insufficientDataCount = analyses.filter(a => a.complianceStatus === 'INSUFFICIENT_DATA').length;
    
    const criticalIssues = analyses.filter(a => a.riskLevel === 'CRITICAL');
    const highRiskIssues = analyses.filter(a => a.riskLevel === 'HIGH');
    
    const reportPrompt = `
Generate a comprehensive FAA Part 142 compliance report based on the following analysis:

OVERALL STATISTICS:
- Total Requirements Analyzed: ${analyses.length}
- Compliant: ${compliantCount}
- Non-Compliant: ${nonCompliantCount}
- Partial Compliance: ${partialCount}
- Insufficient Data: ${insufficientDataCount}

CRITICAL ISSUES (${criticalIssues.length}):
${criticalIssues.map(issue => `- ${issue.requirement}: ${issue.preliminaryResponse}`).join('\n')}

HIGH RISK ISSUES (${highRiskIssues.length}):
${highRiskIssues.map(issue => `- ${issue.requirement}: ${issue.preliminaryResponse}`).join('\n')}

Please generate a professional audit report that includes:
1. Executive Summary
2. Compliance Overview
3. Critical Findings
4. Recommended Actions
5. Timeline for Remediation
6. Next Steps

Format as a comprehensive report suitable for training center management and regulatory review.
`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert FAA compliance auditor generating official audit reports. Create professional, actionable reports that meet regulatory standards."
          },
          {
            role: "user",
            content: reportPrompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.2
      });
      
      return response.choices[0]?.message?.content || 'Unable to generate report';
    } catch (error) {
      console.error('Error generating compliance report:', error);
      return 'Error generating compliance report - please try again';
    }
  }

  async performComprehensiveAuditWithDocumentGeneration(userId: string, organizationId: string): Promise<{
    complianceAnalyses: ComplianceAnalysis[];
    documentGaps: any;
    generatedDocuments: any[];
    uploadRequests: string[];
  }> {
    // Perform initial compliance audit
    const complianceAnalyses = await this.performComprehensiveAudit(userId);
    
    // Identify and fill document gaps
    const gapAnalysis = await this.identifyAndFillDocumentGaps(
      userId, 
      organizationId, 
      complianceAnalyses
    );
    
    return {
      complianceAnalyses,
      documentGaps: gapAnalysis.gaps,
      generatedDocuments: gapAnalysis.generatedDocuments,
      uploadRequests: gapAnalysis.uploadRequests
    };
  }

  async performComprehensiveAudit(userId: string): Promise<ComplianceAnalysis[]> {
    // Load all uploaded documents for analysis
    await this.analyzeUploadedDocuments(userId);
    
    const complianceAnalyses: ComplianceAnalysis[] = [];
    
    // Analyze each checklist item against available documents
    for (const item of this.getAuditChecklist()) {
      try {
        const analysis = await this.analyzeChecklistItem(item);
        complianceAnalyses.push(analysis);
      } catch (error) {
        console.error(`Error analyzing item ${item.id}:`, error);
        // Continue with other items even if one fails
      }
    }
    
    return complianceAnalyses;
  }

  async identifyAndFillDocumentGaps(
    userId: string, 
    organizationId: string,
    complianceAnalyses: ComplianceAnalysis[]
  ): Promise<{
    gaps: any,
    generatedDocuments: any[],
    uploadRequests: string[]
  }> {
    // Analyze document gaps from compliance results
    const checklistItems = this.getAuditChecklist();
    const existingDocuments = this.documentContents;
    const organizationData = { name: 'Training Center', type: 'Part 142' }; // Should be fetched from DB
    
    const gaps = await documentGenerator.analyzeDocumentGaps(
      checklistItems,
      existingDocuments,
      organizationData
    );
    
    const generatedDocuments = await documentGenerator.autoGenerateComplianceDocuments(
      userId,
      organizationId,
      gaps.canAutoGenerate,
      { complianceAnalyses, existingDocuments }
    );
    
    return {
      gaps,
      generatedDocuments,
      uploadRequests: gaps.requiresExternalUpload
    };
  }
}

export const auditComplianceAI = new AuditComplianceAI();