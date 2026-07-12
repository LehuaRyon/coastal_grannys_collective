'use client';

import { useState } from 'react';
import { showToast } from '@/components/ui/Toast';
import { CheckIcon } from '@phosphor-icons/react';

interface GiftCardRow {
  code: string;
  balance: number;
  initialBalance: number;
  createdAt: string;
}

export function GiftCardList({ giftCards }: { giftCards: GiftCardRow[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code);
      showToast('Code copied');
      setTimeout(() => setCopied((c) => (c === code ? null : c)), 1500);
    });
  }

  return (
    <div className="divide-y divide-stone-100">
      {giftCards.map((gc) => (
        <div key={gc.code} className="px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-sm text-stone-800">{gc.code}</p>
            <p className="text-xs text-stone-400 mt-0.5">
              {gc.balance <= 0
                ? 'Fully used'
                : gc.balance < gc.initialBalance
                  ? `$${gc.balance.toFixed(2)} left of $${gc.initialBalance.toFixed(2)}`
                  : 'Never used'}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span
              className={`font-serif text-xl ${gc.balance > 0 ? 'text-amber-700' : 'text-stone-300'}`}
            >
              ${gc.balance.toFixed(2)}
            </span>
            <button
              type="button"
              onClick={() => gc.balance > 0 && copyCode(gc.code)}
              disabled={gc.balance <= 0}
              className="text-xs font-medium text-stone-500 hover:text-stone-800 border border-stone-200 rounded-full px-3 py-1.5 transition-colors inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-stone-500"
            >
              {copied === gc.code ? (
                <>
                  <CheckIcon size={12} weight="bold" />
                  Copied
                </>
              ) : (
                'Copy code'
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
