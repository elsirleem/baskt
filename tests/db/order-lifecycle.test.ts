import { afterAll, beforeEach, describe, expect, test, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { cancelAbandonedOrders } from "@/lib/orders";
import { POST as stripeWebhook } from "@/app/api/webhooks/stripe/route";
import { resetDatabase } from "./reset";

const WEBHOOK_SECRET = "whsec_test_only_secret";

/** Sends a Stripe-signed event to the webhook route, as Stripe would. */
async function sendEvent(type: string, session: Record<string, unknown>, secret = WEBHOOK_SECRET) {
  const payload = JSON.stringify({
    id: `evt_test_${Math.random().toString(36).slice(2)}`,
    object: "event",
    type,
    data: { object: { id: "cs_test_1", object: "checkout.session", mode: "payment", ...session } },
  });
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
  return stripeWebhook(
    new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": signature },
      body: payload,
    }),
  );
}

const address = {
  collected_information: {
    shipping_details: {
      name: "Ada Obi",
      address: { line1: "1 High Street", line2: null, city: "London", postal_code: "E1 6AN", country: "GB", state: null },
    },
  },
  customer_details: { phone: "+447400123456" },
};

async function pendingOrder(createdAt?: Date) {
  const user = await prisma.user.create({
    data: { email: `buyer-${Math.random()}@example.com`, passwordHash: "x" },
  });
  const product = await prisma.product.create({
    data: {
      slug: `garri-${Math.random()}`,
      name: "White Garri",
      description: "Test product",
      priceCents: 449,
      imageUrl: "https://images.unsplash.com/photo-test",
      category: "Grains & Flours",
      stock: 10,
    },
  });
  const order = await prisma.order.create({
    data: {
      userId: user.id,
      status: "PENDING",
      subtotalCents: 898,
      totalCents: 898,
      ...(createdAt && { createdAt }),
      items: {
        create: [{ productId: product.id, quantity: 2, unitPriceCents: 449, nameSnapshot: "White Garri (1kg)" }],
      },
    },
  });
  return { order, product };
}

const statusOf = async (id: string) => (await prisma.order.findUniqueOrThrow({ where: { id } })).status;
const stockOf = async (id: string) => (await prisma.product.findUniqueOrThrow({ where: { id } })).stock;

beforeEach(async () => {
  await resetDatabase();
  process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
});
afterAll(() => prisma.$disconnect());

describe("Stripe webhook", () => {
  test("a card payment marks the order paid, saves the address and takes stock", async () => {
    const { order, product } = await pendingOrder();

    const res = await sendEvent("checkout.session.completed", {
      payment_status: "paid",
      metadata: { orderId: order.id },
      ...address,
    });

    expect(res.status).toBe(200);
    expect(await statusOf(order.id)).toBe("PAID");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).shippingLine1).toBe("1 High Street");
    expect(await stockOf(product.id)).toBe(8);
  });

  test("a delayed payment waits as 'processing', then counts when Stripe confirms it", async () => {
    const { order, product } = await pendingOrder();

    await sendEvent("checkout.session.completed", {
      payment_status: "unpaid",
      metadata: { orderId: order.id },
      ...address,
    });
    expect(await statusOf(order.id)).toBe("AWAITING_PAYMENT");
    expect(await stockOf(product.id)).toBe(10); // nothing taken before the money arrives

    await sendEvent("checkout.session.async_payment_succeeded", {
      payment_status: "paid",
      metadata: { orderId: order.id },
      ...address,
    });
    expect(await statusOf(order.id)).toBe("PAID");
    expect(await stockOf(product.id)).toBe(8);
  });

  test("a failed delayed payment cancels the order", async () => {
    const { order, product } = await pendingOrder();
    await sendEvent("checkout.session.completed", { payment_status: "unpaid", metadata: { orderId: order.id } });

    await sendEvent("checkout.session.async_payment_failed", { payment_status: "unpaid", metadata: { orderId: order.id } });

    expect(await statusOf(order.id)).toBe("CANCELLED");
    expect(await stockOf(product.id)).toBe(10);
  });

  test("an expired checkout cancels the order and deletes its one-time discount", async () => {
    const { order } = await pendingOrder();
    const del = vi.spyOn(stripe.coupons, "del").mockResolvedValue({} as never);

    await sendEvent("checkout.session.expired", {
      payment_status: "unpaid",
      metadata: { orderId: order.id, couponId: "coupon_test_1" },
    });

    expect(await statusOf(order.id)).toBe("CANCELLED");
    expect(del).toHaveBeenCalledWith("coupon_test_1");
    del.mockRestore();
  });

  test("a payment Stripe confirms after the order was cancelled still counts", async () => {
    const { order } = await pendingOrder();
    await sendEvent("checkout.session.expired", { payment_status: "unpaid", metadata: { orderId: order.id } });

    await sendEvent("checkout.session.completed", { payment_status: "paid", metadata: { orderId: order.id } });

    expect(await statusOf(order.id)).toBe("PAID");
  });

  test("an expiry notice can't cancel an order that's already paid", async () => {
    const { order } = await pendingOrder();
    await sendEvent("checkout.session.completed", { payment_status: "paid", metadata: { orderId: order.id } });

    await sendEvent("checkout.session.expired", { payment_status: "unpaid", metadata: { orderId: order.id } });

    expect(await statusOf(order.id)).toBe("PAID");
  });

  test("forged notifications are rejected", async () => {
    const { order } = await pendingOrder();

    const res = await sendEvent(
      "checkout.session.completed",
      { payment_status: "paid", metadata: { orderId: order.id } },
      "whsec_someone_elses_secret",
    );

    expect(res.status).toBe(400);
    expect(await statusOf(order.id)).toBe("PENDING");
  });
});

test("orders still pending an hour after checkout started are cancelled", async () => {
  const old = await pendingOrder(new Date(Date.now() - 2 * 60 * 60 * 1000));
  const recent = await pendingOrder();

  await cancelAbandonedOrders();

  expect(await statusOf(old.order.id)).toBe("CANCELLED");
  expect(await statusOf(recent.order.id)).toBe("PENDING");
});
