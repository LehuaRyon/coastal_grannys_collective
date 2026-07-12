import { NextResponse } from 'next/server';
import { requireOwnedSubscription, getStripeClient, syncSubscriptionFromStripe } from '@/lib/subscriptions';
import { sendSubscriptionResumedEmail } from '@/lib/email';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOwnedSubscription(id);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const { sub, user } = result;

  const stripe = getStripeClient();
  try {
    // Clears both a pause and a scheduled cancel-at-period-end in one
    // action — "Resume" is the single undo button for either state, since
    // from the customer's perspective they're both just "I want this to
    // keep going." Also syncs the DB synchronously from Stripe's response
    // rather than waiting on the async webhook — see pause/route.ts for why.
    const updated = await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      pause_collection: '',
      cancel_at_period_end: false,
    });
    await syncSubscriptionFromStripe(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not resume subscription';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  try {
    await sendSubscriptionResumedEmail({
      to: user.email,
      customerName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || null,
      productName: sub.productName,
    });
  } catch (err) {
    console.error(`Failed to send resume confirmation for subscription ${sub.id}:`, err);
  }

  return NextResponse.json({ ok: true });
}
