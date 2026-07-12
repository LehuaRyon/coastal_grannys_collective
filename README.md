# Coastal Granny's Collective — Web Store

A full-featured e-commerce website for specialty coffee: browsing, filtering, subscriptions, checkout, user accounts, and a complete admin dashboard. Built with Next.js 16, TypeScript, Stripe, and PostgreSQL (Neon).

---

## Requirements

- [Node.js](https://nodejs.org) v18 or higher
- npm (comes with Node)
- A free [Stripe account](https://stripe.com) for payments
- A free [Neon account](https://neon.tech) for the database

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up the database (Neon — free PostgreSQL)

1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project
3. Copy the **Connection string** from the dashboard

### 3. Set up environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in all values:

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...   # Stripe Dashboard → Developers → API Keys
STRIPE_SECRET_KEY=sk_test_...                     # Stripe Dashboard → Developers → API Keys
STRIPE_WEBHOOK_SECRET=whsec_...                   # see Webhooks section below
DATABASE_URL=postgresql://...                     # from Neon dashboard
AUTH_SECRET=...                                   # generate: openssl rand -base64 32
```

> **Test vs Live keys:** Use `pk_test_` / `sk_test_` while building. Switch to live keys when deploying.

### 4. Run the database migration

```bash
npm run db:migrate
```

### 5. Seed the database with products and content

```bash
npm run db:seed-products
```

This creates all 6 coffees, 3 subscription plans, 4 merch items, and default site content.

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 7. Set up webhooks for local testing

Stripe can't reach `localhost` directly, so on your own machine it has no way to tell your app "this payment succeeded." The Stripe CLI bridges that gap by forwarding real Stripe events to your local server. Without it running, **payments still go through in Stripe, but nothing happens in the app** — no `Order` row, no gift cards issued, no confirmation emails. That's the #1 cause of "I paid but nothing happened" while developing locally.

**One-time setup:**

```bash
brew install stripe/stripe-cli/stripe
stripe login
```

**Every time you're testing locally**, run this in its own terminal tab and leave it running for the whole session:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

The first time, copy the `whsec_...` secret it prints into `.env.local` as `STRIPE_WEBHOOK_SECRET`, then restart the dev server. (In practice this secret tends to stay the same across runs for a given Stripe account, so you usually won't need to touch it again — but if webhook signature verification ever starts failing, check that it still matches.)

**How to know it's working:** after a test purchase, this terminal should show something like:

```
--> payment_intent.succeeded
<-- [200] POST http://localhost:3000/api/webhooks/stripe
```

If you don't see that `200` line after paying, the webhook never reached your app — check that `stripe listen` is actually running, and that the URL matches `localhost:3000` (or whatever port `npm run dev` is using).

**This is local-only.** Once deployed, Stripe sends webhooks directly to your live HTTPS endpoint — no CLI listener needed. That's configured separately via a registered webhook endpoint in the Stripe Dashboard (see "Register the production webhook" in the Going Live Checklist below).

### 8. Test a purchase

Use test card `4242 4242 4242 4242`, expiry `12/29`, CVC `123`.

---

## Project Structure

```
coffee-shop/
├── app/
│   ├── layout.tsx                   # Global layout — header, footer, cart, toast
│   ├── page.tsx                     # Homepage — featured coffees, subscription CTA, brand story
│   ├── about/page.tsx               # About page (DB-backed content)
│   ├── contact/
│   │   ├── page.tsx                 # Server component — reads SiteContent from DB
│   │   └── ContactPageClient.tsx    # Contact form UI
│   ├── wholesale/
│   │   ├── page.tsx                 # Server component — reads SiteContent from DB
│   │   └── WholesalePageClient.tsx  # Wholesale inquiry form UI
│   ├── shop/
│   │   ├── layout.tsx               # Shop tab navigation
│   │   ├── coffee/page.tsx          # Fetches all coffees from DB → CoffeePageClient
│   │   ├── subscriptions/page.tsx   # Fetches all subscriptions → SubsPageClient
│   │   ├── merch/page.tsx           # Fetches in-stock merch → MerchPageClient
│   │   └── gift-cards/
│   │       ├── page.tsx             # Server component — reads SiteContent from DB
│   │       └── GiftCardsPageClient.tsx
│   ├── admin/
│   │   ├── layout.tsx               # Admin shell — auth-guarded (admin role only)
│   │   ├── page.tsx                 # Dashboard: stats, quick links, recent orders
│   │   ├── products/
│   │   │   ├── page.tsx             # Products table grouped by type
│   │   │   ├── new/page.tsx         # Create new product
│   │   │   ├── [id]/page.tsx        # Edit product
│   │   │   └── ProductForm.tsx      # Shared create/edit form
│   │   ├── content/page.tsx         # CMS: edit text for all 5 pages
│   │   ├── orders/page.tsx          # Full order list with inline status editor
│   │   └── users/page.tsx           # User list with admin role toggle
│   ├── account/
│   │   ├── login/page.tsx           # NextAuth sign-in
│   │   ├── register/page.tsx        # Register → auto sign-in
│   │   └── dashboard/page.tsx       # Order history for logged-in customer
│   └── api/
│       ├── auth/register/route.ts   # POST — create customer account
│       ├── create-payment-intent/route.ts  # POST — create Stripe PaymentIntent
│       ├── webhooks/stripe/route.ts        # POST — Stripe events → save orders to DB
│       └── admin/
│           ├── products/route.ts           # GET (list), POST (create)
│           ├── products/[id]/route.ts      # GET, PUT, DELETE
│           ├── content/route.ts            # GET (?page=), PUT (upsert)
│           ├── orders/[id]/route.ts        # PUT (update status)
│           ├── users/route.ts              # GET (list)
│           └── users/[id]/route.ts         # PUT (update role)
│
├── components/
│   ├── layout/                      # Header, Footer, MobileNav
│   ├── shop/
│   │   ├── CoffeePageClient.tsx     # Coffee grid with roast/origin/notes/stock filters
│   │   ├── CoffeeCard.tsx           # Coffee card with quick-add, out-of-stock state
│   │   ├── ProductModal.tsx         # Coffee detail modal with size picker
│   │   ├── SubsPageClient.tsx       # Subscription cards with roast preference picker
│   │   ├── MerchPageClient.tsx      # Merch grid with option selector
│   │   └── ShopTabs.tsx             # Tab navigation (Coffee / Subscriptions / Merch / Gift Cards)
│   ├── admin/
│   │   ├── FeaturedToggle.tsx       # ⭐ toggle for homepage featured coffees
│   │   └── OrderStatusSelect.tsx    # Inline order status dropdown
│   ├── cart/CartDrawer.tsx          # Slide-in cart with free shipping progress
│   ├── checkout/
│   │   ├── CheckoutModal.tsx        # 3-step: Contact → Shipping → Payment
│   │   └── StripePaymentForm.tsx    # Stripe PaymentElement (card, Apple Pay, Google Pay)
│   └── ui/                          # Button, Modal, Toast
│
├── lib/
│   ├── data/
│   │   ├── products.ts              # Hardcoded fallback data (used when DB is unavailable)
│   │   └── db-products.ts           # Prisma → typed Coffee/Subscription/Merch mappers
│   ├── db.ts                        # Prisma client singleton
│   ├── store/cart.ts                # Cart state (Zustand, persists in localStorage)
│   ├── stripe.ts                    # Stripe.js loader
│   └── types/index.ts               # Coffee, Subscription, Merch, CartItem, RoastFilter
│
├── prisma/
│   ├── schema.prisma                # DB schema: User, Account, Session, Order, OrderItem, Product, SiteContent
│   ├── seed-products.ts             # Seeds all products + default site content (npm run db:seed-products)
│   └── promote-admin.ts             # Promotes a registered user to admin (npm run db:promote)
│
├── proxy.ts                         # Route protection: /admin/* and /account/dashboard/*
├── auth.ts                          # NextAuth v5 — JWT sessions, credentials provider, role callbacks
└── .env.local.example               # Copy → .env.local and fill in your keys
```

---

## Available Scripts

| Command                    | What it does                                                                |
| -------------------------- | --------------------------------------------------------------------------- |
| `npm run dev`              | Start local dev server (also runs prisma generate)                          |
| `npm run build`            | Generate Prisma client + build for production                               |
| `npm start`                | Run the production build locally                                            |
| `npm run lint`             | Check for code quality issues                                               |
| `npm run db:migrate`       | Run database migrations                                                     |
| `npm run db:studio`        | Open Prisma Studio — visual database browser                                |
| `npm run db:seed-products` | Seed all products and default site content                                  |
| `npm run db:promote`       | Promote a user to admin: `PROMOTE_EMAIL=you@example.com npm run db:promote` |

---

## Auth & Admin

- **NextAuth.js v5** with JWT sessions (no DB round-trip per request)
- **bcryptjs** password hashing (12 rounds)
- **Roles:** `customer` (default) and `admin`
- **Route protection:** `proxy.ts` guards `/admin/*` (requires admin role) and `/account/dashboard/*` (requires any login)

### Creating an admin account

1. Register at `/account/register` — creates a normal customer account
2. Promote to admin:

```bash
PROMOTE_EMAIL=you@example.com npm run db:promote
```

To add more admins later, repeat step 2. To demote someone, run `npm run db:studio` and change their `role` from `admin` to `customer`.

---

## Admin Dashboard

Visit `/admin` while logged in as admin. The whole point of this dashboard is that day-to-day store operation — including everything Stripe-related — never requires opening the Stripe Dashboard or the Neon database console. See "Stripe & Neon parity" below for exactly what that does and doesn't cover.

- **Dashboard** (`/admin`) — order stats (total orders, revenue, avg order, gift card balance, users, products, unread messages); live **Stripe balance** (available/pending, last payout) and **webhook health** (last event received, event count in the last 24h — this is what would have caught the local `stripe listen` gaps hit during development, without ever opening Stripe's own webhook event log); a **disputes** banner when any chargeback needs a response
- **Products** — full CRUD for coffees, subscriptions, and merch. Featured ⭐ toggle controls which coffees appear on the homepage (up to 4; falls back to first 4 in-stock by position)
- **Content** — edit all text for Homepage, About, Contact, Wholesale, and Gift Cards pages. Changes go live immediately
- **Orders** (`/admin/orders`) — full order list with customer details, items (including roast preference), shipping address, inline status editor, **CSV export**, and **Record Manual Order** for a comp, phone/in-person sale, or goodwill replacement that never touches Stripe (clearly badged "Manual" in the list, with a required note and the recording admin's email kept on the order). An **orphaned-payments banner** cross-references Stripe's recent successful payments (last 14 days) against local Order records and offers one-click recovery for any the webhook missed (also happens automatically via a daily cron — see `app/api/cron/release-stale-gift-card-holds`)
  - **Order detail** (`/admin/orders/[id]`) — full item/shipping/payment breakdown, card brand + last 4, Stripe's fraud risk assessment (Radar), a link to the Stripe-hosted receipt, dispute banner with reason/due-by when applicable, and the **Refund** action (partial or full, with an optional reason sent to Stripe) — triggers a real `stripe.refunds.create()`; the `charge.refunded` webhook remains the sole source of truth for reconciling order status and gift card balances, exactly as if the refund had been issued from the Stripe Dashboard
- **Payments** (`/admin/payments`) — look up *any* Stripe payment by PaymentIntent id or customer email regardless of age (the orphaned-payments banner only covers 14 days; this covers all of it, via Stripe's Search API), a **recent failed/declined attempts** feed for "I tried to pay and it didn't work" conversations (a failed attempt never creates an Order, so this is the only place it's visible at all), and the full **recent webhook events log** (not just the dashboard's "last event" summary)
- **Gift Cards** (`/admin/gift-cards`) — issue, credit (additive-only, so a typo can't wipe a balance), **void** (one-way, requires a reason, for fraud/mistakes outside the normal refund-triggered void path), resend, full redemption + admin audit history, and a cron-health banner for scheduled deliveries
- **Users** (`/admin/users`) — customer list with admin role toggle
  - **Customer detail** (`/admin/users/[id]`) — every order, every gift card (purchased and received), and every support message tied to one customer in a single view, so a mid-conversation lookup during a customer issue never requires cross-referencing multiple pages or the database directly
- **Submissions** — contact/wholesale/coffee-cart inquiries with reply threading

### Stripe & Neon parity

Built so an admin unfamiliar with Stripe or Postgres never needs to touch either directly:

| Need | Where it lives in-app |
| --- | --- |
| Available/pending balance, last payout | Dashboard → Stripe Balance card |
| "Is Stripe actually reaching us?" | Dashboard → Webhook Health card, or Payments → full event log |
| Issue a refund (partial or full, with a reason) | Order detail → Refund |
| See card brand/last4, Stripe receipt, fraud risk | Order detail |
| Recover a payment the webhook missed (any age) | Orders → orphaned-payments banner (last 14 days, automatic) or Payments → look up by id/email (any age) |
| See failed/declined payment attempts | Payments → Recent Failed/Declined Attempts |
| Respond to / track a chargeback | Dashboard banner + order detail (see below for the one gap) |
| Cancel/adjust a gift card | Gift Cards → Void / Credit |
| Record a comp, phone sale, or manual adjustment | Orders → Record Manual Order |
| Export transactions for accounting | Orders → Export CSV |
| One customer's full history | Users → customer detail |

**Deliberately still console-only** — these were evaluated and left out on purpose, not overlooked:
- **Full dispute evidence submission.** The dashboard surfaces every dispute (reason, amount, due date) and reconciles the outcome automatically once Stripe resolves it, but *submitting evidence* to actually contest a chargeback requires Stripe's structured, file-upload-driven form. Replicating that in-app has poor ROI against the visibility already built — an admin gets a due-by warning here, then finishes the response in Stripe.
- **Payout schedule / bank account changes.** Changing where or how often money lands requires Stripe's own KYC-verified flow — this is a compliance boundary, not a missing feature, and no app UI can legally substitute for it.
- **Tax documents (1099-K) and identity verification.** Same compliance category — these must be accessed and completed directly in Stripe.
- **Neon backups / point-in-time restore.** Infrastructure-level, "break glass" only. Wiring database restore into an app UI would be a bigger risk than any problem it solves — this should always require deliberately opening Neon's console.
- **Raw SQL / a database console.** Would directly contradict the goal of admins not needing to understand these tools — it's the single most dangerous way to hand someone unfamiliar with SQL access to production data.

---

## Product System

All products live in the `Product` table. Key fields:

| Field                  | Used for                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| `type`                 | `coffee` / `subscription` / `merch`                                                        |
| `inStock`              | Shown/hidden on shop pages; out-of-stock coffees show a badge and disabled button          |
| `featured`             | Coffees only — controls which appear in the homepage featured section                      |
| `position`             | Sort order within each type                                                                |
| `notes`                | Coffee tasting notes — drives the Notes filter on the coffee page                          |
| `options`              | Subscriptions: roast options shown to customer (empty = no picker); Merch: variant options |
| `badge` / `badgeClass` | Any text badge (e.g. "Staff Pick", "Limited") — `badge-gold` (amber) or `badge-red`        |
| `prices` (JSON)        | Coffee size → price map, e.g. `{"12 oz": 22, "5 lb": 85}`                                  |

---

## Coffee Page Filters

The `/shop/coffee` page has four client-side filters:

| Filter     | Behavior                                                                                                         |
| ---------- | ---------------------------------------------------------------------------------------------------------------- |
| **Roast**  | Single-select pills (All / Light / Medium / Medium-Dark / Dark)                                                  |
| **Origin** | Derived from the `origin` field — takes the last comma-separated part (e.g. "Gedeo Zone, Ethiopia" → "Ethiopia") |
| **Notes**  | Multi-select, OR logic — shows coffee if it has any selected note; single horizontally-scrollable row            |
| **Stock**  | Three-way: In Stock (default) / Out of Stock / All                                                               |

---

## Subscription Roast Preferences

If a subscription product has roast options set (via `Product.options`), a roast picker appears on the subscriptions page. The selected roast is included in the cart item variant (e.g. "Weekly delivery · Light Roast") and flows through to `OrderItem.variant` in the database.

To show the roast picker for a subscription: go to Admin → Products → edit the subscription → add options like `Light, Medium, Medium-Dark, Dark` in the "Roast Options" field. Leave empty to hide the picker.

---

## Site Content (CMS)

The `SiteContent` table stores editable text for five pages, keyed by `page + key`:

| Page         | Editable fields                                                           |
| ------------ | ------------------------------------------------------------------------- |
| `home`       | Hero title/subtitle, featured section copy, subscription CTA, brand story |
| `about`      | Hero, story paragraphs, values cards (JSON), team members (JSON)          |
| `contact`    | Heading, subheading, address, hours, email, phone                         |
| `wholesale`  | Hero, why-partner section, perks list (JSON), form heading                |
| `gift-cards` | Heading, subheading, preset amounts (JSON), custom amount range           |

---

## Payment Flow

1. Customer adds items and clicks Checkout
2. Contact + shipping info collected in-browser
3. Site calls `/api/create-payment-intent` — Stripe PaymentIntent created with cart items + customer info in metadata
4. Browser loads Stripe's secure payment form
5. Customer pays (card/Apple Pay/Google Pay)
6. Stripe fires `payment_intent.succeeded` webhook → `/api/webhooks/stripe`
7. Webhook verifies Stripe signature, looks up customer by email (links order to account if found), saves `Order` + `OrderItem` rows to DB

---

## Order → User Linking

When an order is placed, the webhook looks up whether the customer's email matches a registered account. If it does, `Order.userId` is set. If not (guest checkout), `customerEmail` is stored for fallback lookup. The account dashboard (`/account/dashboard`) shows all orders for the logged-in user.

---

## Deploying to Vercel

### 1. Deploy

1. Push to GitHub
2. Import to [vercel.com](https://vercel.com)
3. Add environment variables: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `DATABASE_URL`, `AUTH_SECRET`
4. Deploy

After deploying, run the migration once:

```bash
DATABASE_URL="your-neon-connection-string" npx prisma migrate deploy
```

Then seed the products:

```bash
DATABASE_URL="your-neon-connection-string" npx tsx prisma/seed-products.ts
```

### 2. Register the production webhook

Stripe Dashboard → Developers → Webhooks → Add endpoint:

- URL: `https://your-site.vercel.app/api/webhooks/stripe`
- Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
- Copy the signing secret → update `STRIPE_WEBHOOK_SECRET` in Vercel → redeploy

---

## Development vs. Production Environments

You should run **two separate Neon databases** — one for development and one for production — so you never test against real customer data.

### Setting up a dev database (Neon branching)

Neon lets you create a database branch in seconds — it's a full copy of your schema (and optionally your data) that you can reset or destroy without affecting production.

1. Go to [neon.tech](https://neon.tech) → your project → **Branches** → **Create branch**
2. Name it `dev` (or `staging`)
3. Copy the **Connection string** from the new branch
4. In `.env.local`, use the dev branch connection string for `DATABASE_URL` and `DIRECT_URL`
5. Run `npm run db:migrate` to apply the schema to the dev branch
6. Run `npm run db:seed-products` to populate dev data

Your production database stays untouched. When you deploy to Vercel, add the **production** connection strings as environment variables there.

### Stripe test vs. live mode

`pk_test_` / `sk_test_` keys (already in `.env.local.example`) use Stripe's test mode — no real money changes hands. You can:

- Pay with test card `4242 4242 4242 4242`, expiry `12/29`, CVC `123`
- Use `stripe listen --forward-to localhost:3000/api/webhooks/stripe` to receive webhook events locally
- The Stripe CLI prints a `whsec_...` secret for your local session — use that as `STRIPE_WEBHOOK_SECRET` in `.env.local`

When you're ready to go live, swap in live Stripe keys in Vercel (not in `.env.local`) and register a new production webhook endpoint in the Stripe Dashboard.

### Environment summary

|                | Local dev                          | Production (Vercel)                |
| -------------- | ---------------------------------- | ---------------------------------- |
| Database       | Neon dev branch                    | Neon main branch                   |
| Stripe         | Test keys (`pk_test_`, `sk_test_`) | Live keys (`pk_live_`, `sk_live_`) |
| Stripe webhook | `stripe listen` CLI                | Registered in Stripe Dashboard     |
| `AUTH_SECRET`  | Any random string                  | `openssl rand -base64 32`          |

---

## Going Live Checklist

**Complete before taking real orders:**

1. **Stripe business verification** — enter business name, address, and bank account in Stripe Dashboard
2. **Change Stripe receipt/support email** — Stripe Dashboard → Settings → Business → update to the shop's real email
3. **Deploy to Vercel** — see above
4. **Register production webhook in Stripe (live mode)** — separate from test mode webhook
5. **Flip to live keys** — replace `pk_test_` / `sk_test_` with live keys in Vercel → redeploy
6. **Verify a Resend sending domain** — `RESEND_API_KEY` is set, but `EMAIL_FROM` is still the `onboarding@resend.dev` sandbox default, which can only send to your own Resend account email:
   - Resend Dashboard → Domains → Add Domain → enter your domain
   - Add the TXT/DKIM records it gives you at your DNS provider
   - Wait for verification
   - Update `EMAIL_FROM` in `.env.local` and Vercel to an address on that domain (e.g. `hello@coastalgrannyscollective.com`) → redeploy
7. _(Optional, can wait until after launch)_ **Set up inbound email reply threading** — without this, customer replies to notification emails just land in your regular inbox instead of threading into `/admin/submissions`. Requires the domain from step 6 to be verified first:
   - Resend Dashboard → Domains → your domain → add the **Receiving MX record** (use a subdomain like `inbox.yourdomain.com` if you already have MX records for regular email on the root domain, to avoid conflicting with it)
   - Resend Dashboard → Webhooks → Create Webhook → Event: `email.received` → Endpoint: `https://yourdomain.com/api/webhooks/resend-inbound`
   - Copy the webhook's signing secret → `RESEND_WEBHOOK_SECRET` in `.env.local` and Vercel
   - Set `INBOUND_EMAIL_DOMAIN` to the subdomain used above
   - Needs a live HTTPS deploy — the webhook endpoint can't be tested against localhost
8. **Register your domain for Apple Pay** — without this, the Apple Pay button silently never appears in production (Stripe's `localhost` test-mode exception won't apply once you're live):
   - Stripe Dashboard → Settings → Payment methods → Apple Pay → Add a new domain → enter your production domain
   - Stripe hosts a verification file at a well-known URL on your domain automatically — no action needed beyond adding the domain
   - Note: Apple Pay only ever renders in Safari (macOS/iOS/iPadOS) — it's a Safari-only API, not a Stripe or app limitation, so it will never show in Chrome/Firefox/Edge regardless of this step
9. **Set `CRON_SECRET` in Vercel** — protects `/api/cron/deliver-scheduled-gift-cards` (scheduled gift card delivery, e.g. buy now / send on a birthday). Vercel Cron sends this automatically once set; the schedule lives in `vercel.json` (defaults to 14:00 UTC daily — adjust for your timezone if you want deliveries to land at a specific local time)
   - **Verify Cron is actually enabled** — it's included on Hobby (limited to daily-or-slower schedules) and Pro plans, but confirm under Vercel Dashboard → your project → Settings → Cron Jobs after your first deploy; it won't error loudly if it's silently not running
   - `/admin/gift-cards` shows a warning banner if the cron hasn't run in the last ~26 hours, or if any scheduled card is overdue — check there after going live to confirm it's actually firing
   - If you want an extra layer of certainty beyond that in-app banner, a free external monitor (e.g. cron-job.org, UptimeRobot) hitting the same endpoint with the `CRON_SECRET` header on the same schedule works as a redundant trigger — not required, just extra insurance

---

## Implementation Game Plan

Ordered by priority — work through these phases before going live.

### Phase 1 — Pre-Launch Essentials

These are blocking issues: the site works locally but is not ready for real customers without them.

| #   | Task                                                                                                                                                                                                                                                                                                      | Where                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | **Set up a dev Neon branch** so you're not testing against production data                                                                                                                                                                                                                                | See "Dev vs. Prod" section above                                       |
| 2   | ✅ **Resend wired up & API key added** — code integration done, `RESEND_API_KEY`/`EMAIL_FROM`/`NOTIFY_EMAIL` set in `.env.local`; still need to verify a sending domain (see Going Live Checklist above) before real customer emails go out — currently sandboxed to your own Resend account email        | `.env.local.example` has setup steps                                   |
| 3   | ✅ **Contact form → DB + email** — done                                                                                                                                                                                                                                                                   | `app/contact/ContactPageClient.tsx`, `app/api/submissions`             |
| 4   | ✅ **Wholesale form → DB + email** — done                                                                                                                                                                                                                                                                 | `app/wholesale/WholesalePageClient.tsx`, `app/api/submissions`         |
| 5   | ✅ **Coffee cart inquiry → DB** — mailto: fallback removed, now posts to the DB                                                                                                                                                                                                                           | `app/coffee-cart/CoffeeCartClient.tsx`, `app/api/submissions`          |
| 6   | ✅ **Submission model + admin Submissions tab** — done, with tabs for Contact/Wholesale/Cart, unread badges, and threaded email replies (admin replies from the dashboard; customer replies show back up in the thread once inbound email is set up — see `INBOUND_EMAIL_DOMAIN` in `.env.local.example`) | `app/admin/submissions/page.tsx`, `components/admin/SubmissionRow.tsx` |

### Phase 2 — Revenue-Critical

These don't block launch but directly affect how much money the site makes.

| #   | Task                                                                                                                                                 | Where                                                               |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 7   | **Swap Stripe subscriptions to recurring billing** — subscriptions currently charge as one-time payments, so customers aren't automatically rebilled | `app/api/create-payment-intent/route.ts` + Stripe Subscriptions API |
| 8   | **Gift card email delivery** — currently adds to cart and records the order but never emails the recipient a code or balance                         | Need email service + gift card redemption logic                     |
| 9   | **"Your order has shipped" email** — admin marks order shipped, customer gets a notification                                                         | Admin orders page + email service                                   |

### Phase 3 — Admin Quality-of-Life

| #   | Task                                                                                                                                                                                   | Where                                                                      |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 10  | **Orders: date range filter + status filter** — filter by past 30/60/90 days and by status (paid, refunded, etc.)                                                                      | `app/admin/orders/page.tsx` has a TODO                                     |
| 11  | **Orders: CSV export** — download current filtered view as a spreadsheet                                                                                                               | `app/admin/orders/page.tsx` has a TODO                                     |
| 12  | **Calculated shipping** — currently flat $8 or free over $60; integrate a carrier API (EasyPost / Shippo) for real rates                                                               | `components/checkout/CheckoutModal.tsx` + `components/cart/CartDrawer.tsx` |
| 13  | **Admin: page/feature visibility controls** — admin-configurable show/hide for nav, footer, and shop sub-pages, split between guest and account-holder audiences. See full spec below. | New admin settings section + nav/footer components                         |

See [Visibility Control Spec](#visibility-control-spec-item-13) below for the full breakdown of item 13.

### Phase 4 — Customer Experience

| #   | Task                                                                                                                                                                    | Where                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 14  | **Star ratings on coffee cards** — requires `Rating` model (userId, coffeeId, 1–5 stars), order-history gate (only buyers can rate), aggregated display on `CoffeeCard` | `components/shop/CoffeeCard.tsx` has a TODO |
| 15  | **"Notify Me" for out-of-stock coffees** — requires `StockAlert` model; email all subscribers when admin marks item back in stock                                       | `components/shop/CoffeeCard.tsx` has a TODO |
| 16  | **Inventory quantity tracking** — currently just an in/out toggle; add `qty` field and decrement on purchase via webhook                                                | `prisma/schema.prisma` + webhook            |

### Visibility Control Spec (Item 13)

Admin-configurable toggles controlling who can see which pages/nav items — guests (no account), account holders (logged in), or both. **All toggles default ON** except the coffee-tab tiers noted below.

**Always visible, not toggleable** (guests + account holders):

- About page
- Coffee Cart page
- Contact page
- FAQ (footer link)

**Toggleable — top nav / pages:**

- **Wholesale page** — admin show/hide toggle
- **Shop dropdown (whole)** — admin toggle to show/hide the entire dropdown for guests and/or account holders
  - **Merch** (within Shop) — independently toggleable for guests and/or account holders
  - **Coffee tab** (within Shop) — tiered access, admin-controlled:
    1. _Initial default:_ visible only to specific account emails the admin allow-lists individually
    2. Admin can widen to: all logged-in account holders
    3. Admin can widen further to: guests too (public)
    - The "allow guests" tier is a toggle nested inside the account-holder tier, per the phased rollout above

**Footer nav must always mirror the top nav's current toggle state**, plus:

- **Fix:** footer is currently missing a Coffee Cart link — add it (always visible, matches top nav)
- **Shipping Info** + **Returns & Refunds** footer links — only show when the Shop dropdown toggle is on
- **Brewing Guides** footer link — only show once the Coffee tab is opened to account holders (tier 2+ above, not just the initial email allow-list)
- **FAQ** — always shown regardless of any toggle
- **Coffee Subscriptions**, **Gift Cards**, **Merch** footer links — each independently toggleable by admin for guests / account holders / everyone

This likely needs a new admin settings model (e.g. `SiteVisibilitySettings`) storing per-feature flags plus the coffee-tab email allow-list, read by both the nav and footer components.

---

## What's Included

- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Coffee page with roast, origin, tasting notes, and stock filters
- ✅ Coffee product modal with size selection and out-of-stock handling
- ✅ Subscription plans with admin-configurable roast preference picker
- ✅ Merch grid with option selector
- ✅ Gift cards (preset amounts + custom amount + recipient email)
- ✅ Wholesale inquiry form
- ✅ Contact and About pages with DB-backed content
- ✅ Persistent cart (survives page refresh)
- ✅ 3-step checkout (Contact → Shipping → Payment)
- ✅ Stripe payments — restricted to card, Apple Pay, and Google Pay only (Bank, Klarna, Link, and other Stripe-enabled methods turned off in the account's Payment Method Configuration)
- ✅ Webhook-backed order storage in PostgreSQL
- ✅ Refund handling via webhook
- ✅ Stripe receipt emails
- ✅ User accounts (register, login, bcrypt passwords)
- ✅ Customer account dashboard with full order history
- ✅ Orders linked to user accounts (fallback by email for guest orders)
- ✅ Admin dashboard with stats
- ✅ Admin: full product CRUD (coffees, subscriptions, merch)
- ✅ Admin: CMS for all site content (5 pages)
- ✅ Admin: order management with inline status editor
- ✅ Admin: user management with role control
- ✅ Admin: featured coffees toggle (controls homepage featured section)
- ✅ Admin: in-stock / out-of-stock toggle per product
- ✅ Role-based access control (customer vs admin)
- ✅ Contact, wholesale, and coffee cart inquiries saved to DB and manageable from `/admin/submissions` (tabs, unread badges, threaded email replies)
- ✅ Resend integration (`lib/email.ts`) — needs an account + verified domain to actually send, see `.env.local.example`

## Not Yet Included

### Email / Transactional

- ❌ Gift card email delivery — order recorded but not sent to recipient (uses the same Resend integration, just not wired to the gift card flow yet)
- ❌ Fulfillment / "your order has shipped" emails (same — Resend is wired up, just not triggered from the orders page yet)
- ❌ Inbound email threading is code-complete but requires a verified domain + MX record + Resend webhook — see `INBOUND_EMAIL_DOMAIN` in `.env.local.example`

### Payments / Subscriptions

- ❌ Recurring subscriptions — charged as one-time payments (needs Stripe Subscriptions API)
- ❌ Calculated shipping rates — flat rate only: free over $60, $8 otherwise

### Admin Dashboard

- ❌ Order sorting and filtering — date range buttons (30 / 60 / 90 days / all time), sort by customer name (`app/admin/orders/page.tsx`)
- ❌ CSV export for orders — export currently filtered rows with order ID, customer, items, amount, status, date (`app/admin/orders/page.tsx`)

### Shop

- ❌ Star ratings on coffee cards — requires `Rating` model (userId, coffeeId, stars 1–5), order-history verification before saving, and display on `CoffeeCard` (`components/shop/CoffeeCard.tsx`)
- ❌ "Notify Me" for out-of-stock coffees — requires `StockAlert` model, email trigger when admin marks item back in stock (`components/shop/CoffeeCard.tsx`)
- ❌ Inventory management / quantity tracking

---

_For a plain-English explanation of how this project works, see [OVERVIEW.md](./OVERVIEW.md)._
