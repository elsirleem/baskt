import { describe, expect, test } from "vitest";
import { isReservedAddress } from "@/lib/email";
import {
  escapeHtml,
  orderConfirmationEmail,
  orderShippedEmail,
  passwordResetEmail,
} from "@/lib/email-templates";

const order = {
  id: "cmabcdefghijklmnopqrstuv",
  currency: "gbp",
  subtotalCents: 1597,
  discountCents: 160,
  deliveryCents: 0,
  creditAppliedCents: 0,
  totalCents: 1437,
  shippingName: "Ada <Obi>",
  shippingLine1: "1 High Street",
  shippingLine2: null,
  shippingCity: "London",
  shippingPostcode: "E1 6AN",
  items: [
    { nameSnapshot: "White Garri (1kg)", quantity: 2, unitPriceCents: 449 },
    { nameSnapshot: "Ground Egusi <b>500g</b>", quantity: 1, unitPriceCents: 699 },
  ],
};

describe("reserved test addresses are never emailed", () => {
  test.each([
    "e2e+x@example.com",
    "a@mail.example.org",
    "b@shop.test",
    "c@nowhere.invalid",
    "d@localhost",
  ])("%s is reserved", (address) => {
    expect(isReservedAddress(address)).toBe(true);
  });

  test.each(["ada@gmail.com", "orders@afropantry.co.uk", "x@example-shop.com"])(
    "%s is a real address",
    (address) => {
      expect(isReservedAddress(address)).toBe(false);
    },
  );
});

test("escapeHtml neutralises markup", () => {
  expect(escapeHtml(`<script>alert("x")</script> & 'y'`)).toBe(
    "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;",
  );
});

describe("order confirmation", () => {
  const email = orderConfirmationEmail({ order, name: "Ada Obi", appUrl: "https://afropantry.test" });

  test("names the order in the subject", () => {
    expect(email.subject).toBe("Your AfroPantry order #OPQRSTUV is confirmed");
  });

  test("lists items, totals and the delivery address", () => {
    expect(email.text).toContain("White Garri (1kg) × 2: £8.98");
    expect(email.text).toContain("Member discount: −£1.60");
    expect(email.text).toContain("Delivery: Free");
    expect(email.text).toContain("Total paid: £14.37");
    expect(email.text).toContain("1 High Street");
    expect(email.text).toContain("Track your order: https://afropantry.test/orders");
    expect(email.html).toContain("Thanks for your order, Ada!");
  });

  test("escapes anything customers or admins typed", () => {
    expect(email.html).not.toContain("<b>500g</b>");
    expect(email.html).toContain("Ground Egusi &lt;b&gt;500g&lt;/b&gt;");
    expect(email.html).toContain("Ada &lt;Obi&gt;");
  });
});

describe("shipped", () => {
  test("includes the carrier and tracking number", () => {
    const email = orderShippedEmail({
      order,
      name: "Ada Obi",
      carrier: "DPD",
      trackingNumber: "DPD123456",
      appUrl: "https://afropantry.test",
    });
    expect(email.subject).toBe("Your AfroPantry order #OPQRSTUV is on its way");
    expect(email.text).toContain("It's been sent with DPD.");
    expect(email.text).toContain("Tracking number: DPD123456");
  });

  test("leaves the tracking line out when there isn't one", () => {
    const email = orderShippedEmail({ order, name: null, carrier: "Own delivery", trackingNumber: null, appUrl: "x" });
    expect(email.text).not.toContain("Tracking number");
  });
});

test("password reset email carries the link and says it expires", () => {
  const email = passwordResetEmail({ name: "Ada Obi", link: "https://afropantry.test/reset-password?token=abc" });
  expect(email.subject).toBe("Reset your AfroPantry password");
  expect(email.text).toContain("https://afropantry.test/reset-password?token=abc");
  expect(email.text).toContain("expires in 1 hour");
  expect(email.html).toContain('href="https://afropantry.test/reset-password?token=abc"');
});
