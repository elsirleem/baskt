# 🧺 AfroPantry — Taste of home. African essentials, delivered.

A subscription-first African grocery platform for the UK diaspora: browse authentic
staples, subscribe for member savings, cook with in-app recipes, refer friends for credit,
and check out securely with Stripe. Built as a PWA-ready Next.js web app with a
mobile-first design: phones get an app-style layout with a bottom tab bar, wider screens
get a top menu.

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions) + TypeScript, PWA manifest
- **Tailwind CSS v4** — design tokens (colours, Fraunces + DM Sans fonts) in `app/globals.css`
- **PostgreSQL** + **Prisma 7** (via the `@prisma/adapter-pg` driver adapter)
- **Auth.js (NextAuth v5)** — email/password credentials, bcrypt-hashed, JWT sessions
- **Stripe** — one-off **Checkout** for baskets + recurring **Billing** for memberships, webhooks

## Features

| Feature | Where |
| --- | --- |
| Catalogue: 28 African SKUs (7 AfroPantry private-label), pack sizes, badges, search, category tiles | `app/page.tsx`, `lib/data.ts` |
| Product pages: quantity picker, "Use in these recipes" links | `app/product/[slug]/page.tsx` |
| Accounts: register / sign in / sign out, settings (name, password) | `app/login`, `app/register`, `app/account/settings`, `lib/auth.ts` |
| Basket: add / update qty / remove, GBP, member pricing, free-delivery progress bar | `app/cart`, `lib/actions/cart.ts` |
| Wishlist | `app/wishlist`, `lib/actions/wishlist.ts` |
| **Membership tiers** (Pay As You Go / AfroBasic £4.99-mo / AfroPlus £39.99-yr) via Stripe Billing | `app/membership`, `lib/billing.ts`, `lib/subscription.ts` |
| **Member benefits**: 5%/10% off, AfroPlus free delivery, premium recipes | `lib/pricing.ts` |
| **Fresh Produce Box**: monthly subscription, 3 sizes, Mon–Wed delivery day | `app/fresh`, `lib/freshbox.ts`, `app/api/fresh/checkout` |
| **Recipe library** with amounts, difficulty, tappable ingredients → basket (premium gated to AfroPlus) | `app/recipes`, `lib/actions/cart.ts` |
| **Referral engine**: per-user code, £5 credit each way on first order | `lib/referral.ts`, `lib/orders.ts`, `app/account` |
| Free delivery over £70 (always for Plus) | `lib/pricing.ts` |
| Secure checkout with UK delivery address + phone, order records (discount/delivery/credit/address snapshot) | `app/api/checkout`, `app/api/webhooks/stripe` |
| Order history | `app/orders/page.tsx` |
| Admin product management (CRUD) | `app/admin`, `lib/actions/admin.ts` |
| Profile (plan, stats, Fresh Box, referrals, credit) | `app/account/page.tsx` |

## Run the whole thing with Docker (easiest)

One command builds the app, starts Postgres, applies the schema, seeds the
catalogue, and serves the app at http://localhost:3000:

```bash
docker compose up --build
```

- `app` waits for the `db` healthcheck, then runs `prisma db push` + seed on first
  boot (idempotent), then starts Next.
- Secrets come from `.env` (`AUTH_SECRET`, `STRIPE_*`); compose overrides
  `DATABASE_URL` so the app reaches the `db` service.
- Stop with `docker compose down` (add `-v` to also wipe the database volume).

For active development, the local workflow below (host `npm run dev` + Dockerised
Postgres) gives faster hot-reload. The image keeps full dependencies for a reliable
first run; slimming it with Next `output: "standalone"` is a future optimization.

## Local development

### 1. Start Postgres

```bash
docker compose up -d db
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
STRIPE_PRICE_FRESH_SMALL="price_..."
STRIPE_PRICE_FRESH_MEDIUM="price_..."
STRIPE_PRICE_FRESH_LARGE="price_..."
```

Values left as the `...` placeholders from `.env.example` are treated as unset, so the
app shows a clear "Stripe is not configured" message instead of calling Stripe.

Also generate a real auth secret with `npx auth secret` → `AUTH_SECRET`.

### 3. Set up the database

```bash
npm run db:push    # create tables
npm run db:seed    # 28 African SKUs + 4 Nigerian recipes
```

### 4. (For memberships) provision Stripe prices

```bash
npm run setup-stripe   # creates the AfroBasic/AfroPlus + Fresh Box prices, prints the IDs for .env
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
- **Delivery address**: Stripe Checkout collects a UK address and phone number; they're saved
  on the order when it's paid and shown in order history (and in the Stripe Dashboard).
- **Order finalization** (`lib/orders.ts`) is idempotent and shared by the webhook and the
  success page: it atomically flips the order PENDING → PAID, so even if both run at once,
  the basket is cleared, credit deducted, and referral rewards paid exactly once.

## Memberships

`/membership` shows the three tiers. Subscribing opens Stripe Checkout in `subscription`
mode; the webhook (`customer.subscription.*`) mirrors tier/status into the `Subscription`
table via `lib/subscription.ts`. Members manage or cancel through the Stripe Billing Portal
(`/api/subscription/portal`). Tier is read live from the DB, so benefits apply immediately.

## Recipes

`/recipes` lists Nigerian recipes; each ingredient that maps to a stocked SKU is tappable
(add one, or "Add all to basket"). Recipes flagged `isPremium` are gated to AfroPlus.

## Referrals

Every user gets a unique code; the Profile's "Refer a friend" row shares the link. Sharing `…/register?ref=CODE` links a new
signup as referred. On that user's **first paid order**, both parties receive £5 credit
(`REFERRAL_REWARD_CENTS`), applied automatically on future baskets.

## Admin access

```bash
npm run make-admin -- you@example.com    # (also accepts multiple emails)
```

An **Admin** link appears in the header (desktop) and in the Profile menu; non-admins are
redirected from `/admin`.

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
| `npm run setup-stripe` | Create membership and Fresh Box prices in Stripe |
| `npm run make-admin -- <email>` | Promote a user to admin |

## Notes

- **Platform:** built as a Next.js web app (PWA-ready via `public/manifest.webmanifest`).
  The original plan envisions a React Native app; the backend here (data model, Stripe,
  auth) is API-shaped and reusable if a native client is built later.
- **Not built yet** (shown in the design prototype, left out until they exist): notification
  bell, order tracking (simple status updates or live DHL/DPD), saved delivery addresses in
  the profile, restock reminders, and changing the Fresh Box delivery day after signup.
- **Deferred from the plan:** fresh-box fulfilment scheduling, AI restock recommendations,
  and WhatsApp social commerce.
- **Prisma 7** keeps the connection in `prisma.config.ts` (not the schema) and uses a pg
  driver adapter (`lib/prisma.ts`).
