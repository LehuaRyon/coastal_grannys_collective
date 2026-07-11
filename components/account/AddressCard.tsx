'use client';

import { useState } from 'react';
import { showToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { PhoneInput } from '@/components/ui/PhoneInput';

interface ProfileFields {
  phone: string | null;
  address: string | null;
  apt: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
}

const inputClass =
  'w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors';

export function AddressCard({ profile }: { profile: ProfileFields }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<ProfileFields>(profile);
  const [form, setForm] = useState({
    phone: profile.phone ?? '',
    address: profile.address ?? '',
    apt: profile.apt ?? '',
    city: profile.city ?? '',
    state: profile.state ?? '',
    zip: profile.zip ?? '',
    // US-only shipping — always saved as United States, not user-editable
    country: 'United States',
  });

  function startEditing() {
    setForm({
      phone: saved.phone ?? '',
      address: saved.address ?? '',
      apt: saved.apt ?? '',
      city: saved.city ?? '',
      state: saved.state ?? '',
      zip: saved.zip ?? '',
      country: 'United States',
    });
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSaved(data.user);
      setEditing(false);
      showToast('Address updated');
    } catch {
      showToast('Failed to update — please try again.');
    } finally {
      setSaving(false);
    }
  }

  const hasAddress = saved.address || saved.city || saved.zip;
  const addressLine2 = [saved.city, saved.state, saved.zip].filter(Boolean).join(', ');

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium text-stone-900">Shipping Address &amp; Phone</h2>
        {!editing && (
          <button
            onClick={startEditing}
            className="text-xs font-medium text-amber-700 hover:underline"
          >
            {hasAddress || saved.phone ? 'Edit' : 'Add'}
          </button>
        )}
      </div>

      {!editing ? (
        <div className="text-sm text-stone-700 space-y-1">
          <p>{saved.phone || <span className="text-stone-400">No phone number saved</span>}</p>
          {hasAddress ? (
            <>
              <p>
                {saved.address}
                {saved.apt ? `, ${saved.apt}` : ''}
              </p>
              <p>
                {addressLine2}
                {saved.country ? ` · ${saved.country}` : ''}
              </p>
            </>
          ) : (
            <p className="text-stone-400">No shipping address saved</p>
          )}
          <p className="text-xs text-stone-400 pt-1">
            Used to prefill checkout for coffee orders.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Phone</label>
            <PhoneInput
              value={form.phone}
              onChange={(v) => setForm({ ...form, phone: v })}
              placeholder="(555) 000-0000"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Street Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="123 Main St"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Apt / Suite</label>
            <input
              type="text"
              value={form.apt}
              onChange={(e) => setForm({ ...form, apt: e.target.value })}
              placeholder="Apt 4B"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="San Francisco"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">State</label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                placeholder="CA"
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">ZIP Code</label>
              <input
                type="text"
                value={form.zip}
                onChange={(e) => setForm({ ...form, zip: e.target.value })}
                placeholder="94103"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Country</label>
              <select
                value={form.country}
                disabled
                className={`${inputClass} bg-stone-100 text-stone-500 cursor-not-allowed`}
              >
                <option>United States</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
