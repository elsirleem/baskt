import Link from "next/link";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/data";
import { finalizeOrderPaid } from "@/lib/orders";
import { formatPrice } from "@/lib/utils";

export const metadata = { title: "Order confirmed — Baskt" };

export default async function CheckoutSuccessPage(props: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await props.searchParams;
  const userId = await getCurrentUserId();

  let confirmed = false;
  let totalCents = 0;
  let currency = "gbp";

  if (session_id && userId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      const orderId = session.metadata?.orderId;

      // Fallback confirmation: if Stripe says it's paid, finalize the order here
      // even if the webhook hasn't been delivered (e.g. local dev without `stripe listen`).
      if (session.payment_status === "paid" && orderId) {
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (order && order.userId === userId) {
          await finalizeOrderPaid(orderId);
          confirmed = true;
          totalCents = order.totalCents;
          currency = order.currency;
        }
      }
    } catch {
      // Ignore — show the generic success message below.
    }
  }

  return (
    <div className="py-16 text-center">
      <div className="text-5xl">✅</div>
      <h1 className="mt-4 text-2xl font-bold">Thank you for your order!</h1>
      {confirmed ? (
        <p className="mt-2 text-stone-600">
          Your payment of {formatPrice(totalCents, currency)} was successful. A
          confirmation is on its way.
        </p>
      ) : (
        <p className="mt-2 text-stone-600">
          Your order is being processed. You&apos;ll receive a confirmation shortly.
        </p>
      )}
      <Link
        href="/"
        className="mt-6 inline-block rounded-md bg-emerald-600 px-5 py-2.5 font-medium text-white hover:bg-emerald-700"
      >
        Continue shopping
      </Link>
    </div>
  );
}
