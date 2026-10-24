import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { signupConfirmationEmail } from "@/lib/email-templates";
import { appUrl } from "@/lib/env";
import { ensureReferralCode, resolveReferrer } from "@/lib/referral";
import { hashToken, newToken } from "@/lib/tokens";

const SIGNUP_LINK_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export type NewSignup = {
  email: string;
  name: string;
  passwordHash: string;
  refCode?: string | null;
};

/** Records a sign-up and returns the token for its confirmation link. */
export async function createPendingSignup(signup: NewSignup): Promise<string> {
  // Sign-ups nobody confirmed in time are cleared out as new ones arrive.
  await prisma.pendingSignup.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  const { token, tokenHash } = newToken();
  await prisma.pendingSignup.create({
    data: { ...signup, tokenHash, expiresAt: new Date(Date.now() + SIGNUP_LINK_TTL_MS) },
  });
  return token;
}

/** Emails the link that finishes creating the account. */
export async function sendSignupLink(email: string, name: string, token: string): Promise<void> {
  await sendEmail({
    to: email,
    kind: "signup_confirmation",
    ...signupConfirmationEmail({ name, link: `${appUrl()}/confirm-email?token=${token}` }),
  });
}

/**
 * The newest unconfirmed sign-up for an email, or, given a password, the newest one
 * made with that password. Lets sign-in say "confirm your email first" instead of
 * "wrong password".
 */
export async function findPendingSignup(email: string, password?: string) {
  const signups = await prisma.pendingSignup.findMany({
    where: { email, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  if (password === undefined) return signups[0] ?? null;
  for (const signup of signups) {
    if (await bcrypt.compare(password, signup.passwordHash)) return signup;
  }
  return null;
}

/**
 * Gives that sign-up a new link (the old one stops working) and another 24 hours.
 * Returns the token, or null if there's no sign-up waiting.
 */
export async function renewSignupToken(email: string, password?: string) {
  const signup = await findPendingSignup(email, password);
  if (!signup) return null;
  const { token, tokenHash } = newToken();
  await prisma.pendingSignup.update({
    where: { id: signup.id },
    data: { tokenHash, expiresAt: new Date(Date.now() + SIGNUP_LINK_TTL_MS) },
  });
  return { token, name: signup.name };
}

/** Emails a fresh confirmation link if a sign-up is waiting; does nothing otherwise. */
export async function resendSignupLink(email: string, password?: string): Promise<void> {
  const renewed = await renewSignupToken(email, password);
  if (renewed) await sendSignupLink(email, renewed.name, renewed.token);
}

/** The address a confirmation link is for, if the link can still be used. */
export async function signupEmailForToken(token: string): Promise<string | null> {
  const signup = await prisma.pendingSignup.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { email: true, expiresAt: true },
  });
  return signup && signup.expiresAt > new Date() ? signup.email : null;
}

export type ConfirmResult = "created" | "wrong_password" | "invalid";

/**
 * Creates the account from a confirmation link, if the password is the one chosen
 * at sign-up. Asking for it means only the person who signed up can finish: not a
 * mail scanner that opens links, and not someone who signed up with another
 * person's address. The sign-up is claimed atomically, so a link makes at most one
 * account, and once an address has an account its other sign-ups are void.
 */
export async function confirmSignup(token: string, password: string): Promise<ConfirmResult> {
  const signup = await prisma.pendingSignup.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!signup || signup.expiresAt <= new Date()) return "invalid";
  if (!(await bcrypt.compare(password, signup.passwordHash))) return "wrong_password";

  const referredById = await resolveReferrer(signup.refCode);
  let userId: string | null;
  try {
    userId = await prisma.$transaction(async (tx) => {
      const claimed = await tx.pendingSignup.deleteMany({ where: { id: signup.id } });
      if (claimed.count === 0) return null;
      const user = await tx.user.create({
        data: {
          email: signup.email,
          name: signup.name,
          passwordHash: signup.passwordHash,
          referredById,
        },
      });
      await tx.pendingSignup.deleteMany({ where: { email: signup.email } });
      return user.id;
    });
  } catch (error) {
    // Another link for this address was confirmed first.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return "invalid";
    }
    throw error;
  }
  if (!userId) return "invalid";

  await ensureReferralCode(userId);
  return "created";
}
