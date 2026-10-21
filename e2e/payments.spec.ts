import Stripe from "stripe";
import type { Page } from "@playwright/test";
import { createTestProduct, db, expect, register, stripeConfigured, test, testEmail } from "./helpers";

/**
 * Real payments through Stripe's hosted checkout in test mode. Opt-in, because it
 * creates objects in your Stripe test account:
 *   E2E_STRIPE=1 npm run test:e2e
 * Needs Stripe test keys in .env (stripe listen is optional; the success page also
 * confirms payments). The test customer is deleted in Stripe afterwards.
 */
test.describe("real Stripe test-mode payments", () => {
  test.skip(!process.env.E2E_STRIPE || !stripeConfigured(), "set E2E_STRIPE=1 with Stripe test keys");
  test.setTimeout(180_000);

  async function payOnStripe(page: Page, { withAddress }: { withAddress: boolean }) {
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });
    await page.locator("button[type=submit]").first().waitFor();
    if (withAddress) {
      await page.fill("#shippingName", "Ada Obi"); // country is fixed to the UK
      await page.fill("#shippingAddressLine1", "1 High Street");
      await page.keyboard.press("Escape"); // close address suggestions
      await page.fill("#shippingLocality", "London");
      await page.fill("#shippingPostalCode", "E1 6AN");
      await page.fill("#phoneNumber", "07400 123456");
    }
    const payWithCard = page.getByRole("button", { name: "Pay with card" });
    if (await payWithCard.isVisible().catch(() => false)) await payWithCard.click();
    await page.fill("#cardNumber", "4242 4242 4242 4242"); // Stripe's test card
    await page.fill("#cardExpiry", "12 / 34");
    await page.fill("#cardCvc", "123");
    for (const [field, value] of [["#billingName", "Ada Obi"], ["#billingPostalCode", "E1 6AN"]]) {
      if (await page.locator(field).isVisible().catch(() => false)) await page.fill(field, value);
    }
    await page.locator("button[type=submit]").first().click();
  }

  test("buy with the test card, join AfroPlus, and open the billing portal", async ({ page }) => {
    const product = await createTestProduct(10); // £3.00 each
    const email = testEmail("stripe");
    try {
      await register(page, email, { name: "Ada Obi" });
      await expect(page).toHaveURL("/");
      await page.goto(`/product/${product.slug}`);
      await page.getByRole("button", { name: "Increase quantity" }).click();
      await page.getByRole("button", { name: "Add to Basket — £6.00" }).click();
      await expect(page.getByRole("button", { name: "✓ Added to basket" })).toBeVisible();

      // £6.00 + £4.99 delivery, always in pounds.
      await page.goto("/cart");
      await page.getByRole("button", { name: "Checkout — £10.99" }).click();
      await payOnStripe(page, { withAddress: true });
      await page.waitForURL(/\/checkout\/success/, { timeout: 60_000 });
      await expect(page.getByText("Your payment of £10.99 was successful.", { exact: false })).toBeVisible();

      const order = await db.order.findFirstOrThrow({ where: { user: { email } } });
      expect(order.status).toBe("PAID");
      expect(order.shippingLine1).toBe("1 High Street");
      expect(order.shippingPhone).toBe("+447400123456");
      expect((await db.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(8);

      // AfroPlus membership.
      await page.goto("/membership");
      await page.getByRole("button", { name: /Get AfroPlus/ }).click();
      await payOnStripe(page, { withAddress: false });
      await page.waitForURL(/\/account\?subscribed=1/, { timeout: 60_000 });
      await expect(page.getByText(/Welcome to AfroPlus/)).toBeVisible();
      const sub = await db.subscription.findFirstOrThrow({ where: { user: { email } } });
      expect([sub.tier, sub.status]).toEqual(["PLUS", "active"]);

      await page.getByRole("button", { name: "My subscription" }).click();
      await page.waitForURL(/billing\.stripe\.com/, { timeout: 30_000 });
    } finally {
      // Deleting the Stripe customer also cancels the test subscription.
      const user = await db.user.findUnique({ where: { email } });
      if (user?.stripeCustomerId) {
        await new Stripe(process.env.STRIPE_SECRET_KEY!).customers.del(user.stripeCustomerId).catch(() => {});
      }
    }
  });
});
