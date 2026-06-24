import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const { role } = await req.json();
  if (role !== 'admin' && role !== 'customer') return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  const user = await prisma.user.update({ where: { id }, data: { role }, select: { id: true, email: true, role: true } });
  return NextResponse.json({ user });
}
