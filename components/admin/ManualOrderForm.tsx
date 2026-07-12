'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { showToast } from '@/components/ui/Toast';

interface ItemRow {
  name: string;
  variant: string;
  price: string;
  qty: string;
}

const EMPTY_ROW: ItemRow = { name: '', variant: '', price: '', qty: '1' };

export function ManualOrderForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [note, setNote] = useState('');
  const [rows, setRows] = useState<ItemRow[]>([{ ...EMPTY_ROW }]);
  const [submitting, setSubmitting] = useState(false);

  function updateRow(idx: number, patch: Partial<ItemRow>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((prev) => [...prev, { ...EMPTY_ROW }]);
  }
  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submit() {
    if (!customerEmail.trim()) return showToast('Enter a customer email');
    if (!note.trim()) return showToast('A note explaining this order is required');
    const items = rows
      .filter((r) => r.name.trim() && r.price && r.qty)
      .map((r) => ({ name: r.name.trim(), variant: r.variant.trim(), price: parseFloat(r.price), qty: parseInt(r.qty, 10) }));
    if (items.length === 0) return showToast('Add at least one item');

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/orders/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerEmail: customerEmail.trim(), customerName: customerName.trim(), note: note.trim(), items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Manual order recorded');
      setOpen(false);
      setCustomerEmail('');
      setCustomerName('');
      setNote('');
      setRows([{ ...EMPTY_ROW }]);
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to record order');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium border border-stone-200 px-3 py-1.5 rounded-lg hover:bg-stone-50 transition-colors"
      >
        Record Manual Order
      </button>
    );
  }

  const total = rows.reduce((sum, r) => sum + (parseFloat(r.price) || 0) * (parseInt(r.qty, 10) || 0), 0);

  return (
    <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-stone-900">Record Manual Order</h2>
        <button onClick={() => setOpen(false)} className="text-xs text-stone-400 hover:text-stone-700">Cancel</button>
      </div>
      <p className="text-xs text-stone-400">
        For a comp, phone/in-person sale, or goodwill replacement — no Stripe charge happens. To give someone spendable
        credit instead, use Issue Gift Card on the Gift Cards page.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="email"
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
          placeholder="Customer email *"
          className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
        />
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Customer name"
          className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Items</p>
        {rows.map((row, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <input
              type="text"
              value={row.name}
              onChange={(e) => updateRow(idx, { name: e.target.value })}
              placeholder="Item name"
              className="flex-1 border border-stone-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-amber-400"
            />
            <input
              type="text"
              value={row.variant}
              onChange={(e) => updateRow(idx, { variant: e.target.value })}
              placeholder="Variant"
              className="w-28 border border-stone-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-amber-400"
            />
            <input
              type="number"
              value={row.price}
              onChange={(e) => updateRow(idx, { price: e.target.value })}
              placeholder="Price"
              className="w-20 border border-stone-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-amber-400"
            />
            <input
              type="number"
              value={row.qty}
              onChange={(e) => updateRow(idx, { qty: e.target.value })}
              placeholder="Qty"
              className="w-16 border border-stone-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-amber-400"
            />
            {rows.length > 1 && (
              <button onClick={() => removeRow(idx)} className="text-xs text-red-500 hover:text-red-700 px-1">✕</button>
            )}
          </div>
        ))}
        <button onClick={addRow} className="text-xs text-amber-700 hover:underline">+ Add item</button>
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note — why this order is being recorded manually (required)"
        rows={2}
        className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400 resize-none"
      />

      <div className="flex items-center justify-between pt-1">
        <p className="text-sm text-stone-500">Total: <span className="font-medium text-stone-900">${total.toFixed(2)}</span></p>
        <button
          onClick={submit}
          disabled={submitting}
          className="text-sm font-medium bg-stone-900 text-white px-4 py-2 rounded-full hover:bg-stone-700 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Recording…' : 'Record Order'}
        </button>
      </div>
    </div>
  );
}
