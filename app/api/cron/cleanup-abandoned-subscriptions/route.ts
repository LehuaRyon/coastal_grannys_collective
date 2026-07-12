import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStripeClient, syncSubscriptionFromStripe, fulfillSubscriptionInvoice } from '@/lib/subscriptions';

// Holds younger than this are left alone — Stripe's own PaymentElement
// checkout takes minutes, not hours, so anything still 'incomplete' past
// this age is either abandoned (customer never confirmed payment) or
// genuinely stuck.
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

// Runs daily via Vercel Cron (see vercel.json). A subscription created with
// payment_behavior: 'default_incomplete' (see /api/subscriptions/create)
// sits in our DB as status 'incomplete' the moment it's created — before
// the customer has actually confirmed payment. Two things can leave it
// stuck there:
//   1. The customer abandons signup mid-payment (closes the tab). Stripe
//      itself auto-expires the subscription around 23h if the first
//      invoice never gets paid — this sweep mirrors that into our DB so an
//      abandoned signup doesn't sit around forever looking "pending."
//   2. The customer DID pay, but the webhook that would tell us never
//      arrived (the same "stripe listen wasn't running" / endpoint
//      unreachable failure mode this project has hit before). Rather than
//      that money silently vanishing into a subscription with no order —
//      exactly what happened with one-time orders before that recovery
//      tool existed — this sweep detects the real Stripe state and
//      recovers it automatically, same as the Resync admin action.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const stale = await prisma.subscription.findMany({
    where: { status: 'incomplete', createdAt: { lte: new Date(Date.now() - STALE_THRESHOLD_MS) } },
  });

  let recovered = 0;
  let expired = 0;

  if (stale.length > 0) {
    const stripe = getStripeClient();

    for (const sub of stale) {
      let stripeSub;
      try {
        stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
      } catch (err) {
        console.error(`Could not retrieve subscription ${sub.stripeSubscriptionId} while sweeping abandoned signups:`, err);
        continue;
      }

      if (stripeSub.status === 'active' || stripeSub.status === 'trialing') {
        // Paid, but our webhook missed it — recover exactly like a manual Resync.
        await syncSubscriptionFromStripe(stripeSub);
        const invoices = await stripe.invoices.list({ subscription: sub.stripeSubscriptionId, status: 'paid', limit: 5 });
        for (const invoice of invoices.data) {
          const result = await fulfillSubscriptionInvoice(invoice);
          if (result.created) recovered++;
        }
      } else if (stripeSub.status === 'incomplete') {
        // Still genuinely unpaid after 24h — Stripe hasn't expired it yet
        // on its own; cancel it explicitly rather than leaving it billable
        // indefinitely with a stale price_data line item.
        await stripe.subscriptions.cancel(sub.stripeSubscriptionId).catch((err) =>
          console.error(`Could not cancel abandoned subscription ${sub.stripeSubscriptionId}:`, err)
        );
        await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'incomplete_expired', canceledAt: new Date() } });
        expired++;
      } else {
        // Already incomplete_expired / canceled on Stripe's side — just mirror it.
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: stripeSub.status === 'canceled' ? 'canceled' : 'incomplete_expired', canceledAt: new Date() },
        });
        expired++;
      }
    }
  }

  await prisma.cronRun.create({
    data: { job: 'cleanup-abandoned-subscriptions', checked: stale.length, sent: recovered + expired },
  });

  console.log(`Abandoned subscription sweep: ${stale.length} checked, ${recovered} order(s) recovered, ${expired} expired`);
  return NextResponse.json({ checked: stale.length, recovered, expired });
}
