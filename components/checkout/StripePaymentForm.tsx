'use client';

// TODO: Complete Stripe business profile before going live — payments will not process until
// the account activation requirements are finished. Visit dashboard.stripe.com to complete
// the business profile. See stripe.com/docs/connect/required-verification-information for
// activation requirements, or contact Stripe support.

import { useState, FormEvent } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/Button';

interface StripePaymentFormProps {
  total: number;
  onSuccess: () => void;
  onBack: () => void;
}

export function StripePaymentForm({ total, onSuccess, onBack }: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Stripe redirects here for some payment methods (e.g. bank redirects).
        // For cards, Apple Pay, Google Pay it stays in-page.
        return_url: `${window.location.origin}/shop/coffee?order=confirmed`,
      },
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message ?? 'Something went wrong. Please try again.');
      setLoading(false);
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-stone-200 p-4">
        <PaymentElement
          options={{
            layout: 'tabs',
            wallets: {
              applePay: 'auto',
              googlePay: 'auto',
            },
          }}
        />
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="ghost" onClick={onBack} disabled={loading}>
          ← Back
        </Button>
        <Button type="submit" variant="primary" full disabled={!stripe || !elements || loading}>
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Processing…
            </span>
          ) : (
            `Pay $${total.toFixed(2)}`
          )}
        </Button>
      </div>

      <p className="text-center text-[11px] text-stone-400">
        🔒 Payments are secured by Stripe. We never see or store your card details.
      </p>
    </form>
  );
}
