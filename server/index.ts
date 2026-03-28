import { createApp } from "./app";
import { setupVite, serveStatic, log } from "./vite";
import { regulatoryMonitor } from "./services/regulatory-monitor";
import { linkMonitoringService } from "./services/link-monitor";
import { createServer } from "http";
import * as fs from "fs";
import * as path from "path";

// Load environment variables from .env file in development
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  for (const line of envLines) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  }
}

(async () => {
  const app = await createApp();
  const server = createServer(app);

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT ?? "5000");
  server.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    log(`serving on port ${port}`);

    regulatoryMonitor.startMonitoring().catch((error) => {
      console.error("Failed to start regulatory monitoring:", error);
    });

    linkMonitoringService.initializeMonitoring().catch((error) => {
      console.error("Failed to start link monitoring:", error);
    });
  });
})();
