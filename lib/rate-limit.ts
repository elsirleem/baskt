import { prisma } from "@/lib/prisma";

type Rule = { limit: number; windowSeconds: number };

export const LIMITS = {
  signInPerEmail: { limit: 10, windowSeconds: 15 * 60 },
  signInPerIp: { limit: 50, windowSeconds: 15 * 60 },
  signUpPerIp: { limit: 5, windowSeconds: 60 * 60 },
  passwordChangePerUser: { limit: 5, windowSeconds: 15 * 60 },
  checkoutPerUser: { limit: 10, windowSeconds: 10 * 60 },
} satisfies Record<string, Rule>;

export type RateLimitResult = { ok: boolean; retryAfterSeconds: number };

/**
 * Count one attempt against `key` and report whether it's within the rule.
 * Fixed windows stored in Postgres, so limits hold across server instances; the
 * single upsert keeps concurrent attempts from being lost. Times are UTC to match
 * how Prisma stores DateTime columns.
 */
export async function rateLimit(key: string, rule: Rule): Promise<RateLimitResult> {
  const [row] = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt")
    VALUES (
      ${key},
      1,
      timezone('UTC', now()) + make_interval(secs => ${rule.windowSeconds}::int)
    )
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."resetAt" <= timezone('UTC', now())
        THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" <= timezone('UTC', now())
        THEN EXCLUDED."resetAt" ELSE "RateLimit"."resetAt" END
    RETURNING "count", "resetAt"`;

  // Occasionally clear out expired windows so the table stays small.
  if (Math.random() < 0.01) {
    prisma.rateLimit
      .deleteMany({ where: { resetAt: { lt: new Date() } } })
      .catch(() => {});
  }

  return {
    ok: row.count <= rule.limit,
    retryAfterSeconds: Math.max(1, Math.ceil((row.resetAt.getTime() - Date.now()) / 1000)),
  };
}

/** JSON 429 response for API routes, telling the client when to retry. */
export function tooManyRequests(message: string, result: RateLimitResult): Response {
  return Response.json(
    { error: message },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } },
  );
}

/**
 * Best-effort client IP from the hosting proxy (Vercel, Cloudflare, nginx). Without a
 * trusted proxy in front this header can be forged, which is why sign-in is also
 * limited per account.
 */
export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
