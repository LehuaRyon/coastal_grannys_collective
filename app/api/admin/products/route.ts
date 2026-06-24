import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user?.role !== 'admin') return null;
  return session;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const products = await prisma.product.findMany({ orderBy: [{ type: 'asc' }, { position: 'asc' }] });
  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const product = await prisma.product.create({ data: body });
  return NextResponse.json({ product }, { status: 201 });
}
