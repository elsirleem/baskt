import Link from "next/link";
import { getAdminOrderCounts, getAdminOrders, type AdminOrderView } from "@/lib/data";
import { FULFILMENT_STEPS, stepIndex } from "@/lib/fulfilment";
import { formatPrice } from "@/lib/utils";

export const metadata = { title: "Admin — Orders" };

const VIEWS: { key: AdminOrderView; label: string; empty: string }[] = [
  { key: "to-fulfil", label: "To fulfil", empty: "Nothing to pack. You're all caught up." },
  { key: "shipped", label: "On the way", empty: "No orders are out for delivery." },
  { key: "delivered", label: "Delivered", empty: "No delivered orders yet." },
  { key: "unpaid", label: "Unpaid", empty: "No unpaid or cancelled orders." },
];

const placed = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/London",
});

export default async function AdminOrdersPage(props: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view: requested } = await props.searchParams;
  const view = VIEWS.find((v) => v.key === requested) ?? VIEWS[0];
  // Both queries check for an admin themselves.
  const [orders, counts] = await Promise.all([getAdminOrders(view.key), getAdminOrderCounts()]);

  return (
    <div>
      <nav aria-label="Order lists" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 scrollbar-none md:mx-0 md:px-0">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={`/admin/orders?view=${v.key}`}
            aria-current={v.key === view.key ? "page" : undefined}
            className={`shrink-0 rounded-full border-[1.5px] px-3.5 py-1.5 text-sm font-semibold transition ${
              v.key === view.key
                ? "border-brand bg-brand-pale text-brand"
                : "border-line bg-white text-ink-mid hover:border-brand/40"
            }`}
          >
            {v.label} ({counts[v.key]})
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <p className="rounded-2xl bg-white px-4 py-10 text-center text-ink-soft">{view.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-line bg-cream text-left text-ink-soft">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Deliver to</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-cream">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-semibold text-brand hover:underline"
                    >
                      #{order.id.slice(-8).toUpperCase()}
                    </Link>
                    <p className="text-xs text-ink-soft">{placed.format(order.createdAt)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-ink">{order.user.name ?? "—"}</p>
                    <p className="text-xs text-ink-soft">{order.user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-mid">
                    {[order.shippingCity, order.shippingPostcode].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-mid">
                    {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {formatPrice(order.totalCents, order.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-brand-pale px-2.5 py-0.5 text-xs font-semibold text-brand">
                      {order.status === "PAID"
                        ? FULFILMENT_STEPS[stepIndex(order.fulfilment)].adminLabel
                        : order.status === "PENDING"
                          ? "Awaiting payment"
                          : "Cancelled"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {orders.length === 100 && (
        <p className="mt-2 text-xs text-ink-soft">Showing the first 100 orders in this list.</p>
      )}
    </div>
  );
}
