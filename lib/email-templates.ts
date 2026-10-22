import { formatPrice, orderNumber } from "@/lib/utils";

/** Email bodies: inline styles and system fonts, since mail apps ignore stylesheets and web fonts. */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const firstName = (name: string | null | undefined) => name?.trim().split(/\s+/)[0] ?? "";

function layout({ preheader, heading, body }: { preheader: string; heading: string; body: string }) {
  return `<!doctype html>
<html lang="en">
<body style="margin:0;background:#FAFAF7;font-family:Helvetica,Arial,sans-serif;color:#1C1C1E">
<span style="display:none;max-height:0;overflow:hidden">${preheader}</span>
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
  <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;font-weight:bold;color:#1A6B3C">Afro<span style="color:#B87400">Pantry</span></p>
  <div style="background:#FFFFFF;border-radius:16px;padding:24px">
    <h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:21px">${heading}</h1>
    ${body}
  </div>
  <p style="margin:16px 0 0;font-size:12px;color:#6E6E73">AfroPantry · African essentials, delivered across the UK.</p>
</div>
</body>
</html>`;
}

function button(href: string, label: string) {
  return `<p style="margin:20px 0 4px"><a href="${escapeHtml(href)}" style="display:inline-block;background:#1A6B3C;color:#FFFFFF;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:12px">${label}</a></p>`;
}

type OrderForEmail = {
  id: string;
  currency: string;
  subtotalCents: number;
  discountCents: number;
  deliveryCents: number;
  creditAppliedCents: number;
  totalCents: number;
  shippingName: string | null;
  shippingLine1: string | null;
  shippingLine2: string | null;
  shippingCity: string | null;
  shippingPostcode: string | null;
  items: { nameSnapshot: string; quantity: number; unitPriceCents: number }[];
};

function addressLines(order: OrderForEmail): string[] {
  return [
    order.shippingName,
    order.shippingLine1,
    order.shippingLine2,
    order.shippingCity,
    order.shippingPostcode,
  ].filter((line): line is string => Boolean(line));
}

function totalsRows(order: OrderForEmail): [string, string][] {
  const money = (cents: number) => formatPrice(cents, order.currency);
  return [
    ["Subtotal", money(order.subtotalCents)],
    ...(order.discountCents > 0 ? [["Member discount", `−${money(order.discountCents)}`] as [string, string]] : []),
    ["Delivery", order.deliveryCents ? money(order.deliveryCents) : "Free"],
    ...(order.creditAppliedCents > 0
      ? [["Account credit", `−${money(order.creditAppliedCents)}`] as [string, string]]
      : []),
    ["Total paid", money(order.totalCents)],
  ];
}

export function orderConfirmationEmail({
  order,
  name,
  appUrl,
}: {
  order: OrderForEmail;
  name: string | null;
  appUrl: string;
}) {
  const number = orderNumber(order.id);
  const first = firstName(name);
  const money = (cents: number) => formatPrice(cents, order.currency);
  const address = addressLines(order);
  const subject = `Your AfroPantry order #${number} is confirmed`;

  const itemsHtml = order.items
    .map(
      (item) =>
        `<tr><td style="padding:6px 0">${escapeHtml(item.nameSnapshot)} × ${item.quantity}</td><td style="padding:6px 0;text-align:right">${money(item.unitPriceCents * item.quantity)}</td></tr>`,
    )
    .join("");
  const totalsHtml = totalsRows(order)
    .map(
      ([label, value], i, rows) =>
        `<tr><td style="padding:4px 0;${i === rows.length - 1 ? "font-weight:bold;border-top:1px solid #E5E5EA;padding-top:8px" : "color:#3C3C3E"}">${label}</td><td style="padding:4px 0;text-align:right;${i === rows.length - 1 ? "font-weight:bold;border-top:1px solid #E5E5EA;padding-top:8px" : "color:#3C3C3E"}">${value}</td></tr>`,
    )
    .join("");

  const html = layout({
    preheader: `Order #${number}: we're getting your basket ready.`,
    heading: `Thanks for your order${first ? `, ${escapeHtml(first)}` : ""}!`,
    body: `<p style="margin:0 0 16px;color:#3C3C3E">We've received your payment for order <strong>#${number}</strong> and we're getting your basket ready. We'll email you again when it's on its way.</p>
<table style="width:100%;border-collapse:collapse;font-size:14px">${itemsHtml}</table>
<table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px">${totalsHtml}</table>
${address.length ? `<p style="margin:16px 0 0;font-size:14px;color:#3C3C3E"><strong>Delivering to</strong><br>${address.map(escapeHtml).join("<br>")}</p>` : ""}
${button(`${appUrl}/orders`, "Track your order")}`,
  });

  const text = [
    `Thanks for your order${first ? `, ${first}` : ""}!`,
    "",
    `We've received your payment for order #${number} and we're getting your basket ready. We'll email you again when it's on its way.`,
    "",
    ...order.items.map((item) => `${item.nameSnapshot} × ${item.quantity}: ${money(item.unitPriceCents * item.quantity)}`),
    "",
    ...totalsRows(order).map(([label, value]) => `${label}: ${value}`),
    ...(address.length ? ["", "Delivering to:", ...address] : []),
    "",
    `Track your order: ${appUrl}/orders`,
  ].join("\n");

  return { subject, html, text };
}

export function orderShippedEmail({
  order,
  name,
  carrier,
  trackingNumber,
  appUrl,
}: {
  order: Pick<OrderForEmail, "id">;
  name: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  appUrl: string;
}) {
  const number = orderNumber(order.id);
  const first = firstName(name);
  const subject = `Your AfroPantry order #${number} is on its way`;
  const sentWith = carrier ? `It's been sent with ${carrier}.` : "It's been sent.";

  const html = layout({
    preheader: `Order #${number} is on its way.`,
    heading: `Your order is on its way${first ? `, ${escapeHtml(first)}` : ""}!`,
    body: `<p style="margin:0 0 12px;color:#3C3C3E">Good news: order <strong>#${number}</strong> has left us. ${escapeHtml(sentWith)}</p>
${trackingNumber ? `<p style="margin:0 0 12px;color:#3C3C3E">Tracking number: <strong style="font-family:Menlo,monospace">${escapeHtml(trackingNumber)}</strong></p>` : ""}
${button(`${appUrl}/orders`, "See your order")}`,
  });

  const text = [
    `Your order is on its way${first ? `, ${first}` : ""}!`,
    "",
    `Good news: order #${number} has left us. ${sentWith}`,
    ...(trackingNumber ? [`Tracking number: ${trackingNumber}`] : []),
    "",
    `See your order: ${appUrl}/orders`,
  ].join("\n");

  return { subject, html, text };
}

export function passwordResetEmail({ name, link }: { name: string | null; link: string }) {
  const first = firstName(name);
  const subject = "Reset your AfroPantry password";

  const html = layout({
    preheader: "Use this link within an hour to choose a new password.",
    heading: `Reset your password${first ? `, ${escapeHtml(first)}` : ""}`,
    body: `<p style="margin:0 0 12px;color:#3C3C3E">Someone (hopefully you) asked to reset the password for your AfroPantry account. The link works once and expires in 1 hour.</p>
${button(link, "Choose a new password")}
<p style="margin:16px 0 0;font-size:13px;color:#6E6E73">If you didn't ask for this, you can ignore this email; your password won't change.</p>`,
  });

  const text = [
    `Reset your password${first ? `, ${first}` : ""}`,
    "",
    "Someone (hopefully you) asked to reset the password for your AfroPantry account. The link works once and expires in 1 hour:",
    link,
    "",
    "If you didn't ask for this, you can ignore this email; your password won't change.",
  ].join("\n");

  return { subject, html, text };
}
