import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // The CLI (migrations, seed) needs a direct connection. Hosted Postgres such as
    // Neon on Vercel provides a pooled DATABASE_URL for the app plus a direct one.
    url:
      process.env.DATABASE_URL_UNPOOLED ??
      process.env.POSTGRES_URL_NON_POOLING ??
      process.env.DATABASE_URL,
  },
});
