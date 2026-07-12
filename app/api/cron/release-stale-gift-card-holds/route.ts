import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { fulfillOrder, buildFulfillOrderInputFromPaymentIntent } from '@/lib/orderFulfillment';
import { releaseGiftCardReservation } from '@/lib/giftCard';
import { sendEmail } from '@/lib/email';

// Holds younger than this are left alone — a normal checkout (entering
// card details, 3DS, etc.) takes minutes, not hours, so anything still
// pending past this age is either abandoned or something went wrong.
const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key);
}

// Runs daily via Vercel Cron (see vercel.json) as the safety net for the
// gift card reservation system (see GiftCardHold): every PaymentIntent that
// applies a gift card gets a hold the instant it's created, settled by the
// webhook once payment resolves. Two things can leave a hold stuck pending:
//   1. The customer abandons checkout (closes the tab, never submits a
//      card) — no webhook ever fires for an intent that was never
//      attempted, so the reservation just sits there. This sweep restores
//      the balance once it's old enough to safely call abandoned.
//   2. The webhook itself never landed (endpoint misconfigured, or —
//      locally — `stripe listen` wasn't running) even though the payment
//      genuinely succeeded. Rather than the money silently vanishing into a
//      gift card hold with no order (which happened twice by hand this
//      project before this cron existed), this sweep detects that exact
//      state from Stripe's side and recovers the order automatically.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const stale = await prisma.giftCardHold.findMany({
    where: { status: 'pending', createdAt: { lte: new Date(Date.now() - STALE_THRESHOLD_MS) } },
  });

  const paymentIntentIds = Array.from(new Set(stale.map((h) => h.paymentIntentId)));
  let recovered = 0;
  let released = 0;
  const recoveredOrders: string[] = [];

  if (paymentIntentIds.length > 0) {
    const stripe = getStripeClient();

    for (const paymentIntentId of paymentIntentIds) {
      const holds = stale.filter((h) => h.paymentIntentId === paymentIntentId);

      let pi: Stripe.PaymentIntent;
      try {
        pi = await stripe.paymentIntents.retrieve(paymentIntentId);
      } catch (err) {
        console.error(`Could not retrieve PaymentIntent ${paymentIntentId} while sweeping stale holds:`, err);
        continue;
      }

      if (pi.status === 'succeeded') {
        const existingOrder = await prisma.order.findUnique({ where: { stripePaymentId: paymentIntentId } });
        if (existingOrder) {
          // Order already exists but its holds were never marked consumed —
          // shouldn't happen (fulfillOrder does both in the same call), but
          // don't silently mutate an ambiguous state; flag for manual review.
          console.warn(`PaymentIntent ${paymentIntentId} has an order but ${holds.length} hold(s) still pending — leaving for manual review`);
          continue;
        }
        // Payment succeeded but no order was ever created — the webhook
        // missed this one. Recover it exactly as if the webhook had fired.
        try {
          await fulfillOrder(buildFulfillOrderInputFromPaymentIntent(pi));
          recovered++;
          recoveredOrders.push(paymentIntentId);
        } catch (err) {
          console.error(`Auto-recovery failed for PaymentIntent ${paymentIntentId}:`, err);
        }
      } else {
        // Not succeeded and old enough to call abandoned (declined and
        // never retried, or the customer just never came back) — release.
        for (const hold of holds) {
          await releaseGiftCardReservation(hold.giftCardId, hold.amount);
          await prisma.giftCardHold.update({
            where: { id: hold.id },
            data: { status: 'released', resolvedAt: new Date() },
          });
          released++;
        }
      }
    }
  }

  if (recoveredOrders.length > 0 && process.env.NOTIFY_EMAIL) {
    try {
      await sendEmail({
        to: process.env.NOTIFY_EMAIL,
        subject: `Auto-recovered ${recoveredOrders.length} order(s) that Stripe processed but the webhook missed`,
        text: [
          `${recoveredOrders.length} payment(s) succeeded in Stripe but never created an order here — the webhook that should have processed them apparently never fired.`,
          '',
          ...recoveredOrders.map((id) => `PaymentIntent: ${id}`),
          '',
          `These have now been recovered automatically — no action needed for these specific orders. But if this keeps happening, check that the Stripe webhook endpoint is registered and reachable (in production) or that \`stripe listen\` is running (locally).`,
        ].join('\n'),
      });
    } catch (err) {
      console.error('Failed to send hold-recovery alert:', err);
    }
  }

  await prisma.cronRun.create({
    data: { job: 'release-stale-gift-card-holds', checked: paymentIntentIds.length, sent: recovered + released },
  });

  console.log(`Stale gift card hold sweep: ${paymentIntentIds.length} PaymentIntent(s) checked, ${recovered} order(s) recovered, ${released} hold(s) released`);
  return NextResponse.json({ checked: paymentIntentIds.length, recovered, released });
}
