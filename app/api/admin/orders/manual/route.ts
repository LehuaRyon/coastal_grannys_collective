import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

interface ManualItemInput {
  name: string;
  variant?: string;
  price: number;
  qty: number;
}

// Records an order that never went through checkout at all — a comp, a
// phone/in-person sale, a goodwill replacement for a shipping issue. No
// Stripe involvement (no charge, no refund plumbing applies), no gift card
// side effects — if the admin means to compensate someone with real
// spendable balance, that's what Issue Gift Card on /admin/gift-cards is
// for. This exists purely so "record that this happened" doesn't require
// faking a Stripe payment or reaching into the database directly.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const customerEmail = typeof body?.customerEmail === 'string' ? body.customerEmail.trim() : '';
  const customerName = typeof body?.customerName === 'string' ? body.customerName.trim() : '';
  const note = typeof body?.note === 'string' ? body.note.trim() : '';
  const items: ManualItemInput[] = Array.isArray(body?.items) ? body.items : [];

  if (!customerEmail) {
    return NextResponse.json({ error: 'Customer email is required' }, { status: 400 });
  }
  if (!note) {
    return NextResponse.json({ error: 'A note explaining this manual order is required' }, { status: 400 });
  }
  const validItems = items.filter(
    (i) => typeof i.name === 'string' && i.name.trim() && typeof i.price === 'number' && i.price >= 0 && typeof i.qty === 'number' && i.qty > 0
  );
  if (validItems.length === 0) {
    return NextResponse.json({ error: 'At least one valid item (name, price, qty) is required' }, { status: 400 });
  }

  const amount = validItems.reduce((sum, i) => sum + i.price * i.qty, 0);

  const user = await prisma.user.findUnique({ where: { email: customerEmail }, select: { id: true } });

  const order = await prisma.order.create({
    data: {
      stripePaymentId: `manual_${randomUUID()}`,
      amount,
      currency: 'usd',
      status: 'paid',
      customerEmail,
      customerName: customerName || null,
      userId: user?.id ?? null,
      manualEntryBy: session.user.email!,
      manualEntryNote: note,
      items: {
        create: validItems.map((i) => ({
          productId: 'manual',
          name: i.name.trim(),
          variant: i.variant?.trim() || '',
          price: i.price,
          qty: i.qty,
        })),
      },
    },
    include: { items: true },
  });

  return NextResponse.json({ order });
}
