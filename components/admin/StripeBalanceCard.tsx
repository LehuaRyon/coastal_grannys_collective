import Stripe from 'stripe';
import { BankIcon } from '@phosphor-icons/react/dist/ssr';

function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key) : null;
}

// The #1 reason a store owner opens the Stripe Dashboard directly: "how
// much money do I have, and when does it hit my bank." Pulled live rather
// than cached so it's never stale — this is exactly the kind of number an
// admin needs to trust at a glance.
export async function StripeBalanceCard() {
  const stripe = getStripeClient();
  if (!stripe) return null;

  let available = 0;
  let pending = 0;
  let currency = 'usd';
  let lastPayout: { amount: number; status: string; arrivalDate: Date } | null = null;

  try {
    const balance = await stripe.balance.retrieve();
    available = balance.available.reduce((sum, b) => sum + b.amount, 0) / 100;
    pending = balance.pending.reduce((sum, b) => sum + b.amount, 0) / 100;
    currency = (balance.available[0]?.currency ?? 'usd').toUpperCase();

    const payouts = await stripe.payouts.list({ limit: 1 });
    const p = payouts.data[0];
    if (p) {
      lastPayout = { amount: p.amount / 100, status: p.status, arrivalDate: new Date(p.arrival_date * 1000) };
    }
  } catch (err) {
    console.error('Could not fetch Stripe balance:', err);
    return (
      <div className="bg-white rounded-xl border border-stone-100 p-5">
        <p className="text-xs text-stone-500 font-medium">Stripe Balance</p>
        <p className="text-sm text-stone-400 mt-2">Couldn&apos;t reach Stripe — check STRIPE_SECRET_KEY.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-stone-100 p-5">
      <div className="flex items-center gap-2 mb-3">
        <BankIcon size={16} weight="duotone" color="#C8921A" />
        <p className="text-xs text-stone-500 font-medium uppercase tracking-wide">Stripe Balance</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-2xl font-serif text-stone-900">${available.toFixed(2)}</p>
          <p className="text-xs text-stone-400">Available ({currency})</p>
        </div>
        <div>
          <p className="text-2xl font-serif text-stone-500">${pending.toFixed(2)}</p>
          <p className="text-xs text-stone-400">Pending</p>
        </div>
      </div>
      {lastPayout && (
        <p className="text-xs text-stone-400 mt-3 pt-3 border-t border-stone-100">
          Last payout: ${lastPayout.amount.toFixed(2)} · {lastPayout.status} · {lastPayout.arrivalDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      )}
    </div>
  );
}
