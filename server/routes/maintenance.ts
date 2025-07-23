import express from 'express';
import { predictiveMaintenanceEngine, AircraftSensorData } from '../services/predictive-maintenance';

const router = express.Router();

// Maintenance metrics endpoint
router.get('/metrics', async (req, res) => {
  try {
    // In production, this would query actual database
    const metrics = {
      totalAircraft: 247,
      predictiveAccuracy: 96.8,
      costReduction: 43.2,
      uptimeImprovement: 28.5,
      criticalAlerts: 7,
      predictedFailures: 23,
      preventedDowntime: 156,
      networkIntelligence: predictiveMaintenanceEngine.calculateNetworkIntelligence(247, 85)
    };
    
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching maintenance metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Predictive alerts endpoint
router.get('/alerts', async (req, res) => {
  try {
    // Mock sensor data for demonstration
    const mockSensorData: AircraftSensorData = {
      aircraftId: 'N8742K',
      timestamp: new Date().toISOString(),
      engineData: {
        temperature: 1850, // Slightly high
        pressure: 42.5,
        vibration: 15.7, // Elevated vibration
        oilPressure: 85,
        fuelFlow: 245
      },
      hydraulicData: {
        pressure1: 2950,
        pressure2: 2875, // Slightly low
        temperature: 165,
        fluidLevel: 87
      },
      avionicsData: {
        temperature: 145, // Running hot
        voltage: 28.2,
        signalStrength: 92,
        processingLoad: 67
      },
      structuralData: {
        stress: 0.75,
        fatigueCycles: 15420,
        corrosionIndex: 0.12
      }
    };

    const alerts = await predictiveMaintenanceEngine.analyzeSensorData(mockSensorData);
    res.json(alerts);
  } catch (error) {
    console.error('Error fetching maintenance alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Fleet status endpoint
router.get('/fleet', async (req, res) => {
  try {
    // Mock fleet data - would come from real aircraft monitoring systems
    const fleetStatus = [
      {
        aircraftId: 'N8742K',
        model: 'Cessna Citation CJ3+',
        status: 'OPERATIONAL',
        healthScore: 87.4,
        nextMaintenance: '2025-02-15',
        criticalAlerts: 1,
        lastUpdate: new Date().toISOString()
      },
      {
        aircraftId: 'N5639M',
        model: 'Piper Seminole',
        status: 'MAINTENANCE',
        healthScore: 76.2,
        nextMaintenance: '2025-01-25',
        criticalAlerts: 0,
        lastUpdate: new Date().toISOString()
      },
      {
        aircraftId: 'N2847L',
        model: 'Beechcraft King Air 350',
        status: 'GROUNDED',
        healthScore: 45.1,
        nextMaintenance: 'IMMEDIATE',
        criticalAlerts: 2,
        lastUpdate: new Date().toISOString()
      }
    ];
    
    res.json(fleetStatus);
  } catch (error) {
    console.error('Error fetching fleet status:', error);
    res.status(500).json({ error: 'Failed to fetch fleet status' });
  }
});

// Analyze aircraft sensor data
router.post('/analyze', async (req, res) => {
  try {
    const sensorData: AircraftSensorData = req.body;
    
    if (!sensorData.aircraftId) {
      return res.status(400).json({ error: 'Aircraft ID is required' });
    }
    
    const alerts = await predictiveMaintenanceEngine.analyzeSensorData(sensorData);
    const optimization = await predictiveMaintenanceEngine.optimizeMaintenanceSchedule(
      sensorData.aircraftId,
      [], // Current tasks would come from database
      sensorData,
      alerts
    );
    
    res.json({
      alerts,
      optimization,
      analysisId: `analysis_${sensorData.aircraftId}_${Date.now()}`
    });
  } catch (error) {
    console.error('Error analyzing sensor data:', error);
    res.status(500).json({ error: 'Failed to analyze sensor data' });
  }
});

// Generate maintenance report
router.post('/report', async (req, res) => {
  try {
    const { aircraftId, alerts, optimization } = req.body;
    
    if (!aircraftId) {
      return res.status(400).json({ error: 'Aircraft ID is required' });
    }
    
    const report = await predictiveMaintenanceEngine.generateMaintenanceReport(
      aircraftId,
      alerts || [],
      optimization || {}
    );
    
    res.json({
      report,
      generatedAt: new Date().toISOString(),
      reportId: `report_${aircraftId}_${Date.now()}`
    });
  } catch (error) {
    console.error('Error generating maintenance report:', error);
    res.status(500).json({ error: 'Failed to generate maintenance report' });
  }
});

// Cross-fleet analysis
router.get('/cross-fleet-analysis', async (req, res) => {
  try {
    // Mock fleet sensor data for cross-fleet analysis
    const mockFleetData: AircraftSensorData[] = [
      {
        aircraftId: 'N8742K',
        timestamp: new Date().toISOString(),
        engineData: { temperature: 1850, pressure: 42.5, vibration: 15.7, oilPressure: 85, fuelFlow: 245 },
        hydraulicData: { pressure1: 2950, pressure2: 2875, temperature: 165, fluidLevel: 87 },
        avionicsData: { temperature: 145, voltage: 28.2, signalStrength: 92, processingLoad: 67 },
        structuralData: { stress: 0.75, fatigueCycles: 15420, corrosionIndex: 0.12 }
      },
      {
        aircraftId: 'N5639M',
        timestamp: new Date().toISOString(),
        engineData: { temperature: 1720, pressure: 41.8, vibration: 12.3, oilPressure: 88, fuelFlow: 210 },
        hydraulicData: { pressure1: 3000, pressure2: 2980, temperature: 155, fluidLevel: 92 },
        avionicsData: { temperature: 125, voltage: 28.4, signalStrength: 95, processingLoad: 45 },
        structuralData: { stress: 0.65, fatigueCycles: 12800, corrosionIndex: 0.08 }
      }
    ];
    
    const analysis = await predictiveMaintenanceEngine.crossFleetAnalysis(mockFleetData);
    
    res.json({
      ...analysis,
      fleetSize: mockFleetData.length,
      analysisDate: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in cross-fleet analysis:', error);
    res.status(500).json({ error: 'Failed to perform cross-fleet analysis' });
  }
});

export default router;