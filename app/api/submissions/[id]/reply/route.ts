import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { inboundReplyAddress, sendEmail } from '@/lib/email';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const { message } = await req.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  const submission = await prisma.submission.findUnique({ where: { id } });
  if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await sendEmail({
    to: submission.senderEmail,
    subject: "Re: Your message to Coastal Granny's Collective",
    text: `${message}\n\n— Coastal Granny's Collective`,
    replyTo: inboundReplyAddress(submission.id),
  });

  const [, updated] = await prisma.$transaction([
    prisma.submissionMessage.create({
      data: { submissionId: id, direction: 'OUTBOUND', body: message },
    }),
    prisma.submission.update({ where: { id }, data: { read: true } }),
  ]);

  return NextResponse.json({ submission: updated });
}
