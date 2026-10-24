import "dotenv/config";
import { test as base, expect, type Page } from "@playwright/test";
import { PrismaClient, type OrderStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { configuredEnv, emailConfirmationRequired } from "../lib/env";
import { confirmSignup, renewSignupToken } from "../lib/signup";

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

/**
 * Signs up through the form. When new accounts must confirm their email (the
 * default), it then does what the emailed link does and signs in, so a successful
 * sign-up always ends signed in. `confirm: false` stops at "Check your inbox".
 */
export async function register(
  page: Page,
  email: string,
  { name = "Test Shopper", password = PASSWORD, confirm = true } = {},
) {
  await page.goto("/register");
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  if (!emailConfirmationRequired() || !confirm) return;

  const inbox = page.getByRole("heading", { name: "Check your inbox" });
  await expect(inbox.or(formAlert(page))).toBeVisible();
  if (!(await inbox.isVisible())) return; // the form refused it

  const link = await signupLink(email);
  expect(await confirmSignup(link, password)).toBe("created");
  await signIn(page, email, password);
}

/** A working confirmation link token for a sign-up (replacing the emailed one). */
export async function signupLink(email: string): Promise<string> {
  const renewed = await renewSignupToken(email.trim().toLowerCase());
  if (!renewed) throw new Error(`No sign-up waiting for ${email}`);
  return renewed.token;
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

/** A throwaway product (slug "e2e-…", deleted by the teardown) with a chosen stock level. */
export async function createTestProduct(stock: number) {
  const id = stamp();
  return db.product.create({
    data: {
      slug: `e2e-stock-${id}`,
      name: `E2E Test Spice ${id}`,
      description: "Created by an end-to-end test.",
      priceCents: 300,
      imageUrl: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&q=80",
      category: "Spices",
      stock,
    },
  });
}

/**
 * A paid order with a delivery address, as Stripe would leave it (real payments
 * need Stripe keys), or an unpaid checkout with another status. Deleted with its
 * e2e user by the teardown.
 */
export async function createOrder(email: string, status: OrderStatus = "PAID") {
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  const product = await db.product.findUniqueOrThrow({ where: { slug: "white-garri-1kg" } });
  return db.order.create({
    data: {
      userId: user.id,
      status,
      paidAt: status === "PAID" ? new Date() : null,
      subtotalCents: 898,
      deliveryCents: 499,
      totalCents: 1397,
      shippingName: "Ada Obi",
      shippingPhone: "+447700900123",
      shippingLine1: "1 High Street",
      shippingCity: "London",
      shippingPostcode: "E1 6AN",
      shippingCountry: "GB",
      items: {
        create: [
          { productId: product.id, quantity: 2, unitPriceCents: 449, nameSnapshot: "White Garri (1kg)" },
        ],
      },
    },
  });
}
