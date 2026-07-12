import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key);
}

// Looks up a Stripe payment regardless of age — the orphaned-payments
// banner on /admin/orders only scans the last 14 days, so this is what
// handles "a customer says they paid months ago and it's not in my
// system." Accepts either a PaymentIntent id (exact, instant) or an email
// (Stripe's Search API, which can lag a few seconds to minutes behind
// very recent activity — fine here since this tool is for older lookups;
// recent ones are already covered by the orphan scan).
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q) {
    return NextResponse.json({ error: 'Enter a PaymentIntent id or email' }, { status: 400 });
  }

  const stripe = getStripeClient();
  let paymentIntents: Stripe.PaymentIntent[] = [];

  try {
    if (q.startsWith('pi_')) {
      const pi = await stripe.paymentIntents.retrieve(q);
      paymentIntents = [pi];
    } else {
      // receipt_email is not a supported search field for payment_intents
      // (Stripe rejects the query outright) — metadata.customerEmail alone
      // is sufficient since every PaymentIntent this app creates sets it.
      const result = await stripe.paymentIntents.search({
        query: `metadata['customerEmail']:'${q}'`,
        limit: 10,
      });
      paymentIntents = result.data;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Search failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const existingOrders = await prisma.order.findMany({
    where: { stripePaymentId: { in: paymentIntents.map((pi) => pi.id) } },
    select: { id: true, stripePaymentId: true },
  });
  const orderByPaymentId = new Map(existingOrders.map((o) => [o.stripePaymentId, o.id]));

  const results = paymentIntents.map((pi) => ({
    id: pi.id,
    amount: pi.amount / 100,
    currency: pi.currency,
    status: pi.status,
    created: new Date(pi.created * 1000).toISOString(),
    customerEmail: pi.metadata?.customerEmail || pi.receipt_email || null,
    lastError: pi.last_payment_error?.message ?? null,
    orderId: orderByPaymentId.get(pi.id) ?? null,
  }));

  return NextResponse.json({ results });
}
