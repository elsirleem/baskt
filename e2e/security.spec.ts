import {
  expect,
  formAlert,
  PASSWORD,
  register,
  signIn,
  stripeConfigured,
  submitPasswordChange,
  test,
  testEmail,
  testIp,
} from "./helpers";

test("sign-in locks an account after 10 attempts, but not the whole network", async ({
  page,
  context,
}) => {
  const email = testEmail("lock");
  await register(page, email); // signing up signs in: attempt 1
  await expect(page).toHaveURL("/");
  await context.clearCookies();

  for (let attempt = 2; attempt <= 10; attempt++) {
    await signIn(page, email, "wrong-password");
    await expect(formAlert(page)).toHaveText("Invalid email or password.");
  }
  await signIn(page, email, "wrong-password");
  await expect(formAlert(page)).toHaveText(/Too many sign-in attempts/);

  // Even the right password is refused while the account is locked...
  await signIn(page, email, PASSWORD);
  await expect(formAlert(page)).toHaveText(/Too many sign-in attempts/);

  // ...but someone else on the same network can still get in.
  await register(page, testEmail("neighbour"));
  await expect(page).toHaveURL("/");
});

test("sign-ups are limited to 5 per network per hour", async ({ browser }) => {
  const ip = testIp();
  for (let i = 1; i <= 6; i++) {
    const context = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": ip } });
    const page = await context.newPage();
    await register(page, testEmail(`signup${i}`));
    if (i <= 5) {
      await expect(page).toHaveURL("/");
    } else {
      await expect(formAlert(page)).toHaveText(/Too many accounts created from this network/);
    }
    await context.close();
  }
});

test("password changes are limited to 5 attempts", async ({ page }) => {
  await register(page, testEmail("pwlimit"));
  await expect(page).toHaveURL("/");
  await page.goto("/account/settings");

  for (let attempt = 1; attempt <= 6; attempt++) {
    await submitPasswordChange(page, "not-my-password", "newpassword1");
    await expect(formAlert(page)).toHaveText(
      attempt <= 5 ? "Your current password is incorrect." : /Too many attempts/,
    );
  }
});

test("checkout is limited to 10 attempts per 10 minutes", async ({ page }) => {
  test.skip(stripeConfigured(), "would create real Stripe test sessions");
  await register(page, testEmail("cklimit"));
  await expect(page).toHaveURL("/");

  for (let attempt = 1; attempt <= 10; attempt++) {
    expect((await page.request.post("/api/checkout")).status()).not.toBe(429);
  }
  const blocked = await page.request.post("/api/checkout");
  expect(blocked.status()).toBe(429);
  expect(Number(blocked.headers()["retry-after"])).toBeGreaterThan(0);
  expect((await blocked.json()).error).toMatch(/Too many checkout attempts/);
});

test("security headers are sent", async ({ request }) => {
  const headers = (await request.get("/")).headers();
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["strict-transport-security"]).toContain("max-age=");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toBeTruthy();
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("pages work under the security policy (no blocked scripts, images or fonts)", async ({
  page,
}) => {
  const problems: string[] = [];
  page.on("console", (m) => {
    if (/Content Security Policy|Refused to/i.test(m.text())) problems.push(m.text());
  });
  page.on("pageerror", (e) => problems.push(e.message));

  await register(page, testEmail("csp"));
  await expect(page).toHaveURL("/");
  for (const path of [
    "/product/red-palm-oil-1l",
    "/recipes",
    "/recipes/egusi-soup",
    "/cart",
    "/membership",
    "/account",
    "/account/settings",
    "/fresh",
    "/orders",
    "/wishlist",
    "/",
  ]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }

  const loadedImages = await page.$$eval(
    "img",
    (imgs) => imgs.filter((img) => img.complete && img.naturalWidth > 0).length,
  );
  expect(loadedImages).toBeGreaterThan(0);
  const fonts = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family);
  });
  expect(fonts.some((f) => /Fraunces/.test(f))).toBe(true);
  expect(problems).toEqual([]);
});
