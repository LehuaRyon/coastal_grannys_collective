'use client';

import { useState } from 'react';
import { showToast } from '@/components/ui/Toast';

interface SearchResult {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: string;
  customerEmail: string | null;
  lastError: string | null;
  orderId: string | null;
}

export function PaymentSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [recoveringId, setRecoveringId] = useState<string | null>(null);

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    setResults(null);
    try {
      const res = await fetch(`/api/admin/stripe/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data.results);
      if (data.results.length === 0) showToast('No matching Stripe payments found');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  }

  async function recover(id: string) {
    setRecoveringId(id);
    try {
      const res = await fetch(`/api/admin/stripe/recover/${id}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Order recovered');
      setResults((prev) => prev?.map((r) => (r.id === id ? { ...r, orderId: data.order.id } : r)) ?? null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Recovery failed');
    } finally {
      setRecoveringId(null);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-stone-100 p-6">
      <h2 className="font-medium text-stone-900 mb-1">Look Up a Payment</h2>
      <p className="text-xs text-stone-400 mb-4">
        Search by PaymentIntent id (e.g. <code className="bg-stone-100 px-1 rounded">pi_...</code>) or customer email — works for payments of any age, not just the last 14 days.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder="pi_... or customer@example.com"
          className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
        />
        <button
          onClick={search}
          disabled={searching}
          className="text-sm font-medium bg-stone-900 text-white px-4 py-2 rounded-lg hover:bg-stone-700 transition-colors disabled:opacity-50"
        >
          {searching ? 'Searching…' : 'Search'}
        </button>
      </div>

      {results && results.length > 0 && (
        <ul className="mt-4 divide-y divide-stone-50">
          {results.map((r) => (
            <li key={r.id} className="py-3 flex items-center justify-between gap-3 text-sm">
              <div>
                <p className="font-mono text-xs text-stone-700">{r.id}</p>
                <p className="text-xs text-stone-400">
                  ${r.amount.toFixed(2)} {r.currency.toUpperCase()} · {r.status} · {r.customerEmail ?? 'no email'} · {new Date(r.created).toLocaleString()}
                </p>
                {r.lastError && <p className="text-xs text-red-500 mt-0.5">Last error: {r.lastError}</p>}
              </div>
              {r.orderId ? (
                <a href={`/admin/orders/${r.orderId}`} className="text-xs text-amber-700 hover:underline flex-shrink-0">View order →</a>
              ) : r.status === 'succeeded' ? (
                <button
                  onClick={() => recover(r.id)}
                  disabled={recoveringId === r.id}
                  className="text-xs font-medium bg-red-600 text-white px-3 py-1 rounded-full hover:bg-red-700 transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  {recoveringId === r.id ? 'Recovering…' : 'Recover'}
                </button>
              ) : (
                <span className="text-xs text-stone-400 flex-shrink-0">No order (not succeeded)</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
