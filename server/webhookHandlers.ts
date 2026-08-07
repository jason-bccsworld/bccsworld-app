import { getStripeSync, getUncachableStripeClient, getStripeWebhookSecret } from './stripeClient';
import { db } from './db';
import { sql } from 'drizzle-orm';

// ── Webhook processing ────────────────────────────────────────────────────────
// Inside Replit: delegates to stripe-replit-sync (handles DB sync automatically).
// Outside Replit (Vercel / app.bccsworld.com): verifies signature manually via
//   STRIPE_WEBHOOK_SECRET and processes key subscription lifecycle events.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve which organization a Stripe subscription belongs to:
 *  1. organizationId metadata stamped on the subscription at checkout
 *  2. the paying user's active org membership (admin memberships first),
 *     found via users.stripe_customer_id
 * Returns null when no correlation exists (legacy single-workspace installs).
 */
async function resolveOrgForSubscription(subscription: any, customerId: string | null): Promise<string | null> {
  const metaOrg = subscription?.metadata?.organizationId;
  if (typeof metaOrg === 'string' && metaOrg.length > 0) return metaOrg;
  if (!customerId) return null;
  try {
    const r = await db.execute(sql`
      SELECT uo.organization_id::text AS org_id
      FROM users u
      JOIN user_organizations uo ON uo.user_id = u.id
      WHERE u.stripe_customer_id = ${customerId}
        AND uo.is_active = TRUE
      ORDER BY (uo.org_role = 'admin') DESC
      LIMIT 1
    `);
    return (r.rows[0] as any)?.org_id ?? null;
  } catch (err: any) {
    console.error('[webhook] Failed to resolve org for subscription:', err.message);
    return null;
  }
}

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
    // Correlate the subscription to an organization: prefer the organizationId
    // stamped on the subscription at checkout, else look up the paying user's
    // org membership via the Stripe customer id. This is what lets an
    // expired-trial org upgrade itself: the org's own license row is updated,
    // clearing the trial plan/expiry so the read-only/lock state lifts.
    const orgId = await resolveOrgForSubscription(subscription, customerId);

    let targetLicenseId: string | null = null;
    if (orgId) {
      const existing = await db.execute(sql`
        SELECT id FROM bccs_licenses WHERE organization_id = ${orgId}::uuid
        ORDER BY updated_at DESC LIMIT 1
      `);
      targetLicenseId = (existing.rows[0] as any)?.id ?? null;
    } else {
      // No org correlation — legacy single-workspace install: touch only the
      // platform-wide (unassigned) row, never an arbitrary org's license.
      const existing = await db.execute(sql`
        SELECT id FROM bccs_licenses WHERE organization_id IS NULL
        ORDER BY created_at DESC LIMIT 1
      `);
      targetLicenseId = (existing.rows[0] as any)?.id ?? null;
    }

    if (targetLicenseId) {
      await db.execute(sql`
        UPDATE bccs_licenses SET
          plan = COALESCE(${plan}, plan),
          status = ${licenseStatus},
          stripe_customer_id = ${customerId},
          stripe_subscription_id = ${subscriptionId},
          stripe_price_id = ${priceId},
          current_period_end = ${periodEnd}::TIMESTAMP,
          updated_at = NOW()
        WHERE id = ${targetLicenseId}
      `);
    } else {
      await db.execute(sql`
        INSERT INTO bccs_licenses (organization_id, plan, status, stripe_customer_id, stripe_subscription_id, stripe_price_id, current_period_end)
        VALUES (${orgId}::uuid, ${plan ?? 'standard'}, ${licenseStatus}, ${customerId}, ${subscriptionId}, ${priceId}, ${periodEnd}::TIMESTAMP)
      `);
    }

    // Dynamically invalidate license cache if loaded
    try {
      const { invalidateLicenseCache } = await import('./middleware/license');
      invalidateLicenseCache();
    } catch { /* middleware may not be loaded */ }

    console.log(`[webhook] License updated: org=${orgId ?? 'platform'} plan=${plan ?? 'unchanged'} status=${licenseStatus} sub=${subscriptionId}`);
  } catch (err: any) {
    console.error('[webhook] Failed to update license from subscription event:', err.message);
  }
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error('Webhook payload must be a Buffer. Ensure the webhook route is registered BEFORE express.json().');
    }

    // Try Replit's StripeSync first (handles full DB sync). Its processWebhook
    // verifies the signature via stripe.webhooks.constructEventAsync and
    // THROWS on an invalid signature (see stripe-replit-sync/dist/index.js,
    // processWebhook), so control only reaches the code below for verified
    // payloads. StripeSync does NOT update bccs_licenses, so we still run our
    // subscription→license handler on the verified payload. When our own
    // STRIPE_WEBHOOK_SECRET is also configured we re-verify explicitly rather
    // than trusting the sync contract.
    const sync = await getStripeSync();
    if (sync) {
      await sync.processWebhook(payload, signature); // throws on bad signature
      try {
        let event: any;
        const webhookSecret = getStripeWebhookSecret();
        if (webhookSecret) {
          const stripe = await getUncachableStripeClient();
          event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
        } else {
          // Signature already verified by StripeSync above.
          event = JSON.parse(payload.toString('utf8'));
        }
        if (typeof event?.type === 'string' && event.type.startsWith('customer.subscription.')) {
          await handleSubscriptionEvent(event);
        }
      } catch (err: any) {
        console.error('[webhook] Post-sync license update failed:', err.message);
      }
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
