import { createTestProduct, db, expect, register, test, testEmail } from "./helpers";

test("the basket never holds more than is in stock", async ({ page }) => {
  const product = await createTestProduct(2);
  await register(page, testEmail("stockcap"));
  await expect(page).toHaveURL("/");

  // The quantity picker stops at the stock level.
  await page.goto(`/product/${product.slug}`);
  await expect(page.getByText("Only 2 left")).toBeVisible();
  const more = page.getByRole("button", { name: "Increase quantity" });
  await more.click();
  await expect(more).toBeDisabled();
  await page.getByRole("button", { name: "Add to Basket — £6.00" }).click();
  await expect(page.getByRole("button", { name: "✓ Added to basket" })).toBeVisible();

  // Trying to add more says why.
  await page.getByRole("button", { name: "Decrease quantity" }).click();
  await page.getByRole("button", { name: "Add to Basket — £3.00" }).click();
  await expect(page.getByRole("status").filter({ hasText: "they're all in your basket" })).toBeVisible();

  // In the basket, "+" stops at the stock level too.
  await page.goto("/cart");
  await expect(page.getByRole("button", { name: "Increase quantity" })).toBeDisabled();
});

test("checkout waits when stock drops below what's in the basket", async ({ page }) => {
  const product = await createTestProduct(3);
  await register(page, testEmail("stockdrop"));
  await expect(page).toHaveURL("/");
  await page.goto(`/product/${product.slug}`);
  await page.getByRole("button", { name: "Increase quantity" }).click();
  await page.getByRole("button", { name: "Add to Basket — £6.00" }).click();
  await expect(page.getByRole("button", { name: "✓ Added to basket" })).toBeVisible();

  // Someone else buys most of it.
  await db.product.update({ where: { id: product.id }, data: { stock: 1 } });

  await page.goto("/cart");
  await expect(page.getByRole("alert").filter({ hasText: "less stock than your basket" })).toBeVisible();
  await expect(page.getByText("Only 1 left", { exact: true })).toBeVisible();
  const checkout = page.getByRole("button", { name: "Update your basket to check out" });
  await expect(checkout).toBeDisabled();

  // The server refuses too, whatever the page shows.
  const res = await page.request.post("/api/checkout");
  expect(res.status()).toBe(409);
  expect((await res.json()).error).toContain("only 1 left");

  // Fixing the quantity clears the warning.
  await page.getByRole("button", { name: "Decrease quantity" }).click();
  await expect(page.getByRole("button", { name: /^Checkout —/ })).toBeEnabled();
  await expect(page.getByText("Only 1 left", { exact: true })).toHaveCount(0);
});

test("sold-out products can't be added", async ({ page }) => {
  const product = await createTestProduct(0);
  await register(page, testEmail("soldout"));
  await expect(page).toHaveURL("/");

  await page.goto(`/product/${product.slug}`);
  await expect(page.getByRole("button", { name: "Out of stock" })).toBeDisabled();

  await page.goto("/?category=Spices");
  await expect(
    page.getByRole("button", { name: `${product.name} is out of stock` }),
  ).toBeDisabled();
});
