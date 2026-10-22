import { createPasswordResetToken } from "../lib/password-reset";
import {
  db,
  expect,
  formAlert,
  PASSWORD,
  register,
  signIn,
  submitPasswordChange,
  test,
  testEmail,
  testIp,
} from "./helpers";

// Sign-in times are recorded to the second; wait past it so "signed in before the
// password changed" is unambiguous.
const nextSecond = () => new Promise((resolve) => setTimeout(resolve, 1100));

test("the sign-in page links to password reset", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Forgot your password?" }).click();
  await expect(page).toHaveURL("/forgot-password");
});

test("asking for a reset gives the same answer whether or not the account exists", async ({
  page,
  context,
}) => {
  const existing = testEmail("resetreq");
  await register(page, existing);
  await expect(page).toHaveURL("/");
  await context.clearCookies();

  for (const email of [existing, testEmail("nobody")]) {
    await page.goto("/forgot-password");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByRole("status")).toContainText(
      "If there's an account for that email, we've sent a link",
    );
  }
});

test("a reset link sets a new password once and signs out other devices", async ({ browser }) => {
  const email = testEmail("reset");
  const phoneContext = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": testIp() } });
  const phone = await phoneContext.newPage();
  await register(phone, email);
  await expect(phone).toHaveURL("/");
  await nextSecond();

  const user = await db.user.findUniqueOrThrow({ where: { email } });
  const token = await createPasswordResetToken(user.id); // what the emailed link carries

  const laptopContext = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": testIp() } });
  const laptop = await laptopContext.newPage();
  await laptop.goto(`/reset-password?token=${token}`);
  await laptop.getByLabel("New password", { exact: true }).fill("brandnewpass1");
  await laptop.getByLabel("Confirm new password").fill("brandnewpass1");
  await laptop.getByRole("button", { name: "Set new password" }).click();
  await expect(laptop).toHaveURL("/login?reset=1");
  await expect(laptop.getByText("Your password has been changed.")).toBeVisible();

  await signIn(laptop, email, PASSWORD);
  await expect(formAlert(laptop)).toHaveText("Invalid email or password.");
  await signIn(laptop, email, "brandnewpass1");
  await expect(laptop).toHaveURL("/");

  // The phone, signed in before the reset, is signed out.
  await phone.goto("/account");
  await expect(phone).toHaveURL("/login");

  // The link only works once.
  await laptop.goto(`/reset-password?token=${token}`);
  await expect(laptop.getByRole("heading", { name: "This link has expired" })).toBeVisible();

  await phoneContext.close();
  await laptopContext.close();
});

test("a made-up reset link is refused", async ({ page }) => {
  await page.goto("/reset-password?token=not-a-real-token");
  await expect(page.getByRole("heading", { name: "This link has expired" })).toBeVisible();
  await page.getByRole("link", { name: "Send a new link" }).click();
  await expect(page).toHaveURL("/forgot-password");
});

test("changing your password signs out other devices but keeps you signed in", async ({
  browser,
}) => {
  const email = testEmail("pwchange");
  const mainContext = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": testIp() } });
  const main = await mainContext.newPage();
  await register(main, email, { name: "Ada Obi" });
  await expect(main).toHaveURL("/");

  const otherContext = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": testIp() } });
  const other = await otherContext.newPage();
  await signIn(other, email);
  await expect(other).toHaveURL("/");
  await nextSecond();

  await main.goto("/account/settings");
  await submitPasswordChange(main, PASSWORD, "brandnewpass1");
  await expect(main.getByText("Any other devices have been signed out.")).toBeVisible();

  await main.goto("/account");
  await expect(main.getByRole("heading", { name: "Ada Obi" })).toBeVisible();
  await other.goto("/account");
  await expect(other).toHaveURL("/login");

  await mainContext.close();
  await otherContext.close();
});
