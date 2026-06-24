import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { finalizeOrderPaid } from "@/lib/orders";
import { syncStripeSubscription } from "@/lib/subscription";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret || webhookSecret.includes("replace_me")) {
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
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      // One-off product orders carry an orderId; subscription checkouts don't.
      if (session.mode === "payment" && session.metadata?.orderId) {
        await finalizeOrderPaid(session.metadata.orderId);
      } else if (session.mode === "subscription" && session.subscription) {
        await syncStripeSubscription(String(session.subscription));
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
