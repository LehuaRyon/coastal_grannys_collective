# Grounds Coffee Co. — Web Store

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
2. Create a new project (name it anything, e.g. "grounds-coffee")
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

```bash
brew install stripe/stripe-cli/stripe
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the `whsec_...` secret printed by the CLI into `.env.local` as `STRIPE_WEBHOOK_SECRET`, then restart the dev server.

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

| Command | What it does |
|---|---|
| `npm run dev` | Start local dev server (also runs prisma generate) |
| `npm run build` | Generate Prisma client + build for production |
| `npm start` | Run the production build locally |
| `npm run lint` | Check for code quality issues |
| `npm run db:migrate` | Run database migrations |
| `npm run db:studio` | Open Prisma Studio — visual database browser |
| `npm run db:seed-products` | Seed all products and default site content |
| `npm run db:promote` | Promote a user to admin: `PROMOTE_EMAIL=you@example.com npm run db:promote` |

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

Visit `/admin` while logged in as admin:

- **Dashboard** — order stats (total orders, revenue, avg order, users, products), recent orders table
- **Products** — full CRUD for coffees, subscriptions, and merch. Featured ⭐ toggle controls which coffees appear on the homepage (up to 4; falls back to first 4 in-stock by position)
- **Content** — edit all text for Homepage, About, Contact, Wholesale, and Gift Cards pages. Changes go live immediately
- **Orders** — full order list with customer details, items (including roast preference), shipping address, and inline status editor
- **Users** — customer list with admin role toggle

---

## Product System

All products live in the `Product` table. Key fields:

| Field | Used for |
|---|---|
| `type` | `coffee` / `subscription` / `merch` |
| `inStock` | Shown/hidden on shop pages; out-of-stock coffees show a badge and disabled button |
| `featured` | Coffees only — controls which appear in the homepage featured section |
| `position` | Sort order within each type |
| `notes` | Coffee tasting notes — drives the Notes filter on the coffee page |
| `options` | Subscriptions: roast options shown to customer (empty = no picker); Merch: variant options |
| `badge` / `badgeClass` | Any text badge (e.g. "Staff Pick", "Limited") — `badge-gold` (amber) or `badge-red` |
| `prices` (JSON) | Coffee size → price map, e.g. `{"12 oz": 22, "5 lb": 85}` |

---

## Coffee Page Filters

The `/shop/coffee` page has four client-side filters:

| Filter | Behavior |
|---|---|
| **Roast** | Single-select pills (All / Light / Medium / Medium-Dark / Dark) |
| **Origin** | Derived from the `origin` field — takes the last comma-separated part (e.g. "Gedeo Zone, Ethiopia" → "Ethiopia") |
| **Notes** | Multi-select, OR logic — shows coffee if it has any selected note; single horizontally-scrollable row |
| **Stock** | Three-way: In Stock (default) / Out of Stock / All |

---

## Subscription Roast Preferences

If a subscription product has roast options set (via `Product.options`), a roast picker appears on the subscriptions page. The selected roast is included in the cart item variant (e.g. "Weekly delivery · Light Roast") and flows through to `OrderItem.variant` in the database.

To show the roast picker for a subscription: go to Admin → Products → edit the subscription → add options like `Light, Medium, Medium-Dark, Dark` in the "Roast Options" field. Leave empty to hide the picker.

---

## Site Content (CMS)

The `SiteContent` table stores editable text for five pages, keyed by `page + key`:

| Page | Editable fields |
|---|---|
| `home` | Hero title/subtitle, featured section copy, subscription CTA, brand story |
| `about` | Hero, story paragraphs, values cards (JSON), team members (JSON) |
| `contact` | Heading, subheading, address, hours, email, phone |
| `wholesale` | Hero, why-partner section, perks list (JSON), form heading |
| `gift-cards` | Heading, subheading, preset amounts (JSON), custom amount range |

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

## Going Live Checklist

**Complete before taking real orders:**

1. **Stripe business verification** — enter business name, address, and bank account in Stripe Dashboard
2. **Change Stripe receipt/support email** — Stripe Dashboard → Settings → Business → update to the shop's real email
3. **Deploy to Vercel** — see above
4. **Register production webhook in Stripe (live mode)** — separate from test mode webhook
5. **Flip to live keys** — replace `pk_test_` / `sk_test_` with live keys in Vercel → redeploy

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
- ✅ Stripe payments (card, Apple Pay, Google Pay, Stripe Link)
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

## Not Yet Included

### Email / Transactional
- ❌ Contact and wholesale forms save submission UI only — not emailed (needs Resend or SendGrid)
- ❌ Gift card email delivery — order recorded but not sent to recipient (needs email service)
- ❌ Fulfillment / "your order has shipped" emails (needs email service)

### Payments / Subscriptions
- ❌ Recurring subscriptions — charged as one-time payments (needs Stripe Subscriptions API)
- ❌ Calculated shipping rates — flat rate only: free over $60, $8 otherwise

### Admin Dashboard
- ❌ Submissions tab — contact, wholesale, and coffee cart form data not saved to DB or surfaced in admin (`app/admin/page.tsx`, `ContactPageClient.tsx`, `WholesalePageClient.tsx`, `CoffeeCartClient.tsx`)
- ❌ Order sorting and filtering — date range buttons (30 / 60 / 90 days / all time), sort by customer name (`app/admin/orders/page.tsx`)
- ❌ CSV export for orders — export currently filtered rows with order ID, customer, items, amount, status, date (`app/admin/orders/page.tsx`)

### Shop
- ❌ Star ratings on coffee cards — requires `Rating` model (userId, coffeeId, stars 1–5), order-history verification before saving, and display on `CoffeeCard` (`components/shop/CoffeeCard.tsx`)
- ❌ "Notify Me" for out-of-stock coffees — requires `StockAlert` model, email trigger when admin marks item back in stock (`components/shop/CoffeeCard.tsx`)
- ❌ Inventory management / quantity tracking

---

*For a plain-English explanation of how this project works, see [OVERVIEW.md](./OVERVIEW.md).*
