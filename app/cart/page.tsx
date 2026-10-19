import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPrice, formatWholePrice } from "@/lib/utils";
import { getCurrentUserId, getCart, getAccount } from "@/lib/data";
import {
  computeTotals,
  TIER_DISCOUNT,
  TIER_LABEL,
  FREE_DELIVERY_THRESHOLD_CENTS,
} from "@/lib/pricing";
import { FRESH_BOX_SIZES } from "@/lib/freshbox";
import { QuantityControl, RemoveFromCartButton } from "@/components/CartControls";
import { CheckoutButton } from "@/components/CheckoutButton";
import { EmptyState, PageTitle, cardClass } from "@/components/ui";

export const metadata = { title: "Your basket" };

function SummaryRow({
  label,
  value,
  saving = false,
}: {
  label: string;
  value: string;
  saving?: boolean;
}) {
  return (
    <div
      className={`flex justify-between py-1 text-sm ${
        saving ? "font-semibold text-brand" : "text-ink-mid"
      }`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default async function CartPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const [items, account, freshBox] = await Promise.all([
    getCart(userId),
    getAccount(userId),
    prisma.freshBoxSubscription.findUnique({ where: { userId } }),
  ]);

  if (items.length === 0) {
    return (
      <EmptyState
        icon="🛒"
        title="Your basket is empty"
        text="Add some African essentials to get started."
        cta={{ href: "/", label: "Browse the shop" }}
      />
    );
  }

  const subtotalCents = items.reduce(
    (sum, item) => sum + item.product.priceCents * item.quantity,
    0,
  );
  const tier = account.tier;
  const totals = computeTotals({
    subtotalCents,
    tier,
    creditCents: account.user?.creditCents ?? 0,
  });

  // Free delivery is judged on the discounted subtotal (see computeTotals).
  const isPlus = tier === "PLUS";
  const discountedCents = subtotalCents - totals.discountCents;
  const remainingCents = Math.max(0, FREE_DELIVERY_THRESHOLD_CENTS - discountedCents);
  const progress = isPlus
    ? 100
    : Math.min(100, Math.round((discountedCents / FREE_DELIVERY_THRESHOLD_CENTS) * 100));

  const freshActive = freshBox && freshBox.status !== "canceled";
  const freshFromCents = Math.min(...Object.values(FRESH_BOX_SIZES).map((s) => s.priceCents));
  const testMode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_");

  return (
    <div>
      <PageTitle>My Basket 🛒</PageTitle>

      <div className="lg:grid lg:grid-cols-3 lg:items-start lg:gap-8">
        <div className="lg:col-span-2">
          <div className="mb-4 rounded-xl bg-brand-pale px-4 py-3">
            <div className="mb-2 flex items-center justify-between gap-3 text-[13px]">
              <span className="font-semibold text-brand">
                🚚{" "}
                {isPlus
                  ? "Free delivery — an AfroPlus perk"
                  : remainingCents > 0
                    ? `${formatPrice(remainingCents)} away from free delivery`
                    : "You've unlocked free delivery"}
              </span>
              {!isPlus && (
                <span className="shrink-0 text-ink-mid">
                  {formatPrice(Math.min(discountedCents, FREE_DELIVERY_THRESHOLD_CENTS))} /{" "}
                  {formatPrice(FREE_DELIVERY_THRESHOLD_CENTS)}
                </span>
              )}
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-brand/15"
              role="progressbar"
              aria-label="Progress to free delivery"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id} className={`${cardClass} flex items-center gap-3 p-3.5`}>
                <Link
                  href={`/product/${item.product.slug}`}
                  className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-brand-pale"
                >
                  <Image
                    src={item.product.imageUrl}
                    alt={item.product.name}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </Link>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/product/${item.product.slug}`}
                    className="line-clamp-1 text-sm font-semibold text-ink hover:text-brand"
                  >
                    {item.product.name}
                  </Link>
                  <p className="text-xs text-ink-soft">
                    {[
                      item.product.size,
                      item.product.isPrivateLabel ? "Our Brand" : null,
                      `${formatPrice(item.product.priceCents, item.product.currency)} each`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <div className="mt-1.5 flex items-center gap-3">
                    <QuantityControl productId={item.productId} quantity={item.quantity} />
                    <RemoveFromCartButton productId={item.productId} />
                  </div>
                </div>

                <span className="self-start font-display text-base font-bold text-brand">
                  {formatPrice(item.product.priceCents * item.quantity, item.product.currency)}
                </span>
              </li>
            ))}
          </ul>

          {!freshActive && (
            <Link
              href="/fresh"
              className="mt-4 flex items-center gap-3 rounded-2xl bg-linear-to-br from-fresh to-gold px-4 py-3.5 transition hover:brightness-105"
            >
              <span className="text-3xl" aria-hidden="true">
                🥬
              </span>
              <div className="flex-1">
                <p className="text-[13px] font-bold text-ink">Add a Fresh Produce Box?</p>
                <p className="text-xs text-ink/80">
                  UK farm-sourced · from {formatWholePrice(freshFromCents)}/month
                </p>
              </div>
              <span className="rounded-lg bg-white px-3.5 py-1.5 text-xs font-bold text-ink">
                Add
              </span>
            </Link>
          )}
        </div>

        <aside className={`${cardClass} mt-5 p-4 lg:mt-0 lg:p-6`}>
          <h2 className="mb-2 hidden font-display text-lg font-bold lg:block">Order summary</h2>
          <SummaryRow label="Subtotal" value={formatPrice(totals.subtotalCents)} />
          {totals.discountCents > 0 && (
            <SummaryRow
              saving
              label={`⭐ ${TIER_LABEL[tier]} ${Math.round(TIER_DISCOUNT[tier] * 100)}% off`}
              value={`−${formatPrice(totals.discountCents)}`}
            />
          )}
          <SummaryRow
            label="Delivery"
            value={totals.deliveryCents === 0 ? "Free" : formatPrice(totals.deliveryCents)}
          />
          {totals.creditAppliedCents > 0 && (
            <SummaryRow
              saving
              label="Account credit"
              value={`−${formatPrice(totals.creditAppliedCents)}`}
            />
          )}
          <div className="mt-1.5 flex justify-between border-t border-line pt-2.5 text-base font-bold text-ink">
            <span>Total</span>
            <span>{formatPrice(totals.totalCents)}</span>
          </div>

          {tier === "PAYG" && (
            <p className="mt-3 text-xs text-ink-soft">
              <Link href="/membership" className="font-semibold text-brand hover:underline">
                Join AfroPlus
              </Link>{" "}
              for 10% off and free delivery on every order.
            </p>
          )}

          <div className="mt-4">
            <CheckoutButton label={`Checkout — ${formatPrice(totals.totalCents)}`} />
          </div>
          <p className="mt-3 text-center text-xs text-ink-soft">
            Secure checkout by Stripe — you&apos;ll add your UK delivery address there.
            {testMode && " Test card: 4242 4242 4242 4242."}
          </p>
        </aside>
      </div>
    </div>
  );
}
