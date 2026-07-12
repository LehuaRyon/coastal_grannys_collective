import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/db';
import { GIFT_CARD_ELIGIBLE_TYPES } from '@/lib/giftCard';
import { fulfillOrder } from '@/lib/orderFulfillment';

const MAX_GIFT_CARDS_PER_ORDER = 5;
// Stripe requires a minimum $0.50 card charge. Anything below that after
// gift card discounts is treated as fully covered — see the zero-charge
// branch below.
const STRIPE_MIN_CHARGE = 0.5;

interface CartItemInput {
  key: string;
  id: string;
  type?: string;
  name: string;
  variant: string;
  price: number;
  qty: number;
  giftRecipientEmail?: string;
  giftMessage?: string;
  giftDeliverOn?: string;
}

interface PaymentIntentBody {
  amount: number;
  /** Portion of `amount` that's shipping — gift cards pay this down only after eligible product cost is covered. */
  shippingCost?: number;
  currency?: string;
  customerEmail?: string;
  customerName?: string;
  giftCardCodes?: string[];
  shippingAddress?: {
    address: string;
    apt: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  items?: CartItemInput[];
}

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      'STRIPE_SECRET_KEY is not set. Add it to .env.local — see .env.local.example for instructions.'
    );
  }
  return new Stripe(key);
}

export async function POST(request: NextRequest) {
  try {
    const body: PaymentIntentBody = await request.json();
    const { amount, shippingCost = 0, currency = 'usd', customerEmail, customerName, giftCardCodes, shippingAddress, items } = body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Gift card redemption — server is authoritative on both the real
    // balances and which cart items are eligible (coffee & merch only,
    // never subscriptions or other gift cards), so a client can't fabricate
    // a discount. `amount` above is the pre-discount total. Cards are
    // applied greedily in the order given: each pays down eligible product
    // cost first, then — once that's fully covered — any balance left over
    // spills into paying shipping too, so a card that covers everything
    // results in a true $0 order rather than shipping still being owed.
    const eligibleSubtotal = (items ?? [])
      .filter((i) => i.type && GIFT_CARD_ELIGIBLE_TYPES.has(i.type))
      .reduce((sum, i) => sum + i.price * i.qty, 0);

    const uniqueCodes = Array.from(
      new Set((giftCardCodes ?? []).map((c) => c.trim().toUpperCase()).filter(Boolean))
    ).slice(0, MAX_GIFT_CARDS_PER_ORDER);

    const redemptions: { code: string; amount: number }[] = [];
    let remainingProduct = eligibleSubtotal;
    let remainingShipping = shippingCost;
    for (const code of uniqueCodes) {
      if (remainingProduct <= 0 && remainingShipping <= 0) break;
      const giftCard = await prisma.giftCard.findUnique({ where: { code } });
      if (!giftCard || !giftCard.delivered || giftCard.balance <= 0) continue;
      let balanceLeft = giftCard.balance;
      let used = 0;
      if (remainingProduct > 0) {
        const use = Math.min(balanceLeft, remainingProduct);
        used += use;
        remainingProduct -= use;
        balanceLeft -= use;
      }
      if (remainingProduct <= 0 && remainingShipping > 0 && balanceLeft > 0) {
        const use = Math.min(balanceLeft, remainingShipping);
        used += use;
        remainingShipping -= use;
        balanceLeft -= use;
      }
      if (used > 0) redemptions.push({ code, amount: used });
    }

    const totalDiscount = redemptions.reduce((sum, r) => sum + r.amount, 0);
    const remaining = Math.max(0, amount - totalDiscount);

    // Build compact metadata / order items shared by both branches below
    const compactItems = (items ?? []).map((i) => ({ id: i.id, n: i.name, v: i.variant, p: i.price, q: i.qty }));
    const giftPurchases = (items ?? [])
      .map((i, idx) =>
        i.giftRecipientEmail
          ? { idx, email: i.giftRecipientEmail, msg: i.giftMessage ?? '', deliverOn: i.giftDeliverOn }
          : null
      )
      .filter(
        (x): x is { idx: number; email: string; msg: string; deliverOn: string | undefined } => x !== null
      );

    // Fully covered by gift card balance — skip Stripe entirely rather than
    // force an unchargeable sub-$0.50 card payment.
    if (remaining < STRIPE_MIN_CHARGE) {
      const order = await fulfillOrder({
        stripePaymentId: `giftcard_${randomUUID()}`,
        amount: 0,
        currency,
        customerEmail: customerEmail ?? null,
        customerName: customerName ?? null,
        shippingAddress: shippingAddress ?? null,
        items: compactItems,
        giftPurchases,
        giftRedemptions: redemptions,
      });
      return NextResponse.json({ fullyCovered: true, orderId: order.id, amount: 0 });
    }

    const stripe = getStripeClient();

    const itemsSummary = JSON.stringify(compactItems);

    // Gift card recipient email + personal message travel in a separate metadata
    // field (not the `items` blob above) so a long message can't truncate and
    // corrupt the JSON for every line item in the order. Keyed by index into
    // `items` (not product id) since two different gift cards of the same
    // amount — e.g. two $25 cards to two different recipients — share an id.
    let giftDetailsSummary = giftPurchases.length ? JSON.stringify(giftPurchases) : '';
    if (giftDetailsSummary.length > 500) {
      // Drop messages first, then hard-truncate as a last resort
      giftDetailsSummary = JSON.stringify(giftPurchases.map(({ idx, email }) => ({ idx, email })));
      if (giftDetailsSummary.length > 500) {
        giftDetailsSummary = giftDetailsSummary.substring(0, 497) + '…';
      }
    }

    let redeemGiftCardsSummary = redemptions.length ? JSON.stringify(redemptions) : '';
    if (redeemGiftCardsSummary.length > 500) {
      redeemGiftCardsSummary = redeemGiftCardsSummary.substring(0, 497) + '…';
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(remaining * 100), // Stripe works in cents
      currency,
      receipt_email: customerEmail,
      metadata: {
        customerEmail: customerEmail ?? '',
        customerName: customerName ?? '',
        shippingAddress: shippingAddress ? JSON.stringify(shippingAddress) : '',
        // Truncate if somehow over limit (safety net)
        items: itemsSummary.length <= 500 ? itemsSummary : itemsSummary.substring(0, 497) + '…',
        giftDetails: giftDetailsSummary,
        redeemGiftCards: redeemGiftCardsSummary,
      },
      // Explicit list instead of automatic_payment_methods — restricts checkout to
      // Card (Apple Pay / Google Pay show automatically inside it via the `wallets`
      // option on PaymentElement) instead of surfacing every method enabled in the
      // Stripe Dashboard (bank transfers, Cash App Pay, Affirm, Link, etc.).
      payment_method_types: ['card'],
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret, amount: remaining });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
