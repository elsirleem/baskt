/**
 * Read an env value, treating the `.env.example` placeholders ("sk_test_...",
 * "price_...", "replace_me") as unset so features fail with a clear message
 * instead of calling Stripe with a fake key.
 */
export function configuredEnv(value: string | undefined): string | undefined {
  if (!value || value.includes("...") || value.includes("replace_me")) return undefined;
  return value;
}
