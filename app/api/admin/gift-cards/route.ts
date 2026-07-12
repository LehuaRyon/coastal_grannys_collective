import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { sendGiftCardEmail } from '@/lib/email';
import { generateUniqueGiftCardCode } from '@/lib/giftCard';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get('q')?.trim();
  const giftCards = await prisma.giftCard.findMany({
    where: q
      ? {
          OR: [
            { code: { contains: q, mode: 'insensitive' } },
            { recipientEmail: { contains: q, mode: 'insensitive' } },
          ],
        }
      : undefined,
    include: {
      purchaseOrder: { select: { id: true, customerEmail: true } },
      redemptions: { include: { order: { select: { id: true, createdAt: true } } }, orderBy: { createdAt: 'desc' } },
      auditLog: { orderBy: { createdAt: 'desc' } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const lastCronRun = await prisma.cronRun.findFirst({
    where: { job: 'deliver-scheduled-gift-cards' },
    orderBy: { ranAt: 'desc' },
  });

  const overdueCount = await prisma.giftCard.count({
    where: { delivered: false, deliverOn: { lte: new Date() } },
  });

  return NextResponse.json({ giftCards, lastCronRun, overdueCount });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const amount = Number(body?.amount);
  const recipientEmail = typeof body?.recipientEmail === 'string' ? body.recipientEmail.trim() : '';
  const message = typeof body?.message === 'string' ? body.message.trim() : '';

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'Enter a valid amount' }, { status: 400 });
  }
  if (!recipientEmail) {
    return NextResponse.json({ error: 'Enter a recipient email' }, { status: 400 });
  }

  const senderName =
    `${session.user.firstName ?? ''} ${session.user.lastName ?? ''}`.trim() || "Coastal Granny's Collective";
  const code = await generateUniqueGiftCardCode();
  let giftCard = await prisma.giftCard.create({
    data: {
      code,
      initialBalance: amount,
      balance: amount,
      senderName,
      recipientEmail,
      message: message || null,
      // Same retry-on-failure pattern as the checkout-purchase path — starts
      // undelivered, deliverOn "now" so the daily cron retries if the send
      // below fails.
      deliverOn: new Date(),
      delivered: false,
    },
  });

  await prisma.giftCardAuditLog.create({
    data: { giftCardId: giftCard.id, action: 'issue', amount, adminEmail: session.user.email!, reason: message || null },
  });

  try {
    await sendGiftCardEmail({
      to: recipientEmail,
      amount,
      codes: [code],
      fromName: senderName,
      message: message || undefined,
    });
    giftCard = await prisma.giftCard.update({ where: { id: giftCard.id }, data: { delivered: true } });
  } catch (err) {
    console.error(`Failed to send manually-issued gift card email to ${recipientEmail}:`, err);
    return NextResponse.json({
      giftCard,
      warning: 'Gift card created, but the email failed to send — it will retry automatically, or use Resend.',
    });
  }

  return NextResponse.json({ giftCard });
}
