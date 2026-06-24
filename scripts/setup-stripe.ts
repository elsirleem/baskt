import "dotenv/config";
import Stripe from "stripe";

/**
 * Creates the Baskt membership products + recurring prices in your Stripe TEST
 * account, then prints the price IDs to put in .env. Idempotent-ish: re-running
 * creates new prices, so only run once (or archive old ones in the dashboard).
 */
async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes("replace_me")) {
    console.error("Set a real STRIPE_SECRET_KEY (test mode) in .env first.");
    process.exit(1);
  }
  const stripe = new Stripe(key, { apiVersion: "2026-05-27.dahlia" });

  const monthly = await stripe.prices.create({
    currency: "gbp",
    unit_amount: 499,
    recurring: { interval: "month" },
    product_data: { name: "Baskt Monthly" },
  });

  const plus = await stripe.prices.create({
    currency: "gbp",
    unit_amount: 3999,
    recurring: { interval: "year" },
    product_data: { name: "Baskt Plus" },
  });

  // Fresh Produce Box sizes (monthly).
  const freshSmall = await stripe.prices.create({
    currency: "gbp",
    unit_amount: 2500,
    recurring: { interval: "month" },
    product_data: { name: "Baskt Fresh Box — Small" },
  });
  const freshMedium = await stripe.prices.create({
    currency: "gbp",
    unit_amount: 3200,
    recurring: { interval: "month" },
    product_data: { name: "Baskt Fresh Box — Medium" },
  });
  const freshLarge = await stripe.prices.create({
    currency: "gbp",
    unit_amount: 4000,
    recurring: { interval: "month" },
    product_data: { name: "Baskt Fresh Box — Large" },
  });

  console.log("\n✅ Created prices. Add these to your .env:\n");
  console.log(`STRIPE_PRICE_MONTHLY="${monthly.id}"`);
  console.log(`STRIPE_PRICE_PLUS="${plus.id}"`);
  console.log(`STRIPE_PRICE_FRESH_SMALL="${freshSmall.id}"`);
  console.log(`STRIPE_PRICE_FRESH_MEDIUM="${freshMedium.id}"`);
  console.log(`STRIPE_PRICE_FRESH_LARGE="${freshLarge.id}"\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
