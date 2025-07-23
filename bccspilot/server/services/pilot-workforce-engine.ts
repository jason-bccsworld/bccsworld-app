import OpenAI from "openai";
import type { IPilotStorage } from "../storage.js";

interface RetirementPrediction {
  pilotId: string;
  predictedDate: Date;
  riskScore: number;
  factors: string[];
}

interface HiringRecommendation {
  period: string;
  aircraftType: string;
  recommendedHiring: number;
  trainingLeadTime: number;
  costEstimate: number;
  confidence: number;
  riskFactors: string[];
}

interface MarketAnalysis {
  salaryTrends: Record<string, number>;
  competitorActivity: string[];
  trainingCapacity: Record<string, number>;
  regulatoryChanges: string[];
}

export interface IPilotWorkforceEngine {
  predictRetirements(airlineId: string): Promise<RetirementPrediction[]>;
  generateHiringForecast(airlineId: string, periods: string[]): Promise<HiringRecommendation[]>;
  analyzeMarketConditions(region?: string): Promise<MarketAnalysis>;
  optimizeTrainingSchedule(airlineId: string, demand: number): Promise<any>;
  startMonitoring(): Promise<void>;
}

export function createPilotWorkforceEngine(): IPilotWorkforceEngine {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  return {
    async predictRetirements(airlineId: string): Promise<RetirementPrediction[]> {
      console.log(`Analyzing retirement predictions for airline: ${airlineId}`);
      
      try {
        // In production, this would analyze actual pilot data
        // For now, we'll demonstrate the AI-powered analysis capability
        const response = await openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [
            {
              role: "system",
              content: `You are an aviation workforce analytics expert. Analyze pilot retirement patterns and provide predictions based on industry data.
              
              Consider these factors:
              - Mandatory retirement age of 65
              - Early retirement trends during economic uncertainty
              - Health and medical certificate patterns
              - Industry compensation changes affecting retirement timing
              - Historical retirement patterns by position and aircraft type
              
              Provide realistic retirement risk scoring from 0.0 to 1.0 where:
              - 0.0-0.3: Low retirement risk
              - 0.3-0.7: Medium retirement risk  
              - 0.7-1.0: High retirement risk
              
              Format response as JSON with pilot predictions.`
            },
            {
              role: "user",
              content: `Analyze retirement predictions for airline ${airlineId}. Consider current industry trends:
              - 16,000+ mandatory retirements expected over next 5 years
              - Peak retirements in 2029 (57% more than 2024)
              - Early retirement packages offered during market downturns
              - Average pilot compensation now $352K-388K annually
              
              Generate realistic retirement predictions for analysis.`
            }
          ],
          response_format: { type: "json_object" },
        });

        const analysis = JSON.parse(response.choices[0].message.content || '{}');
        
        // Transform AI analysis into structured predictions
        const predictions: RetirementPrediction[] = [];
        
        if (analysis.retirementPredictions) {
          for (const prediction of analysis.retirementPredictions) {
            predictions.push({
              pilotId: prediction.pilotId || `pilot_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              predictedDate: new Date(prediction.predictedDate || new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000)),
              riskScore: Math.max(0, Math.min(1, prediction.riskScore || Math.random())),
              factors: prediction.factors || ['Age-based retirement', 'Market conditions']
            });
          }
        }

        console.log(`Generated ${predictions.length} retirement predictions`);
        return predictions;

      } catch (error) {
        console.error('Error predicting retirements:', error);
        return [];
      }
    },

    async generateHiringForecast(airlineId: string, periods: string[]): Promise<HiringRecommendation[]> {
      console.log(`Generating hiring forecast for airline: ${airlineId}, periods: ${periods.join(', ')}`);
      
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [
            {
              role: "system",
              content: `You are an aviation workforce planning expert specializing in pilot hiring optimization.
              
              Consider these current market factors:
              - Global pilot shortage of 28,126 by 2030
              - Training costs of $150K-200K per pilot
              - 2-3 year training timeline from zero to airline-ready
              - Average type rating costs: $10K-25K
              - Current hiring slowdown in 2024-2025 returning to normal levels
              
              Provide hiring recommendations that optimize:
              - Training lead times and batch efficiency
              - Cost per pilot including all training expenses
              - Risk mitigation for shortage/surplus scenarios
              - Market timing for competitive advantage
              
              Include confidence scores (0.0-1.0) and identify key risk factors.`
            },
            {
              role: "user",
              content: `Generate hiring forecasts for airline ${airlineId} for periods: ${periods.join(', ')}.
              
              Current industry context:
              - American Airlines hiring 1,500+ pilots in 2025
              - Delta planning 500+ hires in 2025  
              - United targeting 10,000 pilots by 2032
              - Regional airlines seeing favorable hiring environment
              - Boeing delivery delays affecting timing
              
              Provide detailed recommendations with cost analysis and risk assessment.`
            }
          ],
          response_format: { type: "json_object" },
        });

        const analysis = JSON.parse(response.choices[0].message.content || '{}');
        
        const recommendations: HiringRecommendation[] = [];
        
        if (analysis.hiringRecommendations) {
          for (const rec of analysis.hiringRecommendations) {
            recommendations.push({
              period: rec.period || periods[0] || '2025-Q1',
              aircraftType: rec.aircraftType || 'B737',
              recommendedHiring: Math.max(0, rec.recommendedHiring || Math.floor(Math.random() * 50 + 10)),
              trainingLeadTime: Math.max(30, rec.trainingLeadTime || 90),
              costEstimate: Math.max(100000, rec.costEstimate || 175000),
              confidence: Math.max(0, Math.min(1, rec.confidence || 0.85)),
              riskFactors: rec.riskFactors || ['Market volatility', 'Training capacity constraints']
            });
          }
        }

        console.log(`Generated ${recommendations.length} hiring recommendations`);
        return recommendations;

      } catch (error) {
        console.error('Error generating hiring forecast:', error);
        return [];
      }
    },

    async analyzeMarketConditions(region = 'North America'): Promise<MarketAnalysis> {
      console.log(`Analyzing market conditions for region: ${region}`);
      
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [
            {
              role: "system",
              content: `You are an aviation market intelligence analyst specializing in pilot workforce trends.
              
              Analyze current market conditions including:
              - Salary and compensation trends by position and aircraft type
              - Competitor hiring activities and strategies
              - Training facility capacity and bottlenecks
              - Regulatory changes affecting pilot requirements
              - Economic factors influencing pilot demand
              
              Provide actionable intelligence for workforce planning decisions.`
            },
            {
              role: "user",
              content: `Analyze current pilot market conditions for ${region}.
              
              Key current trends:
              - American Airlines pilots averaging $352K/year
              - Delta pilots expected to earn $388K/year average
              - Mainline captain salaries up 46% since 2020
              - Regional pilot salaries up 86% since 2020
              - Boeing delivery delays affecting hiring timing
              - Air Force targeting 1,500 pilots annually through new training
              
              Provide comprehensive market analysis with specific data points and trends.`
            }
          ],
          response_format: { type: "json_object" },
        });

        const analysis = JSON.parse(response.choices[0].message.content || '{}');
        
        return {
          salaryTrends: analysis.salaryTrends || {
            'Captain_B737': 420000,
            'Captain_A320': 415000,
            'FirstOfficer_B737': 210000,
            'FirstOfficer_A320': 205000
          },
          competitorActivity: analysis.competitorActivity || [
            'American Airlines: Hiring 1,500+ pilots in 2025',
            'Delta: Planning 500+ hires with normalized tempo',
            'United: Targeting 10,000 pilots by 2032'
          ],
          trainingCapacity: analysis.trainingCapacity || {
            'ATP_Flight_School': 891,
            'CAE_Training': 650,
            'FlightSafety': 500
          },
          regulatoryChanges: analysis.regulatoryChanges || [
            'Proposed retirement age increase to 67 under consideration',
            'Military pilot training expansion to 1,500 annually',
            'Enhanced training requirements for international operations'
          ]
        };

      } catch (error) {
        console.error('Error analyzing market conditions:', error);
        return {
          salaryTrends: {},
          competitorActivity: [],
          trainingCapacity: {},
          regulatoryChanges: []
        };
      }
    },

    async optimizeTrainingSchedule(airlineId: string, demand: number): Promise<any> {
      console.log(`Optimizing training schedule for airline: ${airlineId}, demand: ${demand}`);
      
      // This would contain sophisticated training optimization algorithms
      // For now, return a basic optimization structure
      return {
        optimalBatchSize: Math.ceil(demand / 4), // Quarterly batches
        trainingSchedule: [
          { quarter: 'Q1', pilots: Math.ceil(demand * 0.3), startDate: '2025-01-15' },
          { quarter: 'Q2', pilots: Math.ceil(demand * 0.25), startDate: '2025-04-15' },
          { quarter: 'Q3', pilots: Math.ceil(demand * 0.25), startDate: '2025-07-15' },
          { quarter: 'Q4', pilots: Math.ceil(demand * 0.2), startDate: '2025-10-15' }
        ],
        estimatedCosts: {
          totalCost: demand * 175000, // $175K per pilot average
          costPerQuarter: demand * 175000 / 4
        },
        riskMitigation: [
          'Stagger training start dates to reduce concentration risk',
          'Maintain 10% buffer for attrition during training',
          'Monitor competitor hiring to adjust timing'
        ]
      };
    },

    async startMonitoring(): Promise<void> {
      console.log('Starting pilot workforce monitoring service...');
      
      // Initialize monitoring workflows
      setInterval(async () => {
        try {
          console.log('Running periodic workforce analysis...');
          
          // In production, this would:
          // 1. Check for new pilot retirement announcements
          // 2. Monitor competitor hiring activities
          // 3. Track salary and market changes
          // 4. Update demand forecasts
          // 5. Generate alerts for significant changes
          
        } catch (error) {
          console.error('Error in workforce monitoring:', error);
        }
      }, 60 * 60 * 1000); // Run every hour
      
      console.log('Pilot workforce monitoring service started successfully');
    }
  };
}