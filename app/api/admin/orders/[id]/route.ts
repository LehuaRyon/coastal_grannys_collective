import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

const VALID_STATUSES = ['paid', 'refunded', 'disputed', 'pending', 'failed'];

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const { status } = await req.json();
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }
  const order = await prisma.order.update({ where: { id }, data: { status } });
  return NextResponse.json({ order });
}
