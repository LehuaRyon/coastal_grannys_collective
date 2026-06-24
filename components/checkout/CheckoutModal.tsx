'use client';

import { useState, useEffect } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useCartStore } from '@/lib/store/cart';
import { getStripe } from '@/lib/stripe';
import { StripePaymentForm } from './StripePaymentForm';

type Step = 1 | 2 | 3 | 'confirmed';

interface ContactForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface ShippingForm {
  address: string;
  apt: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = ['Contact', 'Shipping', 'Payment'] as const;

export function CheckoutModal({ isOpen, onClose }: CheckoutModalProps) {
  const { items, total, clearCart } = useCartStore();
  const [step, setStep] = useState<Step>(1);

  // Stripe state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [loadingIntent, setLoadingIntent] = useState(false);

  const [contact, setContact] = useState<ContactForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [shipping, setShipping] = useState<ShippingForm>({
    address: '',
    apt: '',
    city: '',
    state: '',
    zip: '',
    country: 'United States',
  });

  const subtotal = total();
  const shippingCost = subtotal >= 60 ? 0 : 8;
  const grandTotal = subtotal + shippingCost;

  // Create a PaymentIntent when the user reaches step 3
  useEffect(() => {
    if (step !== 3 || clientSecret) return;

    const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!stripeKey) {
      setPaymentError(
        'Stripe is not configured yet. Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY to your .env.local file.'
      );
      return;
    }

    setLoadingIntent(true);
    setPaymentError(null);

    fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: grandTotal,
        customerEmail: contact.email,
        customerName: `${contact.firstName} ${contact.lastName}`.trim(),
        shippingAddress: shipping,
        items: items.map((i) => ({
          key: i.key,
          id: i.id,
          name: i.name,
          variant: i.variant,
          price: i.price,
          qty: i.qty,
        })),
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setClientSecret(data.clientSecret);
      })
      .catch((err: Error) => {
        setPaymentError(err.message);
      })
      .finally(() => setLoadingIntent(false));
  }, [step, clientSecret, grandTotal]);

  function handleClose() {
    onClose();
    setTimeout(() => {
      setStep(1);
      setClientSecret(null);
      setPaymentError(null);
    }, 300);
  }

  function handlePaymentSuccess() {
    clearCart();
    setStep('confirmed');
  }

  function goToStep3() {
    // Reset clientSecret so a fresh PaymentIntent is created with the latest total
    setClientSecret(null);
    setStep(3);
  }

  const OrderSummary = () => (
    <div className="bg-stone-50 rounded-xl p-4 mb-6">
      <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
        Order Summary
      </h4>
      <div className="space-y-2">
        {items.map((i) => (
          <div key={i.key} className="flex justify-between text-sm">
            <span className="text-stone-600">
              {i.name} ({i.variant}) ×{i.qty}
            </span>
            <span className="text-stone-800 font-medium">${(i.price * i.qty).toFixed(2)}</span>
          </div>
        ))}
        <div className="border-t border-stone-200 pt-2 mt-2 space-y-1">
          <div className="flex justify-between text-sm text-stone-500">
            <span>Shipping</span>
            <span>{shippingCost === 0 ? 'Free' : `$${shippingCost.toFixed(2)}`}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold text-stone-900">
            <span>Total</span>
            <span>${grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const StepIndicator = () => (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((label, i) => {
        const num = i + 1;
        const isActive = step === num;
        const isDone = typeof step === 'number' && step > num;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                  isDone
                    ? 'bg-amber-700 text-white'
                    : isActive
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-400'
                }`}
              >
                {isDone ? '✓' : num}
              </div>
              <span
                className={`text-xs font-medium ${isActive ? 'text-stone-900' : 'text-stone-400'}`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && <div className="w-6 h-px bg-stone-200" />}
          </div>
        );
      })}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-lg">
      <div className="p-6 sm:p-8">
        {step === 'confirmed' ? (
          <div className="text-center py-6">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="font-serif text-2xl text-stone-900 mb-2">Order Confirmed!</h2>
            <p className="text-stone-500 text-sm mb-4 leading-relaxed">
              Thank you! Your freshly roasted coffee is being prepared and will ship within 1–2
              business days.
            </p>
            <p className="text-xs text-stone-400 mb-8">
              A receipt has been sent to your email by Stripe.
            </p>
            <Button variant="primary" onClick={handleClose}>
              Continue Shopping
            </Button>
          </div>
        ) : (
          <>
            <h2 className="font-serif text-xl text-stone-900 mb-1">Checkout</h2>
            <StepIndicator />

            {/* ── Step 1: Contact ── */}
            {step === 1 && (
              <div className="space-y-4">
                <OrderSummary />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={contact.firstName}
                      onChange={(e) => setContact({ ...contact, firstName: e.target.value })}
                      placeholder="Jane"
                      className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={contact.lastName}
                      onChange={(e) => setContact({ ...contact, lastName: e.target.value })}
                      placeholder="Doe"
                      className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={contact.email}
                    onChange={(e) => setContact({ ...contact, email: e.target.value })}
                    placeholder="jane@example.com"
                    className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    Phone (optional)
                  </label>
                  <input
                    type="tel"
                    value={contact.phone}
                    onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="ghost" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button variant="primary" full onClick={() => setStep(2)}>
                    Continue →
                  </Button>
                </div>
              </div>
            )}

            {/* ── Step 2: Shipping ── */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={shipping.address}
                    onChange={(e) => setShipping({ ...shipping, address: e.target.value })}
                    placeholder="123 Main St"
                    className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    Apt / Suite (optional)
                  </label>
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
                    <label className="block text-xs font-medium text-stone-600 mb-1">City</label>
                    <input
                      type="text"
                      value={shipping.city}
                      onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                      placeholder="San Francisco"
                      className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">State</label>
                    <input
                      type="text"
                      value={shipping.state}
                      onChange={(e) => setShipping({ ...shipping, state: e.target.value })}
                      placeholder="CA"
                      className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      value={shipping.zip}
                      onChange={(e) => setShipping({ ...shipping, zip: e.target.value })}
                      placeholder="94103"
                      className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">
                      Country
                    </label>
                    <select
                      value={shipping.country}
                      onChange={(e) => setShipping({ ...shipping, country: e.target.value })}
                      className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors bg-white"
                    >
                      <option>United States</option>
                      <option>Canada</option>
                      <option>United Kingdom</option>
                      <option>Australia</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="ghost" onClick={() => setStep(1)}>
                    ← Back
                  </Button>
                  <Button variant="primary" full onClick={goToStep3}>
                    Continue →
                  </Button>
                </div>
              </div>
            )}

            {/* ── Step 3: Payment (Stripe) ── */}
            {step === 3 && (
              <div>
                <OrderSummary />

                {paymentError && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-sm text-amber-800">
                    <strong>Stripe not configured:</strong> {paymentError}
                  </div>
                )}

                {loadingIntent && (
                  <div className="flex items-center justify-center py-12 text-stone-400 gap-3">
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    <span className="text-sm">Preparing payment…</span>
                  </div>
                )}

                {clientSecret && !loadingIntent && (
                  <Elements
                    stripe={getStripe()}
                    options={{
                      clientSecret,
                      appearance: {
                        theme: 'stripe',
                        variables: {
                          colorPrimary: '#92400e',
                          colorBackground: '#ffffff',
                          borderRadius: '8px',
                          fontFamily: 'Inter, system-ui, sans-serif',
                        },
                      },
                    }}
                  >
                    <StripePaymentForm
                      total={grandTotal}
                      onSuccess={handlePaymentSuccess}
                      onBack={() => setStep(2)}
                    />
                  </Elements>
                )}

                {/* Fallback back button if Stripe fails to load */}
                {paymentError && (
                  <Button variant="ghost" className="mt-4" onClick={() => setStep(2)}>
                    ← Back
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
