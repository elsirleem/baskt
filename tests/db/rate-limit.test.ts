import { afterAll, beforeEach, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { resetDatabase } from "./reset";

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

test("allows up to the limit, then blocks with a retry time", async () => {
  const rule = { limit: 3, windowSeconds: 60 };
  const allowed = [];
  for (let i = 0; i < 4; i++) allowed.push((await rateLimit("k", rule)).ok);
  expect(allowed).toEqual([true, true, true, false]);

  const blocked = await rateLimit("k", rule);
  expect(blocked.retryAfterSeconds).toBeGreaterThan(55);
  expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
});

test("keys are counted separately", async () => {
  const rule = { limit: 1, windowSeconds: 60 };
  expect((await rateLimit("a", rule)).ok).toBe(true);
  expect((await rateLimit("a", rule)).ok).toBe(false);
  expect((await rateLimit("b", rule)).ok).toBe(true);
});

test("the count starts again once the window has passed", async () => {
  const rule = { limit: 1, windowSeconds: 1 };
  await rateLimit("k", rule);
  expect((await rateLimit("k", rule)).ok).toBe(false);

  await new Promise((resolve) => setTimeout(resolve, 1100));
  expect((await rateLimit("k", rule)).ok).toBe(true);
});

test("simultaneous attempts are all counted", async () => {
  await Promise.all(
    Array.from({ length: 20 }, () => rateLimit("k", { limit: 100, windowSeconds: 60 })),
  );
  expect((await prisma.rateLimit.findUniqueOrThrow({ where: { key: "k" } })).count).toBe(20);
});
