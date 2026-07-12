import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { sendGiftCardEmail } from '@/lib/email';

// Manually re-sends a gift card's code — for a delivery that already
// succeeded (customer says they never got it) or one that's still stuck
// undelivered (e.g. the immediate send failed and they don't want to wait
// for the next daily cron retry).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const giftCard = await prisma.giftCard.findUnique({ where: { id } });
  if (!giftCard) {
    return NextResponse.json({ error: 'Gift card not found' }, { status: 404 });
  }

  try {
    await sendGiftCardEmail({
      to: giftCard.recipientEmail,
      amount: giftCard.initialBalance,
      codes: [giftCard.code],
      fromName: giftCard.senderName || 'A friend',
      message: giftCard.message ?? undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const updated = await prisma.giftCard.update({ where: { id }, data: { delivered: true } });

  await prisma.giftCardAuditLog.create({
    data: { giftCardId: id, action: 'resend', adminEmail: session.user.email! },
  });

  return NextResponse.json({ giftCard: updated });
}
