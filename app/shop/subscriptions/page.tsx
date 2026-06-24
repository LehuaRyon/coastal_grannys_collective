import { prisma } from '@/lib/db';
import { dbToSubscription } from '@/lib/data/db-products';
import { SubsPageClient } from '@/components/shop/SubsPageClient';
import { SUBSCRIPTIONS } from '@/lib/data/products';

export default async function SubscriptionsPage() {
  let subscriptions;
  try {
    const products = await prisma.product.findMany({
      where: { type: 'subscription' },
      orderBy: { position: 'asc' },
    });
    subscriptions = products.length > 0 ? products.map(dbToSubscription) : SUBSCRIPTIONS;
  } catch {
    subscriptions = SUBSCRIPTIONS;
  }
  return <SubsPageClient subscriptions={subscriptions} />;
}
