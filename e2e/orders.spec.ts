import { createOrder, expect, register, registerAdmin, test, testEmail, testIp } from "./helpers";

test("an admin packs, ships and delivers an order, and the customer can follow it", async ({
  browser,
}) => {
  // Customer with a paid order.
  const customer = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": testIp() } });
  const shopper = await customer.newPage();
  const email = testEmail("tracking");
  await register(shopper, email, { name: "Ada Obi" });
  await expect(shopper).toHaveURL("/");
  const order = await createOrder(email);
  const orderNo = `#${order.id.slice(-8).toUpperCase()}`;

  await shopper.goto("/account");
  await expect(shopper.getByRole("link", { name: "Track your order · Order received" })).toBeVisible();

  // Admin finds it in "To fulfil" and works through the steps.
  const staff = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": testIp() } });
  const admin = await staff.newPage();
  await registerAdmin(admin);
  await admin.goto("/admin/orders");
  await expect(admin.getByRole("link", { name: /^To fulfil \(\d+\)$/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await admin.getByRole("link", { name: orderNo }).click();
  await expect(admin.getByRole("heading", { name: `Order ${orderNo}` })).toBeVisible();
  await expect(admin.getByText("1 High Street")).toBeVisible();
  await expect(admin.getByText("+447700900123")).toBeVisible();

  await admin.getByRole("button", { name: "Mark as packed" }).click();
  await expect(admin.getByRole("button", { name: "Mark as packed" })).toHaveCount(0);

  await admin.getByLabel("Delivered by").selectOption("DPD");
  await admin.getByLabel(/Tracking number/).fill("DPD123456");
  await admin.getByRole("button", { name: "Mark as shipped" }).click();
  await expect(admin.getByText("Sent with DPD")).toBeVisible();

  await admin.goto("/admin/orders?view=shipped");
  await expect(admin.getByRole("link", { name: orderNo })).toBeVisible();

  // Customer sees it on the way, with the tracking number.
  await shopper.goto("/orders");
  const card = shopper.locator(`#order-${order.id}`);
  await expect(card.getByText("On its way").first()).toBeVisible();
  await expect(card.getByText("DPD123456")).toBeVisible();

  // Delivered: the profile stops showing it as active.
  await admin.goto(`/admin/orders/${order.id}`);
  await admin.getByRole("button", { name: "Mark as delivered" }).click();
  await expect(admin.getByText("Delivered. Nothing left to do.")).toBeVisible();

  await shopper.goto("/account");
  await expect(shopper.getByRole("link", { name: /Track your order/ })).toHaveCount(0);
  await shopper.goto("/orders");
  await expect(card.locator("[aria-current=step]")).toContainText("Delivered");

  await customer.close();
  await staff.close();
});

test("only paid orders appear in a customer's order history", async ({ page }) => {
  const email = testEmail("history");
  await register(page, email);
  await expect(page).toHaveURL("/");
  const unpaid = await createOrder(email, "PENDING");
  const processing = await createOrder(email, "AWAITING_PAYMENT");

  await page.goto("/orders");
  await expect(page.getByRole("heading", { name: "No orders yet" })).toBeVisible();

  const paid = await createOrder(email);
  await page.goto("/orders");
  await expect(page.locator(`#order-${paid.id}`)).toBeVisible();
  for (const order of [unpaid, processing]) {
    await expect(page.locator(`#order-${order.id}`)).toHaveCount(0);
  }
  await expect(page.getByText(/Awaiting payment|Payment processing/)).toHaveCount(0);
});

test("customers can't open the admin orders pages", async ({ page }) => {
  await register(page, testEmail("snoop"));
  await expect(page).toHaveURL("/");
  await page.goto("/admin/orders");
  await expect(page).toHaveURL("/");
});
