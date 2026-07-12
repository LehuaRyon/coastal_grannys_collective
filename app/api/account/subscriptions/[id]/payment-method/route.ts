import { NextRequest, NextResponse } from 'next/server';
import { requireOwnedSubscription, getStripeClient, retryLatestInvoice } from '@/lib/subscriptions';

// Second step — after the customer confirms the SetupIntent client-side,
// this attaches the resulting payment method as both the subscription's
// and the customer's new default, so it's used for this subscription's
// next renewal (and any future one, in case they add another plan later).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOwnedSubscription(id);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const { sub } = result;

  const body = await req.json().catch(() => null);
  const setupIntentId = typeof body?.setupIntentId === 'string' ? body.setupIntentId : '';
  if (!setupIntentId) {
    return NextResponse.json({ error: 'Missing setup intent' }, { status: 400 });
  }

  const stripe = getStripeClient();
  try {
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
    if (setupIntent.status !== 'succeeded' || !setupIntent.payment_method) {
      return NextResponse.json({ error: 'Payment method was not confirmed' }, { status: 400 });
    }
    const paymentMethodId = typeof setupIntent.payment_method === 'string' ? setupIntent.payment_method : setupIntent.payment_method.id;

    await stripe.subscriptions.update(sub.stripeSubscriptionId, { default_payment_method: paymentMethodId });
    await stripe.customers.update(sub.stripeCustomerId, { invoice_settings: { default_payment_method: paymentMethodId } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update payment method';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // The card is fixed now — if this subscription was past_due/unpaid, try
  // charging the outstanding invoice with the new card right away instead
  // of leaving the customer stuck until Stripe's own retry schedule catches
  // up (which can take days). If it declines again, that's surfaced below;
  // the card itself was still saved successfully either way.
  let invoiceRetryFailed = false;
  try {
    await retryLatestInvoice(sub.stripeSubscriptionId);
  } catch {
    invoiceRetryFailed = true;
  }

  return NextResponse.json({ ok: true, invoiceRetryFailed });
}
