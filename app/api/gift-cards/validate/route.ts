import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimit } from '@/lib/rateLimit';

// Best-effort throttle against scripted code-guessing — see lib/rateLimit
// for why this isn't a hard security boundary on serverless.
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!rateLimit(`gift-card-validate:${ip}`, RATE_LIMIT, RATE_WINDOW_MS)) {
    return NextResponse.json(
      { valid: false, error: 'Too many attempts — please try again in a few minutes' },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : '';

  if (!code) {
    return NextResponse.json({ valid: false, error: 'Enter a gift card code' }, { status: 400 });
  }

  const giftCard = await prisma.giftCard.findUnique({ where: { code } });

  if (!giftCard || !giftCard.delivered) {
    return NextResponse.json({ valid: false, error: 'We couldn\'t find that gift card code' });
  }
  if (giftCard.balance <= 0) {
    return NextResponse.json({ valid: false, error: 'This gift card has no remaining balance' });
  }

  return NextResponse.json({ valid: true, balance: giftCard.balance });
}
