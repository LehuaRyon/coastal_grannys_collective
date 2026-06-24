'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { label: 'Coffee', href: '/shop/coffee' },
  { label: 'Subscriptions', href: '/shop/subscriptions' },
  { label: 'Merch', href: '/shop/merch' },
  { label: 'Gift Cards', href: '/shop/gift-cards' },
];

export function ShopTabs() {
  const pathname = usePathname();

  return (
    <div className="border-b border-stone-200 mb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex gap-0 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative flex-shrink-0 px-5 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'text-amber-700'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-700 rounded-t-full" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
