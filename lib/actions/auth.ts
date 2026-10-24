"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { headers } from "next/headers";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { AuthError, CredentialsSignin } from "next-auth";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITED_CODE, UNCONFIRMED_CODE, signIn, signOut } from "@/lib/auth";
import { ensureReferralCode, resolveReferrer } from "@/lib/referral";
import { LIMITS, clientIp, rateLimit } from "@/lib/rate-limit";
import { completePasswordReset, startPasswordReset } from "@/lib/password-reset";
import { emailConfirmationRequired } from "@/lib/env";
import {
  confirmSignup,
  createPendingSignup,
  resendSignupLink,
  sendSignupLink,
} from "@/lib/signup";

const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  // Stored lowercase so the same address can't become two accounts.
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email");

/** `confirmEmail` is set once a sign-up is waiting for its emailed link. */
export type FormState = { error?: string; confirmEmail?: string } | undefined;

export async function registerUser(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, email, password } = parsed.data;

  const limited = await rateLimit(`signup:ip:${clientIp(await headers())}`, LIMITS.signUpPerIp);
  if (!limited.ok) {
    return { error: "Too many accounts created from this network. Please try again later." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  const refCode = String(formData.get("ref") ?? "").trim().slice(0, 32) || null;
  const passwordHash = await bcrypt.hash(password, 12);

  // The account is only created once the emailed link is used, so an address
  // that isn't yours (or doesn't exist) can't be signed up.
  if (emailConfirmationRequired()) {
    // Past the per-address limit nothing more is sent, but the answer is the same.
    const emails = await rateLimit(`signup:email:${email}`, LIMITS.signUpEmailsPerAddress);
    if (emails.ok) {
      const token = await createPendingSignup({ email, name, passwordHash, refCode });
      after(() => sendSignupLink(email, name, token));
    }
    return { confirmEmail: email };
  }

  // Link the referrer if a valid code was supplied.
  const referredById = await resolveReferrer(refCode);

  const user = await prisma.user.create({
    data: { name, email, passwordHash, referredById },
  });
  await ensureReferralCode(user.id);

  // Sign the new user in immediately.
  await signIn("credentials", {
    email,
    password,
    redirectTo: "/",
  });

  return undefined;
}

export async function loginUser(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof CredentialsSignin && error.code === RATE_LIMITED_CODE) {
      return { error: "Too many sign-in attempts. Please wait 15 minutes and try again." };
    }
    if (error instanceof CredentialsSignin && error.code === UNCONFIRMED_CODE) {
      // They've lost the email, most likely: send that sign-up a fresh link.
      const address = email.trim().toLowerCase();
      const emails = await rateLimit(`signup:email:${address}`, LIMITS.signUpEmailsPerAddress);
      if (emails.ok) after(() => resendSignupLink(address, password));
      return {
        error:
          "Please confirm your email first. We've emailed you a link to finish creating your account.",
      };
    }
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    // signIn throws a redirect on success — re-throw so Next handles it.
    throw error;
  }

  return undefined;
}

export type ResendState = { error?: string; sent?: boolean } | undefined;

/** "Send it again" on the check-your-inbox screen. Same answer whatever happens. */
export async function resendConfirmation(
  _prev: ResendState,
  formData: FormData,
): Promise<ResendState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: "Enter a valid email" };
  const email = parsed.data;

  const byIp = await rateLimit(`signup-resend:ip:${clientIp(await headers())}`, LIMITS.signUpResendPerIp);
  if (!byIp.ok) return { error: "Too many requests. Please try again later." };

  const byAddress = await rateLimit(`signup:email:${email}`, LIMITS.signUpEmailsPerAddress);
  if (byAddress.ok) after(() => resendSignupLink(email));
  return { sent: true };
}

const confirmSchema = z.object({
  token: z.string().min(1, "This link is incomplete."),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, "Enter your password"),
});

/** The emailed link's form: creates the account and signs straight in. */
export async function confirmEmail(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = confirmSchema.safeParse({
    token: formData.get("token"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { token, email, password } = parsed.data;

  // Same limits as signing in, since this checks a password too.
  const byIp = await rateLimit(`signin:ip:${clientIp(await headers())}`, LIMITS.signInPerIp);
  const byEmail = await rateLimit(`signin:email:${email}`, LIMITS.signInPerEmail);
  if (!byIp.ok || !byEmail.ok) {
    return { error: "Too many attempts. Please wait 15 minutes and try again." };
  }

  const result = await confirmSignup(token, password);
  if (result === "wrong_password") {
    return { error: "That's not the password you chose when you signed up." };
  }
  if (result === "invalid") {
    return { error: "This link has expired or has already been used." };
  }

  await signIn("credentials", { email, password, redirectTo: "/" });
  return undefined;
}

export async function logoutUser() {
  await signOut({ redirectTo: "/" });
  redirect("/");
}

export type ResetRequestState = { error?: string; sent?: boolean } | undefined;

/**
 * "Forgot password": always answers the same way, straight away, whether or not
 * the email has an account. The email itself is sent after the response, so the
 * timing doesn't give it away either.
 */
export async function requestPasswordReset(
  _prev: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid email" };
  }
  const email = parsed.data;

  const byIp = await rateLimit(`reset:ip:${clientIp(await headers())}`, LIMITS.resetEmailPerIp);
  if (!byIp.ok) return { error: "Too many requests. Please try again later." };

  // Over the per-address limit: same answer, but no more emails to that inbox.
  const byAddress = await rateLimit(`reset:email:${email}`, LIMITS.resetEmailPerAddress);
  if (byAddress.ok) after(() => startPasswordReset(email));

  return { sent: true };
}

export type ResetPasswordState = { error?: string } | undefined;

const resetSchema = z
  .object({
    token: z.string().min(1, "This reset link is incomplete."),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords don't match" });

/** Sets a new password from a reset link, then sends you to sign in with it. */
export async function resetPassword(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const limited = await rateLimit(`reset-submit:ip:${clientIp(await headers())}`, LIMITS.resetSubmitPerIp);
  if (!limited.ok) return { error: "Too many attempts. Please wait 15 minutes and try again." };

  if (!(await completePasswordReset(parsed.data.token, parsed.data.password))) {
    return { error: "This reset link has expired or has already been used. Ask for a new one." };
  }
  redirect("/login?reset=1");
}
