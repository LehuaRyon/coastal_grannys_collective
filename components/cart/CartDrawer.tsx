'use client';

import { useEffect, useState } from 'react';
import { XIcon, CoffeeBeanIcon, GiftIcon, ArrowsClockwiseIcon, TShirtIcon } from '@phosphor-icons/react';
import { useCartStore } from '@/lib/store/cart';
import { CheckoutModal } from '@/components/checkout/CheckoutModal';
import { Button } from '@/components/ui/Button';
import type { CartItem } from '@/lib/types';

function CartItemThumb({ item }: { item: CartItem }) {
  const [imgError, setImgError] = useState(false);
  const showImg = item.type === 'coffee' && item.slug && !imgError;

  return (
    <div
      className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
      style={!showImg ? { background: item.gradient } : undefined}
    >
      {showImg ? (
        <img
          src={`/images/products/${item.slug}.png`}
          alt={item.name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : item.type === 'gift' ? (
        <GiftIcon size={24} weight="duotone" color="white" />
      ) : item.type === 'sub' ? (
        <ArrowsClockwiseIcon size={24} weight="duotone" color="white" />
      ) : item.type === 'merch' ? (
        <TShirtIcon size={24} weight="duotone" color="white" />
      ) : (
        <CoffeeBeanIcon size={24} weight="duotone" color="white" />
      )}
    </div>
  );
}

const FREE_SHIPPING_THRESHOLD = 60;

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQty, total, count } = useCartStore();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const subtotal = total();
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 8;
  const grandTotal = subtotal + shipping;
  const cartCount = count();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeCart}
      />

      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <h2 className="font-serif text-lg text-stone-900">
            Your Cart{' '}
            {mounted && cartCount > 0 && (
              <span className="text-sm font-normal text-stone-400">({cartCount})</span>
            )}
          </h2>
          <button
            onClick={closeCart}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-500 transition-colors"
          >
            <XIcon size={16} weight="bold" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-12">
              <CoffeeBeanIcon size={48} weight="duotone" color="#C8921A" />
              <h3 className="font-serif text-lg text-stone-800">Your cart is empty</h3>
              <p className="text-sm text-stone-500">Add some coffees to get started.</p>
              <Button variant="dark" size="sm" onClick={closeCart}>
                Shop Coffee
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.key} className="flex gap-3">
                  <CartItemThumb item={item} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900 truncate">{item.name}</p>
                    <p className="text-xs text-stone-400 mb-1.5">{item.variant}</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(item.key, -1)}
                        className="w-6 h-6 flex items-center justify-center rounded-full border border-stone-200 hover:border-stone-400 text-stone-600 text-xs transition-colors"
                      >
                        −
                      </button>
                      <span className="text-sm w-5 text-center">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.key, 1)}
                        className="w-6 h-6 flex items-center justify-center rounded-full border border-stone-200 hover:border-stone-400 text-stone-600 text-xs transition-colors"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeItem(item.key)}
                        className="ml-1 text-xs text-stone-400 hover:text-red-500 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-stone-900 flex-shrink-0">
                    ${(item.price * item.qty).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-6 py-4 border-t border-stone-100 space-y-3">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Shipping</span>
                <span>{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between font-semibold text-stone-900 pt-1 border-t border-stone-100">
                <span>Total</span>
                <span>${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {subtotal < FREE_SHIPPING_THRESHOLD ? (
              <p className="text-xs text-stone-500 text-center">
                Add ${(FREE_SHIPPING_THRESHOLD - subtotal).toFixed(2)} more for free shipping
              </p>
            ) : (
              <p className="text-xs text-amber-700 text-center font-medium">
                🎉 You&apos;ve unlocked free shipping!
              </p>
            )}

            <Button
              variant="primary"
              full
              onClick={() => {
                closeCart();
                setCheckoutOpen(true);
              }}
            >
              Checkout →
            </Button>
          </div>
        )}
      </aside>

      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
      />
    </>
  );
}
