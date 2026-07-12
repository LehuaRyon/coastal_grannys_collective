import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key);
}

// Triggers a real refund through Stripe — this is the ONLY thing this route
// does. It does not touch order status or gift card balances itself; the
// charge.refunded webhook is still the single source of truth for that
// reconciliation (partial-vs-full detection, restoring/voiding gift cards,
// customer emails — see updateOrderStatus), exactly as it already was for
// refunds triggered from the Stripe Dashboard. This just means an admin
// never has to leave the app to start one.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (order.stripePaymentId.startsWith('giftcard_')) {
    return NextResponse.json(
      { error: 'This order was fully covered by a gift card — nothing was charged via Stripe. Use the gift card tools (Void/Credit) on /admin/gift-cards instead.' },
      { status: 400 }
    );
  }

  // Subscription-cycle orders use a synthetic sub_invoice_<id> as
  // Order.stripePaymentId (an idempotency key, not a real charge) — the
  // actual refundable id lives in stripeChargeId instead. See
  // resolveRealChargeId in lib/subscriptions.ts for why.
  if (order.stripePaymentId.startsWith('sub_invoice_') && !order.stripeChargeId) {
    return NextResponse.json(
      { error: "Couldn't find the underlying charge for this subscription order — try Resync on the subscription first, then retry the refund." },
      { status: 400 }
    );
  }
  const refundTargetId = order.stripeChargeId ?? order.stripePaymentId;

  const alreadyRefunded = order.refundedAmount ?? 0;
  const maxRefundable = order.amount - alreadyRefunded;
  if (maxRefundable <= 0) {
    return NextResponse.json({ error: 'This order has already been fully refunded' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const requested = typeof body?.amount === 'number' ? body.amount : maxRefundable;
  if (requested <= 0 || requested > maxRefundable) {
    return NextResponse.json(
      { error: `Amount must be between $0.01 and $${maxRefundable.toFixed(2)}` },
      { status: 400 }
    );
  }

  // Stripe's reason is a fixed enum (shows up in their own reporting/
  // dashboard) — anything outside it is just left off rather than rejected,
  // since capturing a reason at all is optional.
  const VALID_REASONS = ['duplicate', 'fraudulent', 'requested_by_customer'] as const;
  const reason = VALID_REASONS.includes(body?.reason) ? (body.reason as (typeof VALID_REASONS)[number]) : undefined;

  try {
    const stripe = getStripeClient();
    const refund = await stripe.refunds.create({
      // Almost always a PaymentIntent id (pi_...) for this app's checkout
      // flows; the charge param is the fallback for the rare payment type
      // that surfaces a Charge id instead (see resolveRealChargeId).
      ...(refundTargetId.startsWith('ch_') ? { charge: refundTargetId } : { payment_intent: refundTargetId }),
      amount: Math.round(requested * 100),
      ...(reason ? { reason } : {}),
    });
    return NextResponse.json({
      refundId: refund.id,
      status: refund.status,
      message: 'Refund submitted to Stripe — order status and gift card balances will update automatically once the webhook confirms it (usually within seconds).',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Refund failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
