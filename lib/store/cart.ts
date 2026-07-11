'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '@/lib/types';

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: Omit<CartItem, 'qty'>) => void;
  removeItem: (key: string) => void;
  updateQty: (key: string, delta: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  total: () => number;
  count: () => number;
}

let autoCloseTimer: ReturnType<typeof setTimeout> | null = null;
function clearAutoClose() {
  if (autoCloseTimer) { clearTimeout(autoCloseTimer); autoCloseTimer = null; }
}

// Coffee first, then subscriptions (coffee-adjacent), then merch, then gift cards last —
// alphabetical by name within each group. Used anywhere cart items are listed
// (cart drawer, checkout order summary) so the order is consistent everywhere.
const TYPE_ORDER: Record<CartItem['type'], number> = { coffee: 0, sub: 1, merch: 2, gift: 3 };

export function sortCartItems(items: CartItem[]): CartItem[] {
  return [...items].sort((a, b) => {
    const typeDiff = TYPE_ORDER[a.type] - TYPE_ORDER[b.type];
    if (typeDiff !== 0) return typeDiff;
    return a.name.localeCompare(b.name);
  });
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (newItem) => {
        set((state) => {
          const existing = state.items.find((i) => i.key === newItem.key);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.key === newItem.key ? { ...i, qty: i.qty + 1 } : i
              ),
            };
          }
          return { items: [...state.items, { ...newItem, qty: 1 }] };
        });
        clearAutoClose();
        set({ isOpen: true });
        autoCloseTimer = setTimeout(() => { set({ isOpen: false }); autoCloseTimer = null; }, 2500);
      },

      removeItem: (key) => {
        set((state) => ({ items: state.items.filter((i) => i.key !== key) }));
      },

      updateQty: (key, delta) => {
        set((state) => ({
          items: state.items
            .map((i) => (i.key === key ? { ...i, qty: Math.max(1, i.qty + delta) } : i))
            .filter((i) => i.qty > 0),
        }));
      },

      clearCart: () => set({ items: [] }),

      openCart: () => { clearAutoClose(); set({ isOpen: true }); },
      closeCart: () => { clearAutoClose(); set({ isOpen: false }); },
      toggleCart: () => { clearAutoClose(); set((state) => ({ isOpen: !state.isOpen })); },

      total: () => get().items.reduce((sum, i) => sum + i.price * i.qty, 0),
      count: () => get().items.reduce((sum, i) => sum + i.qty, 0),
    }),
    { name: 'coastal-grannys-cart', skipHydration: true }
  )
);
