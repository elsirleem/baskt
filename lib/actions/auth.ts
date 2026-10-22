"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { headers } from "next/headers";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { AuthError, CredentialsSignin } from "next-auth";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITED_CODE, signIn, signOut } from "@/lib/auth";
import { ensureReferralCode, resolveReferrer } from "@/lib/referral";
import { LIMITS, clientIp, rateLimit } from "@/lib/rate-limit";
import { completePasswordReset, startPasswordReset } from "@/lib/password-reset";

const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  // Stored lowercase so the same address can't become two accounts.
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type FormState = { error?: string } | undefined;

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

  // Link the referrer if a valid code was supplied.
  const referredById = await resolveReferrer(formData.get("ref") as string | null);

  const passwordHash = await bcrypt.hash(password, 12);
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
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    // signIn throws a redirect on success — re-throw so Next handles it.
    throw error;
  }

  return undefined;
}

export async function logoutUser() {
  await signOut({ redirectTo: "/" });
  redirect("/");
}

export type ResetRequestState = { error?: string; sent?: boolean } | undefined;

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email");

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
