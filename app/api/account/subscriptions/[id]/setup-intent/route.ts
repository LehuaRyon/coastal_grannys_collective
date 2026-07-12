import { NextResponse } from 'next/server';
import { requireOwnedSubscription, getStripeClient } from '@/lib/subscriptions';

// First step of updating a subscription's payment method — a SetupIntent
// collects and validates a new card without charging it (unlike the
// PaymentIntent flow used at signup/renewal, which charges immediately).
// Confirmed client-side with stripe.confirmSetup, not confirmPayment.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOwnedSubscription(id);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const { sub } = result;

  const stripe = getStripeClient();
  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: sub.stripeCustomerId,
      payment_method_types: ['card'],
    });
    return NextResponse.json({ clientSecret: setupIntent.client_secret });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not start payment method update';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
