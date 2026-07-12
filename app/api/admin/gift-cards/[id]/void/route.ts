import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { sendGiftCardVoidedEmail } from '@/lib/email';

// One-way, explicit action (separate from credit's typo-safe additive-only
// design) for cancelling a card outside the automatic refund-triggered void
// path — fraud, a mistake on a manually issued card, etc. Always requires a
// reason, always audit-logged, and always notifies the recipient so a
// cancelled code doesn't quietly stop working with no explanation.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';

  if (!reason) {
    return NextResponse.json({ error: 'A reason is required' }, { status: 400 });
  }

  const giftCard = await prisma.giftCard.findUnique({ where: { id } });
  if (!giftCard) {
    return NextResponse.json({ error: 'Gift card not found' }, { status: 404 });
  }
  if (giftCard.balance <= 0) {
    return NextResponse.json({ error: 'This gift card already has no balance' }, { status: 400 });
  }

  const voidedAmount = giftCard.balance;
  const updated = await prisma.giftCard.update({ where: { id }, data: { balance: 0 } });

  await prisma.giftCardAuditLog.create({
    data: { giftCardId: id, action: 'void', amount: voidedAmount, reason, adminEmail: session.user.email! },
  });

  try {
    await sendGiftCardVoidedEmail({ to: giftCard.recipientEmail, code: giftCard.code, amountVoided: voidedAmount });
  } catch (err) {
    console.error(`Failed to send voided-card email for ${giftCard.code}:`, err);
  }

  return NextResponse.json({ giftCard: updated });
}
