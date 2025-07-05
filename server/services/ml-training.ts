import { storage } from "../storage";
import { generateBlockchainHash } from "./blockchain";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface FeedbackData {
  documentId: string;
  fieldName: string;
  originalValue: string;
  correctedValue: string;
  confidenceScore: number;
  userId: string;
  documentType: string;
  correctionReason?: string;
}

export interface TrainingMetrics {
  totalCorrections: number;
  accuracyImprovement: number;
  fieldAccuracyBreakdown: Record<string, number>;
  modelVersion: string;
  lastTrainingDate: Date;
}

export class MLTrainingService {
  private trainingHistory: FeedbackData[] = [];
  private modelVersion = "1.0.0";

  async recordUserFeedback(feedback: FeedbackData): Promise<void> {
    // Store feedback in database for training
    await storage.createAuditLog({
      action: "ml_feedback",
      entityType: "document",
      entityId: feedback.documentId,
      userId: feedback.userId,
      details: {
        fieldName: feedback.fieldName,
        originalValue: feedback.originalValue,
        correctedValue: feedback.correctedValue,
        confidenceScore: feedback.confidenceScore,
        documentType: feedback.documentType,
        correctionReason: feedback.correctionReason
      },
      timestamp: new Date()
    });

    this.trainingHistory.push(feedback);

    // Trigger incremental training if we have enough feedback
    if (this.trainingHistory.length % 10 === 0) {
      await this.performIncrementalTraining();
    }
  }

  async performIncrementalTraining(): Promise<void> {
    console.log(`Starting incremental training with ${this.trainingHistory.length} feedback samples`);
    
    // Analyze patterns in user corrections
    const patterns = await this.analyzeCorrections();
    
    // Generate improved prompts based on patterns
    const improvedPrompts = await this.generateImprovedPrompts(patterns);
    
    // Update model version
    this.modelVersion = this.incrementVersion(this.modelVersion);
    
    console.log(`Training completed. New model version: ${this.modelVersion}`);
  }

  private async analyzeCorrections(): Promise<Record<string, any>> {
    const fieldCorrections: Record<string, FeedbackData[]> = {};
    
    // Group corrections by field type
    for (const feedback of this.trainingHistory) {
      if (!fieldCorrections[feedback.fieldName]) {
        fieldCorrections[feedback.fieldName] = [];
      }
      fieldCorrections[feedback.fieldName].push(feedback);
    }

    const patterns: Record<string, any> = {};

    // Analyze each field type
    for (const [fieldName, corrections] of Object.entries(fieldCorrections)) {
      patterns[fieldName] = {
        totalCorrections: corrections.length,
        commonErrors: await this.identifyCommonErrors(corrections),
        accuracyTrend: this.calculateAccuracyTrend(corrections),
        improvementSuggestions: await this.generateImprovementSuggestions(corrections)
      };
    }

    return patterns;
  }

  private async identifyCommonErrors(corrections: FeedbackData[]): Promise<string[]> {
    const errorPatterns: string[] = [];
    
    // Use AI to identify patterns in corrections
    const correctionSummary = corrections.map(c => 
      `Original: "${c.originalValue}" → Corrected: "${c.correctedValue}"`
    ).join('\n');

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "Analyze OCR correction patterns and identify common error types. Respond with JSON array of error pattern descriptions."
          },
          {
            role: "user",
            content: `Analyze these OCR corrections for aviation documents:\n${correctionSummary}\n\nIdentify the most common error patterns.`
          }
        ],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{"patterns": []}');
      return result.patterns || [];
    } catch (error) {
      console.error("Error identifying common errors:", error);
      return [];
    }
  }

  private calculateAccuracyTrend(corrections: FeedbackData[]): number {
    // Calculate improvement in accuracy over time
    if (corrections.length < 2) return 0;
    
    const recentCorrections = corrections.slice(-10);
    const olderCorrections = corrections.slice(0, Math.max(1, corrections.length - 10));
    
    const recentAccuracy = recentCorrections.reduce((sum, c) => sum + c.confidenceScore, 0) / recentCorrections.length;
    const olderAccuracy = olderCorrections.reduce((sum, c) => sum + c.confidenceScore, 0) / olderCorrections.length;
    
    return recentAccuracy - olderAccuracy;
  }

  private async generateImprovementSuggestions(corrections: FeedbackData[]): Promise<string[]> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "Generate specific improvement suggestions for OCR/NLP processing based on user corrections. Respond with JSON array of actionable suggestions."
          },
          {
            role: "user",
            content: `Based on these user corrections, suggest improvements for better accuracy:\n${JSON.stringify(corrections.slice(-5), null, 2)}`
          }
        ],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{"suggestions": []}');
      return result.suggestions || [];
    } catch (error) {
      console.error("Error generating improvement suggestions:", error);
      return [];
    }
  }

  private async generateImprovedPrompts(patterns: Record<string, any>): Promise<Record<string, string>> {
    const improvedPrompts: Record<string, string> = {};

    for (const [fieldName, pattern] of Object.entries(patterns)) {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [
            {
              role: "system",
              content: "Generate an improved extraction prompt for aviation document processing based on error analysis."
            },
            {
              role: "user",
              content: `Field: ${fieldName}\nCommon errors: ${JSON.stringify(pattern.commonErrors)}\nGenerate an improved prompt that addresses these specific issues.`
            }
          ]
        });

        improvedPrompts[fieldName] = response.choices[0].message.content || "";
      } catch (error) {
        console.error(`Error generating improved prompt for ${fieldName}:`, error);
      }
    }

    return improvedPrompts;
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.').map(Number);
    parts[2]++; // Increment patch version for each training iteration
    return parts.join('.');
  }

  async getTrainingMetrics(): Promise<TrainingMetrics> {
    const fieldAccuracy: Record<string, number> = {};
    
    // Calculate accuracy by field
    const fieldGroups: Record<string, FeedbackData[]> = {};
    for (const feedback of this.trainingHistory) {
      if (!fieldGroups[feedback.fieldName]) {
        fieldGroups[feedback.fieldName] = [];
      }
      fieldGroups[feedback.fieldName].push(feedback);
    }

    for (const [fieldName, feedbacks] of Object.entries(fieldGroups)) {
      const avgAccuracy = feedbacks.reduce((sum, f) => sum + f.confidenceScore, 0) / feedbacks.length;
      fieldAccuracy[fieldName] = Math.round(avgAccuracy * 100) / 100;
    }

    return {
      totalCorrections: this.trainingHistory.length,
      accuracyImprovement: this.calculateOverallAccuracyImprovement(),
      fieldAccuracyBreakdown: fieldAccuracy,
      modelVersion: this.modelVersion,
      lastTrainingDate: new Date()
    };
  }

  private calculateOverallAccuracyImprovement(): number {
    if (this.trainingHistory.length < 10) return 0;
    
    const recent = this.trainingHistory.slice(-20);
    const older = this.trainingHistory.slice(0, 20);
    
    const recentAvg = recent.reduce((sum, f) => sum + f.confidenceScore, 0) / recent.length;
    const olderAvg = older.reduce((sum, f) => sum + f.confidenceScore, 0) / older.length;
    
    return Math.round((recentAvg - olderAvg) * 100 * 100) / 100; // Percentage improvement
  }

  async exportTrainingData(): Promise<any> {
    return {
      trainingHistory: this.trainingHistory,
      metrics: await this.getTrainingMetrics(),
      modelVersion: this.modelVersion,
      exportDate: new Date().toISOString()
    };
  }
}

export const mlTrainingService = new MLTrainingService();