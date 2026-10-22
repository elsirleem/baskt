/**
 * Read an env value, treating the `.env.example` placeholders ("sk_test_...",
 * "price_...", "replace_me") as unset so features fail with a clear message
 * instead of calling Stripe with a fake key.
 */
export function configuredEnv(value: string | undefined): string | undefined {
  if (!value || value.includes("...") || value.includes("replace_me")) return undefined;
  return value;
}

/**
 * The site's public address, for Stripe return links and links in emails:
 * NEXT_PUBLIC_APP_URL if set, otherwise the Vercel production domain (set
 * automatically on Vercel), otherwise localhost.
 */
export function appUrl(): string {
  const explicit = configuredEnv(process.env.NEXT_PUBLIC_APP_URL);
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
