# 🧺 Baskt — Taste of home. African essentials, delivered.

A subscription-first African grocery platform for the UK diaspora: browse authentic
staples, subscribe for member savings, cook with in-app recipes, refer friends for credit,
and check out securely with Stripe. Built as a PWA-ready Next.js web app.

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions) + TypeScript, PWA manifest
- **Tailwind CSS v4**
- **PostgreSQL** + **Prisma 7** (via the `@prisma/adapter-pg` driver adapter)
- **Auth.js (NextAuth v5)** — email/password credentials, bcrypt-hashed, JWT sessions
- **Stripe** — one-off **Checkout** for baskets + recurring **Billing** for memberships, webhooks

## Features

| Feature | Where |
| --- | --- |
| Catalogue: 28 African SKUs (6 Baskt private-label), search, category filter | `app/page.tsx`, `lib/data.ts` |
| Product detail pages | `app/product/[slug]/page.tsx` |
| Accounts: register / sign in / sign out | `app/login`, `app/register`, `lib/auth.ts` |
| Basket: add / update qty / remove, GBP, member pricing | `app/cart`, `lib/actions/cart.ts` |
| Wishlist | `app/wishlist`, `lib/actions/wishlist.ts` |
| **Membership tiers** (PAYG / Monthly £4.99 / Plus £39.99-yr) via Stripe Billing | `app/membership`, `lib/billing.ts`, `lib/subscription.ts` |
| **Member benefits**: 5%/10% off, Plus free delivery, premium recipes | `lib/pricing.ts` |
| **Recipe library** with tappable ingredients → basket (premium gated to Plus) | `app/recipes`, `lib/actions/cart.ts` |
| **Referral engine**: per-user code, £5 credit each way on first order | `lib/referral.ts`, `lib/orders.ts`, `app/account` |
| Free delivery over £70 (always for Plus) | `lib/pricing.ts` |
| Secure checkout + order records (discount/delivery/credit snapshot) | `app/api/checkout`, `app/api/webhooks/stripe` |
| Order history | `app/orders/page.tsx` |
| Admin product management (CRUD) | `app/admin`, `lib/actions/admin.ts` |
| Account dashboard (tier, credit, referrals) | `app/account/page.tsx` |

## Getting started

### 1. Start Postgres

```bash
docker compose up -d
```

### 2. Configure environment

`.env` ships with working local defaults for the database and auth. For payments and
memberships, add your Stripe [test keys](https://dashboard.stripe.com/test/apikeys):

```env
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."     # from `stripe listen`
STRIPE_PRICE_MONTHLY="price_..."      # from `npm run setup-stripe`
STRIPE_PRICE_PLUS="price_..."
```

Also generate a real auth secret with `npx auth secret` → `AUTH_SECRET`.

### 3. Set up the database

```bash
npm run db:push    # create tables
npm run db:seed    # 28 African SKUs + 4 Nigerian recipes
```

### 4. (For memberships) provision Stripe prices

```bash
npm run setup-stripe   # creates the Monthly/Plus prices, prints the IDs to paste into .env
```

### 5. Run

```bash
npm run dev        # http://localhost:3000
```

## How the money works

- **Prices** are stored in integer pence (`priceCents`), currency GBP.
- **Member discount** (5% Monthly / 10% Plus) + **delivery** (free over £70, always free for
  Plus) + **account credit** are computed in one place (`lib/pricing.ts`) and shown in the
  basket. At checkout the discount + credit become a one-time Stripe coupon so the hosted
  page shows full prices with savings applied; delivery is a line item.
- **Orders** snapshot subtotal, discount, delivery, credit, and per-item prices at purchase.
- **Order finalization** (`lib/orders.ts`) is idempotent and shared by the webhook and the
  success page: marks PAID, clears the basket, deducts credit, and pays referral rewards.

## Memberships

`/membership` shows the three tiers. Subscribing opens Stripe Checkout in `subscription`
mode; the webhook (`customer.subscription.*`) mirrors tier/status into the `Subscription`
table via `lib/subscription.ts`. Members manage or cancel through the Stripe Billing Portal
(`/api/subscription/portal`). Tier is read live from the DB, so benefits apply immediately.

## Recipes

`/recipes` lists Nigerian recipes; each ingredient that maps to a stocked SKU is tappable
(add one, or "Add all to basket"). Recipes flagged `isPremium` are gated to Baskt Plus.

## Referrals

Every user gets a unique code (`/account`). Sharing `…/register?ref=CODE` links a new
signup as referred. On that user's **first paid order**, both parties receive £5 credit
(`REFERRAL_REWARD_CENTS`), applied automatically on future baskets.

## Admin access

```bash
npm run make-admin -- you@example.com    # (also accepts multiple emails)
```

An **Admin** link appears in the header; non-admins are redirected from `/admin`.

## Testing payments

Stripe **test mode**: card `4242 4242 4242 4242`, any future expiry, any CVC/postcode.
Forward webhooks locally with:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Without the CLI, the success page still confirms orders by verifying the session directly.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` / `build` / `start` | Dev / production build / serve |
| `npm run db:push` / `db:seed` / `db:studio` | Schema sync / seed / Prisma Studio |
| `npm run setup-stripe` | Create membership prices in Stripe |
| `npm run make-admin -- <email>` | Promote a user to admin |

## Notes

- **Platform:** built as a Next.js web app (PWA-ready via `public/manifest.webmanifest`).
  The original Baskt plan envisions a React Native app; the backend here (data model, Stripe,
  auth) is API-shaped and reusable if a native client is built later.
- **Deferred from the plan:** fresh-produce monthly box scheduler, live order tracking
  (DHL/DPD), AI restock recommendations, and WhatsApp social commerce.
- **Prisma 7** keeps the connection in `prisma.config.ts` (not the schema) and uses a pg
  driver adapter (`lib/prisma.ts`).
