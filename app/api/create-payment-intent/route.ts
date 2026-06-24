import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

interface CartItemInput {
  key: string;
  id: string;
  name: string;
  variant: string;
  price: number;
  qty: number;
}

interface PaymentIntentBody {
  amount: number;
  currency?: string;
  customerEmail?: string;
  customerName?: string;
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
    const { amount, currency = 'usd', customerEmail, customerName, shippingAddress, items } = body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const stripe = getStripeClient();

    // Build compact metadata — Stripe caps each value at 500 chars
    const itemsSummary = items
      ? JSON.stringify(
          items.map((i) => ({ id: i.id, n: i.name, v: i.variant, p: i.price, q: i.qty }))
        )
      : '';

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe works in cents
      currency,
      receipt_email: customerEmail,
      metadata: {
        customerEmail: customerEmail ?? '',
        customerName: customerName ?? '',
        shippingAddress: shippingAddress ? JSON.stringify(shippingAddress) : '',
        // Truncate if somehow over limit (safety net)
        items: itemsSummary.length <= 500 ? itemsSummary : itemsSummary.substring(0, 497) + '…',
      },
      automatic_payment_methods: { enabled: true },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
