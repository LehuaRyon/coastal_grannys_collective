import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { retryLatestInvoice } from '@/lib/subscriptions';

// Admin-triggered version of the same retry that happens automatically
// after a customer updates their card — for phone-support cases where a
// customer says their card is fixed but hasn't (or can't) log in to update
// it themselves through the account dashboard.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const sub = await prisma.subscription.findUnique({ where: { id } });
  if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });

  try {
    const result = await retryLatestInvoice(sub.stripeSubscriptionId);
    if (!result.attempted) {
      return NextResponse.json({ attempted: false, paid: false, message: 'No outstanding invoice to retry — it may have already been paid.' });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Payment retry failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
