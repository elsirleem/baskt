import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { passwordResetEmail } from "@/lib/email-templates";
import { appUrl } from "@/lib/env";
import { hashToken, newToken } from "@/lib/tokens";

const RESET_LINK_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Creates a one-time reset token for a user, cancelling any earlier ones. */
export async function createPasswordResetToken(userId: string): Promise<string> {
  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  const { token, tokenHash } = newToken();
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_LINK_TTL_MS),
    },
  });
  return token;
}

/**
 * Emails a reset link if the address has an account; does nothing otherwise.
 * Callers show the same message either way, so this can't reveal who has an account.
 */
export async function startPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true },
  });
  if (!user) return;

  const token = await createPasswordResetToken(user.id);
  await sendEmail({
    to: user.email,
    kind: "password_reset",
    ...passwordResetEmail({ name: user.name, link: `${appUrl()}/reset-password?token=${token}` }),
  });
}

/** Whether a link's token can still be used (shown before asking for a new password). */
export async function isResetTokenUsable(token: string): Promise<boolean> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { usedAt: true, expiresAt: true },
  });
  return Boolean(record && !record.usedAt && record.expiresAt > new Date());
}

/**
 * Sets a new password if the token is valid, unused and unexpired, and returns
 * whether it worked. The token is claimed atomically, so it works exactly once;
 * passwordChangedAt ends every existing sign-in on the account.
 */
export async function completePasswordReset(token: string, newPassword: string): Promise<boolean> {
  const tokenHash = hashToken(token);
  const passwordHash = await bcrypt.hash(newPassword, 12);

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.passwordResetToken.updateMany({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (claimed.count === 0) return false;

    const { userId } = await tx.passwordResetToken.findUniqueOrThrow({ where: { tokenHash } });
    await tx.user.update({
      where: { id: userId },
      // Ends every sign-in on the account (none is kept for a reset link).
      data: { passwordHash, passwordChangedAt: new Date(), passwordChangedBySession: null },
    });
    await tx.passwordResetToken.deleteMany({ where: { userId, tokenHash: { not: tokenHash } } });
    return true;
  });
}
