import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const REFERRAL_REWARD_CENTS = 500; // £5 each way

/** Delivery details snapshotted onto an order (column names match `Order`). */
export type ShippingDetails = {
  shippingName: string | null;
  shippingPhone: string | null;
  shippingLine1: string | null;
  shippingLine2: string | null;
  shippingCity: string | null;
  shippingPostcode: string | null;
  shippingCountry: string | null;
};

/** Extract the delivery address and phone Stripe Checkout collected, if any. */
export function shippingFromSession(
  session: Stripe.Checkout.Session,
): ShippingDetails | undefined {
  const details = session.collected_information?.shipping_details;
  if (!details) return undefined;
  const { address } = details;
  return {
    shippingName: details.name,
    shippingPhone: session.customer_details?.phone ?? null,
    shippingLine1: address.line1,
    shippingLine2: address.line2,
    shippingCity: address.city,
    shippingPostcode: address.postal_code,
    shippingCountry: address.country,
  };
}

/**
 * Finalize a paid order exactly once: mark PAID, save the delivery address, take
 * the items out of stock, clear the basket, deduct any account credit used, and
 * grant referral rewards on the buyer's first paid order. Idempotent — safe to
 * call from both the webhook and the success page, even at the same moment.
 */
export async function finalizeOrderPaid(
  orderId: string,
  shipping?: ShippingDetails,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Claim the order atomically: only one caller can flip PENDING → PAID, so a
    // racing webhook and success page can't both apply credit and rewards.
    const claimed = await tx.order.updateMany({
      where: { id: orderId, status: "PENDING" },
      data: { status: "PAID", paidAt: new Date(), ...shipping },
    });
    if (claimed.count === 0) return;

    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true },
    });

    // Atomic decrements, so simultaneous orders can't lose a sale. Stock can go
    // below zero if two people pay for the last one; the admin sees "oversold".
    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    await tx.cartItem.deleteMany({ where: { userId: order.userId } });

    if (order.creditAppliedCents > 0) {
      await tx.user.update({
        where: { id: order.userId },
        data: { creditCents: { decrement: order.creditAppliedCents } },
      });
    }

    // Referral reward: the buyer's first paid order pays both parties. The
    // conditional update makes the flag flip once even across concurrent orders.
    const rewarded = await tx.user.updateMany({
      where: { id: order.userId, referralRewarded: false, referredById: { not: null } },
      data: {
        referralRewarded: true,
        creditCents: { increment: REFERRAL_REWARD_CENTS },
      },
    });
    if (rewarded.count > 0) {
      const buyer = await tx.user.findUniqueOrThrow({
        where: { id: order.userId },
        select: { referredById: true },
      });
      await tx.user.update({
        where: { id: buyer.referredById! },
        data: { creditCents: { increment: REFERRAL_REWARD_CENTS } },
      });
    }
  });
}
