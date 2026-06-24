import Link from "next/link";
import { redirect } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { getCurrentUserId, getOrders } from "@/lib/data";

export const metadata = { title: "Your orders — Baskt" };

const STATUS_STYLES: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-800",
  PENDING: "bg-amber-100 text-amber-800",
  CANCELLED: "bg-stone-200 text-stone-600",
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function OrdersPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const orders = await getOrders(userId);

  if (orders.length === 0) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold">No orders yet</h1>
        <p className="mt-2 text-stone-600">When you place an order it&apos;ll show up here.</p>
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
      <h1 className="mb-6 text-2xl font-bold">Your orders</h1>
      <ul className="space-y-4">
        {orders.map((order) => (
          <li key={order.id} className="rounded-lg border border-stone-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">Order #{order.id.slice(-8).toUpperCase()}</p>
                <p className="text-sm text-stone-500">{formatDate(order.createdAt)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    STATUS_STYLES[order.status] ?? "bg-stone-200 text-stone-600"
                  }`}
                >
                  {order.status}
                </span>
                <span className="font-semibold">
                  {formatPrice(order.totalCents, order.currency)}
                </span>
              </div>
            </div>

            <ul className="mt-4 divide-y divide-stone-100 border-t border-stone-100">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between py-2 text-sm">
                  <span className="text-stone-700">
                    {item.nameSnapshot}{" "}
                    <span className="text-stone-400">× {item.quantity}</span>
                  </span>
                  <span className="text-stone-600">
                    {formatPrice(item.unitPriceCents * item.quantity, order.currency)}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
