'use client';

import { useState } from 'react';
import { showToast } from '@/components/ui/Toast';

const REASONS = [
  { value: '', label: 'No reason specified' },
  { value: 'requested_by_customer', label: 'Requested by customer' },
  { value: 'duplicate', label: 'Duplicate charge' },
  { value: 'fraudulent', label: 'Fraudulent' },
];

export function RefundPanel({ orderId, maxRefundable }: { orderId: string; maxRefundable: number }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(maxRefundable.toFixed(2));
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submitRefund() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || amt > maxRefundable) {
      showToast(`Amount must be between $0.01 and $${maxRefundable.toFixed(2)}`);
      return;
    }
    const isFull = amt === maxRefundable;
    if (!window.confirm(`Refund $${amt.toFixed(2)}${isFull ? ' (full remaining amount)' : ' (partial)'} to the customer's original payment method? This can't be undone.`)) {
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, reason: reason || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Refund submitted — order will update automatically in a few seconds');
      setDone(true);
      setOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Refund failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return <p className="text-xs text-stone-400">Refund submitted — waiting for Stripe to confirm.</p>;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-sm font-medium bg-stone-900 text-white px-4 py-2 rounded-full hover:bg-stone-700 transition-colors"
      >
        Refund
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-stone-600">
        Amount to refund (max ${maxRefundable.toFixed(2)})
      </label>
      <input
        type="number"
        step="0.01"
        min="0.01"
        max={maxRefundable}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
      />
      <label className="block text-xs font-medium text-stone-600 pt-1">Reason (optional)</label>
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400 bg-white"
      >
        {REASONS.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => setOpen(false)}
          className="flex-1 text-sm font-medium border border-stone-200 px-4 py-2 rounded-full hover:bg-stone-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={submitRefund}
          disabled={submitting}
          className="flex-1 text-sm font-medium bg-red-600 text-white px-4 py-2 rounded-full hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Refunding…' : 'Confirm Refund'}
        </button>
      </div>
    </div>
  );
}
