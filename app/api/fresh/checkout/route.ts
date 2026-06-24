import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getCurrentUserId } from "@/lib/data";
import { ensureStripeCustomer, isStripeConfigured } from "@/lib/billing";
import { FRESH_PRICE_ENV } from "@/lib/freshbox";
import type { FreshBoxSize } from "@prisma/client";

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured. Add STRIPE_SECRET_KEY to .env." },
      { status: 500 },
    );
  }

  const { size, weekday } = (await request.json().catch(() => ({}))) as {
    size?: FreshBoxSize;
    weekday?: number;
  };

  if (size !== "SMALL" && size !== "MEDIUM" && size !== "LARGE") {
    return NextResponse.json({ error: "Invalid box size" }, { status: 400 });
  }
  const deliveryWeekday = [1, 2, 3].includes(Number(weekday)) ? Number(weekday) : 2;

  const priceId = FRESH_PRICE_ENV[size];
  if (!priceId) {
    return NextResponse.json(
      {
        error:
          "Fresh box prices aren't set up yet. Run `npm run setup-stripe` and add the printed price IDs to .env.",
      },
      { status: 500 },
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const customerId = await ensureStripeCustomer(userId);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      // Tag the subscription so the webhook routes it to fresh-box handling.
      subscription_data: {
        metadata: { kind: "fresh", size, weekday: String(deliveryWeekday) },
      },
      success_url: `${appUrl}/account?fresh=1`,
      cancel_url: `${appUrl}/fresh`,
      metadata: { userId, kind: "fresh", size, weekday: String(deliveryWeekday) },
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not start subscription";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
