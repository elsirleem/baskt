import { prisma } from "@/lib/prisma";

export const REFERRAL_REWARD_CENTS = 500; // £5 each way

/**
 * Finalize a paid order exactly once: mark PAID, clear the basket, deduct any
 * account credit used, and grant referral rewards on the buyer's first paid order.
 * Idempotent — safe to call from both the webhook and the success page.
 */
export async function finalizeOrderPaid(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true },
  });
  if (!order || order.status === "PAID") return;

  await prisma.$transaction(async (tx) => {
    // Re-check inside the transaction to avoid double-processing under races.
    const fresh = await tx.order.findUnique({ where: { id: orderId } });
    if (!fresh || fresh.status === "PAID") return;

    await tx.order.update({ where: { id: orderId }, data: { status: "PAID" } });
    await tx.cartItem.deleteMany({ where: { userId: order.userId } });

    if (order.creditAppliedCents > 0) {
      await tx.user.update({
        where: { id: order.userId },
        data: { creditCents: { decrement: order.creditAppliedCents } },
      });
    }

    // Referral reward: first paid order by a referred user pays both parties.
    const buyer = order.user;
    if (buyer.referredById && !buyer.referralRewarded) {
      await tx.user.update({
        where: { id: buyer.id },
        data: {
          referralRewarded: true,
          creditCents: { increment: REFERRAL_REWARD_CENTS },
        },
      });
      await tx.user.update({
        where: { id: buyer.referredById },
        data: { creditCents: { increment: REFERRAL_REWARD_CENTS } },
      });
    }
  });
}
