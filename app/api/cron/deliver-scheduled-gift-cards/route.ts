import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendEmail, sendGiftCardEmail, sendGiftDeliveredNotificationEmail } from '@/lib/email';

const SEVERELY_OVERDUE_MS = 2 * 24 * 60 * 60 * 1000; // 2 days

// Runs daily via Vercel Cron (see vercel.json) — finds gift cards whose
// scheduled delivery date has arrived and sends the code, e.g. someone
// bought a card early to be delivered the day of a friend's birthday.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const due = await prisma.giftCard.findMany({
    where: { delivered: false, deliverOn: { lte: new Date() } },
    include: { purchaseOrder: { select: { customerEmail: true } } },
  });

  let sent = 0;
  const stillStuck: typeof due = [];
  for (const giftCard of due) {
    try {
      await sendGiftCardEmail({
        to: giftCard.recipientEmail,
        amount: giftCard.initialBalance,
        codes: [giftCard.code],
        fromName: giftCard.senderName || 'A friend',
        message: giftCard.message ?? undefined,
      });
      await prisma.giftCard.update({ where: { id: giftCard.id }, data: { delivered: true } });
      sent++;

      // Follow-up to the buyer, promised by sendGiftPurchaseReceiptEmail at
      // purchase time ("we'll email you again once it actually goes out").
      const buyerEmail = giftCard.purchaseOrder?.customerEmail;
      if (buyerEmail) {
        try {
          await sendGiftDeliveredNotificationEmail({
            to: buyerEmail,
            recipientEmail: giftCard.recipientEmail,
            amount: giftCard.initialBalance,
          });
        } catch (err) {
          console.error(`Failed to notify buyer ${buyerEmail} of delivered gift card ${giftCard.code}:`, err);
        }
      }
    } catch (err) {
      // Leave `delivered: false` so the next run retries it.
      console.error(`Failed to deliver scheduled gift card ${giftCard.code}:`, err);
      stillStuck.push(giftCard);
    }
  }

  // If a card is still undelivered more than 2 days past its scheduled
  // date, something's persistently wrong — either the email keeps failing,
  // or this cron job hasn't been running reliably (e.g. not enabled on the
  // Vercel plan, misconfigured schedule). Surface it proactively rather
  // than relying on someone noticing a missing email days later.
  const severelyOverdue = stillStuck.filter(
    (gc) => gc.deliverOn && Date.now() - gc.deliverOn.getTime() > SEVERELY_OVERDUE_MS
  );
  if (severelyOverdue.length > 0 && process.env.NOTIFY_EMAIL) {
    try {
      await sendEmail({
        to: process.env.NOTIFY_EMAIL,
        subject: `Action needed: ${severelyOverdue.length} scheduled gift card(s) failed to deliver`,
        text: [
          `${severelyOverdue.length} scheduled gift card(s) are more than 2 days overdue and still haven't been emailed:`,
          '',
          ...severelyOverdue.map(
            (gc) => `${gc.code} — due ${gc.deliverOn?.toDateString()}, recipient ${gc.recipientEmail}`
          ),
          '',
          'Check /admin/gift-cards and the server logs for the delivery error. If none of these cards were expected, this cron job may not be running — verify Cron is enabled for your Vercel plan and vercel.json is deployed.',
        ].join('\n'),
      });
    } catch (err) {
      console.error('Failed to send overdue gift card alert:', err);
    }
  }

  await prisma.cronRun.create({
    data: { job: 'deliver-scheduled-gift-cards', checked: due.length, sent },
  });

  console.log(`Scheduled gift card delivery: ${sent}/${due.length} sent`);
  return NextResponse.json({ checked: due.length, sent, severelyOverdue: severelyOverdue.length });
}
