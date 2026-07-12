import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { updateOrderStatus } from '@/lib/orderFulfillment';

const VALID_STATUSES = ['paid', 'partially_refunded', 'refunded', 'disputed', 'pending', 'failed'];

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const { status, refundedAmount } = await req.json();
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }
  // A full "refunded" restores any gift card balance this order spent and
  // voids any gift card this order purchased; "partially_refunded" just
  // records the amount without touching gift cards — see updateOrderStatus.
  const order = await updateOrderStatus(
    id,
    status,
    typeof refundedAmount === 'number' ? refundedAmount : undefined
  );
  return NextResponse.json({ order });
}
