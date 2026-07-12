import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

// Admin equivalent of the customer's own roast-change action — no
// ownership check since an admin can act on any subscription for
// customer-service reasons (e.g. someone calls in asking to switch roasts).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const sub = await prisma.subscription.findUnique({ where: { id } });
  if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });

  const body = await req.json().catch(() => null);
  const roastPreference: string | null = body?.roastPreference ?? null;

  const product = await prisma.product.findUnique({ where: { id: sub.productId }, select: { options: true } });
  const validOptions = product?.options ?? [];
  if (roastPreference !== null && !validOptions.includes(roastPreference)) {
    return NextResponse.json({ error: 'Not a valid roast option for this plan' }, { status: 400 });
  }

  const updated = await prisma.subscription.update({
    where: { id: sub.id },
    data: { roastPreference },
  });

  return NextResponse.json({ roastPreference: updated.roastPreference });
}
