import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  // Don't throw at import time during build; the checkout route guards at runtime.
  console.warn("STRIPE_SECRET_KEY is not set — checkout will fail until configured.");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder", {
  // Pin a stable API version for predictable behaviour.
  apiVersion: "2026-05-27.dahlia",
  typescript: true,
});
