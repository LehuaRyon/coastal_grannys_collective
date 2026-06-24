import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user?.role !== 'admin') return null;
  return session;
}

export async function GET(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const page = req.nextUrl.searchParams.get('page') ?? 'home';
  const content = await prisma.siteContent.findMany({ where: { page }, orderBy: { key: 'asc' } });
  return NextResponse.json({ content });
}

export async function PUT(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { page, key, value } = await req.json();
  if (!page || !key) return NextResponse.json({ error: 'page and key required' }, { status: 400 });
  const record = await prisma.siteContent.upsert({
    where: { page_key: { page, key } },
    update: { value },
    create: { page, key, value },
  });
  return NextResponse.json({ record });
}
