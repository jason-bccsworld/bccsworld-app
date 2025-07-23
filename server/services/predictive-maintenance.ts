import OpenAI from 'openai';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface AircraftSensorData {
  aircraftId: string;
  timestamp: string;
  engineData: {
    temperature: number;
    pressure: number;
    vibration: number;
    oilPressure: number;
    fuelFlow: number;
  };
  hydraulicData: {
    pressure1: number;
    pressure2: number;
    temperature: number;
    fluidLevel: number;
  };
  avionicsData: {
    temperature: number;
    voltage: number;
    signalStrength: number;
    processingLoad: number;
  };
  structuralData: {
    stress: number;
    fatigueCycles: number;
    corrosionIndex: number;
  };
}

export interface PredictiveAlert {
  id: string;
  aircraftId: string;
  component: string;
  prediction: string;
  confidence: number;
  timeToFailure: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendedAction: string;
  affectedSystems: string[];
  estimatedCost: number;
  regulatoryImpact: string;
  createdAt: string;
}

export interface MaintenanceOptimization {
  aircraftId: string;
  optimizedSchedule: {
    taskId: string;
    description: string;
    priority: number;
    estimatedHours: number;
    requiredParts: string[];
    certifiedTechnicians: string[];
    optimalWindow: string;
  }[];
  costSavings: number;
  downtimeReduction: number;
  complianceScore: number;
}

export class PredictiveMaintenanceEngine {
  async analyzeSensorData(sensorData: AircraftSensorData): Promise<PredictiveAlert[]> {
    try {
      const prompt = `Analyze the following aircraft sensor data for predictive maintenance insights:

Aircraft ID: ${sensorData.aircraftId}
Timestamp: ${sensorData.timestamp}

Engine Data:
- Temperature: ${sensorData.engineData.temperature}°F
- Pressure: ${sensorData.engineData.pressure} PSI
- Vibration: ${sensorData.engineData.vibration} Hz
- Oil Pressure: ${sensorData.engineData.oilPressure} PSI
- Fuel Flow: ${sensorData.engineData.fuelFlow} GPH

Hydraulic Data:
- System 1 Pressure: ${sensorData.hydraulicData.pressure1} PSI
- System 2 Pressure: ${sensorData.hydraulicData.pressure2} PSI
- Temperature: ${sensorData.hydraulicData.temperature}°F
- Fluid Level: ${sensorData.hydraulicData.fluidLevel}%

Avionics Data:
- Temperature: ${sensorData.avionicsData.temperature}°F
- Voltage: ${sensorData.avionicsData.voltage}V
- Signal Strength: ${sensorData.avionicsData.signalStrength}%
- Processing Load: ${sensorData.avionicsData.processingLoad}%

Structural Data:
- Stress Level: ${sensorData.structuralData.stress}
- Fatigue Cycles: ${sensorData.structuralData.fatigueCycles}
- Corrosion Index: ${sensorData.structuralData.corrosionIndex}

Based on this data, identify potential maintenance issues, predict failure timeframes, and recommend actions. Consider regulatory compliance requirements and safety implications.

Respond with a JSON array of alerts, each containing:
- component: specific component at risk
- prediction: detailed failure prediction
- confidence: prediction confidence (0-100)
- timeToFailure: estimated time range
- severity: LOW/MEDIUM/HIGH/CRITICAL
- recommendedAction: specific maintenance action
- affectedSystems: array of affected aircraft systems
- estimatedCost: repair cost estimate in USD
- regulatoryImpact: regulatory compliance considerations`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert aircraft maintenance engineer and data analyst specializing in predictive maintenance. Analyze sensor data to identify potential failures before they occur, considering FAA regulations and safety requirements."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{"alerts": []}');
      
      return (analysis.alerts || []).map((alert: any, index: number) => ({
        id: `pred_${sensorData.aircraftId}_${Date.now()}_${index}`,
        aircraftId: sensorData.aircraftId,
        component: alert.component || 'Unknown Component',
        prediction: alert.prediction || 'Potential issue detected',
        confidence: Math.min(100, Math.max(0, alert.confidence || 0)),
        timeToFailure: alert.timeToFailure || 'Unknown timeframe',
        severity: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(alert.severity) ? alert.severity : 'MEDIUM',
        recommendedAction: alert.recommendedAction || 'Schedule inspection',
        affectedSystems: Array.isArray(alert.affectedSystems) ? alert.affectedSystems : [],
        estimatedCost: alert.estimatedCost || 0,
        regulatoryImpact: alert.regulatoryImpact || 'Standard maintenance procedures apply',
        createdAt: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error analyzing sensor data:', error);
      return [];
    }
  }

  async optimizeMaintenanceSchedule(
    aircraftId: string, 
    currentTasks: any[], 
    sensorData: AircraftSensorData,
    predictiveAlerts: PredictiveAlert[]
  ): Promise<MaintenanceOptimization> {
    try {
      const prompt = `Optimize the maintenance schedule for aircraft ${aircraftId} based on:

Current Scheduled Tasks:
${JSON.stringify(currentTasks, null, 2)}

Recent Sensor Data:
${JSON.stringify(sensorData, null, 2)}

Predictive Alerts:
${JSON.stringify(predictiveAlerts, null, 2)}

Create an optimized maintenance schedule that:
1. Prioritizes critical and high-severity predictions
2. Minimizes aircraft downtime by combining compatible tasks
3. Considers technician certifications and parts availability
4. Maintains FAA compliance requirements
5. Optimizes cost and resource utilization

Respond with JSON containing:
- optimizedSchedule: array of prioritized maintenance tasks
- costSavings: estimated cost savings in USD
- downtimeReduction: percentage reduction in downtime
- complianceScore: regulatory compliance score (0-100)`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert maintenance planning optimizer with deep knowledge of aircraft systems, FAA regulations, and resource management. Create efficient maintenance schedules that minimize downtime while ensuring safety and compliance."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const optimization = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        aircraftId,
        optimizedSchedule: (optimization.optimizedSchedule || []).map((task: any, index: number) => ({
          taskId: task.taskId || `task_${index}`,
          description: task.description || 'Maintenance task',
          priority: Math.min(10, Math.max(1, task.priority || 5)),
          estimatedHours: Math.max(0, task.estimatedHours || 0),
          requiredParts: Array.isArray(task.requiredParts) ? task.requiredParts : [],
          certifiedTechnicians: Array.isArray(task.certifiedTechnicians) ? task.certifiedTechnicians : [],
          optimalWindow: task.optimalWindow || 'Next available'
        })),
        costSavings: Math.max(0, optimization.costSavings || 0),
        downtimeReduction: Math.min(100, Math.max(0, optimization.downtimeReduction || 0)),
        complianceScore: Math.min(100, Math.max(0, optimization.complianceScore || 95))
      };
    } catch (error) {
      console.error('Error optimizing maintenance schedule:', error);
      return {
        aircraftId,
        optimizedSchedule: [],
        costSavings: 0,
        downtimeReduction: 0,
        complianceScore: 95
      };
    }
  }

  async generateMaintenanceReport(
    aircraftId: string,
    alerts: PredictiveAlert[],
    optimization: MaintenanceOptimization
  ): Promise<string> {
    try {
      const prompt = `Generate a comprehensive predictive maintenance report for aircraft ${aircraftId}:

Predictive Alerts:
${JSON.stringify(alerts, null, 2)}

Maintenance Optimization:
${JSON.stringify(optimization, null, 2)}

Create a professional maintenance report that includes:
1. Executive summary of aircraft health
2. Critical findings and immediate actions required
3. Detailed analysis of each predictive alert
4. Optimized maintenance schedule with justification
5. Cost-benefit analysis of predictive vs. reactive maintenance
6. Regulatory compliance assessment
7. Recommendations for ongoing monitoring

Format as a professional maintenance report suitable for chief mechanics, maintenance managers, and regulatory authorities.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a senior aircraft maintenance engineer creating professional maintenance reports. Write clear, detailed reports that support maintenance decisions and regulatory compliance."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 2000
      });

      return response.choices[0].message.content || 'Report generation failed';
    } catch (error) {
      console.error('Error generating maintenance report:', error);
      return 'Error: Unable to generate maintenance report';
    }
  }

  calculateNetworkIntelligence(totalAircraft: number, dataQuality: number): number {
    // Network effect calculation: intelligence improves logarithmically with fleet size
    const baseIntelligence = 75; // Base intelligence without network effects
    const networkBonus = Math.log(Math.max(1, totalAircraft)) * 5; // Logarithmic scaling
    const qualityMultiplier = dataQuality / 100; // Data quality factor
    
    return Math.min(99, baseIntelligence + (networkBonus * qualityMultiplier));
  }

  async crossFleetAnalysis(allAircraftData: AircraftSensorData[]): Promise<{
    patterns: string[];
    recommendations: string[];
    riskFactors: string[];
    industryBenchmarks: any;
  }> {
    try {
      const prompt = `Analyze cross-fleet data patterns from ${allAircraftData.length} aircraft:

Fleet Data Summary:
${JSON.stringify(allAircraftData.slice(0, 10), null, 2)} // Sample data

Identify:
1. Common failure patterns across the fleet
2. Emerging trends and early warning indicators
3. Risk factors affecting multiple aircraft
4. Industry benchmarking opportunities
5. Fleet-wide optimization recommendations

Consider how patterns in one aircraft type can inform maintenance decisions for similar aircraft in the network.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a fleet-wide maintenance analyst identifying patterns and trends across multiple aircraft to improve overall fleet reliability and reduce costs."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        patterns: Array.isArray(analysis.patterns) ? analysis.patterns : [],
        recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : [],
        riskFactors: Array.isArray(analysis.riskFactors) ? analysis.riskFactors : [],
        industryBenchmarks: analysis.industryBenchmarks || {}
      };
    } catch (error) {
      console.error('Error in cross-fleet analysis:', error);
      return {
        patterns: [],
        recommendations: [],
        riskFactors: [],
        industryBenchmarks: {}
      };
    }
  }
}

export const predictiveMaintenanceEngine = new PredictiveMaintenanceEngine();