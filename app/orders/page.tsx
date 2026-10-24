import { redirect } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { getCurrentUserId, getOrders } from "@/lib/data";
import { BackLink, EmptyState, PageTitle, cardClass } from "@/components/ui";
import { OrderTracker, trackerTimes } from "@/components/OrderTracker";
import { FULFILMENT_STEPS, stepIndex } from "@/lib/fulfilment";

export const metadata = { title: "Your orders" };

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(date);
}

export default async function OrdersPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const orders = await getOrders(userId);

  if (orders.length === 0) {
    return (
      <EmptyState
        icon="📦"
        title="No orders yet"
        text="When you place an order it'll show up here."
        cta={{ href: "/", label: "Browse the shop" }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/account" label="Profile" />
      <PageTitle>Your Orders 📦</PageTitle>

      <ul className="space-y-4">
        {orders.map((order) => {
          const address = [
            order.shippingName,
            order.shippingLine1,
            order.shippingLine2,
            order.shippingCity,
            order.shippingPostcode,
          ]
            .filter(Boolean)
            .join(", ");

          return (
            <li key={order.id} id={`order-${order.id}`} className={`${cardClass} scroll-mt-4 p-4 md:p-5`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink">
                    Order #{order.id.slice(-8).toUpperCase()}
                  </p>
                  <p className="text-xs text-ink-soft">{formatDate(order.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-brand-pale px-2.5 py-0.5 text-xs font-semibold text-brand">
                    {FULFILMENT_STEPS[stepIndex(order.fulfilment)].customerLabel}
                  </span>
                  <span className="font-display text-lg font-bold text-brand">
                    {formatPrice(order.totalCents, order.currency)}
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <OrderTracker status={order.fulfilment} times={trackerTimes(order)} />
                {order.carrier && (
                  <p className="mt-3 text-xs text-ink-mid">
                    Sent with {order.carrier}
                    {order.trackingNumber && (
                      <>
                        {" "}
                        · Tracking number{" "}
                        <span className="font-mono font-semibold">{order.trackingNumber}</span>
                      </>
                    )}
                  </p>
                )}
              </div>

              <ul className="mt-3 divide-y divide-line border-t border-line">
                {order.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3 py-2 text-sm">
                    <span className="text-ink-mid">
                      {item.nameSnapshot}{" "}
                      <span className="text-ink-soft">× {item.quantity}</span>
                    </span>
                    <span className="shrink-0 text-ink-mid">
                      {formatPrice(item.unitPriceCents * item.quantity, order.currency)}
                    </span>
                  </li>
                ))}
              </ul>

              {(order.discountCents > 0 || order.creditAppliedCents > 0) && (
                <p className="mt-2 text-xs font-semibold text-brand">
                  {`You saved ${formatPrice(order.discountCents + order.creditAppliedCents, order.currency)} on this order`}
                </p>
              )}

              {address && (
                <p className="mt-3 rounded-xl bg-cream px-3 py-2 text-xs text-ink-mid">
                  🚚 Delivering to {address}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
