'use client';

import { useState } from 'react';

const IMAGES = [
  { src: '/images/cart/kelly-at-cart.png', alt: "Kelly at the Coastal Granny's cart outdoors" },
  { src: '/images/cart/cg-drinks-food.png', alt: "Coastal Granny's drinks and food spread" },
  { src: '/images/cart/cg-cart.png', alt: "Ryan and Kelly behind the Coastal Granny's cart" },
  { src: '/images/cart/kelly-pouring.png', alt: "Kelly finishing a drink at a pop-up" },
];

export function CartCarousel() {
  const [current, setCurrent] = useState(0);

  function prev() {
    setCurrent((i) => (i === 0 ? IMAGES.length - 1 : i - 1));
  }
  function next() {
    setCurrent((i) => (i === IMAGES.length - 1 ? 0 : i + 1));
  }

  return (
    <div className="relative rounded-3xl overflow-hidden shadow-xl aspect-[3/4] bg-stone-100">
        {IMAGES.map((img, i) => (
          <img
            key={img.src}
            src={img.src}
            alt={img.alt}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
              i === current ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}

        {/* Prev */}
        <button
          onClick={prev}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
          aria-label="Previous image"
        >
          ‹
        </button>

        {/* Next */}
        <button
          onClick={next}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
          aria-label="Next image"
        >
          ›
        </button>

        {/* Dots */}
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
