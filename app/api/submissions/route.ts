import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';

const VALID_TYPES = ['CONTACT', 'WHOLESALE', 'CART'];

function extractSender(type: string, data: Record<string, string>) {
  const senderEmail = data.email;
  const senderName =
    type === 'WHOLESALE'
      ? data.businessName || [data.firstName, data.lastName].filter(Boolean).join(' ')
      : [data.firstName, data.lastName].filter(Boolean).join(' ');
  return { senderEmail, senderName: senderName || null };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { type, data } = body ?? {};
  if (!VALID_TYPES.includes(type) || !data || typeof data !== 'object') {
    return NextResponse.json({ error: 'Invalid submission' }, { status: 400 });
  }

  const { senderEmail, senderName } = extractSender(type, data);
  if (!senderEmail) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const submission = await prisma.submission.create({
    data: { type, data, senderEmail, senderName },
  });

  const notifyTo = process.env.NOTIFY_EMAIL;
  if (notifyTo) {
    const lines = Object.entries(data as Record<string, string>)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
    sendEmail({
      to: notifyTo,
      subject: `New ${type.toLowerCase()} submission from ${senderName || senderEmail}`,
      text: `${lines}\n\nReply from the admin dashboard: /admin/submissions?type=${type}`,
    }).catch((err) => console.error('[submissions] notify email failed:', err));
  }

  return NextResponse.json({ submission });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const type = req.nextUrl.searchParams.get('type');
  const submissions = await prisma.submission.findMany({
    where: type ? { type } : undefined,
    include: { messages: { orderBy: { createdAt: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ submissions });
}
