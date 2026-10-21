import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import {
  cancelUnpaidOrder,
  finalizeOrderPaid,
  markAwaitingPayment,
  shippingFromSession,
} from "@/lib/orders";
import { syncStripeSubscription } from "@/lib/subscription";
import { configuredEnv } from "@/lib/env";

export async function POST(request: Request) {
  const webhookSecret = configuredEnv(process.env.STRIPE_WEBHOOK_SECRET);
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // The raw request body is required for signature verification.
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      // One-off product orders carry an orderId; subscription checkouts don't.
      const orderId = session.mode === "payment" ? session.metadata?.orderId : undefined;
      if (orderId) {
        // Cards are paid by now. Delayed methods (bank debits) finish checkout
        // "unpaid" and confirm later with async_payment_succeeded.
        if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
          await finalizeOrderPaid(orderId, shippingFromSession(session));
        } else {
          await markAwaitingPayment(orderId, shippingFromSession(session));
        }
      } else if (session.mode === "subscription" && session.subscription) {
        await syncStripeSubscription(String(session.subscription));
      }
      break;
    }
    case "checkout.session.expired":
    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.mode === "payment" ? session.metadata?.orderId : undefined;
      if (orderId) {
        await cancelUnpaidOrder(orderId);
        // The one-time discount made for this checkout can't be used now.
        const couponId = session.metadata?.couponId;
        if (couponId) await stripe.coupons.del(couponId).catch(() => {});
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await syncStripeSubscription(sub.id);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
