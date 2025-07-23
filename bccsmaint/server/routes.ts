import type { Express } from "express";
import path from "path";
import { PredictiveMaintenanceEngine } from "./services/predictive-engine";

const engine = new PredictiveMaintenanceEngine();

export function registerRoutes(app: Express) {
  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'healthy', service: 'BCCSMaint', timestamp: new Date().toISOString() });
  });

  // Fleet metrics
  app.get('/api/fleet/metrics', async (_req, res) => {
    try {
      const metrics = await engine.getFleetMetrics();
      res.json(metrics);
    } catch (error) {
      console.error('Error fetching fleet metrics:', error);
      res.status(500).json({ error: 'Failed to fetch fleet metrics' });
    }
  });

  // Fleet status
  app.get('/api/fleet/status', async (_req, res) => {
    try {
      const fleetStatus = await engine.getFleetStatus();
      res.json(fleetStatus);
    } catch (error) {
      console.error('Error fetching fleet status:', error);
      res.status(500).json({ error: 'Failed to fetch fleet status' });
    }
  });

  // Predictive alerts
  app.get('/api/alerts', async (_req, res) => {
    try {
      const alerts = await engine.getPredictiveAlerts();
      res.json(alerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      res.status(500).json({ error: 'Failed to fetch alerts' });
    }
  });

  // Maintenance schedule
  app.get('/api/maintenance/schedule', async (_req, res) => {
    try {
      const schedule = await engine.getMaintenanceSchedule();
      res.json(schedule);
    } catch (error) {
      console.error('Error fetching maintenance schedule:', error);
      res.status(500).json({ error: 'Failed to fetch maintenance schedule' });
    }
  });

  // Cost analysis
  app.get('/api/analytics/costs', async (_req, res) => {
    try {
      const costAnalysis = await engine.getCostAnalysis();
      res.json(costAnalysis);
    } catch (error) {
      console.error('Error fetching cost analysis:', error);
      res.status(500).json({ error: 'Failed to fetch cost analysis' });
    }
  });

  // Serve React app in production
  if (process.env.NODE_ENV === 'production') {
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, '../dist/public/index.html'));
    });
  }
}