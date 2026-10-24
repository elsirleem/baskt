import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { sendOrderConfirmationEmail } from "@/lib/order-emails";

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
 * the items out of stock, clear the basket, deduct any account credit used, grant
 * referral rewards on the buyer's first paid order, and email a confirmation.
 * Idempotent — safe to call from both the webhook and the success page, even at
 * the same moment.
 */
export async function finalizeOrderPaid(
  orderId: string,
  shipping?: ShippingDetails,
): Promise<void> {
  const claimed = await prisma.$transaction(async (tx) => {
    // Claim the order atomically: only one caller can flip it to PAID, so a racing
    // webhook and success page can't both apply credit and rewards. A cancelled
    // order is revived too: if Stripe says the money arrived, the order stands.
    const claimed = await tx.order.updateMany({
      where: { id: orderId, status: { in: ["PENDING", "AWAITING_PAYMENT", "CANCELLED"] } },
      data: { status: "PAID", paidAt: new Date(), ...shipping },
    });
    if (claimed.count === 0) return false;

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
    return true;
  });

  // Only the caller that marked it paid sends the confirmation (after commit).
  if (claimed) await sendOrderConfirmationEmail(orderId);
}

/**
 * Checkout finished with a delayed payment method (e.g. a bank debit): keep the
 * address, but don't take stock or credit until Stripe confirms the money.
 */
export async function markAwaitingPayment(
  orderId: string,
  shipping?: ShippingDetails,
): Promise<void> {
  await prisma.order.updateMany({
    where: { id: orderId, status: "PENDING" },
    data: { status: "AWAITING_PAYMENT", ...shipping },
  });
}

/** The checkout expired or a delayed payment failed: cancel unless it was paid. */
export async function cancelUnpaidOrder(orderId: string): Promise<void> {
  await prisma.order.updateMany({
    where: { id: orderId, status: { in: ["PENDING", "AWAITING_PAYMENT"] } },
    data: { status: "CANCELLED" },
  });
}

/** Checkouts expire after 30 minutes, so anything still pending after an hour was abandoned. */
const ABANDONED_AFTER_MS = 60 * 60 * 1000;

/**
 * Backup for a missed "checkout expired" notification: cancels orders still
 * PENDING an hour after checkout started. Runs when admins view order lists
 * (there's no job scheduler yet). If Stripe later confirms a payment anyway,
 * finalizeOrderPaid revives the order.
 */
export async function cancelAbandonedOrders(): Promise<void> {
  await prisma.order.updateMany({
    where: {
      status: "PENDING",
      createdAt: { lt: new Date(Date.now() - ABANDONED_AFTER_MS) },
    },
    data: { status: "CANCELLED" },
  });
}
