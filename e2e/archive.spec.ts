import { createTestProduct, db, expect, register, registerAdmin, test, testEmail, testIp } from "./helpers";

test("archiving hides a product from the shop until it's restored", async ({ browser }) => {
  const product = await createTestProduct(5);

  // A shopper already has it in their basket.
  const customer = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": testIp() } });
  const shopper = await customer.newPage();
  await register(shopper, testEmail("archive"));
  await expect(shopper).toHaveURL("/");
  await shopper.goto(`/product/${product.slug}`);
  await shopper.getByRole("button", { name: /Add to Basket/ }).click();
  await expect(shopper.getByRole("button", { name: "✓ Added to basket" })).toBeVisible();

  // Admin archives it.
  const staff = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": testIp() } });
  const admin = await staff.newPage();
  await registerAdmin(admin);
  await admin.goto("/admin");
  await admin.waitForLoadState("networkidle"); // let the buttons hydrate before clicking
  const row = admin.getByRole("row").filter({ hasText: product.name });
  await row.getByRole("button", { name: "Archive" }).click();
  await expect(row.getByText("Archived", { exact: true })).toBeVisible();

  // Gone from the shop, explained on its page, and blocked at checkout.
  await shopper.goto("/?category=Spices");
  await expect(shopper.getByRole("link", { name: product.name, exact: true })).toHaveCount(0);
  await shopper.goto(`/product/${product.slug}`);
  await expect(shopper.getByText("We no longer sell this product.")).toBeVisible();
  await shopper.goto("/cart");
  await expect(shopper.getByText("No longer available — please remove it")).toBeVisible();
  await expect(shopper.getByRole("button", { name: "Update your basket to check out" })).toBeDisabled();

  // Restored: back in the shop.
  await admin.goto("/admin");
  await admin.waitForLoadState("networkidle"); // let the buttons hydrate before clicking
  await row.getByRole("button", { name: "Restore" }).click();
  await expect(row.getByText("Archived", { exact: true })).toHaveCount(0);
  await shopper.goto("/?category=Spices");
  await expect(shopper.getByRole("link", { name: product.name, exact: true })).toBeVisible();

  await customer.close();
  await staff.close();
});

test("ordered products can only be archived; never-ordered ones can be deleted", async ({ page }) => {
  const email = await registerAdmin(page);
  const ordered = await createTestProduct(5);
  const unused = await createTestProduct(5);
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  await db.order.create({
    data: {
      userId: user.id,
      status: "PAID",
      subtotalCents: 300,
      totalCents: 300,
      items: { create: [{ productId: ordered.id, quantity: 1, unitPriceCents: 300, nameSnapshot: ordered.name }] },
    },
  });

  await page.goto("/admin");
  await page.waitForLoadState("networkidle");
  const orderedRow = page.getByRole("row").filter({ hasText: ordered.name });
  await expect(orderedRow.getByRole("button", { name: "Archive" })).toBeVisible();
  await expect(orderedRow.getByRole("button", { name: "Delete" })).toHaveCount(0);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("row").filter({ hasText: unused.name }).getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("row").filter({ hasText: unused.name })).toHaveCount(0);
  expect(await db.product.count({ where: { id: unused.id } })).toBe(0);
});
