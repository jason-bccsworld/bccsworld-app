import express from "express";
import { registerRoutes } from "./routes";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Register API routes
const httpServer = await registerRoutes(app);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const staticPath = path.join(__dirname, '../dist/public');
  app.use(express.static(staticPath));
  
  // Serve index.html for all non-API routes (SPA fallback)
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(staticPath, 'index.html'));
    }
  });
}

httpServer.listen(PORT, () => {
  console.log(`BCCS Aircraft Registry Platform serving on port ${PORT}`);
  if (process.env.NODE_ENV === 'development') {
    console.log(`Frontend: http://localhost:3000`);
    console.log(`Backend: http://localhost:${PORT}`);
  }
});