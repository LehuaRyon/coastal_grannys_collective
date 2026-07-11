import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

const ADDRESS_FIELDS = ['phone', 'address', 'apt', 'city', 'state', 'zip', 'country'] as const;

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      address: true,
      apt: true,
      city: true,
      state: true,
      zip: true,
      country: true,
    },
  });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ user });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const data: Record<string, string | null> = {};
  for (const field of ADDRESS_FIELDS) {
    if (field in body) {
      const value = body[field];
      data[field] = typeof value === 'string' && value.trim() ? value.trim() : null;
    }
  }

  const user = await prisma.user.update({
    where: { email: session.user.email },
    data,
    select: {
      phone: true,
      address: true,
      apt: true,
      city: true,
      state: true,
      zip: true,
      country: true,
    },
  });

  return NextResponse.json({ user });
}
