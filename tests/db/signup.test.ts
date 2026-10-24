import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  confirmSignup,
  createPendingSignup,
  findPendingSignup,
  resendSignupLink,
  sendSignupLink,
  signupEmailForToken,
} from "@/lib/signup";
import { resetDatabase } from "./reset";
import { fakeResend } from "./fake-resend";

const EMAIL = "ada@mail.co.uk";

/** A sign-up as the register form leaves it; returns its link token. */
async function signUp(password = "password123", extra: { refCode?: string } = {}) {
  return createPendingSignup({
    email: EMAIL,
    name: "Ada Obi",
    passwordHash: await bcrypt.hash(password, 4),
    ...extra,
  });
}

beforeEach(resetDatabase);
afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.RESEND_API_KEY;
});
afterAll(() => prisma.$disconnect());

describe("signing up", () => {
  test("no account exists until the emailed link is used", async () => {
    const { sent } = fakeResend();
    const token = await signUp();
    await sendSignupLink(EMAIL, "Ada Obi", token);

    expect(await prisma.user.count()).toBe(0);
    const [email] = sent();
    expect(email.body.subject).toBe("Confirm your email to join AfroPantry");
    expect(email.body.text).toContain(`/confirm-email?token=${token}`);
  });

  test("only a hash of the link is stored", async () => {
    const token = await signUp();
    const stored = await prisma.pendingSignup.findFirstOrThrow();
    expect(stored.tokenHash).not.toContain(token);
    expect(stored.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  test("the link with the right password creates the account, once", async () => {
    const token = await signUp();
    expect(await signupEmailForToken(token)).toBe(EMAIL);

    expect(await confirmSignup(token, "password123")).toBe("created");

    const user = await prisma.user.findUniqueOrThrow({ where: { email: EMAIL } });
    expect(user.name).toBe("Ada Obi");
    expect(await bcrypt.compare("password123", user.passwordHash)).toBe(true);
    expect(user.referralCode).toBeTruthy();
    expect(await prisma.pendingSignup.count()).toBe(0);

    expect(await confirmSignup(token, "password123")).toBe("invalid");
    expect(await signupEmailForToken(token)).toBeNull();
  });

  test("the wrong password doesn't confirm, and the link still works afterwards", async () => {
    const token = await signUp();

    expect(await confirmSignup(token, "not-my-password")).toBe("wrong_password");
    expect(await prisma.user.count()).toBe(0);
    expect(await confirmSignup(token, "password123")).toBe("created");
  });

  test("an expired link doesn't work", async () => {
    const token = await signUp();
    await prisma.pendingSignup.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

    expect(await signupEmailForToken(token)).toBeNull();
    expect(await confirmSignup(token, "password123")).toBe("invalid");
  });

  test("clicking twice at once makes one account", async () => {
    const token = await signUp();

    const results = await Promise.all(Array.from({ length: 5 }, () => confirmSignup(token, "password123")));

    expect(results.filter((r) => r === "created")).toHaveLength(1);
    expect(await prisma.user.count()).toBe(1);
  });

  test("with several sign-ups for one address, the first confirmed wins", async () => {
    // e.g. someone else signed up with Ada's address before she did.
    const theirs = await signUp("someone-elses-pw");
    const hers = await signUp("password123");

    expect(await confirmSignup(hers, "password123")).toBe("created");
    expect(await confirmSignup(theirs, "someone-elses-pw")).toBe("invalid");

    const user = await prisma.user.findUniqueOrThrow({ where: { email: EMAIL } });
    expect(await bcrypt.compare("password123", user.passwordHash)).toBe(true);
  });

  test("someone else's link can't be finished with your password", async () => {
    const theirs = await signUp("someone-elses-pw");
    expect(await confirmSignup(theirs, "password123")).toBe("wrong_password");
  });

  test("a referral code is applied when the account is created", async () => {
    const referrer = await prisma.user.create({
      data: { email: "friend@mail.co.uk", passwordHash: "x", referralCode: "FRIEND" },
    });
    const token = await signUp("password123", { refCode: "friend" });

    await confirmSignup(token, "password123");

    const user = await prisma.user.findUniqueOrThrow({ where: { email: EMAIL } });
    expect(user.referredById).toBe(referrer.id);
  });

  test("an unknown referral code is ignored", async () => {
    const token = await signUp("password123", { refCode: "NOPE" });
    expect(await confirmSignup(token, "password123")).toBe("created");
  });
});

describe("before confirming", () => {
  test("sign-in can tell 'not confirmed yet' from a wrong password", async () => {
    await signUp();

    expect(await findPendingSignup(EMAIL, "password123")).not.toBeNull();
    expect(await findPendingSignup(EMAIL, "wrong-password")).toBeNull();
    expect(await findPendingSignup("nobody@mail.co.uk", "password123")).toBeNull();
  });

  test("sending it again replaces the link", async () => {
    const { sent } = fakeResend();
    const first = await signUp();

    await resendSignupLink(EMAIL);

    const second = sent()[0].body.text.match(/confirm-email\?token=([\w-]+)/)?.[1];
    expect(second).toBeTruthy();
    expect(second).not.toBe(first);
    expect(await confirmSignup(first, "password123")).toBe("invalid");
    expect(await confirmSignup(second!, "password123")).toBe("created");
  });

  test("nothing is sent when no sign-up is waiting", async () => {
    const { fetchSpy } = fakeResend();
    await resendSignupLink("nobody@mail.co.uk");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("expired sign-ups are cleared out as new ones arrive", async () => {
    await signUp();
    await prisma.pendingSignup.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

    await createPendingSignup({ email: "new@mail.co.uk", name: "New", passwordHash: "x" });

    expect(await prisma.pendingSignup.findMany({ select: { email: true } })).toEqual([
      { email: "new@mail.co.uk" },
    ]);
  });
});
