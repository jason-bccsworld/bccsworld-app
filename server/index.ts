import { createApp } from "./app";
import { setupVite, serveStatic, log } from "./vite";
import { regulatoryMonitor } from "./services/regulatory-monitor";
import { linkMonitoringService } from "./services/link-monitor";
import { faaDocumentMonitor } from "./services/faa-document-monitor";
import { startComplianceWatchdog } from "./services/compliance-watchdog";
import { startFederalContractsMonitor } from "./services/federal-contracts-monitor";
import { ensureTables } from "./db-init";
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

const isReplitEnv = !!(process.env.REPLIT_CONNECTORS_HOSTNAME && (process.env.REPL_IDENTITY || process.env.WEB_REPL_RENEWAL));

async function initStripe(): Promise<void> {
  try {
    if (isReplitEnv) {
      // Inside Replit: use stripe-replit-sync for full DB sync + managed webhooks
      const { runMigrations } = await import('stripe-replit-sync');
      const { getStripeSync } = await import('./stripeClient');

      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) return;

      // Cast: stripe-replit-sync's runMigrations accepts a `schema` option at
      // runtime but it's absent from the published MigrationConfig type.
      await runMigrations({ databaseUrl, schema: 'stripe' } as any);
      log('Stripe schema ready');

      const stripeSync = await getStripeSync();
      if (!stripeSync) return;

      const domains = process.env.REPLIT_DOMAINS ?? '';
      const host = domains.split(',')[0] ?? 'localhost';
      const webhookUrl = `https://${host}/api/stripe/webhook`;
      await stripeSync.findOrCreateManagedWebhook(webhookUrl);
      log('Stripe webhook configured');

      stripeSync.syncBackfill()
        .then(() => log('Stripe data synced'))
        .catch((err: any) => console.error('Stripe backfill error:', err.message));
    } else {
      // Outside Replit (Vercel / app.bccsworld.com): verify env vars are present
      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();
      // Quick connectivity check
      await stripe.products.list({ limit: 1 });
      log('Stripe connected via STRIPE_SECRET_KEY');

      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.warn('[stripe] STRIPE_WEBHOOK_SECRET not set — subscription webhooks will not be verified. Set it in your environment variables.');
      } else {
        log('Stripe webhook secret configured');
      }
    }
  } catch (err: any) {
    console.warn('[stripe] Init skipped:', err.message?.slice(0, 120));
  }
}

(async () => {
  await ensureTables();

  // Initialize Stripe (non-blocking — app runs fine without it)
  initStripe().catch((err: any) => console.warn('[stripe] Async init error:', err.message));

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

    faaDocumentMonitor.initialize().then(() => {
      faaDocumentMonitor.startScheduledMonitoring(6);
    }).catch((error) => {
      console.error("Failed to start FAA document monitor:", error);
    });

    startComplianceWatchdog(12);
    startFederalContractsMonitor(12);
  });
})();
