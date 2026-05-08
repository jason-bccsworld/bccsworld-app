import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { WebhookHandlers } from "./webhookHandlers";
import { ensureTables } from "./db-init";

function log(message: string) {
  const time = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${time} [express] ${message}`);
}

// Detect whether we are inside Replit (dev) or on an external host (Vercel / app.bccsworld.com)
const isReplitEnv = !!(
  process.env.REPLIT_CONNECTORS_HOSTNAME &&
  (process.env.REPL_IDENTITY || process.env.WEB_REPL_RENEWAL)
);

// Non-blocking Stripe initialisation for external deployments (Vercel).
// In Replit this is handled by server/index.ts using stripe-replit-sync.
async function initStripeExternal(): Promise<void> {
  if (isReplitEnv) return; // Replit init happens in server/index.ts
  try {
    const { getUncachableStripeClient } = await import('./stripeClient');
    const stripe = await getUncachableStripeClient();
    await stripe.products.list({ limit: 1 }); // connectivity check
    log('Stripe connected via STRIPE_SECRET_KEY');

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.warn('[stripe] STRIPE_WEBHOOK_SECRET not set — subscription webhooks will not be verified.');
    }
  } catch (err: any) {
    console.warn('[stripe] Init skipped:', err.message?.slice(0, 120));
  }
}

export async function createApp() {
  // Run DB migrations on every cold start (idempotent, safe)
  await ensureTables();

  // Kick off Stripe init non-blocking (only on external deployments)
  initStripeExternal().catch(() => {});

  const app = express();

  // ── Stripe webhook MUST be registered BEFORE express.json() ──────────────
  // Stripe needs the raw Buffer body, not parsed JSON.
  app.post(
    '/api/stripe/webhook',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      const signature = req.headers['stripe-signature'];
      if (!signature) {
        return res.status(400).json({ error: 'Missing stripe-signature header' });
      }
      try {
        const sig = Array.isArray(signature) ? signature[0] : signature;
        if (!Buffer.isBuffer(req.body)) {
          console.error('STRIPE WEBHOOK ERROR: req.body is not a Buffer.');
          return res.status(500).json({ error: 'Webhook processing error' });
        }
        await WebhookHandlers.processWebhook(req.body as Buffer, sig);
        res.status(200).json({ received: true });
      } catch (error: any) {
        console.error('Webhook error:', error.message);
        res.status(400).json({ error: 'Webhook processing error' });
      }
    }
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }
        if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
        log(logLine);
      }
    });

    next();
  });

  await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  return app;
}
