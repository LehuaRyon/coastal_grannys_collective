'use client';

import { useState } from 'react';
import { useCartStore } from '@/lib/store/cart';
import { showToast } from '@/components/ui/Toast';
import type { Coffee } from '@/lib/types';
import { CoffeeBeanIcon } from '@phosphor-icons/react';

interface CoffeeCardProps {
  coffee: Coffee;
  onViewDetails: (coffee: Coffee) => void;
}

const badgeColors: Record<string, string> = {
  'badge-gold': 'bg-amber-400 text-amber-900',
  'badge-red': 'bg-red-500 text-white',
};

export function CoffeeCard({ coffee, onViewDetails }: CoffeeCardProps) {
  const { addItem, items } = useCartStore();
  const cartQty = items.filter((i) => i.id === coffee.id).reduce((sum, i) => sum + i.qty, 0);
  const [imgError, setImgError] = useState(coffee.hasImage === false);
  const defaultSize = Object.keys(coffee.prices)[0];
  const defaultPrice = coffee.prices[defaultSize];

  function handleQuickAdd(e: React.MouseEvent) {
    e.stopPropagation();
    if (!coffee.inStock) return;
    // If roast selection is required, open the detail modal instead
    if (coffee.roastOptions.length > 0) {
      onViewDetails(coffee);
      return;
    }
    addItem({
      key: `${coffee.id}-${defaultSize}-${coffee.roast}`,
      id: coffee.id,
      type: 'coffee',
      name: coffee.name,
      variant: `${defaultSize} · ${coffee.roast} Roast`,
      price: defaultPrice,
      gradient: coffee.gradient,
      slug: coffee.slug,
      hasImage: coffee.hasImage,
    });
    showToast(`"${coffee.name}" added to cart`);
  }

  return (
    <div
      className={`group bg-white rounded-2xl shadow-sm transition-all duration-300 overflow-hidden cursor-pointer border border-stone-100 ${coffee.inStock ? 'hover:shadow-md hover:border-stone-200' : 'opacity-60'}`}
      onClick={() => onViewDetails(coffee)}
    >
      {/* Image area */}
      <div
        className="relative h-48 flex items-center justify-center overflow-hidden"
        style={{ background: coffee.gradient }}
      >
        {/* Product image — falls back to gradient+icon on error */}
        {!imgError && (
          <>
            <img
              src={`/images/products/${coffee.slug}.png`}
              alt={coffee.name}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={() => setImgError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          </>
        )}

        {imgError && (
          <CoffeeBeanIcon
            size={52}
            weight="duotone"
            color="white"
            className={`relative z-10 opacity-80 transition-transform duration-300 ${coffee.inStock ? 'group-hover:scale-110' : ''}`}
          />
        )}

        {coffee.badge && (
          <span
            className={`absolute top-3 left-3 z-10 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
              badgeColors[coffee.badgeClass ?? ''] ?? 'bg-stone-800 text-white'
            }`}
          >
            {coffee.badge}
          </span>
        )}
        {!coffee.inStock && (
          <span className="absolute top-3 right-3 z-10 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-black/50 text-white">
            Out of Stock
          </span>
        )}
        <span className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 text-[10px] text-white/90 font-medium tracking-wide bg-black/30 rounded-full px-3 py-1 whitespace-nowrap">
          {coffee.origin}
        </span>
      </div>

      {/* Body */}
      {/* TODO: Display average star rating here (e.g. ★ 4.2 · 18 reviews).
          Ratings should only be submitted by customers who have ordered this coffee
          and are logged in. Requires: a Rating model in the DB (userId, coffeeId, stars 1–5),
          a POST /api/ratings endpoint that verifies the order history before saving,
          and a GET /api/coffees/[slug]/rating endpoint for the aggregated score. */}
      <div className="p-4">
        <p className="font-serif text-xl text-stone-900 font-medium leading-tight mb-0.5 group-hover:text-amber-700 transition-colors">{coffee.name}</p>
        <p className="text-xs text-stone-400 mb-0.5">{coffee.subtitle}</p>
        <div className="flex flex-wrap gap-1 mb-3">
          {coffee.notes.map((note) => (
            <span
              key={note}
              className="text-[10px] px-2 py-0.5 bg-stone-100 text-stone-500 rounded-full capitalize"
            >
              {note}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-stone-900">
              ${defaultPrice}{' '}
              <span className="text-xs font-normal text-stone-400">/ {defaultSize}</span>
            </div>
            {cartQty > 0 && (
              <p className="text-[10px] text-amber-700 font-medium mt-0.5">{cartQty} in cart</p>
            )}
          </div>
          {!coffee.inStock && (
            <span className="text-xs px-3 py-1.5 rounded-full bg-stone-100 text-stone-400">
              Unavailable
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
