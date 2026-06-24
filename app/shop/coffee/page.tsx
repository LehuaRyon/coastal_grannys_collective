import { prisma } from '@/lib/db';
import { dbToCoffee } from '@/lib/data/db-products';
import { CoffeePageClient } from '@/components/shop/CoffeePageClient';
import { COFFEES } from '@/lib/data/products';

export default async function CoffeePage() {
  let coffees;
  try {
    const products = await prisma.product.findMany({
      where: { type: 'coffee' },
      orderBy: { position: 'asc' },
    });
    coffees = products.length > 0 ? products.map(dbToCoffee) : COFFEES;
  } catch {
    coffees = COFFEES;
  }
  return <CoffeePageClient coffees={coffees} />;
}
