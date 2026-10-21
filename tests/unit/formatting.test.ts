import { describe, expect, test } from "vitest";
import { formatPrice, formatWholePrice, greeting, productLabel } from "@/lib/utils";
import { categoryIcon } from "@/lib/categories";
import { nextDeliveryDate, weekdayLabel } from "@/lib/freshbox";

describe("prices", () => {
  test("formatPrice shows pounds and pence", () => {
    expect(formatPrice(499)).toBe("£4.99");
    expect(formatPrice(7000)).toBe("£70.00");
  });

  test("formatWholePrice rounds down to whole pounds for compact stats", () => {
    expect(formatWholePrice(21499)).toBe("£214");
    expect(formatWholePrice(500)).toBe("£5");
    expect(formatWholePrice(0)).toBe("£0");
  });

  test("productLabel adds the pack size when there is one", () => {
    expect(productLabel({ name: "White Garri", size: "1kg" })).toBe("White Garri (1kg)");
    expect(productLabel({ name: "Puna Yam", size: null })).toBe("Puna Yam");
  });
});

describe("greeting (UK time, including summer time)", () => {
  test.each([
    ["2026-10-21T07:00:00Z", "Good morning"], // 08:00 BST
    ["2026-10-21T11:30:00Z", "Good afternoon"], // 12:30 BST
    ["2026-10-21T17:30:00Z", "Good evening"], // 18:30 BST
    ["2026-12-01T17:30:00Z", "Good afternoon"], // 17:30 GMT
    ["2026-12-01T23:59:00Z", "Good evening"],
  ])("%s → %s", (iso, expected) => {
    expect(greeting(new Date(iso))).toBe(expected);
  });
});

describe("Fresh Box delivery dates", () => {
  // Monday 19 October 2026, in local time.
  const monday = new Date(2026, 9, 19, 15, 30);

  test("leaves at least two days to pack", () => {
    // Earliest is Wednesday the 21st.
    expect(nextDeliveryDate(3, monday)).toEqual(new Date(2026, 9, 21));
  });

  test("rolls over to next week when the day has passed", () => {
    expect(nextDeliveryDate(1, monday)).toEqual(new Date(2026, 9, 26)); // next Monday
    expect(nextDeliveryDate(2, monday)).toEqual(new Date(2026, 9, 27)); // next Tuesday
  });

  test("weekday labels fall back to Tuesday", () => {
    expect(weekdayLabel(1)).toBe("Monday");
    expect(weekdayLabel(9)).toBe("Tuesday");
  });
});

test("category icons fall back to a basket for new categories", () => {
  expect(categoryIcon("Spices")).toBe("🌶️");
  expect(categoryIcon("Drinks")).toBe("🛒");
});
