'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { showToast } from '@/components/ui/Toast';

export function AdminSubscriptionActions({ id, status, cancelAtPeriodEnd = false }: { id: string; status: string; cancelAtPeriodEnd?: boolean }) {
  const router = useRouter();
  const [acting, setActing] = useState<'pause' | 'resume' | 'cancel' | 'resync' | 'retry-payment' | null>(null);
  // 'incomplete' included too — same as the customer-side widening, this
  // covers the case where the very first payment was never confirmed
  // (declined card, abandoned checkout), so an admin can force a retry on
  // a phone-support call ("customer says their card is fine now") instead
  // of only being able to Cancel and tell the customer to start over.
  const hasPaymentIssue = status === 'past_due' || status === 'unpaid' || status === 'incomplete';

  async function act(action: 'pause' | 'resume' | 'cancel' | 'resync' | 'retry-payment') {
    if (action === 'cancel' && !window.confirm('Cancel this subscription immediately? This cannot be undone.')) return;
    setActing(action);
    try {
      const res = await fetch(`/api/admin/subscriptions/${id}/${action}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (action === 'resync') {
        showToast(`Resynced — status ${data.status}, ${data.ordersRecovered} order(s) recovered`);
      } else if (action === 'retry-payment') {
        showToast(!data.attempted ? (data.message ?? 'Nothing to retry') : data.paid ? 'Payment succeeded' : 'Still declined');
      } else {
        showToast(action === 'pause' ? 'Subscription paused' : action === 'resume' ? 'Subscription resumed' : 'Subscription cancelled');
      }
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => act('resync')}
        disabled={acting !== null}
        title="Re-check this subscription's status and fulfillment against Stripe directly — fixes it if a webhook was missed"
        className="text-xs font-medium border border-stone-200 text-stone-600 px-2.5 py-1 rounded-lg hover:bg-stone-50 transition-colors disabled:opacity-50"
      >
        {acting === 'resync' ? '…' : 'Resync'}
      </button>
      {hasPaymentIssue && (
        <button
          onClick={() => act('retry-payment')}
          disabled={acting !== null}
          title="Attempt to charge the outstanding invoice right now with the current default payment method, instead of waiting for Stripe's automatic retry schedule"
          className="text-xs font-medium bg-red-600 text-white px-2.5 py-1 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {acting === 'retry-payment' ? '…' : 'Retry Payment'}
        </button>
      )}
      {status !== 'canceled' && (status === 'paused' || cancelAtPeriodEnd) && (
        <button
          onClick={() => act('resume')}
          disabled={acting !== null}
          className="text-xs font-medium bg-stone-900 text-white px-2.5 py-1 rounded-lg hover:bg-stone-700 transition-colors disabled:opacity-50"
        >
          {acting === 'resume' ? '…' : status === 'paused' ? 'Resume' : 'Un-cancel'}
        </button>
      )}
      {status !== 'canceled' && status !== 'paused' && (
        <button
          onClick={() => act('pause')}
          disabled={acting !== null}
          className="text-xs font-medium border border-stone-200 text-stone-600 px-2.5 py-1 rounded-lg hover:bg-stone-50 transition-colors disabled:opacity-50"
        >
          {acting === 'pause' ? '…' : 'Pause'}
        </button>
      )}
      {status !== 'canceled' && (
        <button
          onClick={() => act('cancel')}
          disabled={acting !== null}
          className="text-xs font-medium text-red-600 hover:text-red-700 px-2.5 py-1 transition-colors disabled:opacity-50"
        >
          {acting === 'cancel' ? '…' : 'Cancel'}
        </button>
      )}
    </div>
  );
}
