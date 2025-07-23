import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface FleetMetrics {
  totalAircraft: number;
  operationalAircraft: number;
  maintenanceAircraft: number;
  groundedAircraft: number;
  predictiveAccuracy: number;
  costReduction: number;
  uptimeImprovement: number;
  criticalAlerts: number;
  predictedFailures: number;
  preventedDowntime: number;
  networkIntelligence: number;
}

export interface AircraftStatus {
  aircraftId: string;
  model: string;
  status: 'OPERATIONAL' | 'MAINTENANCE' | 'GROUNDED';
  healthScore: number;
  nextMaintenance: string;
  criticalAlerts: number;
  lastUpdate: string;
  location?: string;
  flightHours: number;
  engineCycles: number;
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
  costImpact: number;
  created: string;
}

export interface MaintenanceTask {
  id: string;
  aircraftId: string;
  taskType: string;
  description: string;
  scheduledDate: string;
  estimatedDuration: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  technician?: string;
  partsRequired: string[];
  estimatedCost: number;
}

export class PredictiveMaintenanceEngine {
  // Mock fleet data - in production this would come from real sensors and databases
  private mockFleetData = [
    {
      aircraftId: 'N8742K',
      model: 'Cessna Citation CJ3+',
      status: 'OPERATIONAL' as const,
      healthScore: 87.4,
      nextMaintenance: '2025-02-15',
      criticalAlerts: 1,
      location: 'KORD - Chicago O\'Hare',
      flightHours: 3456,
      engineCycles: 2187
    },
    {
      aircraftId: 'N5639M', 
      model: 'Piper Seminole',
      status: 'MAINTENANCE' as const,
      healthScore: 76.2,
      nextMaintenance: '2025-01-25',
      criticalAlerts: 0,
      location: 'KFLL - Fort Lauderdale',
      flightHours: 1823,
      engineCycles: 1456
    },
    {
      aircraftId: 'N2847L',
      model: 'Beechcraft King Air 350',
      status: 'GROUNDED' as const,
      healthScore: 45.1,
      nextMaintenance: 'IMMEDIATE',
      criticalAlerts: 2,
      location: 'KPHX - Phoenix Sky Harbor',
      flightHours: 4567,
      engineCycles: 3421
    },
    {
      aircraftId: 'N9876T',
      model: 'Cirrus SR22',
      status: 'OPERATIONAL' as const,
      healthScore: 92.8,
      nextMaintenance: '2025-03-10',
      criticalAlerts: 0,
      location: 'KLAS - Las Vegas McCarran',
      flightHours: 987,
      engineCycles: 654
    },
    {
      aircraftId: 'N4321P',
      model: 'Diamond DA40',
      status: 'OPERATIONAL' as const,
      healthScore: 89.3,
      nextMaintenance: '2025-02-28',
      criticalAlerts: 0,
      location: 'KJFK - New York JFK',
      flightHours: 2134,
      engineCycles: 1765
    }
  ];

  async getFleetMetrics(): Promise<FleetMetrics> {
    const operational = this.mockFleetData.filter(a => a.status === 'OPERATIONAL').length;
    const maintenance = this.mockFleetData.filter(a => a.status === 'MAINTENANCE').length;
    const grounded = this.mockFleetData.filter(a => a.status === 'GROUNDED').length;
    const totalAlerts = this.mockFleetData.reduce((sum, a) => sum + a.criticalAlerts, 0);

    return {
      totalAircraft: this.mockFleetData.length,
      operationalAircraft: operational,
      maintenanceAircraft: maintenance,
      groundedAircraft: grounded,
      predictiveAccuracy: 96.8,
      costReduction: 43.2,
      uptimeImprovement: 28.5,
      criticalAlerts: totalAlerts,
      predictedFailures: 12,
      preventedDowntime: 156,
      networkIntelligence: this.calculateNetworkIntelligence()
    };
  }

  async getFleetStatus(): Promise<AircraftStatus[]> {
    return this.mockFleetData.map(aircraft => ({
      ...aircraft,
      lastUpdate: new Date().toISOString()
    }));
  }

  async getPredictiveAlerts(): Promise<PredictiveAlert[]> {
    return [
      {
        id: 'alert-001',
        aircraftId: 'N8742K',
        component: 'Left Engine Turbine Blade',
        prediction: 'Fatigue crack development detected in turbine blade section',
        confidence: 94.7,
        timeToFailure: '18-22 flight hours',
        severity: 'HIGH',
        recommendedAction: 'Schedule borescope inspection within 5 flights',
        costImpact: 15000,
        created: new Date().toISOString()
      },
      {
        id: 'alert-002',
        aircraftId: 'N2847L',
        component: 'Hydraulic System Pump',
        prediction: 'Pressure anomaly indicating pump seal degradation',
        confidence: 87.3,
        timeToFailure: '3-5 flight cycles',
        severity: 'CRITICAL',
        recommendedAction: 'Ground aircraft immediately and replace hydraulic pump',
        costImpact: 8500,
        created: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'alert-003',
        aircraftId: 'N2847L',
        component: 'Avionics Cooling Fan',
        prediction: 'Fan bearing wear approaching failure threshold',
        confidence: 91.2,
        timeToFailure: '12-15 flight hours',
        severity: 'MEDIUM',
        recommendedAction: 'Replace cooling fan during next scheduled maintenance',
        costImpact: 1200,
        created: new Date(Date.now() - 7200000).toISOString()
      }
    ];
  }

  async getMaintenanceSchedule(): Promise<MaintenanceTask[]> {
    return [
      {
        id: 'task-001',
        aircraftId: 'N8742K',
        taskType: 'Inspection',
        description: 'Borescope inspection of left engine turbine section',
        scheduledDate: '2025-01-25',
        estimatedDuration: 4,
        priority: 'HIGH',
        technician: 'Mike Rodriguez',
        partsRequired: ['Borescope kit', 'Turbine blade (if replacement needed)'],
        estimatedCost: 2500
      },
      {
        id: 'task-002',
        aircraftId: 'N2847L',
        taskType: 'Replacement',
        description: 'Emergency hydraulic pump replacement',
        scheduledDate: '2025-01-24',
        estimatedDuration: 8,
        priority: 'CRITICAL',
        technician: 'Sarah Chen',
        partsRequired: ['Hydraulic pump assembly', 'Hydraulic fluid', 'Seals kit'],
        estimatedCost: 8500
      },
      {
        id: 'task-003',
        aircraftId: 'N5639M',
        taskType: 'Routine',
        description: '100-hour inspection and service',
        scheduledDate: '2025-01-26',
        estimatedDuration: 6,
        priority: 'MEDIUM',
        technician: 'David Kim',
        partsRequired: ['Oil filter', 'Engine oil', 'Air filter'],
        estimatedCost: 1200
      }
    ];
  }

  async getCostAnalysis() {
    return {
      totalSavings: 425000,
      preventedDowntime: 156,
      earlyDetection: 23,
      optimizedMaintenance: 18,
      monthlyTrends: [
        { month: 'Jul', traditional: 45000, predictive: 28000, savings: 17000 },
        { month: 'Aug', traditional: 52000, predictive: 31000, savings: 21000 },
        { month: 'Sep', traditional: 48000, predictive: 27000, savings: 21000 },
        { month: 'Oct', traditional: 55000, predictive: 32000, savings: 23000 },
        { month: 'Nov', traditional: 51000, predictive: 29000, savings: 22000 },
        { month: 'Dec', traditional: 49000, predictive: 28000, savings: 21000 }
      ],
      roi: 340,
      paybackPeriod: 3.2
    };
  }

  private calculateNetworkIntelligence(): number {
    // Simulate network intelligence calculation based on fleet size and cross-learning
    const fleetSize = this.mockFleetData.length;
    const baseIntelligence = 85;
    const networkBonus = Math.min(15, fleetSize * 0.5);
    return Math.round((baseIntelligence + networkBonus) * 10) / 10;
  }

  // AI-powered failure prediction using OpenAI
  async predictFailure(sensorData: any): Promise<PredictiveAlert> {
    try {
      const prompt = `Analyze this aircraft sensor data and predict potential failures:
      
Aircraft ID: ${sensorData.aircraftId}
Engine Temperature: ${sensorData.engineTemp}°F
Vibration Level: ${sensorData.vibration} Hz
Oil Pressure: ${sensorData.oilPressure} PSI
Flight Hours: ${sensorData.flightHours}

Based on this data, provide a JSON response with:
- component: affected component
- prediction: failure prediction
- confidence: confidence percentage (0-100)
- timeToFailure: estimated time
- severity: LOW/MEDIUM/HIGH/CRITICAL
- recommendedAction: what to do`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      const prediction = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        id: `ai-${Date.now()}`,
        aircraftId: sensorData.aircraftId,
        component: prediction.component,
        prediction: prediction.prediction,
        confidence: prediction.confidence,
        timeToFailure: prediction.timeToFailure,
        severity: prediction.severity,
        recommendedAction: prediction.recommendedAction,
        costImpact: prediction.estimatedCost || 0,
        created: new Date().toISOString()
      };
    } catch (error) {
      console.error('AI prediction error:', error);
      throw new Error('Failed to generate AI prediction');
    }
  }
}