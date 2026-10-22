import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getAdminOrder } from "@/lib/data";
import { formatPrice } from "@/lib/utils";
import { FulfilmentActions } from "@/components/FulfilmentActions";
import { OrderTracker, trackerTimes } from "@/components/OrderTracker";
import { BackLink, cardClass } from "@/components/ui";

export const metadata = { title: "Admin — Order" };

const UNPAID_LABEL: Record<string, string> = {
  PENDING: "Awaiting payment",
  AWAITING_PAYMENT: "Payment processing",
  CANCELLED: "Cancelled",
};

const EMAIL_LABEL: Record<string, string> = {
  order_confirmation: "Order confirmation",
  order_shipped: "Shipped",
};

const placed = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/London",
});

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={`${cardClass} p-4 md:p-5`}>
      <h3 className="mb-3 font-display text-base font-bold">{title}</h3>
      {children}
    </section>
  );
}

export default async function AdminOrderPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const order = await getAdminOrder(id); // checks for an admin
  if (!order) notFound();

  const money = (cents: number) => formatPrice(cents, order.currency);
  const address = [
    order.shippingName,
    order.shippingLine1,
    order.shippingLine2,
    order.shippingCity,
    order.shippingPostcode,
    order.shippingCountry,
  ].filter(Boolean);

  return (
    <div>
      <BackLink href="/admin/orders" label="All orders" />
      <div className="mb-5">
        <h2 className="font-display text-xl font-bold">Order #{order.id.slice(-8).toUpperCase()}</h2>
        <p className="text-sm text-ink-soft">
          Placed {placed.format(order.createdAt)}
          {order.status !== "PAID" && ` · ${UNPAID_LABEL[order.status]}`}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {order.status === "PAID" && (
            <Card title="Progress">
              <OrderTracker
                status={order.fulfilment}
                times={trackerTimes(order)}
                audience="admin"
              />
              {order.carrier && (
                <p className="mt-3 text-sm text-ink-mid">
                  Sent with {order.carrier}
                  {order.trackingNumber && (
                    <>
                      {" "}
                      · Tracking <span className="font-mono">{order.trackingNumber}</span>
                    </>
                  )}
                </p>
              )}
            </Card>
          )}

          <Card title="Items">
            <ul className="divide-y divide-line">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-3 py-2 text-sm">
                  <div>
                    <Link
                      href={`/product/${item.product.slug}`}
                      className="text-ink hover:text-brand"
                    >
                      {item.nameSnapshot}
                    </Link>{" "}
                    <span className="text-ink-soft">× {item.quantity}</span>
                    {item.product.stock < 0 && (
                      <p className="text-xs font-semibold text-danger">
                        Oversold: stock is now {item.product.stock}. Check before packing.
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-ink-mid">
                    {money(item.unitPriceCents * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
              <div className="flex justify-between text-ink-mid">
                <dt>Subtotal</dt>
                <dd>{money(order.subtotalCents)}</dd>
              </div>
              {order.discountCents > 0 && (
                <div className="flex justify-between text-brand">
                  <dt>Member discount</dt>
                  <dd>−{money(order.discountCents)}</dd>
                </div>
              )}
              <div className="flex justify-between text-ink-mid">
                <dt>Delivery</dt>
                <dd>{order.deliveryCents ? money(order.deliveryCents) : "Free"}</dd>
              </div>
              {order.creditAppliedCents > 0 && (
                <div className="flex justify-between text-brand">
                  <dt>Account credit</dt>
                  <dd>−{money(order.creditAppliedCents)}</dd>
                </div>
              )}
              <div className="flex justify-between font-bold text-ink">
                <dt>Total paid</dt>
                <dd>{money(order.totalCents)}</dd>
              </div>
            </dl>
          </Card>
        </div>

        <div className="space-y-5">
          {order.status === "PAID" && (
            <Card title="Next step">
              <FulfilmentActions orderId={order.id} status={order.fulfilment} />
            </Card>
          )}

          <Card title="Deliver to">
            {address.length > 0 ? (
              <address className="text-sm not-italic leading-relaxed text-ink-mid">
                {address.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </address>
            ) : (
              <p className="text-sm text-ink-soft">No address saved for this order.</p>
            )}
            {order.shippingPhone && (
              <p className="mt-2 text-sm text-ink-mid">📞 {order.shippingPhone}</p>
            )}
          </Card>

          <Card title="Emails">
            {order.emails.length === 0 ? (
              <p className="text-sm text-ink-soft">None sent yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {order.emails.map((email) => (
                  <li key={email.id} className="flex items-start justify-between gap-3">
                    <span className="text-ink-mid">
                      {EMAIL_LABEL[email.kind] ?? email.kind}
                      <span className="block text-xs text-ink-soft">{placed.format(email.createdAt)}</span>
                    </span>
                    <span
                      title={email.error ?? undefined}
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        email.status === "sent"
                          ? "bg-brand-pale text-brand"
                          : email.status === "failed"
                            ? "bg-red-50 text-danger"
                            : "bg-line text-ink-soft"
                      }`}
                    >
                      {email.status === "sent" ? "Sent" : email.status === "failed" ? "Failed" : "Not sent"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Customer">
            <p className="text-sm text-ink">{order.user.name ?? "—"}</p>
            <p className="text-sm text-ink-soft">{order.user.email}</p>
            {order.stripeSessionId && (
              <p className="mt-3 break-all text-xs text-ink-soft">
                Stripe checkout: <span className="font-mono">{order.stripeSessionId}</span>
                <br />
                Refunds are made in the Stripe Dashboard.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
