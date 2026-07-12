import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

// Credit-only (never a direct set/subtract) so a typo can't accidentally
// wipe out a customer's balance — matches the additive-only redemption/
// refund model used everywhere else in the gift card system.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const amount = Number(body?.amount);
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'Enter a valid amount' }, { status: 400 });
  }
  if (!reason) {
    return NextResponse.json({ error: 'A reason is required' }, { status: 400 });
  }

  const giftCard = await prisma.giftCard.update({
    where: { id },
    data: { balance: { increment: amount }, initialBalance: { increment: amount } },
  });

  await prisma.giftCardAuditLog.create({
    data: { giftCardId: id, action: 'credit', amount, reason, adminEmail: session.user.email! },
  });

  return NextResponse.json({ giftCard });
}
