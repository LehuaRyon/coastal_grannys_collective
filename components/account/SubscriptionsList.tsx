'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Elements } from '@stripe/react-stripe-js';
import { showToast } from '@/components/ui/Toast';
import { StateSelect } from '@/components/ui/StateSelect';
import { sanitizeZip, sanitizeCity } from '@/lib/utils/numberInput';
import { SUBSCRIPTION_STATUS_LABELS, SUBSCRIPTION_STATUS_COLORS } from '@/lib/constants/subscriptionStatus';
import { getStripe } from '@/lib/stripe';
import { UpdatePaymentMethodForm } from '@/components/account/UpdatePaymentMethodForm';

interface ShippingAddress {
  address: string;
  apt?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface SubscriptionRow {
  id: string;
  productName: string;
  price: number;
  freq: string;
  roastPreference: string | null;
  roastOptions: string[];
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  shippingAddress: ShippingAddress | null;
}

const EMPTY_ADDRESS: ShippingAddress = { address: '', apt: '', city: '', state: '', zip: '', country: 'United States' };

export function SubscriptionsList({ subscriptions }: { subscriptions: SubscriptionRow[] }) {
  const router = useRouter();
  const [actingId, setActingId] = useState<string | null>(null);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState<ShippingAddress>(EMPTY_ADDRESS);
  const [savingAddress, setSavingAddress] = useState(false);
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
  const [loadingPaymentSetup, setLoadingPaymentSetup] = useState(false);
  const [editingRoastId, setEditingRoastId] = useState<string | null>(null);
  const [savingRoast, setSavingRoast] = useState(false);

  async function act(id: string, action: 'pause' | 'resume' | 'cancel') {
    if (action === 'cancel' && !window.confirm("Cancel this subscription? You'll keep what you've already paid for, and it'll stop at the end of the current period.")) {
      return;
    }
    setActingId(id);
    try {
      const res = await fetch(`/api/account/subscriptions/${id}/${action}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(
        action === 'pause' ? 'Subscription paused' : action === 'resume' ? 'Subscription resumed' : 'Cancellation scheduled'
      );
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setActingId(null);
    }
  }

  function startEditingAddress(sub: SubscriptionRow) {
    setAddressForm(sub.shippingAddress ?? EMPTY_ADDRESS);
    setEditingAddressId(sub.id);
  }

  async function startUpdatingPayment(id: string) {
    if (updatingPaymentId === id) {
      setUpdatingPaymentId(null);
      setPaymentClientSecret(null);
      return;
    }
    setUpdatingPaymentId(id);
    setPaymentClientSecret(null);
    setLoadingPaymentSetup(true);
    try {
      const res = await fetch(`/api/account/subscriptions/${id}/setup-intent`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPaymentClientSecret(data.clientSecret);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not start payment method update');
      setUpdatingPaymentId(null);
    } finally {
      setLoadingPaymentSetup(false);
    }
  }

  function donePaymentUpdate() {
    setUpdatingPaymentId(null);
    setPaymentClientSecret(null);
    router.refresh();
  }

  async function saveRoast(id: string, roastPreference: string | null) {
    setSavingRoast(true);
    try {
      const res = await fetch(`/api/account/subscriptions/${id}/roast`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roastPreference }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Roast preference updated — takes effect on your next delivery');
      setEditingRoastId(null);
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update roast preference');
    } finally {
      setSavingRoast(false);
    }
  }

  async function saveAddress(id: string) {
    if (!addressForm.address.trim() || !addressForm.city.trim() || !addressForm.state.trim() || !addressForm.zip.trim()) {
      showToast('Fill in the full address');
      return;
    }
    setSavingAddress(true);
    try {
      const res = await fetch(`/api/account/subscriptions/${id}/address`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shippingAddress: addressForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Shipping address updated — takes effect on your next delivery');
      setEditingAddressId(null);
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update address');
    } finally {
      setSavingAddress(false);
    }
  }

  return (
    <div className="divide-y divide-stone-100">
      {subscriptions.map((sub) => {
        const statusLabel = SUBSCRIPTION_STATUS_LABELS[sub.status] ?? sub.status;
        const statusColor = SUBSCRIPTION_STATUS_COLORS[sub.status] ?? 'bg-stone-100 text-stone-500';
        const canAct = sub.status === 'active' || sub.status === 'paused' || sub.status === 'past_due';
        const canUpdatePayment = canAct || sub.status === 'unpaid';
        const hasPaymentIssue = sub.status === 'past_due' || sub.status === 'unpaid';
        const addr = sub.shippingAddress;
        return (
          <div key={sub.id} className="px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-stone-900">
                  {sub.productName}
                  <span className={`ml-2 inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${statusColor}`}>
                    {statusLabel}
                  </span>
                </p>
                <p className="text-xs text-stone-400 mt-0.5">
                  ${sub.price.toFixed(2)} · {sub.freq}
                  {sub.roastPreference ? ` · ${sub.roastPreference} Roast` : ''}
                </p>
                {sub.currentPeriodEnd && sub.status === 'active' && !sub.cancelAtPeriodEnd && (
                  <p className="text-xs text-stone-400 mt-0.5">Next billing {new Date(sub.currentPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                )}
                {sub.cancelAtPeriodEnd && sub.currentPeriodEnd && (
                  <p className="text-xs text-amber-700 mt-0.5">Ends {new Date(sub.currentPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                )}
                {addr && (
                  <p className="text-xs text-stone-400 mt-1">
                    Ships to {addr.address}{addr.apt ? `, ${addr.apt}` : ''}, {addr.city}, {addr.state} {addr.zip}
                  </p>
                )}
                {hasPaymentIssue && (
                  <p className="text-xs text-red-600 mt-1">
                    We couldn&apos;t charge your card — update your payment method to keep this subscription active.
                  </p>
                )}
              </div>
              {canAct && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  {sub.status === 'paused' ? (
                    <button
                      onClick={() => act(sub.id, 'resume')}
                      disabled={actingId === sub.id}
                      className="text-xs font-medium bg-stone-900 text-white px-3 py-1.5 rounded-full hover:bg-stone-700 transition-colors disabled:opacity-50"
                    >
                      {actingId === sub.id ? '…' : 'Resume'}
                    </button>
                  ) : sub.cancelAtPeriodEnd ? (
                    <button
                      onClick={() => act(sub.id, 'resume')}
                      disabled={actingId === sub.id}
                      className="text-xs font-medium bg-stone-900 text-white px-3 py-1.5 rounded-full hover:bg-stone-700 transition-colors disabled:opacity-50"
                    >
                      {actingId === sub.id ? '…' : 'Un-cancel'}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => act(sub.id, 'pause')}
                        disabled={actingId === sub.id}
                        className="text-xs font-medium border border-stone-200 text-stone-600 px-3 py-1.5 rounded-full hover:bg-stone-50 transition-colors disabled:opacity-50"
                      >
                        {actingId === sub.id ? '…' : 'Pause'}
                      </button>
                      <button
                        onClick={() => act(sub.id, 'cancel')}
                        disabled={actingId === sub.id}
                        className="text-xs font-medium text-red-600 hover:text-red-700 px-3 py-1.5 transition-colors disabled:opacity-50"
                      >
                        {actingId === sub.id ? '…' : 'Cancel'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {(canAct || canUpdatePayment) && (
              <div className="flex items-center gap-3 mt-2">
                {canAct && (
                  <button
                    onClick={() => (editingAddressId === sub.id ? setEditingAddressId(null) : startEditingAddress(sub))}
                    className="text-xs text-amber-700 hover:underline"
                  >
                    {editingAddressId === sub.id ? 'Cancel edit' : 'Edit shipping address'}
                  </button>
                )}
                {canAct && sub.roastOptions.length > 0 && (
                  <button
                    onClick={() => setEditingRoastId(editingRoastId === sub.id ? null : sub.id)}
                    className="text-xs text-amber-700 hover:underline"
                  >
                    {editingRoastId === sub.id ? 'Cancel edit' : 'Change roast'}
                  </button>
                )}
                {canUpdatePayment && (
                  <button
                    onClick={() => startUpdatingPayment(sub.id)}
                    className={`text-xs hover:underline ${hasPaymentIssue ? 'text-red-600 font-medium' : 'text-amber-700'}`}
                  >
                    {updatingPaymentId === sub.id ? 'Cancel' : 'Update payment method'}
                  </button>
                )}
              </div>
            )}

            {editingAddressId === sub.id && (
              <div className="mt-3 space-y-2 bg-stone-50 rounded-lg p-4">
                <input
                  type="text"
                  value={addressForm.address}
                  onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                  placeholder="Street address"
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                />
                <input
                  type="text"
                  value={addressForm.apt ?? ''}
                  onChange={(e) => setAddressForm({ ...addressForm, apt: e.target.value })}
                  placeholder="Apt / Suite"
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: sanitizeCity(e.target.value) })}
                    placeholder="City"
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                  />
                  <StateSelect
                    value={addressForm.state}
                    onChange={(v) => setAddressForm({ ...addressForm, state: v })}
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>
                <input
                  type="text"
                  value={addressForm.zip}
                  onChange={(e) => setAddressForm({ ...addressForm, zip: sanitizeZip(e.target.value) })}
                  placeholder="ZIP"
                  maxLength={5}
                  className="w-32 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                />
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => saveAddress(sub.id)}
                    disabled={savingAddress}
                    className="text-xs font-medium bg-stone-900 text-white px-3 py-1.5 rounded-full hover:bg-stone-700 transition-colors disabled:opacity-50"
                  >
                    {savingAddress ? 'Saving…' : 'Save Address'}
                  </button>
                </div>
              </div>
            )}

            {editingRoastId === sub.id && (
              <div className="mt-3 bg-stone-50 rounded-lg p-4">
                <div className="flex flex-wrap gap-1.5">
                  {['No Preference', ...sub.roastOptions].map((r) => {
                    const value = r === 'No Preference' ? null : r;
                    const active = (sub.roastPreference ?? 'No Preference') === r;
                    return (
                      <button
                        key={r}
                        disabled={savingRoast}
                        onClick={() => saveRoast(sub.id, value)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all disabled:opacity-50 ${
                          active ? 'bg-stone-900 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {updatingPaymentId === sub.id && (
              <div className="mt-3 bg-stone-50 rounded-lg p-4">
                {loadingPaymentSetup && <p className="text-sm text-stone-400 text-center py-2">Loading…</p>}
                {paymentClientSecret && (
                  <Elements
                    stripe={getStripe()}
                    options={{
                      clientSecret: paymentClientSecret,
                      appearance: {
                        theme: 'stripe',
                        variables: { colorPrimary: '#92400e', colorBackground: '#ffffff', borderRadius: '8px', fontFamily: 'Inter, system-ui, sans-serif' },
                      },
                    }}
                  >
                    <UpdatePaymentMethodForm subscriptionId={sub.id} onDone={donePaymentUpdate} />
                  </Elements>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
