import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { db } from "./database.js";
import { setupRoutes } from "./routes.js";
import { RegulatoryAnalyticsEngine } from "./services/analytics-engine.js";
import { TrendAnalysisService } from "./services/trend-analysis.js";
import { AlertingService } from "./services/alerting.js";
import { DataIngestionService } from "./services/data-ingestion.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || "bccsreg-dev-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize services
const analyticsEngine = new RegulatoryAnalyticsEngine(db);
const trendAnalysis = new TrendAnalysisService(db, analyticsEngine);
const alertingService = new AlertingService(db, wss);
const dataIngestion = new DataIngestionService(db, alertingService);

// WebSocket handling for real-time updates
wss.on('connection', (ws) => {
  console.log('Inspector connected to real-time feed');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'subscribe') {
        // Subscribe inspector to specific data feeds
        ws.send(JSON.stringify({
          type: 'subscription_confirmed',
          feeds: data.feeds || ['compliance_alerts', 'trend_updates', 'violation_notifications']
        }));
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    console.log('Inspector disconnected from real-time feed');
  });
});

// API routes
setupRoutes(app, { db, analyticsEngine, trendAnalysis, alertingService, dataIngestion });

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  const publicPath = path.join(__dirname, "../dist/public");
  app.use(express.static(publicPath));
  
  app.get("*", (_, res) => {
    res.sendFile(path.join(publicPath, "index.html"));
  });
}

// Start background services
async function startServices() {
  try {
    console.log("Starting BCCS Regulator Analytics Services...");
    
    // Start data ingestion monitoring
    await dataIngestion.startMonitoring();
    console.log("✓ Data ingestion service started");
    
    // Start trend analysis engine
    await trendAnalysis.startBackgroundAnalysis();
    console.log("✓ Trend analysis engine started");
    
    // Start alerting service
    await alertingService.startMonitoring();
    console.log("✓ Alerting service started");
    
    console.log("🏛️ All BCCSREG oversight services operational");
  } catch (error) {
    console.error("❌ Failed to start services:", error);
  }
}

const PORT = process.env.PORT || 80;

server.listen(PORT, () => {
  console.log(`🏛️ BCCSREG server running on port ${PORT}`);
  startServices();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down BCCSREG server...');
  server.close(() => {
    console.log('Server shut down gracefully');
    process.exit(0);
  });
});