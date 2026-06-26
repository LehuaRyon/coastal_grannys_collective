import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Product } from '@prisma/client';
import type { Coffee, Subscription, Merch } from '@/lib/types';

function productImageExists(slug: string): boolean {
  try {
    return existsSync(join(process.cwd(), 'public', 'images', 'products', `${slug}.png`));
  } catch {
    return true;
  }
}

export function dbToCoffee(p: Product): Coffee {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    subtitle: p.subtitle ?? '',
    origin: p.origin ?? '',
    region: p.region ?? undefined,
    process: p.process ?? '',
    elevation: p.elevation ?? '',
    roast: (p.roast ?? 'Medium') as Coffee['roast'],
    notes: p.notes,
    prices: (p.prices && typeof p.prices === 'object' && !Array.isArray(p.prices)
      ? (p.prices as Record<string, number>)
      : {}),
    gradient: p.gradient ?? 'linear-gradient(135deg,#5C3D1E 0%,#8B5E3C 100%)',
    description: p.description ?? '',
    roastOptions: p.options ?? [],
    inStock: p.inStock,
    featured: p.featured,
    badge: p.badge ?? undefined,
    badgeClass: (p.badgeClass as Coffee['badgeClass']) ?? undefined,
    hasImage: productImageExists(p.slug),
    salesRank: p.salesRank,
  };
}

export function dbToSubscription(p: Product): Subscription {
  return {
    id: p.id,
    name: p.name,
    freq: p.freq ?? '',
    desc: p.description ?? '',
    features: p.features,
    roastOptions: p.options ?? [],
    price: p.price,
    period: p.period ?? '',
    gradient: p.gradient ?? 'linear-gradient(135deg,#3A7D5C 0%,#5BAF84 100%)',
    badge: p.badge ?? null,
    inStock: p.inStock,
  };
}

export function dbToMerch(p: Product): Merch {
  return {
    id: p.id,
    name: p.name,
    icon: p.icon ?? '📦',
    desc: p.description ?? '',
    price: p.price,
    options: p.options.length > 0 ? p.options : null,
    gradient: p.gradient ?? 'linear-gradient(135deg,#EAE0D4 0%,#C4B8AA 100%)',
  };
}
