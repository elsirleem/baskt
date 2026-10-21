import "dotenv/config";
import { test as base, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { configuredEnv } from "../lib/env";

/** Direct database access for setup, e.g. making a test user an admin. */
export const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/** A made-up client IP, so each test gets its own attempt-limit counters. */
export function testIp(): string {
  const n = () => Math.floor(Math.random() * 254) + 1;
  return `10.${n()}.${n()}.${n()}`;
}

let counter = 0;
/** Unique test email; the global teardown deletes every e2e+…@example.com account. */
export function testEmail(tag: string): string {
  return `e2e+${tag}-${Date.now()}-${process.pid}-${counter++}@example.com`;
}

/** Unique suffix for test product names ("E2E …"), which the teardown also deletes. */
export const stamp = () => `${Date.now()}${counter++}`;

export const test = base.extend({
  // Every test browses from its own IP address (see testIp).
  extraHTTPHeaders: async ({}, provide) => {
    await provide({ "x-forwarded-for": testIp() });
  },
});

export { expect };

export const PASSWORD = "password123";

export async function register(
  page: Page,
  email: string,
  { name = "Test Shopper", password = PASSWORD } = {},
) {
  await page.goto("/register");
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
}

export async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

/**
 * Submits the change-password form and waits for React to clear it afterwards,
 * so the next attempt isn't typed into fields that are about to be wiped.
 */
export async function submitPasswordChange(page: Page, current: string, next: string) {
  await page.getByLabel("Current password").fill(current);
  await page.getByLabel("New password", { exact: true }).fill(next);
  await page.getByLabel("Confirm new password").fill(next);
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByLabel("Current password")).toHaveValue("");
}

/** Registers a new user and gives them admin rights. */
export async function registerAdmin(page: Page): Promise<string> {
  const email = testEmail("admin");
  await register(page, email, { name: "Test Admin" });
  await expect(page).toHaveURL("/");
  await db.user.update({ where: { email }, data: { isAdmin: true } });
  return email;
}

/**
 * The form's own message. Next.js also renders an empty role="alert" page-change
 * announcer, so a page-wide alert lookup is ambiguous.
 */
export const formAlert = (page: Page) => page.locator("form [role=alert]");

/** Whether real Stripe keys are set (some tests only make sense without them). */
export const stripeConfigured = () => !!configuredEnv(process.env.STRIPE_SECRET_KEY);
