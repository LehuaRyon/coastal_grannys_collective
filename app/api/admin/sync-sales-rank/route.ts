import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

// POST /api/admin/sync-sales-rank
// Recomputes salesRank for all coffee products based on total units sold in OrderItems.
// Call this from an admin panel or after bulk order imports.
export async function POST() {
  const sales = await prisma.orderItem.groupBy({
    by: ['productId'],
    _sum: { qty: true },
  });

  const rankMap = new Map<string, number>();
  for (const row of sales) {
    rankMap.set(row.productId, row._sum.qty ?? 0);
  }

  const coffees = await prisma.product.findMany({ where: { type: 'coffee' }, select: { id: true } });

  await Promise.all(
    coffees.map((c) =>
      prisma.product.update({
        where: { id: c.id },
        data: { salesRank: rankMap.get(c.id) ?? 0 },
      })
    )
  );

  return NextResponse.json({ updated: coffees.length, ranks: Object.fromEntries(rankMap) });
}
