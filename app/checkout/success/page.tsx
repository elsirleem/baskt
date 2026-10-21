import Link from "next/link";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/data";
import { finalizeOrderPaid, shippingFromSession } from "@/lib/orders";
import { formatPrice } from "@/lib/utils";
import { buttonClass } from "@/components/ui";

export const metadata = { title: "Order confirmed" };

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
          await finalizeOrderPaid(orderId, shippingFromSession(session));
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
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-pale text-4xl">
        ✅
      </div>
      <h1 className="mt-5 font-display text-2xl font-bold md:text-3xl">
        Thank you for your order!
      </h1>
      {confirmed ? (
        <p className="mx-auto mt-2 max-w-md text-ink-mid">
          {`Your payment of ${formatPrice(totalCents, currency)} was successful. We'll get your basket packed and on its way.`}
        </p>
      ) : (
        <p className="mx-auto mt-2 max-w-md text-ink-mid">
          Your order is being processed. You&apos;ll see it in your order history shortly.
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/orders" className={buttonClass.outline}>
          View orders
        </Link>
        <Link href="/" className={buttonClass.primary}>
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
