import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type { SubTier } from "@prisma/client";

/** Stripe Price IDs for the recurring membership tiers (set by scripts/setup-stripe.ts). */
export const TIER_PRICE_ENV: Record<Exclude<SubTier, "PAYG">, string | undefined> = {
  MONTHLY: process.env.STRIPE_PRICE_MONTHLY,
  PLUS: process.env.STRIPE_PRICE_PLUS,
};

export function isStripeConfigured(): boolean {
  return (
    !!process.env.STRIPE_SECRET_KEY &&
    !process.env.STRIPE_SECRET_KEY.includes("replace_me")
  );
}

/** Find or create the Stripe customer for a user and persist the id. */
export async function ensureStripeCustomer(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, stripeCustomerId: true },
  });
  if (!user) throw new Error("User not found");
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name ?? undefined,
    metadata: { userId: user.id },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });
  return customer.id;
}

/** Map a Stripe price id back to a Baskt tier. */
export function tierForPriceId(priceId: string | null | undefined): SubTier {
  if (priceId && priceId === TIER_PRICE_ENV.PLUS) return "PLUS";
  if (priceId && priceId === TIER_PRICE_ENV.MONTHLY) return "MONTHLY";
  return "PAYG";
}
