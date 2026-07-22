'use client';

import { useEffect, useState } from 'react';

// Same three images as the desktop grid below, in the same order. `objectClass`
// preserves each image's framing (the Rodeo Queen bag is top-aligned).
const IMAGES = [
  { src: '/images/about/cart-popup.png', alt: "Coastal Granny's pop-up cart", objectClass: 'object-cover' },
  { src: '/images/about/rodeo-queen-bag.png', alt: 'Rodeo Queen — Coastal Granny\'s Collective', objectClass: 'object-cover object-top' },
  { src: '/images/about/cg-drink.png', alt: "Coastal Granny's signature drink", objectClass: 'object-cover' },
];

// Mobile-only carousel for the About gallery. Mirrors the coffee-cart CartCarousel
// (crossfade, prev/next, dots, 3s auto-advance). Desktop keeps the 3-across grid.
export function AboutGallery() {
  const [current, setCurrent] = useState(0);

  function prev() {
    setCurrent((i) => (i === 0 ? IMAGES.length - 1 : i - 1));
  }
  function next() {
    setCurrent((i) => (i === IMAGES.length - 1 ? 0 : i + 1));
  }

  // Auto-advance every 3s; resets on manual navigation via the `current` dep.
  useEffect(() => {
    const timer = setInterval(next, 3000);
    return () => clearInterval(timer);
  }, [current]);

  return (
    <div className="relative rounded-3xl overflow-hidden shadow-xl aspect-[3/4] bg-stone-100">
      {IMAGES.map((img, i) => (
        <img
          key={img.src}
          src={img.src}
          alt={img.alt}
          className={`absolute inset-0 w-full h-full ${img.objectClass} transition-opacity duration-700 ${
            i === current ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}

      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
        aria-label="Previous image"
      >
        ‹
      </button>

      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
        aria-label="Next image"
      >
        ›
      </button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {IMAGES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2 h-2 rounded-full transition-all ${
              i === current ? 'bg-white w-5' : 'bg-white/50'
            }`}
            aria-label={`Go to image ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
