import { createHash, randomBytes } from "crypto";

/**
 * Secrets sent in emailed links (password resets, sign-up confirmations). Only the
 * SHA-256 hash is stored, so the database alone can't be used to follow a link.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** A new random link token and the hash to store for it. */
export function newToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}
