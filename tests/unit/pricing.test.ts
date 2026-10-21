import { describe, expect, test } from "vitest";
import { computeTotals, DELIVERY_FEE_CENTS, TIER_LABEL } from "@/lib/pricing";

describe("computeTotals", () => {
  test("pay-as-you-go under £70 pays delivery and no discount", () => {
    expect(computeTotals({ subtotalCents: 5000, tier: "PAYG" })).toEqual({
      subtotalCents: 5000,
      discountCents: 0,
      deliveryCents: DELIVERY_FEE_CENTS,
      creditAppliedCents: 0,
      totalCents: 5000 + DELIVERY_FEE_CENTS,
    });
  });

  test("delivery is free from exactly £70", () => {
    expect(computeTotals({ subtotalCents: 7000, tier: "PAYG" }).deliveryCents).toBe(0);
    expect(computeTotals({ subtotalCents: 6999, tier: "PAYG" }).deliveryCents).toBe(
      DELIVERY_FEE_CENTS,
    );
  });

  test("the free-delivery threshold uses the price after the member discount", () => {
    // £72 with 5% off is £68.40, which is under £70.
    const totals = computeTotals({ subtotalCents: 7200, tier: "MONTHLY" });
    expect(totals.discountCents).toBe(360);
    expect(totals.deliveryCents).toBe(DELIVERY_FEE_CENTS);
    expect(totals.totalCents).toBe(6840 + DELIVERY_FEE_CENTS);
  });

  test("AfroBasic gets 5% off, rounded to the nearest penny", () => {
    expect(computeTotals({ subtotalCents: 333, tier: "MONTHLY" }).discountCents).toBe(17);
  });

  test("AfroPlus gets 10% off and free delivery on any basket", () => {
    const totals = computeTotals({ subtotalCents: 1000, tier: "PLUS" });
    expect(totals.discountCents).toBe(100);
    expect(totals.deliveryCents).toBe(0);
    expect(totals.totalCents).toBe(900);
  });

  test("credit is applied after discount and delivery, and never below zero", () => {
    const totals = computeTotals({ subtotalCents: 1000, tier: "PAYG", creditCents: 5000 });
    expect(totals.creditAppliedCents).toBe(1000 + DELIVERY_FEE_CENTS);
    expect(totals.totalCents).toBe(0);
  });

  test("partial credit reduces the total", () => {
    const totals = computeTotals({ subtotalCents: 8000, tier: "PAYG", creditCents: 500 });
    expect(totals.creditAppliedCents).toBe(500);
    expect(totals.totalCents).toBe(7500);
  });

  test("negative credit is ignored", () => {
    const totals = computeTotals({ subtotalCents: 8000, tier: "PAYG", creditCents: -300 });
    expect(totals.creditAppliedCents).toBe(0);
    expect(totals.totalCents).toBe(8000);
  });

  test("an empty basket costs nothing, including delivery", () => {
    expect(computeTotals({ subtotalCents: 0, tier: "PAYG" }).totalCents).toBe(0);
  });
});

test("plan names match the AfroPantry branding", () => {
  expect(TIER_LABEL).toEqual({
    PAYG: "Pay As You Go",
    MONTHLY: "AfroBasic",
    PLUS: "AfroPlus",
  });
});
