import { NextRequest, NextResponse } from 'next/server';
import { requireOwnedSubscription } from '@/lib/subscriptions';
import { prisma } from '@/lib/db';

// Purely a local DB update, same reasoning as the address route — roast
// preference isn't a Stripe concept, it's just what the next invoice.paid
// fulfillment order will snapshot as the item variant. Validated against
// the product's *current* roast options (Product.options) rather than a
// hardcoded list, since an admin can change which roasts a plan offers
// after a customer has already subscribed.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOwnedSubscription(id);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const { sub } = result;

  const body = await req.json().catch(() => null);
  const roastPreference: string | null = body?.roastPreference ?? null;

  const product = await prisma.product.findUnique({ where: { id: sub.productId }, select: { options: true } });
  const validOptions = product?.options ?? [];
  if (roastPreference !== null && !validOptions.includes(roastPreference)) {
    return NextResponse.json({ error: 'Not a valid roast option for this plan' }, { status: 400 });
  }

  const updated = await prisma.subscription.update({
    where: { id: sub.id },
    data: { roastPreference },
  });

  return NextResponse.json({ roastPreference: updated.roastPreference });
}
