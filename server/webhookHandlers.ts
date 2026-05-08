import { getStripeSync, getUncachableStripeClient, getStripeWebhookSecret } from './stripeClient';
import { db } from './db';
import { sql } from 'drizzle-orm';

// ── Webhook processing ────────────────────────────────────────────────────────
// Inside Replit: delegates to stripe-replit-sync (handles DB sync automatically).
// Outside Replit (Vercel / app.bccsworld.com): verifies signature manually via
//   STRIPE_WEBHOOK_SECRET and processes key subscription lifecycle events.
// ─────────────────────────────────────────────────────────────────────────────

async function handleSubscriptionEvent(event: any): Promise<void> {
  const subscription = event.data.object;
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id as string;
  const priceId = subscription.items?.data?.[0]?.price?.id ?? null;
  const status = subscription.status as string; // active | past_due | canceled | trialing ...

  // Map Stripe subscription status → our license status
  const licenseStatus = status === 'active' || status === 'trialing' ? 'active' :
    status === 'past_due' ? 'active' : // still give access during grace period
    'suspended';

  // Derive plan from price metadata (set during seed-products.ts)
  const stripe = await getUncachableStripeClient();
  let plan: string | null = null;
  if (priceId) {
    try {
      const price = await stripe.prices.retrieve(priceId, { expand: ['product'] });
      plan = (price.metadata?.planKey) ?? ((price.product as any)?.metadata?.planKey) ?? null;
    } catch { /* ignore */ }
  }

  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  try {
    // Update the platform license based on this subscription
    const existing = await db.execute(sql`SELECT id FROM bccs_licenses ORDER BY created_at DESC LIMIT 1`);
    const row = (existing.rows[0] as any);

    if (row) {
      await db.execute(sql`
        UPDATE bccs_licenses SET
          plan = COALESCE(${plan}, plan),
          status = ${licenseStatus},
          stripe_customer_id = ${customerId},
          stripe_subscription_id = ${subscriptionId},
          stripe_price_id = ${priceId},
          current_period_end = ${periodEnd}::TIMESTAMP,
          updated_at = NOW()
        WHERE id = ${row.id}
      `);
    } else {
      await db.execute(sql`
        INSERT INTO bccs_licenses (plan, status, stripe_customer_id, stripe_subscription_id, stripe_price_id, current_period_end)
        VALUES (${plan ?? 'standard'}, ${licenseStatus}, ${customerId}, ${subscriptionId}, ${priceId}, ${periodEnd}::TIMESTAMP)
      `);
    }

    // Dynamically invalidate license cache if loaded
    try {
      const { invalidateLicenseCache } = await import('./middleware/license');
      invalidateLicenseCache();
    } catch { /* middleware may not be loaded */ }

    console.log(`[webhook] License updated: plan=${plan ?? 'unchanged'} status=${licenseStatus} sub=${subscriptionId}`);
  } catch (err: any) {
    console.error('[webhook] Failed to update license from subscription event:', err.message);
  }
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error('Webhook payload must be a Buffer. Ensure the webhook route is registered BEFORE express.json().');
    }

    // Try Replit's StripeSync first (handles full DB sync)
    const sync = await getStripeSync();
    if (sync) {
      await sync.processWebhook(payload, signature);
      return;
    }

    // Outside Replit: verify signature and handle key events manually
    const webhookSecret = getStripeWebhookSecret();
    if (!webhookSecret) {
      console.warn('[webhook] STRIPE_WEBHOOK_SECRET not set — skipping signature verification. Set it in your environment variables.');
      return;
    }

    const stripe = await getUncachableStripeClient();
    let event: any;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    console.log(`[webhook] Received: ${event.type}`);

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'customer.subscription.paused':
      case 'customer.subscription.resumed':
        await handleSubscriptionEvent(event);
        break;
      default:
        // Acknowledge but don't process other event types
        break;
    }
  }
}
