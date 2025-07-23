import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import session from "express-session";
import { createPilotWorkforceEngine } from "./services/pilot-workforce-engine.js";
import { createStorage } from "./storage.js";
import routes from "./routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Initialize storage and services
const storage = createStorage();
const pilotWorkforceEngine = createPilotWorkforceEngine();

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'bccspilot-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(express.json());

// API routes
app.use('/api', routes(storage, pilotWorkforceEngine));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const publicPath = join(__dirname, '../public');
  app.use(express.static(publicPath));
  
  app.get('*', (req, res) => {
    res.sendFile(join(publicPath, 'index.html'));
  });
} else {
  // Development: Serve a simple message
  app.get('*', (req, res) => {
    res.json({ 
      message: 'BCCSPilot API Server',
      status: 'Development Mode',
      version: '1.0.0',
      description: 'AI-powered pilot workforce planning and hiring optimization platform'
    });
  });
}

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`BCCSPilot server running on port ${PORT}`);
  console.log('Environment:', process.env.NODE_ENV);
  
  // Initialize pilot workforce monitoring
  pilotWorkforceEngine.startMonitoring().catch(console.error);
});

export default app;