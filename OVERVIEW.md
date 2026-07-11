# Coastal Granny's Collective — Plain-English Overview

This document explains what this project is, how it works, and answers common questions — no technical background needed.

---

## What is this?

This is the complete website and online store for Coastal Granny's Collective. Customers can visit the site on any device (phone, tablet, or computer), browse coffee, and place a real order with their credit card.

It includes:

- **A coffee shop** — browse single-origin coffees, filter by roast level, read tasting notes, and choose your bag size
- **Subscriptions** — recurring coffee deliveries (bi-weekly, monthly, or weekly)
- **Merch** — tote bags, mugs, t-shirts, pour-over kits
- **Gift cards** — preset amounts or a custom amount sent by email
- **Wholesale** — a form for cafés and businesses to request a sample kit
- **About & Contact pages**
- **Login / Create Account** — real user accounts stored securely in the database
- **Admin Dashboard** — a private area (accessible only to you) to see orders and stats

---

## How does a customer buy something?

1. They visit the site and browse the coffee page
2. They click a product to see details, pick a size, and add it to their cart
3. A cart drawer slides in from the right — they can adjust quantities or remove items
4. They click **Checkout** and fill in three quick steps:
   - Name and email
   - Shipping address
   - Payment (card, Apple Pay, or Google Pay)
5. They click **Pay** — the charge goes through Stripe
6. They see an order confirmation screen

The whole checkout takes about 60 seconds.

---

## How do payments work?

Payments are handled by **Stripe** — the same company that processes payments for Lyft, Amazon, Shopify, and millions of other businesses. It is one of the most trusted payment processors in the world.

**What Stripe does:**

- Securely collects the customer's card number (it never touches our server)
- Handles fraud detection automatically
- Deposits money into your bank account (usually within 2 business days)
- Sends a receipt to the customer by email

**What it costs:**

- No monthly fee
- No setup fee
- You pay **2.9% + 30¢ per transaction**, only when someone buys something
- Example: a $22 bag of Ethiopia Yirgacheffe → you keep **$21.06**, Stripe takes **$0.94**
- Example: a $55 subscription → you keep **$53.10**, Stripe takes **$1.90**

**Test mode vs. Live mode:**
While the store is being built and tested, it runs in "test mode" — no real money moves, and you can use a fake card number (`4242 4242 4242 4242`) to simulate purchases. When you're ready to launch, you flip one switch in Stripe and it starts accepting real cards.

---

## What about Apple Pay and Google Pay?

These are included automatically through Stripe. When a customer visits the checkout on:

- An **iPhone or Mac** using Safari → they see an **Apple Pay** button (one tap, Face ID / Touch ID)
- An **Android phone or Chrome** → they see a **Google Pay** button

No extra setup needed. These payment methods make checkout even faster because customers don't need to type their card number.

---

## Why not Shop Pay (shop.app)?

**Shop Pay** is a fast-checkout button created by **Shopify** — the same company that runs thousands of online stores. It works like Apple Pay but saves your Shopify account details across all Shopify-powered stores.

The catch: **Shop Pay only works if your entire store is built on Shopify's platform.** Since this store is built as a custom website (not on Shopify), Shop Pay is not available.

**The good news:** Stripe's built-in tools are equivalent:

- **Apple Pay** — works on all Apple devices, just like Shop Pay but faster
- **Google Pay** — works on all Android devices
- **Stripe Link** — Stripe's own saved-card feature (customers save their card once, one-click everywhere)

In practice, customers experience the same one-tap checkout they're used to.

---

## Why not just use Shopify?

**Short answer:** You're not able to use Shop Pay on this custom site — it's locked to Shopify's platform. Stripe gives you Apple Pay + Google Pay + Stripe Link which covers the same ground. If you truly want Shop Pay, the only path is rebuilding the entire store on Shopify ($39+/month with extra per-transaction fees on top of Stripe's). For a custom site like this, Stripe is the better deal.

Here's the full comparison:

|                  | This custom site                        | Shopify                         |
| ---------------- | --------------------------------------- | ------------------------------- |
| Monthly cost     | $0 (hosting on Vercel is free to start) | $39–$399/month                  |
| Transaction fees | 2.9% + 30¢ (Stripe only)                | 2.9% + 30¢ + 0.5–2% Shopify fee |
| Design control   | Full — change anything                  | Limited to their themes         |
| Shop Pay         | ❌ Not available                        | ✅ Included                     |
| Built-in admin   | ❌ Not yet                              | ✅ Full dashboard               |
| Speed to launch  | Slower (custom build)                   | Faster (drag and drop)          |

If you want Shop Pay specifically, or you don't want to touch any code ever, Shopify is the right choice. If you want full control, lower fees, and the ability to build anything, this custom approach is better.

---

## Where does the site live?

Currently it runs on your local computer (only you can see it). When you're ready to share it with the world, you deploy it to **Vercel** — a hosting platform that:

- Hosts the site for free (up to a generous usage limit)
- Gives you a `.vercel.app` URL instantly
- Lets you connect a custom domain (e.g. `coastalgrannyscollective.co`)
- Deploys automatically every time you update the code

The whole deployment process takes about 5 minutes.

---

## What happens when someone places an order?

Here's the full chain of events, from "click Pay" to the order being safely recorded:

1. The customer clicks **Pay** on the checkout screen
2. Their card details go directly to Stripe — they never pass through our website's server (this is how Stripe keeps things secure)
3. Stripe charges the card and emails the customer a receipt automatically
4. Stripe then sends a private message to our server (called a **webhook**) saying "payment succeeded"
5. Our server verifies the message is really from Stripe (using a secret signature), then saves the order — including the customer's name, email, shipping address, and every item in their cart — to our database
6. The customer sees the order confirmation screen
7. The money appears in your Stripe account, typically paid out to your bank within 2 business days

**Why the webhook matters:** Without it, if a customer's internet cut out right after paying, we might never know the order went through. The webhook is Stripe calling our server directly — it doesn't depend on the customer's browser at all. Every order is safely recorded even if the browser crashes.

**The full payment loop is confirmed working end-to-end:**

1. ✅ Customer pays → Stripe charges the card
2. ✅ Stripe fires webhook → the server receives it
3. ✅ Server saves the order → record appears in Neon

When you go live, real orders will land in that same database the exact same way — you just swap the test keys for live keys.

**Where to see your orders:**

- **Admin Dashboard → Orders** (`/admin/orders`) — full order list with customer details, items, roast preferences, shipping address, and inline status editor
- **`npm run db:studio`** — opens a visual browser of your database locally at localhost:5555
- **Stripe Dashboard → Payments** — charge history with amounts and customer emails

What isn't built yet:

- An automated "your order has shipped" email (needs an email service like Resend or SendGrid)
- Inventory tracking / quantity limits
- Recurring subscription billing (currently charged as one-time payments)

---

## How do I test it before going live?

1. Make sure the site is running (`npm run dev` → open localhost:3000)
2. Add a coffee to your cart and go through checkout
3. Use the test card: **4242 4242 4242 4242**, any future expiry, any CVC
4. The payment will "succeed" without charging anyone
5. Check your Stripe dashboard → you'll see the test payment recorded there

When you're satisfied everything works, follow the going live checklist below.

---

## How do user accounts work?

Customers can create an account with their name, email, and a password. Passwords are scrambled (hashed) before being stored — even if someone broke into the database, they couldn't read anyone's password.

When a customer signs in, they get a secure login cookie that keeps them signed in for their session. This is the same approach used by Amazon, Google, and every major website.

**You have an admin account.** When you sign in to the site as the admin, you see an extra "Admin" link in the header. Clicking it takes you to a private dashboard showing:

- Total orders and revenue
- Number of registered customers
- A table of recent orders with every detail

Regular customers cannot access the admin area — they get redirected automatically.

---

## Going live checklist (when you're ready to take real orders)

**Already done ✅**

- Stripe receipt emails enabled (Dashboard → Settings → Customer emails → Successful payments)
- Full payment loop tested and confirmed working end-to-end in Stripe sandbox
- Orders saving to Neon database via webhook
- User accounts with secure password storage
- Admin dashboard — full product/content/order/user management
- Customer account dashboard with order history

**Still to do before launch:**

1. **Complete Stripe's business verification** — takes ~10 min. Stripe will ask for your business name, address, and bank account details so they know where to send the money.
2. **Change the support/receipt email in Stripe** — Go to Stripe Dashboard → Settings → Business → update the email address to the shop's real email (coastal granny's email).
3. **Deploy to Vercel** — see the README for step-by-step instructions.
4. **Register the production webhook in Stripe (live mode)** — Stripe's live and test modes have separate webhook lists. Add your production URL and update the webhook secret in Vercel.
5. **Flip to live keys** — in Vercel Settings, replace the test Stripe keys with live keys and redeploy.

That's it — real cards and real accounts start working immediately.

---

## Who built this and what technology does it use?

The site is built with:

- **Next.js** — the framework that powers the pages (used by companies like TikTok, Twitch, and The Washington Post)
- **TypeScript** — a version of JavaScript that catches mistakes before they reach customers
- **Tailwind CSS** — the styling system (makes it look good and responsive)
- **Stripe** — payments (card, Apple Pay, Google Pay)
- **PostgreSQL (Neon)** — the database where orders and user accounts are stored
- **Prisma** — the layer that talks to the database in a safe, structured way
- **NextAuth.js** — the industry-standard library for user login and sessions
- **Zustand** — keeps track of the shopping cart as you browse
- **Vercel** — where it's hosted

All of these are industry-standard tools used by professional engineering teams worldwide.
