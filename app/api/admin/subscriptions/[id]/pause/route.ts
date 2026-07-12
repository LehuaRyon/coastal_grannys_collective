import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getStripeClient, syncSubscriptionFromStripe } from '@/lib/subscriptions';
import { sendSubscriptionPausedEmail } from '@/lib/email';

// Admin equivalent of the customer's own pause action (/api/account/subscriptions/[id]/pause)
// — no ownership check since an admin can act on any subscription for
// customer-service reasons (e.g. someone calls in asking to pause). Syncs
// the DB synchronously from Stripe's response rather than waiting on the
// async webhook — see the customer pause route for why (found live: the
// admin UI could show stale state for a few seconds right after clicking).
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
    const updated = await stripe.subscriptions.update(sub.stripeSubscriptionId, { pause_collection: { behavior: 'void' } });
    await syncSubscriptionFromStripe(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not pause subscription';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const user = await prisma.user.findUnique({ where: { id: sub.userId } });
  if (user) {
    try {
      await sendSubscriptionPausedEmail({
        to: user.email,
        customerName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || null,
        productName: sub.productName,
      });
    } catch (err) {
      console.error(`Failed to send pause email for subscription ${sub.id}:`, err);
    }
  }

  return NextResponse.json({ ok: true });
}
