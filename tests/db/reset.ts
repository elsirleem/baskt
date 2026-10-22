import { prisma } from "@/lib/prisma";

/** Empties every table (CASCADE reaches orders, baskets, etc.). Test database only. */
export async function resetDatabase() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "User", "Product", "Recipe", "RateLimit", "EmailLog" RESTART IDENTITY CASCADE',
  );
}
