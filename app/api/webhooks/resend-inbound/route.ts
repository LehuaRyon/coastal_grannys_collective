import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { prisma } from '@/lib/db';

interface ResendInboundEvent {
  type: string;
  data: {
    email_id: string;
    to: string[];
    from: string;
    subject: string;
  };
}

async function fetchReceivedEmailBody(emailId: string): Promise<string> {
  const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch received email ${emailId}: ${res.status}`);
  const email = await res.json();
  return (email.text as string) || (email.html as string) || '';
}

// Reply-To addresses are minted as submission+{id}@INBOUND_EMAIL_DOMAIN — see lib/email.ts
function extractSubmissionId(to: string[]): string | null {
  for (const address of to) {
    const match = address.match(/^submission\+([a-z0-9]+)@/i);
    if (match) return match[1];
  }
  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.text(); // raw body required for signature verification

  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error('RESEND_WEBHOOK_SECRET is not set — add it to .env.local');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: ResendInboundEvent;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(body, {
      'svix-id': req.headers.get('svix-id') ?? '',
      'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
      'svix-signature': req.headers.get('svix-signature') ?? '',
    }) as ResendInboundEvent;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    console.error('Resend webhook signature verification failed:', message);
    return NextResponse.json({ error: `Webhook error: ${message}` }, { status: 400 });
  }

  if (event.type !== 'email.received') {
    return NextResponse.json({ received: true });
  }

  const submissionId = extractSubmissionId(event.data.to);
  if (!submissionId) {
    console.warn('[resend-inbound] Could not match reply to a submission:', event.data.to);
    return NextResponse.json({ received: true });
  }

  const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
  if (!submission) {
    console.warn(`[resend-inbound] No submission found for id ${submissionId}`);
    return NextResponse.json({ received: true });
  }

  try {
    const bodyText = await fetchReceivedEmailBody(event.data.email_id);
    await prisma.$transaction([
      prisma.submissionMessage.create({
        data: { submissionId, direction: 'INBOUND', body: bodyText },
      }),
      prisma.submission.update({ where: { id: submissionId }, data: { read: false } }),
    ]);
  } catch (err) {
    console.error('[resend-inbound] Failed to save inbound reply:', err);
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
