import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { fulfillOrder, updateOrderStatus, buildFulfillOrderInputFromPaymentIntent, findOrderByPaymentIntentId } from '@/lib/orderFulfillment';
import { releaseGiftCardReservation } from '@/lib/giftCard';
import {
  sendEmail,
  sendSubscriptionPaymentFailedEmail,
  sendSubscriptionCanceledEmail,
} from '@/lib/email';
import { syncSubscriptionFromStripe, fulfillSubscriptionInvoice, getSubscriptionIdFromInvoice } from '@/lib/subscriptions';

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key);
}

export async function POST(request: NextRequest) {
  const body = await request.text(); // raw body required for signature verification
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set — add it to .env.local');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  // Verify the event came from Stripe (not a spoofed request)
  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    console.error('Webhook signature verification failed:', message);
    return NextResponse.json({ error: `Webhook error: ${message}` }, { status: 400 });
  }

  // Logged as soon as the signature checks out — before any processing —
  // so the admin dashboard's "Stripe last talked to us at X" reflects
  // Stripe reaching this endpoint at all, independent of whether handling
  // that specific event later succeeds or fails. upsert (not create) since
  // Stripe redelivers the same event id on retry.
  await prisma.stripeWebhookEvent
    .upsert({ where: { stripeEventId: event.id }, create: { stripeEventId: event.id, type: event.type }, update: {} })
    .catch((err) => console.error('Failed to log webhook event receipt:', err));

  // Handle events
  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(pi);
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.warn(`Payment failed for PaymentIntent ${pi.id}:`, pi.last_payment_error?.message);
        // Deliberately not releasing gift card holds here — Stripe commonly
        // reuses the same PaymentIntent for a retry after a declined card,
        // so a single failed attempt doesn't mean the checkout is dead. Only
        // payment_intent.canceled (explicitly terminal) or the
        // release-stale-gift-card-holds cron (abandoned long enough to be
        // safe) release the reservation — see GiftCardHold's doc comment.
        break;
      }

      case 'payment_intent.canceled': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await releaseHoldsForPaymentIntent(pi.id, 'payment intent canceled');
        break;
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        await handleDisputeCreated(dispute);
        break;
      }

      case 'charge.dispute.closed': {
        const dispute = event.data.object as Stripe.Dispute;
        await handleDisputeClosed(dispute);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        if (charge.payment_intent) {
          const order = await findOrderByPaymentIntentId(charge.payment_intent as string);
          if (order) {
            // Gift card money never touches Stripe, so a refund only implies
            // anything about gift card balances once the ENTIRE card-charged
            // portion has been refunded — a partial refund (e.g. $5 back for
            // a shipping issue on a $48 order) shouldn't restore/void the
            // full amount. amount_refunded is cumulative, so this correctly
            // detects "eventually fully refunded" across multiple partials.
            const isFullRefund = charge.amount_refunded >= charge.amount;
            const refundedDollars = charge.amount_refunded / 100;
            await updateOrderStatus(order.id, isFullRefund ? 'refunded' : 'partially_refunded', refundedDollars);
            console.log(
              `Order ${isFullRefund ? 'refunded' : 'partially refunded'} ($${refundedDollars}) for PaymentIntent ${charge.payment_intent}`
            );
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscriptionFromStripe(sub);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(sub);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await fulfillSubscriptionInvoice(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      default:
        // Unhandled event types are fine — Stripe sends many we don't need
        break;
    }
  } catch (err) {
    console.error(`Error handling Stripe event ${event.type}:`, err);
    // Return 500 so Stripe retries the webhook
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentSucceeded(pi: Stripe.PaymentIntent) {
  // A subscription's invoice charge is ALSO a PaymentIntent that fires this
  // same event — Stripe creates it internally when finalizing the invoice,
  // without any of our custom metadata (this API version doesn't expose a
  // top-level pi.invoice field to check directly; metadata.items is always
  // set for a real one-time cart checkout, and never set on Stripe's own
  // auto-created ones, so its absence is a reliable signal). Without this
  // guard, every subscription signup/renewal created a second, orphaned,
  // customer-less Order alongside the real one fulfillSubscriptionInvoice
  // creates via invoice.paid — found via a live refund test where the
  // webhook updated the wrong (orphan) order instead of the real one.
  if (!pi.metadata.items) {
    return;
  }
  await fulfillOrder(buildFulfillOrderInputFromPaymentIntent(pi));
}

// Restores any still-pending GiftCardHold rows for a PaymentIntent that
// didn't end in success — a declined card, or Stripe canceling an intent —
// so the customer's gift card balance isn't stuck reserved for money that
// was never actually taken.
async function releaseHoldsForPaymentIntent(paymentIntentId: string, reason: string) {
  const holds = await prisma.giftCardHold.findMany({
    where: { paymentIntentId, status: 'pending' },
  });
  for (const hold of holds) {
    await releaseGiftCardReservation(hold.giftCardId, hold.amount);
    await prisma.giftCardHold.update({
      where: { id: hold.id },
      data: { status: 'released', resolvedAt: new Date() },
    });
  }
  if (holds.length > 0) {
    console.log(`Released ${holds.length} gift card hold(s) for PaymentIntent ${paymentIntentId} (${reason})`);
  }
}

// A dispute means the cardholder's bank pulled the money back directly,
// bypassing our normal refund flow entirely — without this, a chargeback
// would never restore redeemed gift card balances or void purchased ones.
async function handleDisputeCreated(dispute: Stripe.Dispute) {
  const paymentIntentId =
    typeof dispute.payment_intent === 'string' ? dispute.payment_intent : dispute.payment_intent?.id;
  if (!paymentIntentId) return;

  const order = await findOrderByPaymentIntentId(paymentIntentId);
  if (!order) {
    console.warn(`Dispute ${dispute.id} created for unknown PaymentIntent ${paymentIntentId}`);
    return;
  }

  const dueBy = dispute.evidence_details?.due_by ? new Date(dispute.evidence_details.due_by * 1000) : null;

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: 'disputed',
      disputeId: dispute.id,
      disputeReason: dispute.reason,
      disputeStatus: dispute.status,
      disputeDueBy: dueBy,
    },
  });

  console.log(`Order ${order.id} disputed ($${(dispute.amount / 100).toFixed(2)}, reason: ${dispute.reason})`);

  if (process.env.NOTIFY_EMAIL) {
    try {
      await sendEmail({
        to: process.env.NOTIFY_EMAIL,
        subject: `Chargeback opened — $${(dispute.amount / 100).toFixed(2)} (order ${order.id})`,
        text: [
          `A customer disputed a charge through their bank rather than requesting a refund.`,
          '',
          `Order: ${order.id}`,
          `Customer: ${order.customerName ?? 'Guest'} <${order.customerEmail ?? 'no email'}>`,
          `Amount disputed: $${(dispute.amount / 100).toFixed(2)}`,
          `Reason given by the bank: ${dispute.reason}`,
          dueBy ? `Evidence due by: ${dueBy.toDateString()}` : null,
          '',
          `Review it at /admin/orders — if you don't respond with evidence before the due date, the dispute is automatically lost and the charge stays reversed.`,
        ].filter((l): l is string => l !== null).join('\n'),
      });
    } catch (err) {
      console.error(`Failed to send dispute alert for order ${order.id}:`, err);
    }
  }
}

// Terminal event — Stripe will never bill this subscription again (either
// canceled immediately, or a cancel_at_period_end finally took effect).
async function handleSubscriptionDeleted(stripeSub: Stripe.Subscription) {
  const dbSub = await prisma.subscription.update({
    where: { stripeSubscriptionId: stripeSub.id },
    data: { status: 'canceled', canceledAt: new Date() },
  }).catch(() => null);
  if (!dbSub) return;

  const user = await prisma.user.findUnique({ where: { id: dbSub.userId }, select: { email: true, firstName: true, lastName: true } });
  if (user) {
    try {
      await sendSubscriptionCanceledEmail({
        to: user.email,
        customerName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || null,
        productName: dbSub.productName,
      });
    } catch (err) {
      console.error(`Failed to send cancellation email for subscription ${dbSub.id}:`, err);
    }
  }
}

// A renewal charge failing — status sync to past_due happens via
// customer.subscription.updated (fired alongside this); this handler is
// purely responsible for telling the customer before a delivery silently
// doesn't show up.
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = getSubscriptionIdFromInvoice(invoice);
  if (!subscriptionId) return;

  const dbSub = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: subscriptionId } });
  if (!dbSub) return;

  const user = await prisma.user.findUnique({ where: { id: dbSub.userId } });
  if (!user) return;

  try {
    await sendSubscriptionPaymentFailedEmail({
      to: user.email,
      customerName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || null,
      productName: dbSub.productName,
    });
  } catch (err) {
    console.error(`Failed to send payment-failed email for subscription ${dbSub.id}:`, err);
  }

  if (process.env.NOTIFY_EMAIL) {
    try {
      await sendEmail({
        to: process.env.NOTIFY_EMAIL,
        subject: `Subscription renewal payment failed — ${dbSub.productName}`,
        text: `${user.email}'s renewal payment for ${dbSub.productName} ($${dbSub.price.toFixed(2)}) failed. Stripe will retry automatically.`,
      });
    } catch (err) {
      console.error('Failed to send admin alert for failed subscription payment:', err);
    }
  }
}

// Stripe resolves a dispute days/weeks later — "lost" means the chargeback
// stands (money is gone for good, same as a full refund) so it gets the
// same gift card reconciliation; "won" means we keep the funds and the
// order just goes back to normal.
async function handleDisputeClosed(dispute: Stripe.Dispute) {
  const paymentIntentId =
    typeof dispute.payment_intent === 'string' ? dispute.payment_intent : dispute.payment_intent?.id;
  if (!paymentIntentId) return;

  const order = await findOrderByPaymentIntentId(paymentIntentId);
  if (!order) return;

  if (dispute.status === 'lost') {
    await updateOrderStatus(order.id, 'refunded', dispute.amount / 100);
    await prisma.order.update({ where: { id: order.id }, data: { disputeStatus: 'lost' } });
    console.log(`Dispute ${dispute.id} lost — order ${order.id} reconciled like a refund`);
  } else if (dispute.status === 'won') {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'paid', disputeStatus: 'won' },
    });
    console.log(`Dispute ${dispute.id} won — order ${order.id} restored to paid`);
  } else {
    // warning_closed / other non-terminal outcomes — just record the status
    await prisma.order.update({ where: { id: order.id }, data: { disputeStatus: dispute.status } });
  }
}
