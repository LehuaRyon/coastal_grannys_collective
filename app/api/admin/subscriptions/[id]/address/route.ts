import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

interface AddressInput {
  address: string;
  apt?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const sub = await prisma.subscription.findUnique({ where: { id } });
  if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });

  const body = await req.json().catch(() => null);
  const address: AddressInput | null = body?.shippingAddress ?? null;
  if (!address?.address || !address?.city || !address?.state || !address?.zip) {
    return NextResponse.json({ error: 'A complete shipping address is required' }, { status: 400 });
  }

  const updated = await prisma.subscription.update({
    where: { id: sub.id },
    data: { shippingAddress: address as unknown as object },
  });

  return NextResponse.json({ shippingAddress: updated.shippingAddress });
}
