import { prisma } from '@/lib/db';
import { dbToMerch } from '@/lib/data/db-products';
import { MerchPageClient } from '@/components/shop/MerchPageClient';
import { MERCH } from '@/lib/data/products';

export default async function MerchPage() {
  let merch;
  try {
    const products = await prisma.product.findMany({
      where: { type: 'merch', inStock: true },
      orderBy: { position: 'asc' },
    });
    merch = products.length > 0 ? products.map(dbToMerch) : MERCH;
  } catch {
    merch = MERCH;
  }
  return <MerchPageClient merch={merch} />;
}
