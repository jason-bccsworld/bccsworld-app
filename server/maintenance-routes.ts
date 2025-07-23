import type { Express } from "express";

export function registerMaintenanceRoutes(app: Express) {
  // BCCSMaint Predictive Maintenance Routes
  app.get('/api/maintenance/metrics', async (req, res) => {
    try {
      const metrics = {
        totalAircraft: 247,
        predictiveAccuracy: 96.8,
        costReduction: 43.2,
        uptimeImprovement: 28.5,
        criticalAlerts: 7,
        predictedFailures: 23,
        preventedDowntime: 156,
        networkIntelligence: 94.3
      };
      res.json(metrics);
    } catch (error) {
      console.error('Error fetching maintenance metrics:', error);
      res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  });

  app.get('/api/maintenance/alerts', async (req, res) => {
    try {
      const alerts = [
        {
          id: 'alert-001',
          aircraftId: 'N8742K',
          component: 'Left Engine Turbine Blade',
          prediction: 'Fatigue crack development detected',
          confidence: 94.7,
          timeToFailure: '18-22 flight hours',
          severity: 'HIGH',
          recommendedAction: 'Schedule borescope inspection within 5 flights'
        }
      ];
      res.json(alerts);
    } catch (error) {
      console.error('Error fetching maintenance alerts:', error);
      res.status(500).json({ error: 'Failed to fetch alerts' });
    }
  });

  app.get('/api/maintenance/fleet', async (req, res) => {
    try {
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
}