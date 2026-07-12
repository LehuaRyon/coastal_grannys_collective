import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getStripeClient, syncSubscriptionFromStripe } from '@/lib/subscriptions';
import { sendSubscriptionResumedEmail } from '@/lib/email';

// Admin equivalent of the customer's own resume action
// (/api/account/subscriptions/[id]/resume) — no ownership check since an
// admin can act on any subscription for customer-service reasons. Clears
// both a pause and a scheduled cancel-at-period-end, same as the customer
// version, since from an admin's perspective "un-pause" and "un-cancel"
// are both just "keep this subscription going."
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const sub = await prisma.subscription.findUnique({ where: { id } });
  if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });

  const stripe = getStripeClient();
  try {
    const updated = await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      pause_collection: '',
      cancel_at_period_end: false,
    });
    await syncSubscriptionFromStripe(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not resume subscription';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const user = await prisma.user.findUnique({ where: { id: sub.userId } });
  if (user) {
    try {
      await sendSubscriptionResumedEmail({
        to: user.email,
        customerName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || null,
        productName: sub.productName,
      });
    } catch (err) {
      console.error(`Failed to send resume email for subscription ${sub.id}:`, err);
    }
  }

  return NextResponse.json({ ok: true });
}
