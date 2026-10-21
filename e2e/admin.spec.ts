import { db, expect, formAlert, register, registerAdmin, stamp, test, testEmail } from "./helpers";

const IMAGE = "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&q=80";

/** Fills the parts of the new-product form every test needs. */
async function fillProduct(page: import("@playwright/test").Page, name: string) {
  await page.goto("/admin/products/new");
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Description").fill("Added by an end-to-end test.");
  await page.getByLabel("Price (in pounds)").fill("2.50");
  await page.getByLabel("Pack size").fill("250g");
  await page.getByLabel("Stock").fill("12");
}

test("non-admins are sent away from the admin area", async ({ page }) => {
  await register(page, testEmail("notadmin"));
  await expect(page).toHaveURL("/");
  await page.goto("/admin");
  await expect(page).toHaveURL("/");
});

test("an admin can add an own-brand product in a new category", async ({ page }) => {
  await registerAdmin(page);
  const name = `E2E Hibiscus Drink ${stamp()}`;

  await page.goto("/admin");
  await page.getByRole("link", { name: "+ New product" }).click();
  await fillProduct(page, name);
  await page.getByLabel("Badges").fill("Small batch, Test badge");
  await page.getByLabel("Category").selectOption({ label: "+ New category…" });
  await page.getByLabel("New category name").fill("E2E Drinks");
  await page.getByLabel("Image link").fill(IMAGE);
  await page.getByLabel(/Our Brand/).check();
  await page.getByRole("button", { name: "Create product" }).click();

  await expect(page).toHaveURL("/admin");
  await expect(page.getByText(name)).toBeVisible();

  await page.goto("/?brand=ours");
  await expect(page.getByRole("link", { name })).toBeVisible();
  await page.getByRole("link", { name }).click();
  await expect(page.getByText("🏷️ Private Label")).toBeVisible();
  await expect(page.getByText("✓ Small batch")).toBeVisible();
  await expect(page.getByText("250g · Our Brand · E2E Drinks")).toBeVisible();
});

test("bad image links are rejected and nothing typed is lost", async ({ page }) => {
  await registerAdmin(page);
  const name = `E2E Bad Link ${stamp()}`;
  await fillProduct(page, name);
  await page.getByLabel("Category").selectOption("Legumes");
  await page.getByLabel(/Our Brand/).check();
  const image = page.getByLabel("Image link");
  await image.fill("https://example.com/photo.jpg");

  // The browser stops it first...
  await page.getByRole("button", { name: "Create product" }).click();
  expect(await image.evaluate((el: HTMLInputElement) => el.validity.patternMismatch)).toBe(true);
  await expect(page).toHaveURL("/admin/products/new");

  // ...and the server rejects it too, keeping everything that was typed.
  await page.locator("form").evaluate((form: HTMLFormElement) => (form.noValidate = true));
  await page.getByRole("button", { name: "Create product" }).click();
  await expect(formAlert(page)).toContainText("Image links must come from images.unsplash.com");
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue(name);
  await expect(page.getByLabel("Description")).toHaveValue("Added by an end-to-end test.");
  await expect(page.getByLabel("Category")).toHaveValue("Legumes");
  await expect(page.getByLabel(/Our Brand/)).toBeChecked();
  expect(await db.product.count({ where: { name } })).toBe(0);
});

test("a new category typed in different case reuses the existing one", async ({ page }) => {
  await registerAdmin(page);
  const name = `E2E Pepper Mix ${stamp()}`;
  await fillProduct(page, name);
  await page.getByLabel("Category").selectOption({ label: "+ New category…" });
  await page.getByLabel("New category name").fill("spices");
  await page.getByLabel("Image link").fill(IMAGE);
  await page.getByRole("button", { name: "Create product" }).click();
  await expect(page).toHaveURL("/admin");

  expect((await db.product.findFirstOrThrow({ where: { name } })).category).toBe("Spices");
});

test("editing keeps the category and can turn Our Brand off", async ({ page }) => {
  await registerAdmin(page);
  const name = `E2E Zobo Leaves ${stamp()}`;
  await fillProduct(page, name);
  await page.getByLabel("Category").selectOption("Pantry");
  await page.getByLabel("Image link").fill(IMAGE);
  await page.getByLabel(/Our Brand/).check();
  await page.getByRole("button", { name: "Create product" }).click();
  await expect(page).toHaveURL("/admin");

  const product = await db.product.findFirstOrThrow({ where: { name } });
  await page.goto(`/admin/products/${product.id}`);
  await expect(page.getByLabel("Category")).toHaveValue("Pantry");
  await expect(page.getByLabel(/Our Brand/)).toBeChecked();
  await page.getByLabel(/Our Brand/).uncheck();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL("/admin");

  expect((await db.product.findUniqueOrThrow({ where: { id: product.id } })).isPrivateLabel).toBe(
    false,
  );
});
