'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useCartStore } from '@/lib/store/cart';
import { showToast } from '@/components/ui/Toast';
import type { Coffee } from '@/lib/types';
import { CoffeeBeanIcon } from '@phosphor-icons/react';

interface ProductModalProps {
  product: Coffee | null;
  onClose: () => void;
}

const ROAST_LEVELS = ['Light', 'Light-Medium', 'Medium', 'Medium-Dark', 'Dark'] as const;

function sizeToLbs(s: string): number {
  if (s.startsWith('½')) return 0.5;
  return parseFloat(s);
}

export function ProductModal({ product, onClose }: ProductModalProps) {
  const { addItem } = useCartStore();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedRoast, setSelectedRoast] = useState<string | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(product?.hasImage === false);

  useEffect(() => {
    setSelectedSize(null);
    setSelectedRoast(null);
    setImgLoaded(false);
    setImgError(product?.hasImage === false);
  }, [product?.id, product?.hasImage]);

  // Sizes sorted biggest → smallest; default 1 lb
  const sizes = product
    ? Object.entries(product.prices).sort((a, b) => sizeToLbs(b[0]) - sizeToLbs(a[0]))
    : [];
  const activeSize = selectedSize ?? '1 lb';
  const activePrice = product && activeSize ? product.prices[activeSize] : 0;

  // Roast: default to the coffee's recommended roast
  const activeRoast = selectedRoast ?? product?.roast ?? 'Medium';

  function handleAddToCart() {
    if (!product || !activeSize || !product.inStock) return;
    const variant = `${activeSize} · ${activeRoast} Roast`;
    addItem({
      key: `${product.id}-${activeSize}-${activeRoast.replace(/\s/g, '-')}`,
      id: product.id,
      type: 'coffee',
      name: product.name,
      variant,
      price: activePrice,
      gradient: product.gradient,
      slug: product.slug,
      hasImage: product.hasImage,
    });
    showToast(`"${product.name}" added to cart`);
    onClose();
  }

  return (
    <Modal isOpen={!!product} onClose={onClose} className="max-w-4xl">
      {product && (
        <div className="grid md:grid-cols-2">
          {/* Image */}
          <div
            className={`flex flex-col items-center justify-center p-10 rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none min-h-48 relative overflow-hidden ${!product.inStock ? 'opacity-70' : ''}`}
            style={{ background: product.gradient }}
          >
            {!imgError && (
              <img
                src={`/images/products/${product.slug}.png`}
                alt={product.name}
                className="absolute inset-0 w-full h-full object-cover"
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
              />
            )}

            {(!imgLoaded || imgError) && (
              <CoffeeBeanIcon size={72} weight="duotone" color="white" className="mb-4 relative z-10 opacity-80" />
            )}

            {!product.inStock && (
              <div className="absolute inset-0 flex items-center justify-center rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none bg-black/40">
                <span className="bg-black/70 text-white text-sm font-bold uppercase tracking-widest px-4 py-2 rounded-full">
                  Out of Stock
                </span>
              </div>
            )}
            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 text-xs text-white/90 font-medium tracking-wide bg-black/25 rounded-full px-3 py-1 whitespace-nowrap">
              {product.origin}
            </span>
          </div>

          {/* Info */}
          <div className="p-6 sm:p-8 overflow-y-auto max-h-[80vh]">
            <p className="text-xs text-amber-700 font-semibold uppercase tracking-widest mb-1">
              {product.origin}
            </p>
            <h2 className="font-serif text-2xl text-stone-900 mb-3">{product.name}</h2>

            {!product.inStock && (
              <div className="mb-4 px-3 py-2.5 bg-stone-100 rounded-lg border border-stone-200">
                <p className="text-sm font-medium text-stone-600">Currently out of stock</p>
                <p className="text-xs text-stone-400 mt-0.5">Check back soon or subscribe to always have coffee on hand.</p>
              </div>
            )}

            <p className="text-sm text-stone-600 leading-relaxed mb-5">{product.description}</p>

            {/* Specs */}
            <div className="grid grid-cols-2 gap-2 mb-5">
              {[
                ['Process', product.process],
                ['Elevation', product.elevation],
                ['Recommended Roast', product.roast],
                ['Tasting Notes', product.notes.join(', ')],
              ].map(([label, val]) => (
                <div key={label} className="bg-stone-50 rounded-lg p-2.5">
                  <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-0.5">
                    {label}
                  </p>
                  <p className="text-xs text-stone-700 font-medium capitalize">{val}</p>
                </div>
              ))}
            </div>

            {product.inStock ? (
              <>
                {/* Size picker — biggest to smallest */}
                <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-2">
                  Select Size
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {sizes.map(([sz, pr]) => (
                    <button
                      key={sz}
                      onClick={() => setSelectedSize(sz)}
                      className={`px-3 py-2 rounded-lg text-sm border transition-all ${
                        activeSize === sz
                          ? 'border-stone-900 bg-stone-900 text-white'
                          : 'border-stone-200 text-stone-700 hover:border-stone-400'
                      }`}
                    >
                      {sz} — ${pr}
                    </button>
                  ))}
                </div>

                {/* Roast picker — all 5 levels, recommended pre-selected */}
                <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-2">
                  Select Roast Level
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {ROAST_LEVELS.map((roast) => (
                    <button
                      key={roast}
                      onClick={() => setSelectedRoast(roast)}
                      className={`px-3 py-2 rounded-lg text-sm border transition-all ${
                        activeRoast === roast
                          ? 'border-amber-600 bg-amber-600 text-white'
                          : 'border-stone-200 text-stone-700 hover:border-amber-400'
                      }`}
                    >
                      {roast}
                    </button>
                  ))}
                </div>

                <div className="text-2xl font-serif text-stone-900 mb-4">${activePrice}</div>
                <Button variant="dark" full onClick={handleAddToCart}>
                  Add to Cart — {activeSize} · {activeRoast} Roast
                </Button>
              </>
            ) : (
              <Button variant="outline" full onClick={onClose}>
                Back to Shop
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
