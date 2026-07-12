import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getStripeClient } from '@/lib/subscriptions';

// Proactive version of the per-subscription Resync action — scans every
// currently-billing subscription's recent paid invoices for one with no
// matching fulfillment Order, the exact "customer was charged, webhook
// never told us, they got nothing" gap. Kept lightweight (checks only the
// most recent invoice per subscription, since a missed renewal from weeks
// ago would already have been caught by the next one firing correctly) —
// full historical recovery for a specific subscription is still available
// via that subscription's own Resync action, which checks more invoices.
const INVOICES_PER_SUBSCRIPTION = 2;

export async function GET() {
  const session = await auth();
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const subscriptions = await prisma.subscription.findMany({
    where: { status: { in: ['active', 'paused', 'past_due', 'unpaid'] } },
    include: { user: { select: { email: true } } },
  });

  if (subscriptions.length === 0) {
    return NextResponse.json({ missing: [] });
  }

  const stripe = getStripeClient();
  const missing: { subscriptionId: string; productName: string; customerEmail: string; invoiceId: string; amount: number; created: string }[] = [];

  for (const sub of subscriptions) {
    try {
      const invoices = await stripe.invoices.list({
        subscription: sub.stripeSubscriptionId,
        status: 'paid',
        limit: INVOICES_PER_SUBSCRIPTION,
      });
      for (const invoice of invoices.data) {
        const order = await prisma.order.findUnique({ where: { stripePaymentId: `sub_invoice_${invoice.id}` } });
        if (!order) {
          missing.push({
            subscriptionId: sub.id,
            productName: sub.productName,
            customerEmail: sub.user.email,
            invoiceId: invoice.id,
            amount: invoice.amount_paid / 100,
            created: new Date(invoice.created * 1000).toISOString(),
          });
        }
      }
    } catch (err) {
      console.error(`Could not scan invoices for subscription ${sub.id}:`, err);
    }
  }

  return NextResponse.json({ missing });
}
