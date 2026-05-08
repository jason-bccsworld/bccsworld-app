import { getUncachableStripeClient } from '../server/stripeClient';

const PRODUCTS = [
  {
    name: 'BCCS-US Standard',
    description: 'Up to 15 users, core compliance features, 5 form templates',
    planKey: 'standard',
    unitAmount: 400000, // $4,000.00 in cents
  },
  {
    name: 'BCCS-US Professional',
    description: 'Up to 50 users, AI document processing, unlimited templates, analytics, custom roles',
    planKey: 'professional',
    unitAmount: 900000, // $9,000.00 in cents
  },
  {
    name: 'BCCS-US Enterprise',
    description: 'Unlimited users, blockchain records, API access, priority support',
    planKey: 'enterprise',
    unitAmount: 2000000, // $20,000.00 in cents
  },
];

async function seedProducts() {
  try {
    const stripe = await getUncachableStripeClient();
    console.log('Seeding BCCS-US Stripe products...\n');

    for (const product of PRODUCTS) {
      const existing = await stripe.products.search({
        query: `name:'${product.name}' AND active:'true'`,
      });

      if (existing.data.length > 0) {
        console.log(`✓ ${product.name} already exists (${existing.data[0].id})`);

        // Check if annual price exists
        const prices = await stripe.prices.list({
          product: existing.data[0].id,
          active: true,
        });
        if (prices.data.length > 0) {
          console.log(`  Price: $${prices.data[0].unit_amount! / 100}/year (${prices.data[0].id})`);
        }
        continue;
      }

      const stripeProduct = await stripe.products.create({
        name: product.name,
        description: product.description,
        metadata: { planKey: product.planKey },
      });
      console.log(`Created product: ${stripeProduct.name} (${stripeProduct.id})`);

      const price = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: product.unitAmount,
        currency: 'usd',
        recurring: { interval: 'year' },
        metadata: { planKey: product.planKey },
      });
      console.log(`  Created annual price: $${product.unitAmount / 100}/year (${price.id})`);
    }

    console.log('\n✓ Stripe products seeded successfully.');
    console.log('Webhooks will sync this data to your database automatically.');
  } catch (error: any) {
    console.error('Error seeding products:', error.message);
    process.exit(1);
  }
}

seedProducts();
