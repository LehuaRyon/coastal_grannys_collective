import { NextRequest, NextResponse } from 'next/server';
import { requireOwnedSubscription } from '@/lib/subscriptions';
import { prisma } from '@/lib/db';

interface AddressInput {
  address: string;
  apt?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

// Purely a local DB update — the shipping address isn't a concept Stripe
// knows about for a custom price_data subscription, so there's no Stripe
// call here, just updating what the next invoice.paid fulfillment order
// will snapshot as its shipping destination.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOwnedSubscription(id);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const { sub } = result;

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
