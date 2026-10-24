/** Format a price stored in minor units (pence) into a display string. */
export function formatPrice(cents: number, currency = "gbp"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

/** Whole pounds for compact stats, e.g. "£214" (rounded down). */
export function formatWholePrice(cents: number, currency = "gbp"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.floor(cents / 100));
}

/** Short customer-facing order number, e.g. "#AQMIYVQN" without the "#". */
export function orderNumber(orderId: string): string {
  return orderId.slice(-8).toUpperCase();
}

/** Product name with its pack size, e.g. "White Garri (1kg)", for receipts and Stripe. */
export function productLabel(product: { name: string; size: string | null }): string {
  return product.size ? `${product.name} (${product.size})` : product.name;
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** "Good morning" / "Good afternoon" / "Good evening" in UK time. */
export function greeting(now: Date): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "Europe/London",
    }).format(now),
  );
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** "Ada" from "Ada Obi"; empty when there's no name. */
export function firstName(name: string | null | undefined): string {
  return name?.trim().split(/\s+/)[0] ?? "";
}
