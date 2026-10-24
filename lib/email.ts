import { prisma } from "@/lib/prisma";
import { configuredEnv } from "@/lib/env";

export type EmailKind =
  | "order_confirmation"
  | "order_shipped"
  | "password_reset"
  | "signup_confirmation";

export type Email = {
  to: string;
  subject: string;
  html: string;
  text: string;
  kind: EmailKind;
  orderId?: string;
  /** Resend drops repeats with the same key, so a retried send can't email twice. */
  idempotencyKey?: string;
};

export type SendResult = "sent" | "failed" | "skipped";

/**
 * Domains reserved for testing (RFC 2606/6761): never real inboxes, so nothing is
 * sent there. Keeps test accounts like e2e+…@example.com from hitting Resend.
 */
const RESERVED_DOMAIN = /@(?:[^@]+\.)?(?:example\.(?:com|org|net)|test|invalid|localhost)$/i;

export function isReservedAddress(address: string): boolean {
  return RESERVED_DOMAIN.test(address.trim());
}

/**
 * Sends an email through Resend and records the outcome in EmailLog (never the
 * body). Never throws: a mail problem must not break checkout or admin actions.
 * Without RESEND_API_KEY it logs instead of sending.
 */
export async function sendEmail(email: Email): Promise<SendResult> {
  const apiKey = configuredEnv(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM || "AfroPantry <onboarding@resend.dev>";

  let status: SendResult;
  let providerId: string | undefined;
  let error: string | undefined;

  if (!apiKey || isReservedAddress(email.to)) {
    status = "skipped";
    error = apiKey ? "reserved test address" : "RESEND_API_KEY not set";
    if (process.env.NODE_ENV !== "production") {
      console.info(`[email] ${email.kind} to ${email.to} not sent (${error}): ${email.subject}`);
    }
  } else {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          ...(email.idempotencyKey && { "Idempotency-Key": email.idempotencyKey }),
        },
        body: JSON.stringify({
          from,
          to: [email.to],
          subject: email.subject,
          html: email.html,
          text: email.text,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
      if (res.ok) {
        status = "sent";
        providerId = body.id;
      } else {
        status = "failed";
        error = body.message ?? `HTTP ${res.status}`;
      }
    } catch (e) {
      status = "failed";
      error = e instanceof Error ? e.message : String(e);
    }
    if (status === "failed") console.error(`[email] ${email.kind} to ${email.to} failed: ${error}`);
  }

  await prisma.emailLog
    .create({
      data: {
        to: email.to,
        kind: email.kind,
        subject: email.subject,
        status,
        providerId,
        error,
        orderId: email.orderId,
      },
    })
    .catch(() => {});

  return status;
}
