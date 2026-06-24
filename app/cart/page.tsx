import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { getCurrentUserId, getCart, getAccount } from "@/lib/data";
import { computeTotals, TIER_LABEL, FREE_DELIVERY_THRESHOLD_CENTS } from "@/lib/pricing";
import { QuantityControl, RemoveFromCartButton } from "@/components/CartControls";
import { CheckoutButton } from "@/components/CheckoutButton";

export const metadata = { title: "Your basket — Baskt" };

export default async function CartPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const [items, account] = await Promise.all([getCart(userId), getAccount(userId)]);
  const subtotalCents = items.reduce(
    (sum, item) => sum + item.product.priceCents * item.quantity,
    0,
  );
  const totals = computeTotals({
    subtotalCents,
    tier: account.tier,
    creditCents: account.user?.creditCents ?? 0,
  });
  const awayFromFreeDelivery =
    account.tier !== "PLUS" && totals.deliveryCents > 0
      ? FREE_DELIVERY_THRESHOLD_CENTS - (subtotalCents - totals.discountCents)
      : 0;

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-stone-600">Add some fresh food to get started.</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-md bg-emerald-600 px-5 py-2.5 font-medium text-white hover:bg-emerald-700"
        >
          Browse catalogue
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Your cart</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        <ul className="divide-y divide-stone-200 lg:col-span-2">
          {items.map((item) => (
            <li key={item.id} className="flex gap-4 py-4">
              <Link
                href={`/product/${item.product.slug}`}
                className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border border-stone-200"
              >
                <Image
                  src={item.product.imageUrl}
                  alt={item.product.name}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </Link>

              <div className="flex flex-1 flex-col">
                <Link
                  href={`/product/${item.product.slug}`}
                  className="font-medium hover:text-emerald-700"
                >
                  {item.product.name}
                </Link>
                <span className="text-sm text-stone-500">
                  {formatPrice(item.product.priceCents, item.product.currency)} each
                </span>
                <div className="mt-2 flex items-center gap-4">
                  <QuantityControl productId={item.productId} quantity={item.quantity} />
                  <RemoveFromCartButton productId={item.productId} />
                </div>
              </div>

              <div className="text-right font-semibold">
                {formatPrice(item.product.priceCents * item.quantity, item.product.currency)}
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-lg border border-stone-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Order summary</h2>

          <div className="mt-4 flex justify-between text-sm">
            <span className="text-stone-600">Subtotal</span>
            <span>{formatPrice(totals.subtotalCents)}</span>
          </div>

          {totals.discountCents > 0 && (
            <div className="mt-1 flex justify-between text-sm text-emerald-700">
              <span>{TIER_LABEL[account.tier]} discount</span>
              <span>−{formatPrice(totals.discountCents)}</span>
            </div>
          )}

          <div className="mt-1 flex justify-between text-sm">
            <span className="text-stone-600">Delivery</span>
            <span>
              {totals.deliveryCents === 0 ? (
                <span className="text-emerald-700">Free</span>
              ) : (
                formatPrice(totals.deliveryCents)
              )}
            </span>
          </div>

          {totals.creditAppliedCents > 0 && (
            <div className="mt-1 flex justify-between text-sm text-emerald-700">
              <span>Account credit</span>
              <span>−{formatPrice(totals.creditAppliedCents)}</span>
            </div>
          )}

          <div className="mt-4 flex justify-between border-t border-stone-200 pt-4 text-base font-semibold">
            <span>Total</span>
            <span>{formatPrice(totals.totalCents)}</span>
          </div>

          {awayFromFreeDelivery > 0 && (
            <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Add {formatPrice(awayFromFreeDelivery)} more for free delivery.
            </p>
          )}
          {account.tier === "PAYG" && (
            <p className="mt-3 text-xs text-stone-500">
              <Link href="/membership" className="text-emerald-700 hover:underline">
                Join Baskt Plus
              </Link>{" "}
              for 10% off and free delivery on every order.
            </p>
          )}

          <div className="mt-6">
            <CheckoutButton />
          </div>
          <p className="mt-3 text-center text-xs text-stone-400">
            Secured by Stripe. Use test card 4242 4242 4242 4242.
          </p>
        </aside>
      </div>
    </div>
  );
}
