import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { orderConfirmationEmail, orderShippedEmail } from "@/lib/email-templates";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** "Thanks for your order" with items, totals and delivery address. */
export async function sendOrderConfirmationEmail(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, user: { select: { email: true, name: true } } },
  });
  if (!order) return;

  await sendEmail({
    to: order.user.email,
    kind: "order_confirmation",
    orderId,
    idempotencyKey: `order-confirmation/${orderId}`,
    ...orderConfirmationEmail({ order, name: order.user.name, appUrl: appUrl() }),
  });
}

/** "Your order is on its way" with the carrier and tracking number. */
export async function sendOrderShippedEmail(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      carrier: true,
      trackingNumber: true,
      user: { select: { email: true, name: true } },
    },
  });
  if (!order) return;

  await sendEmail({
    to: order.user.email,
    kind: "order_shipped",
    orderId,
    idempotencyKey: `order-shipped/${orderId}`,
    ...orderShippedEmail({
      order,
      name: order.user.name,
      carrier: order.carrier,
      trackingNumber: order.trackingNumber,
      appUrl: appUrl(),
    }),
  });
}
