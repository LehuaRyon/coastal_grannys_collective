import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

const LOOKBACK_DAYS = 14;

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key);
}

// Cross-references recent succeeded Stripe PaymentIntents against our own
// Order table — anything succeeded-in-Stripe-but-missing-here means the
// webhook never processed it (endpoint down, or locally `stripe listen`
// wasn't running). The daily cron already recovers these automatically once
// they're a couple hours old; this just lets an admin see and fix it
// immediately without waiting, and without ever opening the Stripe
// Dashboard to notice the payment happened at all.
export async function GET() {
  const session = await auth();
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stripe = getStripeClient();
  const since = Math.floor((Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000) / 1000);

  const succeeded: Stripe.PaymentIntent[] = [];
  let startingAfter: string | undefined;
  for (let page = 0; page < 5; page++) {
    const list = await stripe.paymentIntents.list({ limit: 100, created: { gte: since }, starting_after: startingAfter });
    for (const pi of list.data) {
      if (pi.status === 'succeeded') succeeded.push(pi);
    }
    if (!list.has_more) break;
    startingAfter = list.data[list.data.length - 1]?.id;
  }

  if (succeeded.length === 0) {
    return NextResponse.json({ orphaned: [] });
  }

  const existingOrders = await prisma.order.findMany({
    where: { stripePaymentId: { in: succeeded.map((pi) => pi.id) } },
    select: { stripePaymentId: true },
  });
  const existingIds = new Set(existingOrders.map((o) => o.stripePaymentId));

  const orphaned = succeeded
    .filter((pi) => !existingIds.has(pi.id))
    .map((pi) => ({
      id: pi.id,
      amount: pi.amount / 100,
      currency: pi.currency,
      createdAt: new Date(pi.created * 1000).toISOString(),
      customerEmail: pi.metadata?.customerEmail || null,
      customerName: pi.metadata?.customerName || null,
    }));

  return NextResponse.json({ orphaned });
}
