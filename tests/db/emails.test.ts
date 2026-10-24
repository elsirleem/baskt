import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { finalizeOrderPaid } from "@/lib/orders";
import { sendOrderShippedEmail } from "@/lib/order-emails";
import {
  completePasswordReset,
  createPasswordResetToken,
  isResetTokenUsable,
  startPasswordReset,
} from "@/lib/password-reset";
import { resetDatabase } from "./reset";
import { fakeResend } from "./fake-resend";

async function customer(email = "ada@mail.co.uk") {
  return prisma.user.create({
    data: { email, name: "Ada Obi", passwordHash: await bcrypt.hash("oldpassword1", 4) },
  });
}

beforeEach(resetDatabase);
afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.RESEND_API_KEY;
});
afterAll(() => prisma.$disconnect());

describe("sendEmail", () => {
  const email = {
    to: "ada@mail.co.uk",
    subject: "Hello",
    html: "<p>Hi</p>",
    text: "Hi",
    kind: "order_shipped" as const,
    idempotencyKey: "order-shipped/o1",
  };

  test("sends through Resend and records it", async () => {
    const { sent } = fakeResend();

    expect(await sendEmail(email)).toBe("sent");

    const [call] = sent();
    expect(call.headers.Authorization).toBe("Bearer re_test_only_key");
    expect(call.headers["Idempotency-Key"]).toBe("order-shipped/o1");
    expect(call.body).toMatchObject({ to: ["ada@mail.co.uk"], subject: "Hello", text: "Hi" });
    expect(call.body.from).toContain("AfroPantry");
    const log = await prisma.emailLog.findFirstOrThrow();
    expect([log.status, log.providerId, log.kind]).toEqual(["sent", "email_123", "order_shipped"]);
  });

  test("a rejected send is recorded as failed and doesn't throw", async () => {
    fakeResend({ status: 403, body: { message: "You can only send testing emails to your own email address" } });

    expect(await sendEmail(email)).toBe("failed");
    expect((await prisma.emailLog.findFirstOrThrow()).error).toContain("testing emails");
  });

  test("without a key nothing is sent, but it's logged as skipped", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    expect(await sendEmail(email)).toBe("skipped");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect((await prisma.emailLog.findFirstOrThrow()).status).toBe("skipped");
  });

  test("reserved test addresses are skipped even with a key", async () => {
    const { fetchSpy } = fakeResend();

    expect(await sendEmail({ ...email, to: "e2e+x@example.com" })).toBe("skipped");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("order emails", () => {
  async function pendingOrderFor(userId: string) {
    const product = await prisma.product.create({
      data: {
        slug: `garri-${Math.random()}`,
        name: "White Garri",
        description: "x",
        priceCents: 449,
        imageUrl: "https://images.unsplash.com/x",
        category: "Grains & Flours",
      },
    });
    return prisma.order.create({
      data: {
        userId,
        status: "PENDING",
        subtotalCents: 898,
        totalCents: 898,
        items: { create: [{ productId: product.id, quantity: 2, unitPriceCents: 449, nameSnapshot: "White Garri (1kg)" }] },
      },
    });
  }

  test("paying sends exactly one confirmation, even when five calls race", async () => {
    const { sent } = fakeResend();
    const user = await customer();
    const order = await pendingOrderFor(user.id);

    await Promise.all(Array.from({ length: 5 }, () => finalizeOrderPaid(order.id)));

    expect(sent()).toHaveLength(1);
    expect(sent()[0].body.subject).toMatch(/is confirmed$/);
    expect(sent()[0].body.text).toContain("White Garri (1kg) × 2: £8.98");
    expect(await prisma.emailLog.count({ where: { orderId: order.id, kind: "order_confirmation" } })).toBe(1);
  });

  test("the shipped email carries the carrier and tracking number", async () => {
    const { sent } = fakeResend();
    const user = await customer();
    const order = await pendingOrderFor(user.id);
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "PAID", fulfilment: "SHIPPED", carrier: "DPD", trackingNumber: "DPD123456" },
    });

    await sendOrderShippedEmail(order.id);

    expect(sent()[0].body.text).toContain("It's been sent with DPD.");
    expect(sent()[0].body.text).toContain("DPD123456");
    expect((await prisma.emailLog.findFirstOrThrow()).orderId).toBe(order.id);
  });
});

describe("password reset", () => {
  /** Requests a reset and pulls the token out of the emailed link. */
  async function emailedToken(email: string) {
    const { sent } = fakeResend();
    await startPasswordReset(email);
    const link = sent().at(-1)?.body.text.match(/reset-password\?token=([\w-]+)/);
    return link?.[1];
  }

  test("emails a working link; the new password works and the old one doesn't", async () => {
    const user = await customer();
    const token = await emailedToken(user.email);
    expect(token).toBeTruthy();

    expect(await completePasswordReset(token!, "newpassword1")).toBe(true);

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await bcrypt.compare("newpassword1", updated.passwordHash)).toBe(true);
    expect(await bcrypt.compare("oldpassword1", updated.passwordHash)).toBe(false);
    expect(updated.passwordChangedAt).toBeInstanceOf(Date); // ends other sign-ins
  });

  test("only a hash of the link is stored", async () => {
    const user = await customer();
    const token = await emailedToken(user.email);

    const stored = await prisma.passwordResetToken.findFirstOrThrow({ where: { userId: user.id } });
    expect(stored.tokenHash).not.toContain(token!);
    expect(stored.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  test("a link works once", async () => {
    const user = await customer();
    const token = await createPasswordResetToken(user.id);

    expect(await completePasswordReset(token, "newpassword1")).toBe(true);
    expect(await completePasswordReset(token, "anotherpass2")).toBe(false);
    expect(await isResetTokenUsable(token)).toBe(false);
  });

  test("an expired link doesn't work", async () => {
    const user = await customer();
    const token = await createPasswordResetToken(user.id);
    await prisma.passwordResetToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

    expect(await isResetTokenUsable(token)).toBe(false);
    expect(await completePasswordReset(token, "newpassword1")).toBe(false);
  });

  test("asking again cancels the earlier link", async () => {
    const user = await customer();
    const first = await createPasswordResetToken(user.id);
    const second = await createPasswordResetToken(user.id);

    expect(await completePasswordReset(first, "newpassword1")).toBe(false);
    expect(await completePasswordReset(second, "newpassword1")).toBe(true);
  });

  test("unknown emails get no email and no token", async () => {
    const { fetchSpy } = fakeResend();

    await startPasswordReset("nobody@mail.co.uk");

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(await prisma.passwordResetToken.count()).toBe(0);
  });
});
