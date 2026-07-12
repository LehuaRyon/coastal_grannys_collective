'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { showToast } from '@/components/ui/Toast';
import { StateSelect } from '@/components/ui/StateSelect';
import { sanitizeZip, sanitizeCity } from '@/lib/utils/numberInput';

interface ShippingAddress {
  address: string;
  apt?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

const EMPTY_ADDRESS: ShippingAddress = { address: '', apt: '', city: '', state: '', zip: '', country: 'United States' };

export function AdminSubscriptionAddressForm({ subscriptionId, initialAddress }: { subscriptionId: string; initialAddress: ShippingAddress | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ShippingAddress>(initialAddress ?? EMPTY_ADDRESS);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.address.trim() || !form.city.trim() || !form.state.trim() || !form.zip.trim()) {
      showToast('Fill in the full address');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/subscriptions/${subscriptionId}/address`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shippingAddress: form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Shipping address updated');
      setEditing(false);
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update address');
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div>
        {initialAddress ? (
          <p className="text-sm text-stone-600">
            {initialAddress.address}{initialAddress.apt ? `, ${initialAddress.apt}` : ''}<br />
            {initialAddress.city}, {initialAddress.state} {initialAddress.zip}<br />
            {initialAddress.country}
          </p>
        ) : (
          <p className="text-sm text-stone-400">No shipping address on file.</p>
        )}
        <button onClick={() => { setForm(initialAddress ?? EMPTY_ADDRESS); setEditing(true); }} className="text-xs text-amber-700 hover:underline mt-2">
          Edit address
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={form.address}
        onChange={(e) => setForm({ ...form, address: e.target.value })}
        placeholder="Street address"
        className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
      />
      <input
        type="text"
        value={form.apt ?? ''}
        onChange={(e) => setForm({ ...form, apt: e.target.value })}
        placeholder="Apt / Suite"
        className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={form.city}
          onChange={(e) => setForm({ ...form, city: sanitizeCity(e.target.value) })}
          placeholder="City"
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
        />
        <StateSelect
          value={form.state}
          onChange={(v) => setForm({ ...form, state: v })}
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
        />
      </div>
      <input
        type="text"
        value={form.zip}
        onChange={(e) => setForm({ ...form, zip: sanitizeZip(e.target.value) })}
        placeholder="ZIP"
        maxLength={5}
        className="w-32 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
      />
      <div className="flex gap-2 pt-1">
        <button
          onClick={save}
          disabled={saving}
          className="text-xs font-medium bg-stone-900 text-white px-3 py-1.5 rounded-full hover:bg-stone-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Address'}
        </button>
        <button
          onClick={() => setEditing(false)}
          disabled={saving}
          className="text-xs font-medium border border-stone-200 text-stone-600 px-3 py-1.5 rounded-full hover:bg-stone-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
