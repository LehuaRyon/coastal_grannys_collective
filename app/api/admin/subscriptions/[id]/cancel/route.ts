import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getStripeClient, syncSubscriptionFromStripe } from '@/lib/subscriptions';
import { sendEmail } from '@/lib/email';

// Admin cancel is immediate (not cancel_at_period_end like the customer's
// own action) — this is meant for the "fraud/mistake/customer explicitly
// asked us to end it now" case, not the routine self-service path.
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
    const canceled = await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
    // Syncs status synchronously so the admin doesn't see a stale "active"
    // badge for the few seconds before customer.subscription.deleted
    // arrives — that webhook still fires separately and owns canceledAt +
    // the customer-facing cancellation email (not duplicated here).
    await syncSubscriptionFromStripe(canceled);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not cancel subscription';
    return NextResponse.json({ error: message }, { status: 500 });
  }
  const user = await prisma.user.findUnique({ where: { id: sub.userId } });
  if (user && process.env.NOTIFY_EMAIL) {
    await sendEmail({
      to: process.env.NOTIFY_EMAIL,
      subject: `Subscription cancelled by admin — ${sub.productName}`,
      text: `${session.user.email} cancelled ${user.email}'s ${sub.productName} subscription from the admin dashboard.`,
    }).catch((err) => console.error('Failed to send admin-cancel notice:', err));
  }

  return NextResponse.json({ ok: true });
}
