'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { showToast } from '@/components/ui/Toast';

export function AdminSubscriptionRoastForm({
  subscriptionId,
  roastPreference,
  roastOptions,
}: {
  subscriptionId: string;
  roastPreference: string | null;
  roastOptions: string[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save(value: string | null) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/subscriptions/${subscriptionId}/roast`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roastPreference: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Roast preference updated');
      setEditing(false);
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update roast preference');
    } finally {
      setSaving(false);
    }
  }

  if (roastOptions.length === 0) return null;

  if (!editing) {
    return (
      <div className="flex justify-between items-center">
        <span className="text-stone-500 text-sm">Roast</span>
        <button onClick={() => setEditing(true)} className="text-xs text-amber-700 hover:underline">
          {roastPreference ?? 'No preference'} · Change
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {['No Preference', ...roastOptions].map((r) => {
        const value = r === 'No Preference' ? null : r;
        const active = (roastPreference ?? 'No Preference') === r;
        return (
          <button
            key={r}
            disabled={saving}
            onClick={() => save(value)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all disabled:opacity-50 ${
              active ? 'bg-stone-900 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
            }`}
          >
            {r}
          </button>
        );
      })}
    </div>
  );
}
