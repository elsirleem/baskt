import "dotenv/config";
import { defineConfig } from "@playwright/test";

const CI = !!process.env.CI;
const baseURL = "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: 2,
  reporter: CI ? [["list"], ["html", { open: "never" }]] : "list",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL,
    // Locally use the installed Google Chrome; CI installs Playwright's Chromium.
    channel: CI ? undefined : "chrome",
    trace: "retain-on-failure",
  },
  webServer: {
    // CI tests the production build (built in an earlier step). Locally, an
    // already-running `npm run dev` is reused.
    command: CI ? "npm run start" : "npm run dev",
    url: baseURL,
    reuseExistingServer: !CI,
    timeout: 120_000,
  },
});
