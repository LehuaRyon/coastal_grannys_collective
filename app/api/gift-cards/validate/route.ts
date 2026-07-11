import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : '';

  if (!code) {
    return NextResponse.json({ valid: false, error: 'Enter a gift card code' }, { status: 400 });
  }

  const giftCard = await prisma.giftCard.findUnique({ where: { code } });

  if (!giftCard) {
    return NextResponse.json({ valid: false, error: 'We couldn\'t find that gift card code' });
  }
  if (giftCard.balance <= 0) {
    return NextResponse.json({ valid: false, error: 'This gift card has no remaining balance' });
  }

  return NextResponse.json({ valid: true, balance: giftCard.balance });
}
