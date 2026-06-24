import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars

function randomCode(len = 6): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

/** Return the user's referral code, generating and persisting one if absent. */
export async function ensureReferralCode(userId: string): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });
  if (existing?.referralCode) return existing.referralCode;

  // Retry on the (rare) unique collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    try {
      await prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
      return code;
    } catch {
      // unique violation → try again
    }
  }
  throw new Error("Could not generate a referral code");
}

/** Resolve a referral code to the referring user's id (null if invalid/own). */
export async function resolveReferrer(code: string | null | undefined): Promise<string | null> {
  if (!code) return null;
  const user = await prisma.user.findUnique({
    where: { referralCode: code.toUpperCase().trim() },
    select: { id: true },
  });
  return user?.id ?? null;
}
