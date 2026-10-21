import { afterAll, beforeEach, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { finalizeOrderPaid, REFERRAL_REWARD_CENTS, type ShippingDetails } from "@/lib/orders";
import { resetDatabase } from "./reset";

const shipping: ShippingDetails = {
  shippingName: "Ada Obi",
  shippingPhone: "+447700900123",
  shippingLine1: "1 High Street",
  shippingLine2: null,
  shippingCity: "London",
  shippingPostcode: "E1 6AN",
  shippingCountry: "GB",
};

/** A buyer referred by someone, with £3 credit, a basket, and a pending order using that credit. */
async function referredBuyerWithOrder() {
  const referrer = await prisma.user.create({
    data: { email: "referrer@example.com", passwordHash: "x" },
  });
  const buyer = await prisma.user.create({
    data: {
      email: "buyer@example.com",
      passwordHash: "x",
      referredById: referrer.id,
      creditCents: 300,
    },
  });
  const product = await prisma.product.create({
    data: {
      slug: "white-garri",
      name: "White Garri",
      description: "Test product",
      priceCents: 449,
      imageUrl: "https://images.unsplash.com/photo-test",
      category: "Grains & Flours",
    },
  });
  await prisma.cartItem.create({ data: { userId: buyer.id, productId: product.id, quantity: 2 } });
  const order = await pendingOrder(buyer.id, product.id, 300);
  return { referrer, buyer, product, order };
}

function pendingOrder(userId: string, productId: string, creditAppliedCents: number) {
  return prisma.order.create({
    data: {
      userId,
      status: "PENDING",
      subtotalCents: 898,
      deliveryCents: 499,
      creditAppliedCents,
      totalCents: 898 + 499 - creditAppliedCents,
      items: {
        create: [{ productId, quantity: 2, unitPriceCents: 449, nameSnapshot: "White Garri (1kg)" }],
      },
    },
  });
}

const creditOf = async (id: string) =>
  (await prisma.user.findUniqueOrThrow({ where: { id } })).creditCents;

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

test("marks the order paid and saves the delivery address", async () => {
  const { order } = await referredBuyerWithOrder();

  await finalizeOrderPaid(order.id, shipping);

  const saved = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  expect(saved.status).toBe("PAID");
  expect(saved).toMatchObject(shipping);
});

test("clears the basket, uses the credit, and rewards both sides of the referral", async () => {
  const { referrer, buyer, order } = await referredBuyerWithOrder();

  await finalizeOrderPaid(order.id, shipping);

  expect(await prisma.cartItem.count({ where: { userId: buyer.id } })).toBe(0);
  // £3 credit used, then £5 referral reward added.
  expect(await creditOf(buyer.id)).toBe(300 - 300 + REFERRAL_REWARD_CENTS);
  expect(await creditOf(referrer.id)).toBe(REFERRAL_REWARD_CENTS);
  expect((await prisma.user.findUniqueOrThrow({ where: { id: buyer.id } })).referralRewarded).toBe(
    true,
  );
});

test("running it again changes nothing", async () => {
  const { referrer, buyer, order } = await referredBuyerWithOrder();

  await finalizeOrderPaid(order.id, shipping);
  await finalizeOrderPaid(order.id, shipping);

  expect(await creditOf(buyer.id)).toBe(REFERRAL_REWARD_CENTS);
  expect(await creditOf(referrer.id)).toBe(REFERRAL_REWARD_CENTS);
});

test("webhook and success page finishing at the same moment apply credit and rewards once", async () => {
  const { referrer, buyer, order } = await referredBuyerWithOrder();

  await Promise.all(Array.from({ length: 5 }, () => finalizeOrderPaid(order.id, shipping)));

  expect(await creditOf(buyer.id)).toBe(REFERRAL_REWARD_CENTS);
  expect(await creditOf(referrer.id)).toBe(REFERRAL_REWARD_CENTS);
});

test("only the buyer's first paid order pays the referral reward", async () => {
  const { referrer, buyer, product, order } = await referredBuyerWithOrder();
  await finalizeOrderPaid(order.id, shipping);

  const second = await pendingOrder(buyer.id, product.id, 0);
  await finalizeOrderPaid(second.id, shipping);

  expect(await creditOf(buyer.id)).toBe(REFERRAL_REWARD_CENTS);
  expect(await creditOf(referrer.id)).toBe(REFERRAL_REWARD_CENTS);
});

test("still marks the order paid when no address was collected", async () => {
  const { order } = await referredBuyerWithOrder();

  await finalizeOrderPaid(order.id);

  const saved = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  expect(saved.status).toBe("PAID");
  expect(saved.shippingLine1).toBeNull();
});

test("records when it was paid and takes the items out of stock once", async () => {
  const { product, order } = await referredBuyerWithOrder(); // 2 × the product, stock 100

  await Promise.all(Array.from({ length: 5 }, () => finalizeOrderPaid(order.id, shipping)));

  expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).paidAt).toBeInstanceOf(
    Date,
  );
  expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(98);
});

test("two customers paying at once both come out of stock (none lost)", async () => {
  const { product, order } = await referredBuyerWithOrder();
  const other = await prisma.user.create({ data: { email: "other@example.com", passwordHash: "x" } });
  const otherOrder = await pendingOrder(other.id, product.id, 0);

  await Promise.all([finalizeOrderPaid(order.id), finalizeOrderPaid(otherOrder.id)]);

  expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(96);
});

test("an unknown order id does nothing", async () => {
  await expect(finalizeOrderPaid("no-such-order")).resolves.toBeUndefined();
});
