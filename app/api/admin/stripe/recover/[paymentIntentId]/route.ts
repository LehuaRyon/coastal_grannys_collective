import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { fulfillOrder, buildFulfillOrderInputFromPaymentIntent } from '@/lib/orderFulfillment';

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key);
}

// Manual, on-demand version of what the release-stale-gift-card-holds cron
// does automatically after a couple hours — re-creates an order from a
// PaymentIntent that succeeded in Stripe but never got processed here,
// without an admin having to wait for the cron or touch the database by
// hand (this is exactly what was done manually via a one-off script the
// first two times this happened during development).
export async function POST(_req: Request, { params }: { params: Promise<{ paymentIntentId: string }> }) {
  const session = await auth();
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { paymentIntentId } = await params;

  const existing = await prisma.order.findUnique({ where: { stripePaymentId: paymentIntentId } });
  if (existing) {
    return NextResponse.json({ order: existing, message: 'Order already exists — nothing to recover.' });
  }

  const stripe = getStripeClient();
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (pi.status !== 'succeeded') {
    return NextResponse.json({ error: `PaymentIntent status is "${pi.status}", not succeeded — nothing to recover` }, { status: 400 });
  }

  const order = await fulfillOrder(buildFulfillOrderInputFromPaymentIntent(pi));
  return NextResponse.json({ order });
}
