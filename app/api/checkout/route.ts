import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, getCart, getAccount } from "@/lib/data";
import { computeTotals } from "@/lib/pricing";
import { productLabel } from "@/lib/utils";
import { describeShortfall, stockShortfalls } from "@/lib/stock";
import { ensureStripeCustomer, isStripeConfigured } from "@/lib/billing";
import { LIMITS, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const limited = await rateLimit(`checkout:user:${userId}`, LIMITS.checkoutPerUser);
  if (!limited.ok) {
    return tooManyRequests(
      "Too many checkout attempts. Please wait a few minutes and try again.",
      limited,
    );
  }

  const [items, account] = await Promise.all([getCart(userId), getAccount(userId)]);
  if (items.length === 0) {
    return NextResponse.json({ error: "Your basket is empty" }, { status: 400 });
  }

  // Stock may have changed since things went in the basket.
  const shortfalls = stockShortfalls(items);
  if (shortfalls.length > 0) {
    return NextResponse.json(
      { error: `${shortfalls.map(describeShortfall).join("; ")}. Please update your basket.` },
      { status: 409 },
    );
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured. Add STRIPE_SECRET_KEY to .env." },
      { status: 500 },
    );
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
          nameSnapshot: productLabel(item.product),
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
            name: productLabel(item.product),
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
    // Usable once, and only until this checkout expires; deleted early if it does.
    const expiresAt = Math.floor(Date.now() / 1000) + 30 * 60;
    let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
    let couponId: string | undefined;
    if (savingsCents > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: savingsCents,
        currency,
        duration: "once",
        name: "AfroPantry savings",
        max_redemptions: 1,
        redeem_by: expiresAt + 60,
      });
      couponId = coupon.id;
      discounts = [{ coupon: coupon.id }];
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // We sell and deliver in the UK only: always charge in pounds, with no
      // currency-conversion fee or foreign payment methods.
      adaptive_pricing: { enabled: false },
      customer: customerId,
      line_items,
      discounts,
      // We deliver within the UK only; the address is saved on the order when paid.
      shipping_address_collection: { allowed_countries: ["GB"] },
      phone_number_collection: { enabled: true },
      // Save the address on the Stripe customer so it's prefilled next time.
      customer_update: { shipping: "auto" },
      // Stripe's minimum; a short window means fewer abandoned sessions holding
      // a basket whose stock may sell out in the meantime.
      expires_at: expiresAt,
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/cart`,
      client_reference_id: order.id,
      metadata: {
        orderId: order.id,
        userId,
        creditAppliedCents: String(totals.creditAppliedCents),
        ...(couponId && { couponId }),
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
