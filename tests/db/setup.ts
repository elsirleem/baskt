import "dotenv/config";
import { testDatabaseUrl } from "./test-database";

// Runs before each test file's imports, so lib/prisma connects to the test database.
process.env.DATABASE_URL = testDatabaseUrl();
