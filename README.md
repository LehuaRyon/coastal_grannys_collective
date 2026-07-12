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

As of 2026-07-12, after three separate audit passes, this is genuinely as complete as it gets — everything operationally relevant to running the store day-to-day is in the app. What's left falls into exactly two buckets, and both are excluded on purpose:

**Bucket 1 — compliance-locked.** Stripe legally requires these go through their own KYC-verified flow; no app UI, however well-built, can substitute for it:
- **Full dispute evidence submission.** The dashboard surfaces every dispute (reason, amount, due date) and reconciles the outcome automatically once Stripe resolves it, but *submitting evidence* to actually contest a chargeback requires Stripe's structured, file-upload-driven form.
- **Payout schedule / bank account changes.** Changing where or how often money lands requires re-verifying identity/banking details through Stripe directly — this is a fraud-prevention boundary, not a missing feature.
- **Tax documents (1099-K) and identity verification.** Same compliance category — legally must be issued/completed by Stripe, not a third-party app.

**Bucket 2 — infrastructure-only, kept out on purpose.** These *could* technically be wired into an app UI, but doing so would trade a small convenience for a large, unnecessary risk:
- **Neon backups / point-in-time restore.** A "break glass" action — restoring a database is rare, high-stakes, and should require deliberately opening Neon's console as a natural speed bump against doing it by accident or under pressure.
- **Raw SQL / a database console.** The entire point of this dashboard is that an admin unfamiliar with SQL or Postgres never needs to touch either — building one in just to save a click would hand that same admin the single most dangerous tool available (unrestricted read/write on production data) with none of the guardrails the purpose-built admin pages have.

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

## Subscriptions

Real recurring billing via the Stripe Subscriptions API — separate from the one-time cart checkout above. Subscriptions never go through the cart at all: mixing a recurring line item with a one-time PaymentIntent doesn't work, so clicking "Subscribe" on `/shop/subscriptions` opens a dedicated `SubscribeModal` instead.

**Configuring a plan** (Admin → Products → a `subscription`-type product): `Frequency`/`Period` are free-text display copy only ("Bi-weekly delivery", "/delivery"); `Billing Interval` + `Every N Intervals` are what actually drive Stripe billing (e.g. Week + 2 = bills every 2 weeks) — a plan isn't purchasable until both are set. Roast options work the same as before: set them on the product to show a roast picker in the signup modal.

**Signup flow:** requires login (self-service pause/cancel needs a reliable owner — a guest email can't provide that). Creates a Stripe Customer (cached on `User.stripeCustomerId`) and a Stripe Product (cached on `Product.stripeProductId`, since the Subscriptions API needs a real Product id for its recurring price, unlike Checkout Sessions' inline `product_data`) on first use, then a Subscription with `payment_behavior: 'default_incomplete'`. The first payment is confirmed with the *same* embedded Stripe Elements form as one-time checkout (`StripePaymentForm`), using the invoice's `confirmation_secret.client_secret`.

**Keeping in sync:** a local `Subscription` table mirrors Stripe's own object (Stripe remains the source of truth for billing) via these webhook events:
- `customer.subscription.updated` — syncs status/current period end/cancel-at-period-end. Our own `paused` status is inferred from `pause_collection` being set (Stripe itself keeps status `active` while paused).
- `customer.subscription.deleted` — terminal; sends the cancellation email.
- `invoice.paid` — the actual fulfillment trigger. Creates a real `Order` for that cycle (`Order.subscriptionId` + `subscriptionCycleNumber`), reusing all existing order admin/customer views rather than a separate "shipment" concept. Sends the welcome email on the first cycle (`billing_reason: 'subscription_create'`), a renewal email on every one after.
- `invoice.payment_failed` — customer + admin alert emails (status sync to `past_due` is handled by `.updated`, which fires alongside this).

**Self-service** (account dashboard): Pause, Resume, Cancel, edit shipping address, change roast preference, update payment method. Cancel is graceful (`cancel_at_period_end: true` — keeps what's already paid for); Resume doubles as "undo" for either a pause or a scheduled cancellation. Shipping address and roast preference are pure DB fields (not Stripe concepts for a custom `price_data` subscription) — changes take effect on the next delivery, not retroactively. Roast preference is validated against the plan's *current* `Product.options` (an admin can change which roasts a plan offers after a customer has already subscribed — an old choice that's no longer offered is left alone rather than silently reset, but a new save must pick from the current list). Payment method update uses a SetupIntent (`stripe.confirmSetup`, not `confirmPayment` — it validates/saves a card without charging it) via a dedicated `UpdatePaymentMethodForm`, then sets the result as the `default_payment_method` on both the Stripe subscription and customer; surfaced prominently (red, with an explanatory line) whenever a subscription is `past_due`/`unpaid`.

**Admin** (`/admin/subscriptions` list + `/admin/subscriptions/[id]` detail page): every self-service action available for any subscription (admin Cancel is immediate, not period-end; admin Pause/Resume/roast-change mirror the customer versions), an MRR estimate normalized across different billing cadences, a CSV export (mirrors `ExportOrdersButton` — pulling subscription/MRR numbers into a spreadsheet shouldn't require the Stripe Dashboard), and:
- **Detail page** — cycle/order history, live card-on-file summary (brand/last4, pulled fresh from Stripe), customer link, plan/billing timeline (paused-since/canceled-at), and editable shipping address + roast preference, all in one place, matching the order detail page's layout pattern.
- **Resync** — re-checks a subscription's live Stripe status and re-fulfills any of its last 12 paid invoices that don't have a matching Order yet. The manual fix for a missed webhook.
- **Retry Payment** — shown whenever a subscription is `past_due`/`unpaid`; attempts to charge the current open invoice right now with whatever payment method is currently the default, instead of waiting on Stripe's own Smart Retry schedule (which can take days). The same retry also fires automatically the instant a *customer* successfully updates their own card, so fixing the card actually unblocks the subscription immediately rather than leaving them stuck until the next scheduled attempt.
- **Missing-fulfillment banner** — proactively scans every non-terminal subscription's last 2 paid invoices against existing Orders on every admin subscriptions page load, and surfaces a one-click "Recover" (same underlying logic as Resync) for any gap it finds — so a missed webhook doesn't require an admin to notice on their own.
- **Abandoned-signup cleanup cron** (`/api/cron/cleanup-abandoned-subscriptions`, daily) — a subscription created with `payment_behavior: 'default_incomplete'` sits at DB status `incomplete` from the moment it's created, before payment is confirmed. After 24h: if Stripe shows it actually succeeded (webhook missed), recovers it exactly like a manual Resync; if it's genuinely still unpaid, cancels it in Stripe and marks it `incomplete_expired` rather than leaving it billable indefinitely.

Deliberately **not** built: admin editing a subscription's price/discount, and admin creating a subscription on a customer's behalf (a phone order). Both were considered and left out — a price change needs a proration decision (charge/credit the difference now vs. next cycle) that's a real product decision, not just a missing button, and manual subscription creation would mean an admin handling a customer's raw card number, which crosses the same PCI line noted for payment-method updates. Revisit if either becomes a real recurring request.

⚠️ **API version note:** this account's Stripe API version (`2026-05-27.dahlia`) restructured the Invoice object enough that some commonly-documented patterns don't apply as-is:
- `latest_invoice.confirmation_secret` needs its own explicit expand (not included by a plain `latest_invoice` expand).
- The subscription id lives at `invoice.parent.subscription_details.subscription`, not a top-level `invoice.subscription` field.
- The real PaymentIntent/Charge id for a paid invoice lives at `invoice.payments.data[0].payment.payment_intent` (via `invoices.retrieve(id, { expand: ['payments.data.payment.payment_intent'] })` — a list call with the same expand path exceeds Stripe's 4-level expand depth limit, so it must be a single retrieve), not a top-level `invoice.payment_intent` field.

All three were confirmed by direct testing against real invoice objects during development, not assumed from general docs — if Stripe's API version changes, re-verify before trusting any of them.

⚠️ **Bug found and fixed during a later audit pass (2026-07-12):** every subscription charge — signup and every renewal — was silently creating a **second, orphaned Order** with no customer/subscription link, because the generic one-time-checkout webhook handler (`payment_intent.succeeded`) fires for *every* successful PaymentIntent project-wide, including the ones Stripe auto-creates internally when it finalizes a subscription invoice. That handler is now guarded to skip any PaymentIntent lacking `metadata.items` (always set by real one-time cart checkouts, never set by Stripe's own auto-created ones) — see `handlePaymentSucceeded` in the webhook route. A related, more serious symptom: because a subscription order's `Order.stripePaymentId` is a synthetic `sub_invoice_<id>` (an idempotency key, not a real charge), **refunding a subscription-cycle order from the admin order page silently updated the wrong order** — the orphan, not the real one — leaving the real order stuck showing "paid" forever even after Stripe genuinely refunded the money. Fixed by resolving and storing the real PaymentIntent id separately (`Order.stripeChargeId`, resolved via the `invoice.payments` path above) and having refund/dispute webhook handlers look up orders by *either* field (`findOrderByPaymentIntentId` in `lib/orderFulfillment.ts`). Resync also now backfills `stripeChargeId` on any older order missing it, so this self-heals without a separate migration script. Found by testing the refund flow live end-to-end rather than trusting the code read-through — the duplicate order was invisible until a refund exposed which order the webhook actually updated.

That same `metadata.items` guard was then also needed in two more places that share the "does this PaymentIntent have a one-time-checkout Order?" question — both found by re-checking every `stripePaymentId` call site after the fix above, not by symptom: the **orphaned-payments scan** (`/api/admin/stripe/orphaned-payments`, feeds the banner on `/admin/orders`) would otherwise flag *every* successful subscription charge as an "orphaned payment" needing recovery, since it never has a matching `stripePaymentId`; and its **Recover** action (`/api/admin/stripe/recover/[paymentIntentId]`, also reachable from the Payments page's search results) would recreate the exact duplicate-order bug above if an admin clicked Recover on one of those false positives. Both now skip/reject PaymentIntents without `metadata.items`, with a message pointing to subscription Resync instead. The Payments search itself was also updated to check `stripeChargeId` too, so looking up a subscription charge's real PaymentIntent id by hand correctly shows its existing order instead of "no order."

⚠️ **Two more bugs found on a further audit pass:** (1) `DELETE /api/admin/products/[id]` had no guard against deleting a subscription-type product while customers were actively subscribed to it — `Subscription.productId` is a plain string, not a real foreign key, so this wouldn't fail at the DB level, it would just silently orphan the reference. Roast preference lives against the plan's *live* `Product.options` and MRR against its *live* billing interval (neither is snapshotted onto `Subscription`), so deleting the plan would silently break roast-changes and undercount MRR for existing subscribers with no error anywhere. Now blocked with a clear message if any `active`/`paused`/`past_due`/`unpaid` subscription still references the product. (2) Separately — and this one wasn't subscription-specific, it just surfaced while testing the fix above — `ProductForm.tsx`'s delete handler never checked the fetch response status at all, so *any* delete failure (this new guard, or any future server error) would still show a false "Deleted" toast and navigate away as if it worked. Fixed to check `res.ok` and surface the real error. Both confirmed live: deleting an actively-subscribed test plan correctly blocks with the real error message shown in the UI; deleting it again after canceling the one subscription succeeds.

⚠️ **Race condition found and fixed:** Pause, Resume, and Cancel (both self-service and admin, 6 routes total) only ever updated Stripe directly and relied entirely on the async `customer.subscription.updated` webhook to sync the local DB — a deliberate original design choice to keep one source of truth regardless of whether a change came from this app or the Stripe Dashboard. In practice this meant `router.refresh()` on the client could re-fetch the page *before* the webhook landed, showing stale state for a few seconds right after clicking — caught live running a full signup-through-cancel customer journey in one continuous session: clicking "Un-cancel" showed a "Subscription resumed" toast while the visible UI still showed "Ends [date]" and an "Un-cancel" button, for several real seconds, before quietly correcting itself once the webhook caught up. Fixed by having all 6 routes call the existing `syncSubscriptionFromStripe()` synchronously on the Subscription object Stripe's own API response already provides, immediately after the update succeeds — removing the race entirely rather than working around it with a delay or polling. The webhook still fires and re-applies the same state when it arrives; harmless, since the sync is idempotent, and it still owns `canceledAt`/cancellation email on immediate admin cancel. Verified fixed with a deliberately short (2–2.5s) wait on already-warm routes, both self-service and admin — the exact race window that failed before now shows correct state immediately.

⚠️ **Stale "Next billing" date after cancellation:** `Subscription.currentPeriodEnd` is just a snapshot of the last period-end Stripe reported — once a subscription reaches `canceled` or `incomplete_expired`, that date is history, not a future billing date, but the admin list page, the detail page (worse: labeled "Next billing" there, not just an unlabeled date), and the CSV export all displayed it unconditionally. Found by actually reading the CSV export's output rather than just confirming the button exists — a canceled test subscription's row showed a real-looking future "Next Billing" date next to `status: canceled`, which would mislead anyone using the export for accounting. All three now blank/omit it once the subscription is terminal; the detail page's "Canceled: [date]" line already answers the "when did this actually end" question.

⚠️ **Customer stuck with zero recourse after an abandoned/declined signup:** a subscription sits at status `incomplete` from the moment `payment_behavior: 'default_incomplete'` creates it, before the first payment is ever confirmed — reachable any time a customer's card is declined and they don't retry in the modal, closes the tab mid-checkout, or abandons a 3D Secure prompt. Reproduced live: the account dashboard showed the subscription ("Pending" badge) with **no buttons at all** — not Pause, not Cancel, not Update Payment Method — because every self-service action's visibility check excluded `incomplete`. The customer's only path forward was waiting up to 24h for the abandoned-signup cron to auto-expire it, with no way to just fix their card and continue. Fixed by including `incomplete` in the "can update payment method" condition (`SubscriptionsList.tsx`) and the admin "has payment issue" condition (`AdminSubscriptionActions.tsx`) — both reuse the exact same payment-method-update flow already built for `past_due`/`unpaid`, which already auto-retries the subscription's current open invoice right after saving a new card (see the Retry Payment entry above), so no new backend logic was needed, just widening where the existing UI shows up. A distinct message ("This subscription was never confirmed — add a payment method below to complete it") replaces the past_due-flavored "we couldn't charge your card" wording, since no charge was ever attempted. Verified live end to end: created a genuinely abandoned signup (called the create endpoint directly, never confirmed payment, exactly reproducing a real abandonment), confirmed zero actions were available before the fix, then confirmed after the fix that adding a card via the same flow actually paid the subscription's first invoice and flipped it to `active` with a real fulfilled Order — not just a UI change.

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
| 7   | ✅ **Swap Stripe subscriptions to recurring billing** — done; real Stripe Subscriptions API billing, full self-service + admin management — see "Subscriptions" section above | `lib/subscriptions.ts`, `app/admin/subscriptions/`                  |
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
- ✅ Real recurring subscriptions (Stripe Subscriptions API) with admin-configurable roast preference picker, self-service pause/resume/cancel, and per-cycle order fulfillment — see "Subscriptions" below
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

- ❌ Fulfillment / "your order has shipped" emails (Resend is wired up, just not triggered from the orders page yet — gift cards and subscriptions already send their own transactional emails)
- ❌ Inbound email threading is code-complete but requires a verified domain + MX record + Resend webhook — see `INBOUND_EMAIL_DOMAIN` in `.env.local.example`

### Payments / Subscriptions

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
