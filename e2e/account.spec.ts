import {
  expect,
  formAlert,
  PASSWORD,
  register,
  signIn,
  submitPasswordChange,
  test,
  testEmail,
} from "./helpers";

test("the profile shows the plan, stats and menu", async ({ page }) => {
  await register(page, testEmail("profile"), { name: "Ada Obi" });
  await expect(page).toHaveURL("/");

  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Ada Obi" })).toBeVisible();
  await expect(page.getByText("Pay As You Go")).toBeVisible();
  await expect(page.getByRole("link", { name: "Upgrade" })).toBeVisible();
  await expect(page.getByText("Orders", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Refer a friend — earn £5/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
});

test("settings: change name and password, then sign in with the new password", async ({
  page,
}) => {
  const email = testEmail("settings");
  await register(page, email, { name: "Ada Obi" });
  await expect(page).toHaveURL("/");

  await page.goto("/account/settings");
  await page.getByLabel("Name", { exact: true }).fill("Ada Okafor");
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.getByText("Name updated.")).toBeVisible();

  await submitPasswordChange(page, "not-my-password", "newpassword1");
  await expect(formAlert(page)).toHaveText("Your current password is incorrect.");

  await submitPasswordChange(page, PASSWORD, "newpassword1");
  await expect(page.getByText("Password changed.")).toBeVisible();

  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Ada Okafor" })).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();

  await signIn(page, email, PASSWORD);
  await expect(formAlert(page)).toHaveText("Invalid email or password.");
  await signIn(page, email, "newpassword1");
  await expect(page).toHaveURL("/");
});

test("email capitals don't matter: one account, sign in either way", async ({ page }) => {
  const email = testEmail("case");
  await register(page, email.toUpperCase());
  await expect(page).toHaveURL("/");
  await page.goto("/account");
  await expect(page.getByText(email, { exact: true })).toBeVisible(); // stored lowercase

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  await signIn(page, email);
  await expect(page).toHaveURL("/");

  await page.context().clearCookies();
  await register(page, email);
  await expect(formAlert(page)).toHaveText("An account with that email already exists.");
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("the bottom tab bar navigates and the header greets the shopper", async ({ page }) => {
    await register(page, testEmail("phone"), { name: "Nife Adeyemi" });
    await expect(page).toHaveURL("/");
    await expect(page.getByText(/Good (morning|afternoon|evening), Nife/)).toBeVisible();

    const recipes = page.getByRole("link", { name: "Recipes", exact: true });
    await recipes.click();
    await expect(page).toHaveURL("/recipes");
    await expect(recipes).toHaveAttribute("aria-current", "page");

    await page.getByRole("link", { name: "Profile", exact: true }).click();
    await expect(page).toHaveURL("/account");
    // The desktop menu's "Fresh Box" link is hidden on phones.
    await expect(page.getByRole("link", { name: "Fresh Box", exact: true })).toBeHidden();
  });
});

test("on desktop the top menu is used instead of the tab bar", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Fresh Box", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Profile", exact: true })).toBeHidden();
});
