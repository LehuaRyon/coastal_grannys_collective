'use client';

import { useEffect, useState, useCallback } from 'react';
import { showToast } from '@/components/ui/Toast';
import { WarningCircleIcon } from '@phosphor-icons/react';

interface Redemption {
  id: string;
  amount: number;
  createdAt: string;
  order: { id: string; createdAt: string };
}

interface AuditEntry {
  id: string;
  action: string;
  amount: number | null;
  reason: string | null;
  adminEmail: string;
  createdAt: string;
}

interface GiftCard {
  id: string;
  code: string;
  initialBalance: number;
  balance: number;
  senderName: string | null;
  recipientEmail: string;
  message: string | null;
  delivered: boolean;
  deliverOn: string | null;
  createdAt: string;
  purchaseOrder: { id: string; customerEmail: string | null } | null;
  redemptions: Redemption[];
  auditLog: AuditEntry[];
}

interface CronRun {
  ranAt: string;
  checked: number;
  sent: number;
}

const CRON_STALE_HOURS = 26; // should run daily; give a bit of slack

export default function AdminGiftCardsPage() {
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [lastCronRun, setLastCronRun] = useState<CronRun | null>(null);
  const [overdueCount, setOverdueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const [issueOpen, setIssueOpen] = useState(false);
  const [issueAmount, setIssueAmount] = useState('');
  const [issueEmail, setIssueEmail] = useState('');
  const [issueMessage, setIssueMessage] = useState('');
  const [issuing, setIssuing] = useState(false);

  const [creditForms, setCreditForms] = useState<Record<string, { amount: string; reason: string }>>({});
  const [creditingId, setCreditingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [voidReasons, setVoidReasons] = useState<Record<string, string>>({});
  const [voidingId, setVoidingId] = useState<string | null>(null);

  function creditForm(id: string) {
    return creditForms[id] ?? { amount: '', reason: '' };
  }
  function setCreditForm(id: string, patch: Partial<{ amount: string; reason: string }>) {
    setCreditForms((prev) => ({ ...prev, [id]: { ...creditForm(id), ...patch } }));
  }

  const load = useCallback((q: string) => {
    setLoading(true);
    fetch(`/api/admin/gift-cards${q ? `?q=${encodeURIComponent(q)}` : ''}`)
      .then((r) => r.json())
      .then((d) => {
        setGiftCards(d.giftCards ?? []);
        setLastCronRun(d.lastCronRun ?? null);
        setOverdueCount(d.overdueCount ?? 0);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load('');
  }, [load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load(query);
  }

  async function issueGiftCard() {
    const amt = parseFloat(issueAmount);
    if (!amt || amt <= 0) return showToast('Enter a valid amount');
    if (!issueEmail.trim()) return showToast('Enter a recipient email');
    setIssuing(true);
    try {
      const res = await fetch('/api/admin/gift-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, recipientEmail: issueEmail.trim(), message: issueMessage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(data.warning ?? `Issued $${amt} gift card ${data.giftCard.code}`);
      setIssueAmount('');
      setIssueEmail('');
      setIssueMessage('');
      setIssueOpen(false);
      load(query);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to issue gift card');
    } finally {
      setIssuing(false);
    }
  }

  async function addCredit(id: string) {
    const { amount, reason } = creditForm(id);
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return showToast('Enter a valid amount');
    if (!reason.trim()) return showToast('A reason is required');
    setCreditingId(id);
    try {
      const res = await fetch(`/api/admin/gift-cards/${id}/credit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`Credited $${amt}`);
      setCreditForm(id, { amount: '', reason: '' });
      load(query);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add credit');
    } finally {
      setCreditingId(null);
    }
  }

  async function voidCard(id: string, code: string, balance: number) {
    const reason = (voidReasons[id] ?? '').trim();
    if (!reason) return showToast('A reason is required');
    if (!window.confirm(`Void ${code}? This permanently zeroes out its $${balance.toFixed(2)} balance and can't be undone.`)) {
      return;
    }
    setVoidingId(id);
    try {
      const res = await fetch(`/api/admin/gift-cards/${id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`${code} voided`);
      setVoidReasons((prev) => ({ ...prev, [id]: '' }));
      load(query);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to void gift card');
    } finally {
      setVoidingId(null);
    }
  }

  async function resendEmail(id: string) {
    setResendingId(id);
    try {
      const res = await fetch(`/api/admin/gift-cards/${id}/resend`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Email sent');
      load(query);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to resend');
    } finally {
      setResendingId(null);
    }
  }

  const cronStale =
    !lastCronRun || Date.now() - new Date(lastCronRun.ranAt).getTime() > CRON_STALE_HOURS * 60 * 60 * 1000;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-stone-900">Gift Cards</h1>
          <p className="text-sm text-stone-500 mt-1">{giftCards.length} shown</p>
        </div>
        <button
          onClick={() => setIssueOpen((p) => !p)}
          className="text-sm font-medium bg-stone-900 text-white px-4 py-2 rounded-full hover:bg-stone-700 transition-colors"
        >
          {issueOpen ? 'Cancel' : 'Issue Gift Card'}
        </button>
      </div>

      {/* Cron health */}
      {(cronStale || overdueCount > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          {cronStale && (
            <p className="flex items-start gap-1.5">
              <WarningCircleIcon size={16} weight="duotone" className="flex-shrink-0 mt-0.5" />
              <span>
                Scheduled delivery cron {lastCronRun ? `last ran ${new Date(lastCronRun.ranAt).toLocaleString()}` : 'has never run'} —
                expected at least daily. Verify Cron is enabled for your Vercel plan and{' '}
                <code className="bg-amber-100 px-1 rounded">vercel.json</code> is deployed.
              </span>
            </p>
          )}
          {overdueCount > 0 && (
            <p className={`flex items-start gap-1.5 ${cronStale ? 'mt-1' : ''}`}>
              <WarningCircleIcon size={16} weight="duotone" className="flex-shrink-0 mt-0.5" />
              <span>
                {overdueCount} scheduled gift card{overdueCount === 1 ? '' : 's'} past its delivery date and not
                yet sent.
              </span>
            </p>
          )}
        </div>
      )}
      {!cronStale && lastCronRun && (
        <p className="text-xs text-stone-400">
          Scheduled delivery cron last ran {new Date(lastCronRun.ranAt).toLocaleString()} — checked{' '}
          {lastCronRun.checked}, sent {lastCronRun.sent}.
        </p>
      )}

      {/* Issue new gift card */}
      {issueOpen && (
        <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="number"
              value={issueAmount}
              onChange={(e) => setIssueAmount(e.target.value)}
              placeholder="Amount ($)"
              className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
            />
            <input
              type="email"
              value={issueEmail}
              onChange={(e) => setIssueEmail(e.target.value)}
              placeholder="Recipient email"
              className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
            />
          </div>
          <textarea
            value={issueMessage}
            onChange={(e) => setIssueMessage(e.target.value)}
            placeholder="Personal message (optional)"
            rows={2}
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400 resize-none"
          />
          <button
            onClick={issueGiftCard}
            disabled={issuing}
            className="text-sm font-medium bg-amber-700 text-white px-4 py-2 rounded-full hover:bg-amber-600 transition-colors disabled:opacity-50"
          >
            {issuing ? 'Issuing…' : 'Issue & Email'}
          </button>
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by code or recipient email"
          className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
        />
        <button
          type="submit"
          className="text-sm font-medium border border-stone-200 px-4 py-2 rounded-lg hover:bg-stone-50 transition-colors"
        >
          Search
        </button>
      </form>

      <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
        {loading ? (
          <div className="px-6 py-16 text-center text-stone-400 text-sm">Loading…</div>
        ) : giftCards.length === 0 ? (
          <div className="px-6 py-16 text-center text-stone-400 text-sm">No gift cards found.</div>
        ) : (
          <div className="divide-y divide-stone-50">
            {giftCards.map((gc) => (
              <div key={gc.id} className="px-6 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-mono text-sm text-stone-800">{gc.code}</p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {gc.recipientEmail}
                      {gc.senderName ? ` · from ${gc.senderName}` : ''}
                      {!gc.delivered && gc.deliverOn && new Date(gc.deliverOn) > new Date()
                        ? ` · scheduled ${new Date(gc.deliverOn).toLocaleDateString()}`
                        : !gc.delivered
                          ? ' · delivery pending (will retry)'
                          : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`font-serif text-lg ${gc.balance > 0 ? 'text-amber-700' : 'text-stone-300'}`}>
                      ${gc.balance.toFixed(2)}
                      <span className="text-xs text-stone-400 font-sans"> / ${gc.initialBalance.toFixed(2)}</span>
                    </span>
                    <button
                      onClick={() => setExpanded((p) => (p === gc.id ? null : gc.id))}
                      className="text-xs text-stone-500 hover:text-stone-800 border border-stone-200 rounded-full px-3 py-1.5 transition-colors"
                    >
                      {expanded === gc.id ? 'Hide' : 'Details'}
                    </button>
                  </div>
                </div>

                {expanded === gc.id && (
                  <div className="mt-4 pl-1 space-y-3 text-sm">
                    {gc.message && <p className="text-stone-500 italic">&quot;{gc.message}&quot;</p>}
                    {gc.purchaseOrder && (
                      <p className="text-xs text-stone-400">
                        Purchased in order {gc.purchaseOrder.id} ({gc.purchaseOrder.customerEmail})
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        {gc.delivered ? 'Email delivered' : 'Not yet delivered'}
                      </p>
                      <button
                        onClick={() => resendEmail(gc.id)}
                        disabled={resendingId === gc.id}
                        className="text-xs font-medium text-stone-500 hover:text-stone-800 border border-stone-200 rounded-full px-3 py-1 transition-colors disabled:opacity-50"
                      >
                        {resendingId === gc.id ? 'Sending…' : gc.delivered ? 'Resend Email' : 'Send Now'}
                      </button>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">
                        Redemption History
                      </p>
                      {gc.redemptions.length === 0 ? (
                        <p className="text-xs text-stone-400">Never redeemed.</p>
                      ) : (
                        <ul className="space-y-1">
                          {gc.redemptions.map((r) => (
                            <li key={r.id} className="text-xs text-stone-600 flex justify-between">
                              <span>Order {r.order.id} — {new Date(r.createdAt).toLocaleDateString()}</span>
                              <span className="font-medium">-${r.amount.toFixed(2)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {gc.auditLog.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">
                          Admin Activity
                        </p>
                        <ul className="space-y-1">
                          {gc.auditLog.map((a) => (
                            <li key={a.id} className="text-xs text-stone-600">
                              <span className="font-medium capitalize">{a.action}</span>
                              {a.amount != null ? ` $${a.amount.toFixed(2)}` : ''} by {a.adminEmail} —{' '}
                              {new Date(a.createdAt).toLocaleDateString()}
                              {a.reason ? <span className="text-stone-400"> ({a.reason})</span> : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex gap-2 items-start pt-2 border-t border-stone-100">
                      <input
                        type="number"
                        value={creditForm(gc.id).amount}
                        onChange={(e) => setCreditForm(gc.id, { amount: e.target.value })}
                        placeholder="Credit $"
                        className="w-24 border border-stone-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-amber-400"
                      />
                      <input
                        type="text"
                        value={creditForm(gc.id).reason}
                        onChange={(e) => setCreditForm(gc.id, { reason: e.target.value })}
                        placeholder="Reason (required)"
                        className="flex-1 border border-stone-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-amber-400"
                      />
                      <button
                        onClick={() => addCredit(gc.id)}
                        disabled={creditingId === gc.id}
                        className="text-xs font-medium bg-stone-900 text-white px-3 py-1.5 rounded-lg hover:bg-stone-700 transition-colors"
                      >
                        Add Credit
                      </button>
                    </div>

                    {gc.balance > 0 && (
                      <div className="flex gap-2 items-start pt-2 border-t border-stone-100">
                        <input
                          type="text"
                          value={voidReasons[gc.id] ?? ''}
                          onChange={(e) => setVoidReasons((prev) => ({ ...prev, [gc.id]: e.target.value }))}
                          placeholder="Void reason (required)"
                          className="flex-1 border border-stone-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-red-300"
                        />
                        <button
                          onClick={() => voidCard(gc.id, gc.code, gc.balance)}
                          disabled={voidingId === gc.id}
                          className="text-xs font-medium bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          {voidingId === gc.id ? 'Voiding…' : 'Void Card'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
