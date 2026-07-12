import { NextResponse } from 'next/server';
import { requireOwnedSubscription, getStripeClient, syncSubscriptionFromStripe } from '@/lib/subscriptions';
import { sendEmail } from '@/lib/email';

// Graceful cancel — finishes out the period already paid for (matches the
// site's "cancel anytime" copy) rather than cutting off immediately.
// cancelAtPeriodEnd syncs into our DB via customer.subscription.updated;
// the subscription only actually ends (and sendSubscriptionCanceledEmail
// fires) once Stripe sends customer.subscription.deleted at period end —
// this endpoint sends its own lighter "cancellation scheduled" email now so
// the customer isn't left wondering whether the click did anything.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOwnedSubscription(id);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const { sub, user } = result;

  const stripe = getStripeClient();
  let periodEnd: Date | null = null;
  try {
    const updated = await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    await syncSubscriptionFromStripe(updated);
    const seconds = updated.items.data[0]?.current_period_end;
    periodEnd = seconds ? new Date(seconds * 1000) : null;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not cancel subscription';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  try {
    await sendEmail({
      to: user.email,
      subject: `Your ${sub.productName} subscription will end soon`,
      text: [
        `Hi ${user.firstName || 'there'},`,
        '',
        `Your ${sub.productName} subscription is set to cancel${periodEnd ? ` at the end of your current period, on ${periodEnd.toDateString()}` : ''} — you won't be charged again, and you'll keep what you already paid for.`,
        '',
        'Changed your mind? You can resume from your account anytime before then.',
      ].join('\n'),
    });
  } catch (err) {
    console.error(`Failed to send cancellation-scheduled email for subscription ${sub.id}:`, err);
  }

  return NextResponse.json({ ok: true, periodEnd });
}
