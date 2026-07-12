'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Elements } from '@stripe/react-stripe-js';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { StateSelect } from '@/components/ui/StateSelect';
import { StripePaymentForm } from '@/components/checkout/StripePaymentForm';
import { showToast } from '@/components/ui/Toast';
import { getStripe } from '@/lib/stripe';
import { useFormErrors } from '@/lib/hooks/useFormErrors';
import { sanitizeZip, sanitizeCity } from '@/lib/utils/numberInput';
import { CheckCircleIcon } from '@phosphor-icons/react';
import type { Subscription } from '@/lib/types';

interface SubscribeModalProps {
  sub: Subscription | null;
  roastPreference: string | null;
  onClose: () => void;
}

interface ShippingForm {
  address: string;
  apt: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

const EMPTY_SHIPPING: ShippingForm = { address: '', apt: '', city: '', state: '', zip: '', country: 'United States' };

export function SubscribeModal({ sub, roastPreference, onClose }: SubscribeModalProps) {
  const router = useRouter();
  const { clearError, setErrors, borderClass } = useFormErrors();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [shipping, setShipping] = useState<ShippingForm>(EMPTY_SHIPPING);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    if (!sub) return;
    setStep(1);
    setClientSecret(null);
    setLoadingProfile(true);
    fetch('/api/account/profile')
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setShipping({
            address: d.user.address ?? '',
            apt: d.user.apt ?? '',
            city: d.user.city ?? '',
            state: d.user.state ?? '',
            zip: d.user.zip ?? '',
            country: 'United States',
          });
        }
      })
      .finally(() => setLoadingProfile(false));
  }, [sub]);

  if (!sub) return null;

  async function startSubscription() {
    const missing = new Set<string>();
    if (!shipping.address.trim()) missing.add('address');
    if (!shipping.city.trim()) missing.add('city');
    if (!shipping.state.trim()) missing.add('state');
    if (!shipping.zip.trim()) missing.add('zip');
    if (missing.size > 0) {
      setErrors(missing);
      showToast('Fill in your shipping address');
      return;
    }
    setErrors(new Set());
    setSubmitting(true);
    try {
      const res = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: sub!.id, roastPreference, shippingAddress: shipping }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setClientSecret(data.clientSecret);
      setStep(2);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not start subscription');
    } finally {
      setSubmitting(false);
    }
  }

  function handleSuccess() {
    setStep(3);
    router.refresh();
  }

  return (
    <Modal isOpen={!!sub} onClose={onClose} className="max-w-lg w-full" closeOnBackdropClick={step !== 2}>
      <div className="p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-6 text-xs font-medium text-stone-400">
          {['Shipping', 'Payment', 'Confirmed'].map((label, i) => {
            const n = (i + 1) as 1 | 2 | 3;
            return (
              <div key={label} className="flex items-center gap-2">
                {i > 0 && <span className="w-4 h-px bg-stone-200" />}
                <span className={`flex items-center gap-1.5 ${step === n ? 'text-stone-900' : ''}`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${step >= n ? 'bg-stone-900 text-white' : 'bg-stone-100'}`}>
                    {step > n ? <CheckCircleIcon size={12} weight="fill" /> : n}
                  </span>
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-serif text-xl text-stone-900">{sub.name}</h2>
              <p className="text-sm text-stone-500">${sub.price}{sub.period} · {sub.freq}</p>
            </div>

            {loadingProfile ? (
              <p className="text-sm text-stone-400 py-8 text-center">Loading your address…</p>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Street Address *</label>
                  <input
                    type="text"
                    value={shipping.address}
                    onChange={(e) => { setShipping({ ...shipping, address: e.target.value }); clearError('address'); }}
                    placeholder="123 Main St"
                    className={`w-full border ${borderClass('address')} rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Apt / Suite</label>
                  <input
                    type="text"
                    value={shipping.apt}
                    onChange={(e) => setShipping({ ...shipping, apt: e.target.value })}
                    placeholder="Apt 4B"
                    className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">City *</label>
                    <input
                      type="text"
                      value={shipping.city}
                      onChange={(e) => { setShipping({ ...shipping, city: sanitizeCity(e.target.value) }); clearError('city'); }}
                      placeholder="San Francisco"
                      className={`w-full border ${borderClass('city')} rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">State *</label>
                    <StateSelect
                      value={shipping.state}
                      onChange={(v) => { setShipping({ ...shipping, state: v }); clearError('state'); }}
                      className={`w-full border ${borderClass('state')} rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors`}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">ZIP Code *</label>
                    <input
                      type="text"
                      value={shipping.zip}
                      onChange={(e) => { setShipping({ ...shipping, zip: sanitizeZip(e.target.value) }); clearError('zip'); }}
                      placeholder="94103"
                      maxLength={5}
                      className={`w-full border ${borderClass('zip')} rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">Country</label>
                    <select disabled className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-100 text-stone-500 cursor-not-allowed">
                      <option>United States</option>
                    </select>
                  </div>
                </div>
                {roastPreference && (
                  <p className="text-xs text-stone-400">Roast preference: <span className="text-stone-600 font-medium">{roastPreference}</span></p>
                )}
                <p className="text-xs text-stone-400 pt-1">
                  You&apos;ll be charged ${sub.price} today, then again every {sub.freq.toLowerCase()} until you pause or cancel — anytime, from your account.
                </p>
                <Button variant="primary" full onClick={startSubscription} disabled={submitting}>
                  {submitting ? 'Starting…' : `Continue to Payment →`}
                </Button>
              </>
            )}
          </div>
        )}

        {step === 2 && clientSecret && (
          <div>
            <h2 className="font-serif text-xl text-stone-900 mb-4">Payment</h2>
            <Elements
              stripe={getStripe()}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: { colorPrimary: '#92400e', colorBackground: '#ffffff', borderRadius: '8px', fontFamily: 'Inter, system-ui, sans-serif' },
                },
              }}
            >
              <StripePaymentForm
                total={sub.price}
                onSuccess={handleSuccess}
                onBack={() => setStep(1)}
                returnUrl={typeof window !== 'undefined' ? `${window.location.origin}/account/dashboard?subscribed=1` : undefined}
              />
            </Elements>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-8">
            <CheckCircleIcon size={48} weight="duotone" color="#C8921A" className="mx-auto mb-4" />
            <h2 className="font-serif text-xl text-stone-900 mb-2">You&apos;re subscribed!</h2>
            <p className="text-sm text-stone-500 mb-6">
              Your first {sub.name} is on its way. Manage or cancel anytime from your account.
            </p>
            <Button variant="primary" onClick={() => { onClose(); router.push('/account/dashboard'); }}>
              View My Subscriptions
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
