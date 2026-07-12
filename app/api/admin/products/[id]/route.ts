import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user?.role !== 'admin') return null;
  return session;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ product });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const product = await prisma.product.update({ where: { id }, data: body });
  return NextResponse.json({ product });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  // Subscription.productId is a plain string, not a real foreign key (so
  // this wouldn't fail at the DB level) — but a subscription's roast
  // options and MRR interval both read the *live* Product row, not a
  // snapshot, so deleting a plan out from under active subscribers
  // silently breaks roast-change and undercounts MRR for them with no
  // error anywhere. Billing itself would keep working fine via Stripe
  // regardless (it has its own cached price/product), so this only blocks
  // when it would actually degrade something visible.
  const activeSubscriberCount = await prisma.subscription.count({
    where: { productId: id, status: { in: ['active', 'paused', 'past_due', 'unpaid'] } },
  });
  if (activeSubscriberCount > 0) {
    return NextResponse.json(
      {
        error: `${activeSubscriberCount} customer${activeSubscriberCount === 1 ? ' is' : 's are'} still subscribed to this plan — cancel or wait for those subscriptions to end before deleting it. Deleting it now would silently break roast-preference changes and MRR reporting for them.`,
      },
      { status: 400 }
    );
  }

  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
