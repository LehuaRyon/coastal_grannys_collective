'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CoffeeBeanIcon } from '@phosphor-icons/react';

interface FeaturedCoffeeCardProps {
  slug: string;
  name: string;
  subtitle: string;
  origin: string;
  notes: string[];
  prices: Record<string, number>;
  gradient: string;
  badge?: string;
}

export function FeaturedCoffeeCard({ slug, name, subtitle, origin, notes, prices, gradient, badge }: FeaturedCoffeeCardProps) {
  const [imgError, setImgError] = useState(false);

  const [smallestSize, lowestPrice] = Object.entries(prices).sort((a, b) => a[1] - b[1])[0] ?? ['1 lb', 0];

  return (
    <Link
      href="/shop/coffee"
      className="group bg-white rounded-2xl border border-stone-100 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div
        className="h-40 flex items-center justify-center relative overflow-hidden"
        style={{ background: gradient }}
      >
        {!imgError && (
          <img
            src={`/images/products/${slug}.png`}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        )}
        {imgError && <CoffeeBeanIcon size={48} weight="duotone" color="white" className="relative z-10 opacity-80" />}
        {badge && (
          <span className="absolute top-3 left-3 z-10 bg-white/20 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="text-[10px] text-stone-400 font-medium uppercase tracking-widest mb-0.5">
          {subtitle}
        </p>
        <h3 className="font-serif text-xl text-stone-900 mb-1 group-hover:text-amber-700 transition-colors">
          {name}
        </h3>
        <p className="text-xs text-stone-400 mb-3">{origin}</p>
        <div className="flex flex-wrap gap-1 mb-3">
          {notes.slice(0, 2).map((n) => (
            <span key={n} className="text-[10px] px-2 py-0.5 bg-stone-100 rounded-full text-stone-500 capitalize">
              {n}
            </span>
          ))}
        </div>
        <p className="text-sm font-semibold text-stone-900">
          From ${lowestPrice}
          <span className="text-xs font-normal text-stone-400 ml-1">/ {smallestSize}</span>
        </p>
      </div>
    </Link>
  );
}
