import { db, expect, register, test, testEmail, testIp } from "./helpers";

const LINK = /\/wishlist\/[\w-]{22}$/;

test("a wishlist can be shared by private link, then unshared", async ({ browser }) => {
  // Ada saves two products and shares her wishlist.
  const adaContext = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": testIp() } });
  await adaContext.grantPermissions(["clipboard-read", "clipboard-write"]);
  const ada = await adaContext.newPage();
  const adaEmail = testEmail("sharer");
  await register(ada, adaEmail, { name: "Ada Obi" });
  await expect(ada).toHaveURL("/");
  const user = await db.user.findUniqueOrThrow({ where: { email: adaEmail } });
  const products = await db.product.findMany({
    where: { slug: { in: ["white-garri-1kg", "ground-egusi-500g"] } },
  });
  await db.wishlistItem.createMany({
    data: products.map((product) => ({ userId: user.id, productId: product.id })),
  });

  await ada.goto("/wishlist");
  await ada.getByRole("button", { name: "Create a share link" }).click();
  const linkField = ada.getByLabel("Share link");
  await expect(linkField).toHaveValue(LINK);
  const link = await linkField.inputValue();
  await ada.getByRole("button", { name: "Copy link" }).click();
  await expect(ada.getByRole("button", { name: "Copied ✓" })).toBeVisible();
  expect(await ada.evaluate(() => navigator.clipboard.readText())).toBe(link);

  // Someone without an account sees the products and Ada's first name, nothing more.
  const guestContext = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": testIp() } });
  const guest = await guestContext.newPage();
  await guest.goto(link);
  await expect(guest.getByRole("heading", { name: "Ada's wishlist 🤍" })).toBeVisible();
  for (const product of products) {
    await expect(guest.getByRole("link", { name: product.name })).toBeVisible();
  }
  await expect(guest.getByText("Obi")).toHaveCount(0);
  await expect(guest.getByText(adaEmail)).toHaveCount(0);
  await expect(guest.getByText(/to add these to your basket/)).toBeVisible();

  // A signed-in friend can put everything in their own basket.
  const friendContext = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": testIp() } });
  const friend = await friendContext.newPage();
  await register(friend, testEmail("friend"));
  await expect(friend).toHaveURL("/");
  await friend.goto(link);
  await friend.getByRole("button", { name: "Add all 2 to basket" }).click();
  await expect(friend).toHaveURL("/cart");
  for (const product of products) {
    await expect(friend.getByText(product.name).first()).toBeVisible();
  }

  // Ada turns sharing off: the link stops working. Sharing again makes a new one.
  await ada.getByRole("button", { name: "Stop sharing" }).click();
  await expect(ada.getByRole("button", { name: "Create a share link" })).toBeVisible();
  expect((await guest.goto(link))?.status()).toBe(404);

  await ada.getByRole("button", { name: "Create a share link" }).click();
  await expect(linkField).toHaveValue(LINK);
  expect(await linkField.inputValue()).not.toBe(link);

  await adaContext.close();
  await guestContext.close();
  await friendContext.close();
});

test("a made-up wishlist link isn't found", async ({ page }) => {
  expect((await page.goto("/wishlist/not-a-real-link"))?.status()).toBe(404);
});
