import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { PaymentSearch } from '@/components/admin/PaymentSearch';

function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key) : null;
}

const LOOKBACK_DAYS = 7;

export default async function AdminPaymentsPage() {
  const stripe = getStripeClient();

  // "My card kept declining" is invisible everywhere else in the app — no
  // Order is ever created for a failed attempt, so without this an admin
  // has no way to confirm (or troubleshoot) that complaint without Stripe
  // Dashboard. Pulled from the same recent PaymentIntent list Stripe's own
  // dashboard reads, just filtered to ones that recorded an error.
  let failedAttempts: { id: string; amount: number; email: string | null; error: string; created: Date }[] = [];
  if (stripe) {
    try {
      const since = Math.floor((Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000) / 1000);
      const list = await stripe.paymentIntents.list({ limit: 100, created: { gte: since } });
      failedAttempts = list.data
        .filter((pi) => pi.last_payment_error)
        .map((pi) => ({
          id: pi.id,
          amount: pi.amount / 100,
          email: pi.metadata?.customerEmail || pi.receipt_email || null,
          error: pi.last_payment_error!.message ?? 'Unknown error',
          created: new Date(pi.created * 1000),
        }))
        .sort((a, b) => b.created.getTime() - a.created.getTime())
        .slice(0, 20);
    } catch (err) {
      console.error('Could not fetch failed payment attempts:', err);
    }
  }

  const recentEvents = await prisma.stripeWebhookEvent.findMany({ orderBy: { receivedAt: 'desc' }, take: 20 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-stone-900">Payments</h1>
        <p className="text-sm text-stone-500 mt-1">Look up any Stripe payment, see recent failed attempts, and check webhook activity — no need to open Stripe Dashboard.</p>
      </div>

      <PaymentSearch />

      <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100">
          <h2 className="font-medium text-stone-900">Recent Failed/Declined Attempts</h2>
          <p className="text-xs text-stone-400 mt-0.5">Last {LOOKBACK_DAYS} days — useful for "I tried to pay and it didn't work" conversations.</p>
        </div>
        {failedAttempts.length === 0 ? (
          <div className="px-6 py-8 text-center text-stone-400 text-sm">No failed attempts recently.</div>
        ) : (
          <div className="divide-y divide-stone-50">
            {failedAttempts.map((f) => (
              <div key={f.id} className="px-6 py-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-stone-900">${f.amount.toFixed(2)} · {f.email ?? 'no email'}</span>
                  <span className="text-xs text-stone-400">{f.created.toLocaleString()}</span>
                </div>
                <p className="text-xs text-red-500 mt-0.5">{f.error}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100">
          <h2 className="font-medium text-stone-900">Recent Webhook Events</h2>
          <p className="text-xs text-stone-400 mt-0.5">Confirms Stripe is actually reaching this app, without checking Stripe's own webhook log.</p>
        </div>
        {recentEvents.length === 0 ? (
          <div className="px-6 py-8 text-center text-stone-400 text-sm">No webhook events received yet.</div>
        ) : (
          <div className="divide-y divide-stone-50">
            {recentEvents.map((e) => (
              <div key={e.id} className="px-6 py-2.5 text-sm flex items-center justify-between">
                <span className="font-mono text-xs text-stone-700">{e.type}</span>
                <span className="text-xs text-stone-400">{e.receivedAt.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
