import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, getCart, getAccount } from "@/lib/data";
import { computeTotals } from "@/lib/pricing";
import { ensureStripeCustomer } from "@/lib/billing";

export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes("replace_me")) {
    return NextResponse.json(
      { error: "Stripe is not configured. Add STRIPE_SECRET_KEY to .env." },
      { status: 500 },
    );
  }

  const [items, account] = await Promise.all([getCart(userId), getAccount(userId)]);
  if (items.length === 0) {
    return NextResponse.json({ error: "Your basket is empty" }, { status: 400 });
  }

  const subtotalCents = items.reduce(
    (sum, item) => sum + item.product.priceCents * item.quantity,
    0,
  );
  const currency = items[0]?.product.currency ?? "gbp";
  const creditCents = account.user?.creditCents ?? 0;
  const totals = computeTotals({ subtotalCents, tier: account.tier, creditCents });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Create a pending order with a full snapshot of pricing at purchase time.
  const order = await prisma.order.create({
    data: {
      userId,
      status: "PENDING",
      subtotalCents: totals.subtotalCents,
      discountCents: totals.discountCents,
      deliveryCents: totals.deliveryCents,
      creditAppliedCents: totals.creditAppliedCents,
      totalCents: totals.totalCents,
      currency,
      items: {
        create: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPriceCents: item.product.priceCents,
          nameSnapshot: item.product.name,
        })),
      },
    },
  });

  try {
    const customerId = await ensureStripeCustomer(userId);

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(
      (item) => ({
        quantity: item.quantity,
        price_data: {
          currency,
          unit_amount: item.product.priceCents,
          product_data: {
            name: item.product.name,
            images: [item.product.imageUrl],
          },
        },
      }),
    );

    if (totals.deliveryCents > 0) {
      line_items.push({
        quantity: 1,
        price_data: {
          currency,
          unit_amount: totals.deliveryCents,
          product_data: { name: "Delivery" },
        },
      });
    }

    // Member discount + account credit are represented as a single one-time coupon,
    // so Stripe's hosted page shows the full prices with the savings applied.
    const savingsCents = totals.discountCents + totals.creditAppliedCents;
    let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
    if (savingsCents > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: savingsCents,
        currency,
        duration: "once",
        name: "Baskt savings",
      });
      discounts = [{ coupon: coupon.id }];
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items,
      discounts,
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/cart`,
      client_reference_id: order.id,
      metadata: {
        orderId: order.id,
        userId,
        creditAppliedCents: String(totals.creditAppliedCents),
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    // Roll back the pending order if Stripe rejects the session.
    await prisma.order.delete({ where: { id: order.id } }).catch(() => {});
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
