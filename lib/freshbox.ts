import type { FreshBoxSize } from "@prisma/client";

/** Box sizes, their monthly price, and what's inside. */
export const FRESH_BOX_SIZES: Record<
  FreshBoxSize,
  { label: string; priceCents: number; blurb: string; priceEnv?: string }
> = {
  SMALL: {
    label: "Small",
    priceCents: 2500,
    blurb: "A starter box — seasonal fruit & veg for 1–2 people.",
    priceEnv: process.env.STRIPE_PRICE_FRESH_SMALL,
  },
  MEDIUM: {
    label: "Medium",
    priceCents: 3200,
    blurb: "Our most popular — fruit, veg & British beef cuts for a family.",
    priceEnv: process.env.STRIPE_PRICE_FRESH_MEDIUM,
  },
  LARGE: {
    label: "Large",
    priceCents: 4000,
    blurb: "The full table — generous seasonal produce & premium cuts.",
    priceEnv: process.env.STRIPE_PRICE_FRESH_LARGE,
  },
};

export const FRESH_PRICE_ENV: Record<FreshBoxSize, string | undefined> = {
  SMALL: process.env.STRIPE_PRICE_FRESH_SMALL,
  MEDIUM: process.env.STRIPE_PRICE_FRESH_MEDIUM,
  LARGE: process.env.STRIPE_PRICE_FRESH_LARGE,
};

/** Map a Stripe price id back to a box size. */
export function sizeForPriceId(priceId: string | null | undefined): FreshBoxSize | null {
  if (!priceId) return null;
  if (priceId === FRESH_PRICE_ENV.SMALL) return "SMALL";
  if (priceId === FRESH_PRICE_ENV.MEDIUM) return "MEDIUM";
  if (priceId === FRESH_PRICE_ENV.LARGE) return "LARGE";
  return null;
}

// Orders are processed Mon–Wed only.
export const DELIVERY_WEEKDAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
] as const;

export function weekdayLabel(weekday: number): string {
  return DELIVERY_WEEKDAYS.find((d) => d.value === weekday)?.label ?? "Tuesday";
}

/**
 * Next delivery date for a weekday (1–3), at least 2 days out so there's time to
 * pack. Pure given a reference date (so it stays deterministic/testable).
 */
export function nextDeliveryDate(weekday: number, from: Date): Date {
  const result = new Date(from);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() + 2); // 24–48h packing lead time
  // Advance to the requested weekday (JS: 0=Sun … 1=Mon).
  while (result.getDay() !== weekday) {
    result.setDate(result.getDate() + 1);
  }
  return result;
}
