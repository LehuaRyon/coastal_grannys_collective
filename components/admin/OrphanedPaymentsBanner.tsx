'use client';

import { useEffect, useState } from 'react';
import { showToast } from '@/components/ui/Toast';
import { WarningCircleIcon } from '@phosphor-icons/react';

interface OrphanedPayment {
  id: string;
  amount: number;
  currency: string;
  createdAt: string;
  customerEmail: string | null;
  customerName: string | null;
}

export function OrphanedPaymentsBanner() {
  const [payments, setPayments] = useState<OrphanedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [recoveringId, setRecoveringId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/stripe/orphaned-payments')
      .then((r) => r.json())
      .then((d) => setPayments(d.orphaned ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function recover(id: string) {
    setRecoveringId(id);
    try {
      const res = await fetch(`/api/admin/stripe/recover/${id}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Order recovered');
      setPayments((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Recovery failed');
    } finally {
      setRecoveringId(null);
    }
  }

  if (loading || payments.length === 0) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800 space-y-2">
      <p className="flex items-start gap-1.5 font-medium">
        <WarningCircleIcon size={16} weight="duotone" className="flex-shrink-0 mt-0.5" />
        <span>
          {payments.length} Stripe payment{payments.length === 1 ? '' : 's'} succeeded but never created an order —
          the webhook missed {payments.length === 1 ? 'it' : 'them'}. This will also auto-recover on its own within a
          couple hours, but you can fix it now:
        </span>
      </p>
      <ul className="space-y-1.5 pl-6">
        {payments.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 text-xs">
            <span>
              <span className="font-mono">{p.id}</span> — ${p.amount.toFixed(2)} {p.currency.toUpperCase()}
              {p.customerEmail ? ` · ${p.customerEmail}` : ''} · {new Date(p.createdAt).toLocaleString()}
            </span>
            <button
              onClick={() => recover(p.id)}
              disabled={recoveringId === p.id}
              className="flex-shrink-0 text-xs font-medium bg-red-600 text-white px-3 py-1 rounded-full hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {recoveringId === p.id ? 'Recovering…' : 'Recover'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
