import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getCurrentUserId } from "@/lib/data";
import { ensureStripeCustomer, isStripeConfigured, TIER_PRICE_ENV } from "@/lib/billing";

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

  const { tier } = (await request.json().catch(() => ({}))) as { tier?: string };
  if (tier !== "MONTHLY" && tier !== "PLUS") {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const priceId = TIER_PRICE_ENV[tier];
  if (!priceId) {
    return NextResponse.json(
      {
        error:
          "Membership prices aren't set up yet. Run `npm run setup-stripe` and add the printed price IDs to .env.",
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
      subscription_data: { metadata: { kind: "membership", tier } },
      success_url: `${appUrl}/account?subscribed=1`,
      cancel_url: `${appUrl}/membership`,
      metadata: { userId, tier },
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not start subscription";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
