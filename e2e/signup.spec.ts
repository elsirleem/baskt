import {
  db,
  expect,
  formAlert,
  PASSWORD,
  register,
  signIn,
  signupLink,
  test,
  testEmail,
} from "./helpers";
import { emailConfirmationRequired } from "../lib/env";

test.skip(!emailConfirmationRequired(), "email confirmation is switched off");

const confirmationEmails = (email: string) =>
  db.emailLog.count({ where: { to: email, kind: "signup_confirmation" } });

test("the account is only created once the emailed link is used", async ({ page }) => {
  const email = testEmail("confirm");
  await register(page, email, { name: "Ada Obi", confirm: false });
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
  expect(await db.user.count({ where: { email } })).toBe(0);

  // Signing in first says what's missing, and sends a fresh link.
  await signIn(page, email);
  await expect(formAlert(page)).toHaveText(/Please confirm your email first/);
  await expect.poll(() => confirmationEmails(email)).toBe(2);

  const token = await signupLink(email);
  await page.goto(`/confirm-email?token=${token}`);
  await expect(page.getByRole("heading", { name: "Confirm your email" })).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(email);

  await page.getByLabel("Password", { exact: true }).fill("not-my-password");
  await page.getByRole("button", { name: "Confirm and sign in" }).click();
  await expect(formAlert(page)).toHaveText("That's not the password you chose when you signed up.");

  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Confirm and sign in" }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Ada Obi" })).toBeVisible();

  // The link works once.
  await page.goto(`/confirm-email?token=${token}`);
  await expect(page.getByRole("heading", { name: "This link has expired" })).toBeVisible();
});

test("the check-your-inbox screen can send the link again", async ({ page }) => {
  const email = testEmail("resend");
  await register(page, email, { confirm: false });
  await page.getByRole("button", { name: "Send it again" }).click();
  await expect(page.getByRole("status")).toHaveText("We've sent another link. Use the newest email.");
  await expect.poll(() => confirmationEmails(email)).toBe(2);
});

test("a made-up confirmation link is refused", async ({ page }) => {
  await page.goto("/confirm-email?token=not-a-real-token");
  await expect(page.getByRole("heading", { name: "This link has expired" })).toBeVisible();
  await page.getByRole("link", { name: "Sign up again" }).click();
  await expect(page).toHaveURL("/register");
});
