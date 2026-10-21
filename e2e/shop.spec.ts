import { expect, register, stripeConfigured, test, testEmail } from "./helpers";

test("visitors can browse the catalogue and filter by category", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Save 10% on every order" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Our Label/ })).toBeVisible();

  await page.getByRole("link", { name: "Spices", exact: true }).click();
  await expect(page).toHaveURL(/category=Spices/);
  await expect(page.getByRole("heading", { level: 1, name: "Spices" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Cameroon Pepper" })).toBeVisible();
});

test("search finds products", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox", { name: "Search products" }).fill("egusi");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: /Results for .egusi./ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ground Egusi" })).toBeVisible();
});

test("a shopper can fill a basket and sees the right totals", async ({ page }) => {
  await register(page, testEmail("shop"));
  await expect(page).toHaveURL("/");

  // Product page: choose 3 and add them.
  await page.goto("/product/red-palm-oil-1l");
  await page.getByRole("button", { name: "Increase quantity" }).click();
  await page.getByRole("button", { name: "Increase quantity" }).click();
  await page.getByRole("button", { name: "Add to Basket — £26.97" }).click();
  await expect(page.getByRole("button", { name: "✓ Added to basket" })).toBeVisible();

  // The "+" on a product card.
  await page.goto("/");
  const plus = page.getByRole("button", {
    name: "Add Indomie Instant Noodles — Chicken to basket",
  });
  await plus.click();
  await expect(plus).toHaveText("✓");

  // A recipe's "Add all" (egusi, palm oil, crayfish, garri).
  await page.goto("/recipes/egusi-soup");
  await page.getByRole("button", { name: "Add all 4 to basket" }).click();
  await expect(page).toHaveURL("/cart");

  // 4 × £8.99 + £3.49 + £6.99 + £5.99 + £4.49 = £56.92, plus £4.99 delivery.
  const summary = page.locator("aside");
  await expect(summary).toContainText(/Subtotal\s*£56\.92/);
  await expect(summary).toContainText(/Delivery\s*£4\.99/);
  await expect(summary).toContainText(/Total\s*£61\.91/);
  await expect(page.getByRole("button", { name: "Checkout — £61.91" })).toBeVisible();
  await expect(page.getByText("£13.08 away from free delivery")).toBeVisible();
  await expect(page.getByRole("link", { name: "Basket, 8 items" })).toBeVisible();
});

test("checkout explains when payments aren't set up", async ({ page }) => {
  test.skip(stripeConfigured(), "Stripe keys are configured");
  await register(page, testEmail("checkout"));
  await expect(page).toHaveURL("/");
  await page.goto("/product/white-garri-1kg");
  await page.getByRole("button", { name: /Add to Basket/ }).click();
  await expect(page.getByRole("button", { name: "✓ Added to basket" })).toBeVisible();

  await page.goto("/cart");
  await page.getByRole("button", { name: /Checkout —/ }).click();
  await expect(page.getByText(/Stripe is not configured/)).toBeVisible();
});

test("non-members see the AfroPlus recipe as locked", async ({ page }) => {
  await register(page, testEmail("recipe"));
  await expect(page).toHaveURL("/");
  await page.goto("/recipes/suya-skewers");
  await expect(page.getByRole("heading", { name: "This is an AfroPlus recipe" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Ingredients/ })).toHaveCount(0);
});
