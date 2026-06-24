import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { tierForPriceId, isStripeConfigured } from "@/lib/billing";
import { sizeForPriceId } from "@/lib/freshbox";

/**
 * Reconcile all of a user's Stripe subscriptions into our DB. Used as a fallback
 * after checkout so membership/fresh-box state updates even when the webhook
 * isn't being forwarded locally. No-op if Stripe isn't configured.
 */
export async function reconcileUserSubscriptions(userId: string): Promise<void> {
  if (!isStripeConfigured()) return;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });
  if (!user?.stripeCustomerId) return;

  const subs = await stripe.subscriptions.list({
    customer: user.stripeCustomerId,
    status: "all",
    limit: 10,
  });
  for (const sub of subs.data) {
    await syncStripeSubscription(sub.id);
  }
}

/**
 * Pull a subscription's current state from Stripe and mirror it into our DB.
 * Routes to membership-tier or fresh-box handling based on the subscription's
 * `kind` metadata (set at checkout). Resolves the user via the Stripe customer.
 */
export async function syncStripeSubscription(subscriptionId: string): Promise<void> {
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  if (!user) return;

  const item = sub.items.data[0];
  const priceId = item?.price.id;
  const active = sub.status === "active" || sub.status === "trialing";
  const periodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000)
    : null;

  // Fresh-box subscriptions are tagged at checkout; everything else is membership.
  const kind = sub.metadata?.kind;
  if (kind === "fresh") {
    const size = sizeForPriceId(priceId) ?? "MEDIUM";
    const weekday = Number(sub.metadata?.weekday) || 2;
    await prisma.freshBoxSubscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        size,
        deliveryWeekday: weekday,
        status: sub.status,
        stripeSubscriptionId: sub.id,
        currentPeriodEnd: periodEnd,
      },
      update: {
        size,
        deliveryWeekday: weekday,
        status: sub.status,
        stripeSubscriptionId: sub.id,
        currentPeriodEnd: periodEnd,
      },
    });
    return;
  }

  const tier = tierForPriceId(priceId);
  await prisma.subscription.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      tier: active ? tier : "PAYG",
      status: sub.status,
      stripeSubscriptionId: sub.id,
      currentPeriodEnd: periodEnd,
    },
    update: {
      tier: active ? tier : "PAYG",
      status: sub.status,
      stripeSubscriptionId: sub.id,
      currentPeriodEnd: periodEnd,
    },
  });
}
