'use client';

import { useState } from 'react';
import { showToast } from '@/components/ui/Toast';

// "partially_refunded" isn't included here — it only ever comes from the
// Stripe webhook, which knows the real refunded amount. This plain select
// has no amount field, so manually choosing it would misleadingly default
// to crediting the full order amount. It's still recognized for display
// (see `colors` below) if a webhook has already set it.
const STATUSES = ['paid', 'refunded', 'disputed', 'pending', 'failed'];

const colors: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  partially_refunded: 'bg-blue-100 text-blue-700',
  refunded: 'bg-stone-100 text-stone-600',
  disputed: 'bg-orange-100 text-orange-700',
  failed: 'bg-red-100 text-red-600',
};

export function OrderStatusSelect({ orderId, initialStatus }: { orderId: string; initialStatus: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);

  async function handleChange(newStatus: string) {
    if (newStatus === status) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      setStatus(newStatus);
      showToast(`Order marked as ${newStatus}`);
      if (newStatus === 'refunded') {
        showToast('Note: process the actual refund in your Stripe Dashboard');
      }
    } catch {
      showToast('Failed to update status');
    } finally {
      setSaving(false);
    }
  }

  // Include the current status as an option even if it's not one of the
  // manually-selectable STATUSES (e.g. "partially_refunded" set by the
  // webhook) so the select always has a matching option to display.
  const options = STATUSES.includes(status) ? STATUSES : [status, ...STATUSES];

  return (
    <div className="relative inline-flex items-center gap-1">
      <select
        value={status}
        onChange={(e) => handleChange(e.target.value)}
        disabled={saving}
        className={`appearance-none pl-2.5 pr-6 py-1 rounded-full text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50 ${colors[status] ?? 'bg-stone-100 text-stone-600'}`}
      >
        {options.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-1.5 text-[8px] opacity-50">▼</span>
    </div>
  );
}
