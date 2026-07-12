import { NextResponse } from 'next/server';
import { requireOwnedSubscription, getStripeClient, syncSubscriptionFromStripe } from '@/lib/subscriptions';
import { sendSubscriptionPausedEmail } from '@/lib/email';

// pause_collection: { behavior: 'void' } skips invoicing entirely while
// paused (no charge, no delivery) rather than accumulating an unpaid
// balance. Stripe remains the source of truth, but this also syncs the DB
// synchronously from the response Stripe just gave us (instead of relying
// solely on the customer.subscription.updated webhook, whose delivery is
// async and isn't guaranteed to land before the client's immediate
// router.refresh() — found live: a customer could see the OLD state for a
// few seconds right after clicking). The webhook still fires and re-syncs
// the same state when it arrives — harmless, since this is idempotent.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOwnedSubscription(id);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const { sub, user } = result;

  const stripe = getStripeClient();
  try {
    const updated = await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      pause_collection: { behavior: 'void' },
    });
    await syncSubscriptionFromStripe(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not pause subscription';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  try {
    await sendSubscriptionPausedEmail({
      to: user.email,
      customerName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || null,
      productName: sub.productName,
    });
  } catch (err) {
    console.error(`Failed to send pause confirmation for subscription ${sub.id}:`, err);
  }

  return NextResponse.json({ ok: true });
}
