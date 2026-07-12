'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { showToast } from '@/components/ui/Toast';
import { WarningCircleIcon } from '@phosphor-icons/react';

interface MissingItem {
  subscriptionId: string;
  productName: string;
  customerEmail: string;
  invoiceId: string;
  amount: number;
  created: string;
}

export function MissingFulfillmentBanner() {
  const router = useRouter();
  const [items, setItems] = useState<MissingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [recoveringId, setRecoveringId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/subscriptions/scan-missing-fulfillment')
      .then((r) => r.json())
      .then((d) => setItems(d.missing ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function recover(subscriptionId: string) {
    setRecoveringId(subscriptionId);
    try {
      const res = await fetch(`/api/admin/subscriptions/${subscriptionId}/resync`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`Recovered ${data.ordersRecovered} missing order(s)`);
      setItems((prev) => prev.filter((i) => i.subscriptionId !== subscriptionId));
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Recovery failed');
    } finally {
      setRecoveringId(null);
    }
  }

  if (loading || items.length === 0) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800 space-y-2">
      <p className="flex items-start gap-1.5 font-medium">
        <WarningCircleIcon size={16} weight="duotone" className="flex-shrink-0 mt-0.5" />
        <span>
          {items.length} subscription charge{items.length === 1 ? '' : 's'} succeeded but never created a fulfillment
          order — a renewal webhook was likely missed:
        </span>
      </p>
      <ul className="space-y-1.5 pl-6">
        {items.map((item) => (
          <li key={item.invoiceId} className="flex items-center justify-between gap-3 text-xs">
            <span>
              {item.productName} — ${item.amount.toFixed(2)} · {item.customerEmail} · {new Date(item.created).toLocaleString()}
            </span>
            <button
              onClick={() => recover(item.subscriptionId)}
              disabled={recoveringId === item.subscriptionId}
              className="flex-shrink-0 text-xs font-medium bg-red-600 text-white px-3 py-1 rounded-full hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {recoveringId === item.subscriptionId ? 'Recovering…' : 'Recover'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
