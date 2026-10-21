import { describe, expect, test } from "vitest";
import { describeShortfall, stockShortfalls } from "@/lib/stock";
import { canMoveTo, stepIndex } from "@/lib/fulfilment";

describe("stockShortfalls", () => {
  const line = (name: string, quantity: number, stock: number) => ({
    quantity,
    product: { name, stock },
  });

  test("lists only lines that ask for more than is in stock", () => {
    expect(
      stockShortfalls([line("Garri", 2, 5), line("Palm Oil", 3, 2), line("Egusi", 1, 0)]),
    ).toEqual([
      { name: "Palm Oil", requested: 3, available: 2 },
      { name: "Egusi", requested: 1, available: 0 },
    ]);
  });

  test("oversold stock (below zero) counts as none left", () => {
    expect(stockShortfalls([line("Garri", 1, -2)])).toEqual([
      { name: "Garri", requested: 1, available: 0 },
    ]);
  });

  test("a basket within stock has no shortfalls", () => {
    expect(stockShortfalls([line("Garri", 5, 5)])).toEqual([]);
  });

  test("messages say 'sold out' or 'only N left'", () => {
    expect(describeShortfall({ name: "Egusi", requested: 1, available: 0 })).toBe(
      "Egusi is sold out",
    );
    expect(describeShortfall({ name: "Palm Oil", requested: 3, available: 2 })).toBe(
      "Palm Oil: only 2 left",
    );
  });
});

describe("fulfilment steps", () => {
  test("orders only move forward", () => {
    expect(canMoveTo("UNFULFILLED", "PACKED")).toBe(true);
    expect(canMoveTo("PACKED", "SHIPPED")).toBe(true);
    expect(canMoveTo("SHIPPED", "PACKED")).toBe(false);
    expect(canMoveTo("DELIVERED", "SHIPPED")).toBe(false);
    expect(canMoveTo("PACKED", "PACKED")).toBe(false);
  });

  test("skipping a step is allowed", () => {
    expect(canMoveTo("UNFULFILLED", "SHIPPED")).toBe(true);
  });

  test("steps are in delivery order", () => {
    expect(["UNFULFILLED", "PACKED", "SHIPPED", "DELIVERED"].map((s) => stepIndex(s as never))).toEqual([
      0, 1, 2, 3,
    ]);
  });
});
