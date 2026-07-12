import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getStripeClient, syncSubscriptionFromStripe, fulfillSubscriptionInvoice } from '@/lib/subscriptions';

// Manual recovery for a subscription whose webhooks may have been missed —
// the exact same failure mode ("stripe listen wasn't running locally" /
// endpoint unreachable in production) that has hit this project's one-time
// orders more than once. Does two things, both idempotent and safe to run
// repeatedly:
//   1. Re-syncs status/period-end/cancel-at-period-end from a live retrieve
//      (same logic customer.subscription.updated uses).
//   2. Scans this subscription's recent PAID invoices and creates any
//      fulfillment Order that's missing — the case where a renewal charge
//      succeeded but invoice.paid never reached us, so the customer paid
//      and got nothing.
const RECENT_INVOICES_TO_CHECK = 12;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const sub = await prisma.subscription.findUnique({ where: { id } });
  if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });

  const stripe = getStripeClient();
  let stripeSub;
  try {
    stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not reach Stripe';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const synced = await syncSubscriptionFromStripe(stripeSub);

  const invoices = await stripe.invoices.list({
    subscription: sub.stripeSubscriptionId,
    status: 'paid',
    limit: RECENT_INVOICES_TO_CHECK,
  });

  let recovered = 0;
  for (const invoice of invoices.data) {
    const result = await fulfillSubscriptionInvoice(invoice);
    if (result.created) recovered++;
  }

  return NextResponse.json({
    statusSynced: synced,
    status: stripeSub.status,
    invoicesChecked: invoices.data.length,
    ordersRecovered: recovered,
  });
}
