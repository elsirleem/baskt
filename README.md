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
| Accounts: register / sign in / sign out, settings (name, password), forgot password | `app/login`, `app/register`, `app/account/settings`, `app/forgot-password`, `lib/auth.ts` |
| **Emails** (Resend): order confirmation, "on its way" with tracking, password reset | `lib/email.ts`, `lib/email-templates.ts`, `lib/order-emails.ts` |
| Basket: add / update qty / remove, GBP, member pricing, free-delivery progress bar | `app/cart`, `lib/actions/cart.ts` |
| Wishlist | `app/wishlist`, `lib/actions/wishlist.ts` |
| **Membership tiers** (Pay As You Go / AfroBasic £4.99-mo / AfroPlus £39.99-yr) via Stripe Billing | `app/membership`, `lib/billing.ts`, `lib/subscription.ts` |
| **Member benefits**: 5%/10% off, AfroPlus free delivery, premium recipes | `lib/pricing.ts` |
| **Fresh Produce Box**: monthly subscription, 3 sizes, Mon–Wed delivery day | `app/fresh`, `lib/freshbox.ts`, `app/api/fresh/checkout` |
| **Recipe library** with amounts, difficulty, tappable ingredients → basket (premium gated to AfroPlus) | `app/recipes`, `lib/actions/cart.ts` |
| **Referral engine**: per-user code, £5 credit each way on first order | `lib/referral.ts`, `lib/orders.ts`, `app/account` |
| Free delivery over £70 (always for Plus) | `lib/pricing.ts` |
| Secure checkout with UK delivery address + phone, order records (discount/delivery/credit/address snapshot) | `app/api/checkout`, `app/api/webhooks/stripe` |
| Order history with delivery tracking (received → packed → on its way → delivered) | `app/orders/page.tsx`, `components/OrderTracker.tsx` |
| **Stock control**: baskets capped at stock, checkout re-checks, paid orders reduce stock | `lib/stock.ts`, `lib/actions/cart.ts`, `lib/orders.ts` |
| Admin product management (add, edit, archive/restore, delete if never ordered, stock warnings) | `app/admin`, `lib/actions/admin.ts` |
| **Admin orders**: to fulfil / on the way / delivered / unpaid, address and phone, mark packed → shipped (carrier + tracking) → delivered | `app/admin/orders`, `lib/fulfilment.ts` |
| Profile (plan, stats, Fresh Box, referrals, credit) | `app/account/page.tsx` |

## Run the whole thing with Docker (easiest)

One command builds the app, starts Postgres, applies the schema, seeds the
catalogue, and serves the app at http://localhost:3000:

```bash
docker compose up --build
```

- `app` waits for the `db` healthcheck, applies any pending migrations
  (`prisma migrate deploy`), loads the sample catalogue if the shop is empty
  (`SEED_SAMPLE_DATA=true` in `docker-compose.yml`), then starts Next. If migrations
  can't be applied, the app doesn't start.
- Secrets come from `.env` (`AUTH_SECRET`, `STRIPE_*`); compose overrides
  `DATABASE_URL` so the app reaches the `db` service.
- Stop with `docker compose down` (add `-v` to also wipe the database volume).

For active development, the local workflow below (host `npm run dev` + Dockerised
Postgres) gives faster hot-reload. The image keeps full dependencies for a reliable
first run; slimming it with Next `output: "standalone"` is a future optimization.

## Deploy to Vercel

1. In Vercel, **Add New → Project** and import this repository.
2. **Storage → Create Database → Neon**, region London (eu-west-2), connected to the
   project. This adds `DATABASE_URL` (pooled, used by the app) and `DATABASE_URL_UNPOOLED`
   (direct, used for migrations).
3. Add environment variables for **Production**: `AUTH_SECRET` (a new one, e.g.
   `openssl rand -base64 32`), `AUTH_TRUST_HOST=true`, the `STRIPE_*` keys and prices,
   `RESEND_API_KEY`, `EMAIL_FROM`, `REQUIRE_EMAIL_CONFIRMATION=false` until your Resend
   domain is verified, and `SEED_SAMPLE_DATA=true` if you want the sample catalogue in an
   empty shop. Don't set `NEXT_PUBLIC_APP_URL` or `NEXTAUTH_URL`: the app
   uses the Vercel production domain automatically (set `NEXT_PUBLIC_APP_URL` only for a
   custom domain).
4. In Stripe, add a webhook endpoint for `https://<your-domain>/api/webhooks/stripe` with
   the seven events listed under Testing payments, and set its signing secret as
   `STRIPE_WEBHOOK_SECRET`.
5. For product photo uploads, **Storage → Create → Blob** with **public** access, connected
   to the project (this adds `BLOB_READ_WRITE_TOKEN`).
6. Redeploy. Each production build (`scripts/vercel-build.sh`) generates the Prisma client,
   applies pending migrations, seeds an empty shop if `SEED_SAMPLE_DATA=true`, then builds.
   Preview builds of other branches never touch the database.

Functions run in London (`vercel.json`), next to the database and UK customers. Make
yourself an admin by running `npm run make-admin -- you@example.com` with `DATABASE_URL`
set to the production database (e.g. after `npx vercel env pull .env.vercel.local`).

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

For emails, add a [Resend](https://resend.com) API key ("Sending access" is enough):

```env
RESEND_API_KEY="re_..."
EMAIL_FROM="AfroPantry <onboarding@resend.dev>"
```

Without a key, emails are logged to the terminal instead of sent. Until you verify your own
domain in Resend, `onboarding@resend.dev` can only email the address you signed up to
Resend with. New accounts need their confirmation email, so until then either sign up with
that address or set `REQUIRE_EMAIL_CONFIRMATION="false"`.

Also generate a real auth secret with `npx auth secret` → `AUTH_SECRET`.

### 3. Set up the database

```bash
npm run db:deploy  # create the tables by applying the migrations in prisma/migrations
npm run db:seed    # 28 African SKUs + 4 Nigerian recipes
```

`db:seed` adds the sample products and resets them to their defaults; products
added through the admin are left alone.

### 4. (For memberships) provision Stripe prices

```bash
npm run setup-stripe   # creates the AfroBasic/AfroPlus + Fresh Box prices, prints the IDs for .env
```

### 5. Run

```bash
npm run dev        # http://localhost:3000
```

## Changing the database

The schema lives in `prisma/schema.prisma`, and every change ships as a versioned
migration in `prisma/migrations/` (commit these folders).

1. Edit `prisma/schema.prisma`.
2. `npm run db:migrate -- --name what_changed` creates the migration, applies it to
   your local database, then regenerates the Prisma client (Prisma 7's `migrate dev`
   no longer does that itself). Read the generated SQL before committing it.
3. On deploy, the container applies pending migrations (`npm run db:deploy`).

In production, only ever run `db:deploy`. Never run `prisma db push`,
`prisma migrate dev`, or `prisma migrate reset` against it (they can drop data), and
use a managed Postgres with automatic backups and point-in-time recovery; take a
backup before deploying a migration that changes or removes columns.

**Databases created before migrations** (with the old `db:push` and the AfroPantry
schema) need a one-time baseline so Prisma knows the tables already exist:

```bash
npx prisma migrate resolve --applied 0_init   # record the existing tables as migration 0_init
npm run db:deploy                              # apply the migrations that came after it
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma
# should print "No difference detected"; anything else means the database had drifted
```

## Security

- **Payments:** card details are entered on Stripe's hosted checkout page and never
  reach this server; Stripe webhooks are signature-checked; prices and totals are
  always computed on the server.
- **Attempt limits** (`lib/rate-limit.ts`). Counters live in the `RateLimit` table, so
  limits hold across every server instance:

  | Action | Limit |
  | --- | --- |
  | Sign-in | 10 per account and 50 per network, per 15 minutes |
  | Sign-up | 5 per network per hour; 3 confirmation emails per address per hour |
  | Password change | 5 per account per 15 minutes |
  | Checkout (basket, membership, Fresh Box) | 10 per account per 10 minutes (HTTP 429) |

  "Per network" uses the `X-Forwarded-For` header set by your host's proxy (Vercel,
  Cloudflare, nginx). Run the app behind such a proxy in production; without one the
  header can be faked, which is why sign-in is also limited per account.
- **Browser security headers** (`next.config.ts`): Content-Security-Policy, HSTS,
  X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and no
  `X-Powered-By`. The CSP allows inline scripts (no nonces) so pages can still be
  cached; switch to nonces (see the Next.js CSP guide) if you need a stricter policy.
- **Passwords** are hashed with bcrypt at cost 12 (older cost-10 hashes keep working).
- **Sign-ups confirm their email** (`lib/signup.ts`). Signing up stores a pending sign-up
  and emails a link valid for 24 hours; the account is only created when that link is
  opened and the sign-up password entered, which also signs you in. So nobody can create
  an account for an address they can't read, an email scanner that opens links can't
  confirm one, and if someone signs up with your address first, their link can't be
  finished with your password (the first sign-up confirmed wins). Expired sign-ups are
  deleted as new ones arrive. Signing in before confirming says so and sends a fresh link.
  `REQUIRE_EMAIL_CONFIRMATION="false"` creates accounts straight away instead.
- **Forgot password** emails a one-time link that expires in an hour; only a SHA-256 hash of
  it is stored, asking again cancels the previous link, and the page answers the same way
  whether or not an account exists (the email is sent after the response, so timing
  doesn't give it away either). Limited to 3 emails per address and 10 per network an hour.
- **Changing or resetting a password signs out other devices.** Each sign-in has a random
  id; anything signed in before the change is ended on its next request, except the
  sign-in that changed it in Settings. A reset from an email ends them all.

## Emails

Sent through [Resend](https://resend.com) (`lib/email.ts`), with plain HTML and text
versions (`lib/email-templates.ts`):

- **Order confirmation** when an order is paid: items, totals, delivery address. Sent once,
  by whichever of the webhook or success page marks the order paid, with an idempotency key
  so a retry can't send it twice.
- **On its way** when an admin marks an order shipped, with the carrier and tracking number.
- **Password reset** and **sign-up confirmation** (see Security).

Every attempt is recorded in the `EmailLog` table (never the body), and each order's emails
show on its admin page as Sent, Failed or Not sent. Sending never throws, so a mail problem
can't break checkout or an admin action. Addresses on reserved test domains (`example.com`,
`.test`, `.invalid`, `localhost`) are never emailed, which keeps test accounts out of your
Resend quota. Before launch, [verify your domain](https://resend.com/domains) and set
`EMAIL_FROM` to an address on it, e.g. `AfroPantry <orders@afropantry.co.uk>`.
- **Docker** runs the app as the unprivileged `node` user.

## How the money works

- **Prices** are stored in integer pence (`priceCents`), currency GBP.
- **Member discount** (5% Monthly / 10% Plus) + **delivery** (free over £70, always free for
  Plus) + **account credit** are computed in one place (`lib/pricing.ts`) and shown in the
  basket. At checkout the discount + credit become a one-time Stripe coupon so the hosted
  page shows full prices with savings applied; delivery is a line item.
- **Orders** snapshot subtotal, discount, delivery, credit, and per-item prices at purchase.
- **Delivery address**: Stripe Checkout collects a UK address and phone number; they're saved
  on the order when it's paid and shown in order history (and in the Stripe Dashboard).
- **Stock:** the basket never holds more than is in stock, checkout re-checks stock on the
  server, and the Stripe payment page expires after 30 minutes (Stripe's minimum).
  Paying takes the items out of stock. If two people pay for the last one at once,
  stock goes below zero and the admin products list shows "Oversold by N".
- **Always pounds:** checkouts turn off Stripe's Adaptive Pricing, so customers aren't offered
  other currencies (with a conversion fee) or foreign-only payment methods.
- **Order states:** `PENDING` (checkout open) → `PAID`, or `AWAITING_PAYMENT` first for
  delayed methods such as bank debits (stock, credit and rewards wait until Stripe confirms
  the money), or `CANCELLED` when the checkout expires or a delayed payment fails. Orders
  still pending an hour after checkout started are cancelled when order lists are viewed, as
  a backup for a missed "expired" notification. If Stripe later confirms a payment anyway,
  the order is revived.
- **Discounts at checkout** are one-time Stripe coupons: single-use, valid only until that
  checkout expires, and deleted when it does.
- **Order finalization** (`lib/orders.ts`) is idempotent and shared by the webhook and the
  success page: it atomically flips the order to PAID, so even if both run at once, the
  basket is cleared, credit deducted, and referral rewards paid exactly once.

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
redirected from `/admin`. Admin has two tabs:

- **Products:** add and edit products; stock shows "N left", "Sold out" or "Oversold by N".
  The photo can be uploaded from the admin's computer or phone (JPEG, PNG or WebP; the
  browser shrinks it to 1600px and strips hidden details such as location before upload,
  and the server checks the file really is one of those types) or pasted as an
  images.unsplash.com link. Uploads go to [Vercel Blob](https://vercel.com/docs/vercel-blob)
  when a store is connected (`BLOB_READ_WRITE_TOKEN`), otherwise to an `uploads/` folder on
  the server (`UPLOAD_DIR` to move it; mount it as a volume with Docker). On Vercel the disk
  doesn't keep files, so connect a **public** Blob store there.
  **Archive** hides a product from the shop (search, categories, recipes, baskets) while past
  orders keep it, and **Restore** brings it back. **Delete** is only offered for products
  that have never been ordered.
- **Orders:** paid orders waiting to be packed (oldest first), on the way, delivered, and
  unpaid checkouts (abandoned, or waiting on the bank; customers only ever see paid
  orders). Each order shows the items, totals, delivery address and phone, and buttons to
  mark it packed, shipped (choose the carrier, add a tracking number) and delivered.
  Customers see each step in their order history and a "Track your order" row in their
  Profile. Refunds are made in the Stripe Dashboard.

Every admin page and admin query checks for an admin itself; the layout check alone isn't
enough because layouts don't re-run on client-side navigation.

## Testing payments

Stripe **test mode**: card `4242 4242 4242 4242`, any future expiry, any CVC/postcode.
Forward webhooks to your machine with the [Stripe CLI](https://docs.stripe.com/stripe-cli)
(recent versions require the event list):

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe \
  --events checkout.session.completed,checkout.session.expired,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted
```

It prints a `whsec_…` secret for `STRIPE_WEBHOOK_SECRET`. If `stripe login` has expired, add
`--api-key "$STRIPE_SECRET_KEY"` (after `set -a; . ./.env; set +a`) instead of logging in again.
Without the CLI, the success page still confirms orders by verifying the session directly.
In the Stripe Dashboard, save the [customer portal settings](https://dashboard.stripe.com/test/settings/billing/portal)
once, or "Manage subscription" fails.

## Testing

| Command | What it checks |
| --- | --- |
| `npm test` | Unit tests: pricing and delivery rules, Fresh Box dates, formatting, input checks. No database needed. |
| `npm run test:db` | Database tests: marking orders paid (including the webhook and success page finishing at the same moment) and attempt limits. |
| `npm run test:e2e` | Browser tests (Playwright): shopping, accounts, admin, security limits and headers. |
| `E2E_STRIPE=1 npm run test:e2e` | Also runs a real purchase, AfroPlus subscription and billing portal visit through Stripe's test mode (needs test keys; deletes its test customer in Stripe afterwards). |

- **Database tests** use a separate database: your `DATABASE_URL` with `_test` added to its
  name (or `TEST_DATABASE_URL`). It's created and migrated automatically, emptied between
  tests, and the tests refuse to run against any database whose name doesn't end in `_test`.
- **Browser tests** use your running `npm run dev` (or start it) and your installed Google
  Chrome. They create `e2e+…@example.com` accounts and products named `E2E …`, and delete
  them when the run finishes. Run `npx playwright test --ui` to watch them.
- **On every push** GitHub Actions (`.github/workflows/ci.yml`) runs typecheck, lint, unit
  tests and a build, plus the database and browser tests against a throwaway Postgres and
  the production build. If browser tests fail, the run page has a downloadable
  Playwright report showing what happened.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` / `build` / `start` | Dev / production build / serve |
| `npm run db:migrate` | Create + apply a migration after editing the schema (development) |
| `npm run db:deploy` | Apply pending migrations (production, staging, fresh setups) |
| `npm run db:seed` / `db:studio` | Load sample data / Prisma Studio |
| `npm run typecheck` / `lint` | TypeScript check / ESLint |
| `npm test` / `test:db` / `test:e2e` | Unit / database / browser tests (see Testing) |
| `npm run setup-stripe` | Create membership and Fresh Box prices in Stripe |
| `npm run make-admin -- <email>` | Promote a user to admin |

## Notes

- **Platform:** built as a Next.js web app (PWA-ready via `public/manifest.webmanifest`).
  The original plan envisions a React Native app; the backend here (data model, Stripe,
  auth) is API-shaped and reusable if a native client is built later.
- **Not built yet** (shown in the design prototype, left out until they exist): notification
  bell, links to carriers' live tracking pages, saved delivery addresses in the profile,
  restock reminders, and changing the Fresh Box delivery day after signup.
- **Deferred from the plan:** fresh-box fulfilment scheduling, AI restock recommendations,
  and WhatsApp social commerce.
- **Prisma 7** keeps the connection in `prisma.config.ts` (not the schema) and uses a pg
  driver adapter (`lib/prisma.ts`).
