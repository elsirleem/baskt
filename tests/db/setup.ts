import "dotenv/config";
import { testDatabaseUrl } from "./test-database";

// Runs before each test file's imports, so lib/prisma connects to the test database.
process.env.DATABASE_URL = testDatabaseUrl();

// Never send real email from tests: tests that check sending set a fake key and
// intercept fetch themselves.
delete process.env.RESEND_API_KEY;
