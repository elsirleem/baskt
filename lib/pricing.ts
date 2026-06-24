import type { SubTier } from "@prisma/client";

/** Free delivery on orders at/over £70. */
export const FREE_DELIVERY_THRESHOLD_CENTS = 7000;
/** Standard delivery fee when under the threshold (£4.99). */
export const DELIVERY_FEE_CENTS = 499;

/** Member discount rate applied to the item subtotal, by tier. */
export const TIER_DISCOUNT: Record<SubTier, number> = {
  PAYG: 0,
  MONTHLY: 0.05, // 5% off
  PLUS: 0.1, // 10% off
};

export const TIER_LABEL: Record<SubTier, string> = {
  PAYG: "Pay as you go",
  MONTHLY: "Baskt Monthly",
  PLUS: "Baskt Plus",
};

export type OrderTotals = {
  subtotalCents: number;
  discountCents: number;
  deliveryCents: number;
  creditAppliedCents: number;
  totalCents: number;
};

/**
 * Compute order totals applying member discount, delivery rules, and account credit.
 * Plus members always get free delivery; everyone else gets it over the threshold.
 */
export function computeTotals(opts: {
  subtotalCents: number;
  tier: SubTier;
  creditCents?: number;
}): OrderTotals {
  const { subtotalCents, tier } = opts;
  const availableCredit = Math.max(0, opts.creditCents ?? 0);

  const discountCents = Math.round(subtotalCents * TIER_DISCOUNT[tier]);
  const discountedSubtotal = subtotalCents - discountCents;

  const qualifiesFree =
    tier === "PLUS" || discountedSubtotal >= FREE_DELIVERY_THRESHOLD_CENTS;
  const deliveryCents = subtotalCents === 0 || qualifiesFree ? 0 : DELIVERY_FEE_CENTS;

  const beforeCredit = discountedSubtotal + deliveryCents;
  const creditAppliedCents = Math.min(availableCredit, beforeCredit);
  const totalCents = beforeCredit - creditAppliedCents;

  return { subtotalCents, discountCents, deliveryCents, creditAppliedCents, totalCents };
}
