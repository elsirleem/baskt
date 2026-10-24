import { afterEach, describe, expect, test } from "vitest";
import type Stripe from "stripe";
import { appUrl, configuredEnv, emailConfirmationRequired } from "@/lib/env";
import { isAllowedImageUrl, publicImageUrl } from "@/lib/images";
import { clientIp } from "@/lib/rate-limit";
import { shippingFromSession } from "@/lib/orders";

describe("configuredEnv treats .env.example placeholders as unset", () => {
  test.each([undefined, "", "sk_test_...", "price_...", "replace_me"])("%j → unset", (value) => {
    expect(configuredEnv(value)).toBeUndefined();
  });

  test("real values pass through", () => {
    expect(configuredEnv("sk_test_51AbCdEf")).toBe("sk_test_51AbCdEf");
  });
});

describe("isAllowedImageUrl", () => {
  test.each([
    "https://images.unsplash.com/photo-1?w=600",
    "https://abc123.public.blob.vercel-storage.com/products/0123456789abcdef01234567.jpg",
    "/uploads/0123456789abcdef01234567.webp",
  ])("accepts %s", (url) => {
    expect(isAllowedImageUrl(url)).toBe(true);
  });

  test.each([
    "http://images.unsplash.com/photo-1",
    "https://example.com/photo.jpg",
    "https://images.unsplash.com.evil.example/photo.jpg",
    "https://public.blob.vercel-storage.com/x.jpg",
    "https://abc.public.blob.vercel-storage.com.evil.example/x.jpg",
    "/uploads/../.env",
    "/uploads/0123456789abcdef01234567.svg",
    "//evil.example/uploads/0123456789abcdef01234567.jpg",
    "not a url",
  ])("rejects %s", (url) => {
    expect(isAllowedImageUrl(url)).toBe(false);
  });
});

describe("publicImageUrl (photos shown on Stripe's checkout page)", () => {
  test("keeps https links", () => {
    expect(publicImageUrl("https://images.unsplash.com/p", "http://localhost:3000")).toBe(
      "https://images.unsplash.com/p",
    );
  });

  test("makes uploaded photos absolute on the live site", () => {
    expect(publicImageUrl("/uploads/a.jpg", "https://afropantry.co.uk")).toBe(
      "https://afropantry.co.uk/uploads/a.jpg",
    );
  });

  test("leaves out photos Stripe can't reach", () => {
    expect(publicImageUrl("/uploads/a.jpg", "http://localhost:3000")).toBeUndefined();
  });
});

describe("clientIp", () => {
  test("uses the first X-Forwarded-For entry", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": " 203.0.113.7 , 10.0.0.1" }))).toBe(
      "203.0.113.7",
    );
  });

  test("falls back to X-Real-IP, then 'unknown'", () => {
    expect(clientIp(new Headers({ "x-real-ip": "203.0.113.9" }))).toBe("203.0.113.9");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("shippingFromSession", () => {
  const session = (extra: object) => extra as unknown as Stripe.Checkout.Session;

  test("maps Stripe's collected address and phone onto order columns", () => {
    expect(
      shippingFromSession(
        session({
          collected_information: {
            shipping_details: {
              name: "Ada Obi",
              address: {
                line1: "1 High Street",
                line2: "Flat 2",
                city: "London",
                postal_code: "E1 6AN",
                country: "GB",
                state: null,
              },
            },
          },
          customer_details: { phone: "+447700900123" },
        }),
      ),
    ).toEqual({
      shippingName: "Ada Obi",
      shippingPhone: "+447700900123",
      shippingLine1: "1 High Street",
      shippingLine2: "Flat 2",
      shippingCity: "London",
      shippingPostcode: "E1 6AN",
      shippingCountry: "GB",
    });
  });

  test("returns nothing when no address was collected", () => {
    expect(shippingFromSession(session({ collected_information: null }))).toBeUndefined();
  });
});

describe("appUrl", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  test("uses NEXT_PUBLIC_APP_URL first, without a trailing slash", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://afropantry.co.uk/";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "baskt.vercel.app";
    expect(appUrl()).toBe("https://afropantry.co.uk");
  });

  test("falls back to the Vercel production domain", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "baskt.vercel.app";
    expect(appUrl()).toBe("https://baskt.vercel.app");
  });

  test("falls back to localhost", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    expect(appUrl()).toBe("http://localhost:3000");
  });
});

describe("emailConfirmationRequired", () => {
  const saved = process.env.REQUIRE_EMAIL_CONFIRMATION;
  afterEach(() => {
    if (saved === undefined) delete process.env.REQUIRE_EMAIL_CONFIRMATION;
    else process.env.REQUIRE_EMAIL_CONFIRMATION = saved;
  });

  test.each([undefined, "", "true", "yes"])("%j → required", (value) => {
    if (value === undefined) delete process.env.REQUIRE_EMAIL_CONFIRMATION;
    else process.env.REQUIRE_EMAIL_CONFIRMATION = value;
    expect(emailConfirmationRequired()).toBe(true);
  });

  test.each(["false", "FALSE", " false "])("%j → off", (value) => {
    process.env.REQUIRE_EMAIL_CONFIRMATION = value;
    expect(emailConfirmationRequired()).toBe(false);
  });
});
