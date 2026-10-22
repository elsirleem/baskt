import "dotenv/config";
import { execSync } from "node:child_process";
import { testDatabaseUrl } from "./test-database";

/** Creates the test database if needed and applies every migration to it. */
export default function setup() {
  execSync("npx prisma migrate deploy", {
    env: {
      ...process.env,
      DATABASE_URL: testDatabaseUrl(),
      DATABASE_URL_UNPOOLED: undefined,
      POSTGRES_URL_NON_POOLING: undefined,
    },
    stdio: "pipe",
  });
}
