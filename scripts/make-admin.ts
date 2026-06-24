import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const emails = process.argv.slice(2);
  if (emails.length === 0) {
    console.error("Usage: npm run make-admin -- <email> [email...]");
    process.exit(1);
  }

  let failed = 0;
  for (const email of emails) {
    try {
      const user = await prisma.user.update({
        where: { email },
        data: { isAdmin: true },
        select: { email: true },
      });
      console.log(`✅ ${user.email} is now an admin.`);
    } catch (e: unknown) {
      failed++;
      const code = (e as { code?: string })?.code;
      console.error(
        code === "P2025"
          ? `❌ No user found with email: ${email}`
          : `❌ Failed to promote ${email}: ${e}`,
      );
    }
  }

  if (failed > 0) process.exit(1);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
