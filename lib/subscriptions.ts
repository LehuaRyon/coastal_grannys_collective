import Stripe from 'stripe';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import {
  sendSubscriptionConfirmationEmail,
  sendSubscriptionRenewalEmail,
} from '@/lib/email';

export function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key);
}

/**
 * Loads a Subscription and verifies the logged-in session owns it — shared
 * by pause/resume/cancel so a subscription id can never be used to act on
 * someone else's billing by guessing/enumerating ids.
 */
export async function requireOwnedSubscription(subscriptionId: string) {
  const session = await auth();
  if (!session?.user?.email) {
    return { error: 'Unauthorized' as const, status: 401 as const };
  }
  const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
  if (!sub) {
    return { error: 'Subscription not found' as const, status: 404 as const };
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || sub.userId !== user.id) {
    return { error: 'Not your subscription' as const, status: 403 as const };
  }
  return { sub, user };
}

// This API version nests the subscription reference under
// invoice.parent.subscription_details.subscription rather than a top-level
// invoice.subscription field — confirmed directly against a real invoice
// object during development rather than assumed from general docs, since
// this account's API version (2026-05-27.dahlia) restructured Invoice
// enough that several commonly-documented fields (payment_intent included)
// aren't where older examples expect them.
export function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const details = invoice.parent?.subscription_details;
  if (!details?.subscription) return null;
  return typeof details.subscription === 'string' ? details.subscription : details.subscription.id;
}

/**
 * The single source of truth for keeping our Subscription row in sync with
 * Stripe's — status, current period end, cancel-at-period-end. Shared by
 * the customer.subscription.updated webhook handler AND the admin "Resync
 * from Stripe" recovery action, so a missed webhook has a manual fix that
 * runs the exact same logic rather than a parallel, potentially-divergent
 * implementation. Deliberately sends no emails itself (multiple events can
 * fire around the same transition; email-sending lives in more specific
 * handlers to avoid duplicates). Silently no-ops for a subscription id we
 * don't have a row for — e.g. one created directly in the Stripe Dashboard
 * rather than through this app, which is out of scope for now.
 */
export async function syncSubscriptionFromStripe(stripeSub: Stripe.Subscription): Promise<boolean> {
  const dbSub = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: stripeSub.id } });
  if (!dbSub) return false;

  const periodEndSeconds = stripeSub.items.data[0]?.current_period_end;
  const isPaused = !!stripeSub.pause_collection;

  await prisma.subscription.update({
    where: { id: dbSub.id },
    data: {
      // Stripe itself keeps status "active" while pause_collection is set —
      // we surface "paused" as our own distinct status since that's what
      // the customer and admin actually need to see.
      status: isPaused ? 'paused' : stripeSub.status,
      currentPeriodEnd: periodEndSeconds ? new Date(periodEndSeconds * 1000) : null,
      cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
      pausedAt: isPaused ? (dbSub.pausedAt ?? new Date()) : null,
    },
  });
  return true;
}

/**
 * Attempts to pay a subscription's current open invoice right now, using
 * whatever payment method is currently the default — rather than waiting
 * for Stripe's own Smart Retry schedule (which can take days). Used both
 * right after a customer updates their card (so fixing the card actually
 * unblocks them immediately instead of leaving them stuck at past_due
 * until the next scheduled retry) and as a standalone admin action for
 * phone-support cases ("customer says their card is fixed, try again now").
 * A no-op (not an error) if there's nothing open to pay — most commonly
 * because a webhook already caught up between the customer clicking and
 * this running. Any real decline is surfaced as a thrown error with
 * Stripe's own message, since "still declined" is useful to show the caller.
 */
export async function retryLatestInvoice(stripeSubscriptionId: string): Promise<{ attempted: boolean; paid: boolean }> {
  const stripe = getStripeClient();
  const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId, { expand: ['latest_invoice'] });
  const invoice = stripeSub.latest_invoice;
  if (!invoice || typeof invoice === 'string' || invoice.status !== 'open' || !invoice.id) {
    return { attempted: false, paid: false };
  }
  const paid = await stripe.invoices.pay(invoice.id);
  return { attempted: true, paid: paid.status === 'paid' };
}

// This API version surfaces a paid invoice's real PaymentIntent (or Charge,
// for the rare non-PI payment types) under invoice.payments — NOT a
// top-level invoice.payment_intent field, which doesn't exist here (same
// restructuring as getSubscriptionIdFromInvoice above). Confirmed live
// against real paid test-mode invoices: invoices.retrieve with
// `expand: ['payments.data.payment.payment_intent']` reliably populates
// it (a naive `data.payments.data.payment.payment_intent` expand on a LIST
// call exceeds Stripe's 4-level expand depth limit — must retrieve one
// invoice at a time). Needed because the Order this app creates for a
// subscription cycle uses a synthetic `sub_invoice_<id>` as its
// idempotency key (Order.stripePaymentId), which Stripe won't recognize
// as a real charge for a refund call — this resolves the real id to store
// separately (Order.stripeChargeId) so refunds/receipt lookups have
// something that actually works.
async function resolveRealChargeId(stripe: Stripe, invoiceId: string): Promise<string | null> {
  try {
    const invoice = await stripe.invoices.retrieve(invoiceId, { expand: ['payments.data.payment.payment_intent'] });
    const payment = invoice.payments?.data?.[0]?.payment;
    if (!payment) return null;
    const pi = payment.payment_intent;
    if (pi) return typeof pi === 'string' ? pi : pi.id;
    const charge = payment.charge;
    if (charge) return typeof charge === 'string' ? charge : charge.id;
    return null;
  } catch (err) {
    console.error(`Could not resolve real charge id for invoice ${invoiceId}:`, err);
    return null;
  }
}

/**
 * The actual fulfillment trigger — every successful invoice (the first
 * cycle included) creates a real Order for that cycle, reusing every
 * existing Order admin/customer view instead of a parallel "shipment"
 * concept. Idempotent: safe to call more than once for the same invoice —
 * the Order.stripePaymentId unique constraint (synthetic sub_invoice_<id>)
 * means a duplicate attempt just returns { created: false } rather than
 * double-billing. Shared by the invoice.paid webhook handler AND the
 * missing-fulfillment recovery scan, so a renewal whose webhook never
 * arrived gets recovered with the exact same order-creation + email logic
 * as the normal path — including the customer actually being notified,
 * just later than usual.
 */
export async function fulfillSubscriptionInvoice(invoice: Stripe.Invoice): Promise<{ created: boolean; orderId?: string }> {
  const subscriptionId = getSubscriptionIdFromInvoice(invoice);
  if (!subscriptionId) return { created: false };

  const dbSub = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: subscriptionId } });
  if (!dbSub) return { created: false };

  const syntheticPaymentId = `sub_invoice_${invoice.id}`;
  const existing = await prisma.order.findUnique({ where: { stripePaymentId: syntheticPaymentId } });
  if (existing) {
    // Backfills stripeChargeId on orders created before this field existed,
    // so Resync doubles as a one-time repair for "can't refund this
    // subscription order" on older data — no separate migration/script needed.
    if (!existing.stripeChargeId && invoice.id) {
      const stripeChargeId = await resolveRealChargeId(getStripeClient(), invoice.id);
      if (stripeChargeId) {
        await prisma.order.update({ where: { id: existing.id }, data: { stripeChargeId } });
      }
    }
    return { created: false, orderId: existing.id };
  }

  const user = await prisma.user.findUnique({ where: { id: dbSub.userId } });
  const shippingAddress = dbSub.shippingAddress as Record<string, string> | null;
  const cycleNumber = (await prisma.order.count({ where: { subscriptionId: dbSub.id } })) + 1;
  const stripeChargeId = invoice.id ? await resolveRealChargeId(getStripeClient(), invoice.id) : null;

  const order = await prisma.order.create({
    data: {
      stripePaymentId: syntheticPaymentId,
      stripeChargeId,
      amount: invoice.amount_paid / 100,
      currency: invoice.currency,
      status: 'paid',
      customerEmail: user?.email ?? null,
      customerName: user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || null : null,
      shippingAddress: shippingAddress as unknown as object,
      userId: dbSub.userId,
      subscriptionId: dbSub.id,
      subscriptionCycleNumber: cycleNumber,
      items: {
        create: [
          {
            productId: dbSub.productId,
            name: dbSub.productName,
            variant: dbSub.roastPreference ? `${dbSub.roastPreference} Roast` : '',
            price: dbSub.price,
            qty: 1,
          },
        ],
      },
    },
  });

  console.log(`✅ Subscription order created — cycle #${cycleNumber} for ${dbSub.id} ($${order.amount})`);

  if (user) {
    const customerName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || null;
    try {
      if (invoice.billing_reason === 'subscription_create') {
        await sendSubscriptionConfirmationEmail({ to: user.email, customerName, productName: dbSub.productName, price: dbSub.price, freq: dbSub.freq });
      } else {
        await sendSubscriptionRenewalEmail({ to: user.email, customerName, productName: dbSub.productName, price: dbSub.price, cycleNumber });
      }
    } catch (err) {
      console.error(`Failed to send subscription email for order ${order.id}:`, err);
    }
  }

  return { created: true, orderId: order.id };
}
