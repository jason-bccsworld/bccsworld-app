import Stripe from 'stripe';

// ── Environment detection ─────────────────────────────────────────────────────
// When running inside Replit (dev): credentials are fetched from the Replit
// connector system at runtime.
// When running outside Replit (Vercel / app.bccsworld.com): standard env vars
//   STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET are used.
// ─────────────────────────────────────────────────────────────────────────────

function isReplitEnvironment(): boolean {
  return !!(process.env.REPLIT_CONNECTORS_HOSTNAME && (process.env.REPL_IDENTITY || process.env.WEB_REPL_RENEWAL));
}

async function getCredentialsFromReplit(): Promise<{ publishableKey: string; secretKey: string }> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME!;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : 'depl ' + process.env.WEB_REPL_RENEWAL!;

  const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
  const targetEnvironment = isProduction ? 'production' : 'development';

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set('include_secrets', 'true');
  url.searchParams.set('connector_names', 'stripe');
  url.searchParams.set('environment', targetEnvironment);

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'X-Replit-Token': xReplitToken,
    },
  });

  const data = await response.json();
  const settings = data.items?.[0]?.settings;

  if (!settings?.publishable || !settings?.secret) {
    throw new Error(`Stripe ${targetEnvironment} connection not found in Replit connector`);
  }

  return { publishableKey: settings.publishable, secretKey: settings.secret };
}

function getCredentialsFromEnv(): { publishableKey: string; secretKey: string } {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY ?? '';

  if (!secretKey) {
    throw new Error(
      'STRIPE_SECRET_KEY environment variable is required. ' +
      'Set it in your Vercel project settings (Settings → Environment Variables).'
    );
  }

  return { publishableKey, secretKey };
}

async function getCredentials(): Promise<{ publishableKey: string; secretKey: string }> {
  if (isReplitEnvironment()) {
    return getCredentialsFromReplit();
  }
  return getCredentialsFromEnv();
}

// WARNING: Never cache this client — always get a fresh instance.
export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getCredentials();
  return new Stripe(secretKey, { apiVersion: '2025-08-27.basil' as any });
}

export async function getStripePublishableKey(): Promise<string> {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}

export async function getStripeSecretKey(): Promise<string> {
  const { secretKey } = await getCredentials();
  return secretKey;
}

export function getStripeWebhookSecret(): string {
  return process.env.STRIPE_WEBHOOK_SECRET ?? '';
}

// StripeSync is only available inside Replit (it relies on Replit infrastructure).
// Returns null when running outside Replit — webhook events are handled directly.
let _stripeSyncInstance: any = null;

export async function getStripeSync(): Promise<any | null> {
  if (!isReplitEnvironment()) return null;

  if (!_stripeSyncInstance) {
    try {
      const { StripeSync } = await import('stripe-replit-sync');
      const secretKey = await getStripeSecretKey();
      _stripeSyncInstance = new StripeSync({
        poolConfig: {
          connectionString: process.env.DATABASE_URL!,
          max: 2,
        },
        stripeSecretKey: secretKey,
      });
    } catch (err: any) {
      console.warn('[stripe] StripeSync unavailable:', err.message?.slice(0, 80));
      return null;
    }
  }

  return _stripeSyncInstance;
}
