import { Router } from "express";
import type { IPilotStorage } from "./storage.js";
import type { IPilotWorkforceEngine } from "./services/pilot-workforce-engine.js";
import { insertAirlineSchema, insertPilotSchema, insertHiringForecastSchema } from "../shared/schema.js";

export default function createRoutes(storage: IPilotStorage, workforceEngine: IPilotWorkforceEngine) {
  const router = Router();

  // Test authentication endpoint
  router.get('/auth/user', (req, res) => {
    // Simple test user for development
    res.json({
      id: 'test-user',
      email: 'test@bccspilot.com',
      name: 'Test User',
      role: 'admin'
    });
  });

  // Airlines endpoints
  router.get('/airlines', async (req, res) => {
    try {
      const airlines = await storage.getAllAirlines();
      res.json(airlines);
    } catch (error) {
      console.error('Error fetching airlines:', error);
      res.status(500).json({ error: 'Failed to fetch airlines' });
    }
  });

  router.post('/airlines', async (req, res) => {
    try {
      const validatedData = insertAirlineSchema.parse(req.body);
      const airline = await storage.createAirline(validatedData);
      res.status(201).json(airline);
    } catch (error) {
      console.error('Error creating airline:', error);
      res.status(400).json({ error: 'Invalid airline data' });
    }
  });

  router.get('/airlines/:id', async (req, res) => {
    try {
      const airline = await storage.getAirlineById(req.params.id);
      if (!airline) {
        return res.status(404).json({ error: 'Airline not found' });
      }
      res.json(airline);
    } catch (error) {
      console.error('Error fetching airline:', error);
      res.status(500).json({ error: 'Failed to fetch airline' });
    }
  });

  // Pilots endpoints
  router.get('/airlines/:airlineId/pilots', async (req, res) => {
    try {
      const pilots = await storage.getPilotsByAirline(req.params.airlineId);
      res.json(pilots);
    } catch (error) {
      console.error('Error fetching pilots:', error);
      res.status(500).json({ error: 'Failed to fetch pilots' });
    }
  });

  router.post('/airlines/:airlineId/pilots', async (req, res) => {
    try {
      const validatedData = insertPilotSchema.parse({
        ...req.body,
        airlineId: req.params.airlineId
      });
      const pilot = await storage.createPilot(validatedData);
      res.status(201).json(pilot);
    } catch (error) {
      console.error('Error creating pilot:', error);
      res.status(400).json({ error: 'Invalid pilot data' });
    }
  });

  router.get('/airlines/:airlineId/pilots/retirement-forecast/:months', async (req, res) => {
    try {
      const months = parseInt(req.params.months);
      const pilots = await storage.getPilotsNearRetirement(req.params.airlineId, months);
      res.json(pilots);
    } catch (error) {
      console.error('Error fetching retirement forecast:', error);
      res.status(500).json({ error: 'Failed to fetch retirement forecast' });
    }
  });

  // Aircraft endpoints
  router.get('/airlines/:airlineId/aircraft', async (req, res) => {
    try {
      const aircraft = await storage.getAircraftByAirline(req.params.airlineId);
      res.json(aircraft);
    } catch (error) {
      console.error('Error fetching aircraft:', error);
      res.status(500).json({ error: 'Failed to fetch aircraft' });
    }
  });

  // Routes endpoints
  router.get('/airlines/:airlineId/routes', async (req, res) => {
    try {
      const routes = await storage.getRoutesByAirline(req.params.airlineId);
      res.json(routes);
    } catch (error) {
      console.error('Error fetching routes:', error);
      res.status(500).json({ error: 'Failed to fetch routes' });
    }
  });

  // Hiring Forecast endpoints
  router.get('/airlines/:airlineId/hiring-forecasts', async (req, res) => {
    try {
      const forecasts = await storage.getHiringForecastsByAirline(req.params.airlineId);
      res.json(forecasts);
    } catch (error) {
      console.error('Error fetching hiring forecasts:', error);
      res.status(500).json({ error: 'Failed to fetch hiring forecasts' });
    }
  });

  router.post('/airlines/:airlineId/hiring-forecasts', async (req, res) => {
    try {
      const validatedData = insertHiringForecastSchema.parse({
        ...req.body,
        airlineId: req.params.airlineId
      });
      const forecast = await storage.createHiringForecast(validatedData);
      res.status(201).json(forecast);
    } catch (error) {
      console.error('Error creating hiring forecast:', error);
      res.status(400).json({ error: 'Invalid forecast data' });
    }
  });

  // AI-powered analytics endpoints
  router.post('/airlines/:airlineId/analyze-retirements', async (req, res) => {
    try {
      const predictions = await workforceEngine.predictRetirements(req.params.airlineId);
      res.json(predictions);
    } catch (error) {
      console.error('Error analyzing retirements:', error);
      res.status(500).json({ error: 'Failed to analyze retirements' });
    }
  });

  router.post('/airlines/:airlineId/generate-hiring-forecast', async (req, res) => {
    try {
      const { periods } = req.body;
      if (!periods || !Array.isArray(periods)) {
        return res.status(400).json({ error: 'Periods array is required' });
      }
      
      const recommendations = await workforceEngine.generateHiringForecast(req.params.airlineId, periods);
      res.json(recommendations);
    } catch (error) {
      console.error('Error generating hiring forecast:', error);
      res.status(500).json({ error: 'Failed to generate hiring forecast' });
    }
  });

  router.get('/market-analysis', async (req, res) => {
    try {
      const region = req.query.region as string;
      const analysis = await workforceEngine.analyzeMarketConditions(region);
      res.json(analysis);
    } catch (error) {
      console.error('Error analyzing market conditions:', error);
      res.status(500).json({ error: 'Failed to analyze market conditions' });
    }
  });

  // Training Programs endpoints
  router.get('/airlines/:airlineId/training-programs', async (req, res) => {
    try {
      const programs = await storage.getTrainingProgramsByAirline(req.params.airlineId);
      res.json(programs);
    } catch (error) {
      console.error('Error fetching training programs:', error);
      res.status(500).json({ error: 'Failed to fetch training programs' });
    }
  });

  // Workforce Alerts endpoints
  router.get('/airlines/:airlineId/alerts', async (req, res) => {
    try {
      const unreadOnly = req.query.unread === 'true';
      const alerts = await storage.getWorkforceAlerts(req.params.airlineId, unreadOnly);
      res.json(alerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      res.status(500).json({ error: 'Failed to fetch alerts' });
    }
  });

  router.patch('/alerts/:id/read', async (req, res) => {
    try {
      await storage.markAlertAsRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking alert as read:', error);
      res.status(500).json({ error: 'Failed to mark alert as read' });
    }
  });

  router.patch('/alerts/:id/resolve', async (req, res) => {
    try {
      await storage.markAlertAsResolved(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking alert as resolved:', error);
      res.status(500).json({ error: 'Failed to mark alert as resolved' });
    }
  });

  // Market Intelligence endpoints
  router.get('/market-intelligence', async (req, res) => {
    try {
      const filters = {
        dataType: req.query.dataType as string,
        region: req.query.region as string,
        aircraftType: req.query.aircraftType as string,
      };
      
      // Remove undefined filters
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof typeof filters] === undefined) {
          delete filters[key as keyof typeof filters];
        }
      });
      
      const intelligence = await storage.getMarketIntelligence(Object.keys(filters).length > 0 ? filters : undefined);
      res.json(intelligence);
    } catch (error) {
      console.error('Error fetching market intelligence:', error);
      res.status(500).json({ error: 'Failed to fetch market intelligence' });
    }
  });

  // Health check endpoint
  router.get('/health', (req, res) => {
    res.json({ 
      status: 'healthy',
      service: 'BCCSPilot API',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  return router;
}