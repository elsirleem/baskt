import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/** Deletes everything the browser tests created: e2e+… accounts, E2E products, counters, email log rows. */
export default async function globalTeardown() {
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const users = await db.user.findMany({
      where: { email: { startsWith: "e2e+", endsWith: "@example.com" } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);

    await db.rateLimit.deleteMany({
      where: {
        OR: [
          { key: { contains: ":email:e2e+" } },
          // Test IPs come from testIp() (10.x.x.x).
          { key: { startsWith: "signin:ip:10." } },
          { key: { startsWith: "signup:ip:10." } },
          ...ids.flatMap((id) => [
            { key: `checkout:user:${id}` },
            { key: `password:user:${id}` },
          ]),
        ],
      },
    });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await db.emailLog.deleteMany({ where: { to: { startsWith: "e2e+", endsWith: "@example.com" } } });
    await db.product.deleteMany({ where: { slug: { startsWith: "e2e-" } } });
  } finally {
    await db.$disconnect();
  }
}
