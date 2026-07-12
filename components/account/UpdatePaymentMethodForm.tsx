'use client';

import { useState, FormEvent } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { showToast } from '@/components/ui/Toast';

interface UpdatePaymentMethodFormProps {
  subscriptionId: string;
  onDone: () => void;
}

// Confirmed with stripe.confirmSetup (not confirmPayment) — a SetupIntent
// validates and saves a card without charging it. Mirrors
// StripePaymentForm's shape closely on purpose (same PaymentElement, same
// redirect: 'if_required' pattern) for visual/UX consistency, but the two
// can't share code since confirmSetup and confirmPayment are different
// Stripe.js calls with different result shapes.
export function UpdatePaymentMethodForm({ subscriptionId, onDone }: UpdatePaymentMethodFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setErrorMessage(null);

    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/account/dashboard`,
      },
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message ?? 'Something went wrong. Please try again.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/account/subscriptions/${subscriptionId}/payment-method`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setupIntentId: setupIntent?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(
        data.invoiceRetryFailed
          ? 'Card saved, but the outstanding charge was declined again — contact us if this keeps happening'
          : 'Payment method updated'
      );
      onDone();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not save the new card');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="rounded-xl border border-stone-200 p-3">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
          {errorMessage}
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || !elements || loading}
        className="w-full text-sm font-medium bg-stone-900 text-white px-4 py-2.5 rounded-full hover:bg-stone-700 transition-colors disabled:opacity-50"
      >
        {loading ? 'Saving…' : 'Save New Card'}
      </button>
    </form>
  );
}
