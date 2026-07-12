import Link from 'next/link';
import { prisma } from '@/lib/db';
import { AdminSubscriptionActions } from '@/components/admin/AdminSubscriptionActions';
import { MissingFulfillmentBanner } from '@/components/admin/MissingFulfillmentBanner';
import { ExportSubscriptionsButton } from '@/components/admin/ExportSubscriptionsButton';
import { SUBSCRIPTION_STATUS_COLORS } from '@/lib/constants/subscriptionStatus';

// Normalizes any billing cadence to a monthly-equivalent figure so plans on
// different schedules (weekly, bi-weekly, monthly) can be summed into one
// MRR number — the metric an admin actually wants at a glance, mirroring
// what Stripe's own dashboard surfaces for subscription revenue.
function monthlyEquivalent(price: number, interval: string, intervalCount: number): number {
  const WEEKS_PER_MONTH = 52 / 12;
  if (interval === 'week') return (price / intervalCount) * WEEKS_PER_MONTH;
  if (interval === 'month') return price / intervalCount;
  return 0;
}

export default async function AdminSubscriptionsPage() {
  const subscriptions = await prisma.subscription.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { email: true, firstName: true, lastName: true } } },
  });

  const products = await prisma.product.findMany({ where: { type: 'subscription' } });
  const intervalByProductId = new Map(products.map((p) => [p.id, { interval: p.billingInterval, count: p.billingIntervalCount ?? 1 }]));

  const activeCount = subscriptions.filter((s) => s.status === 'active').length;
  const pausedCount = subscriptions.filter((s) => s.status === 'paused').length;
  const mrr = subscriptions
    .filter((s) => s.status === 'active')
    .reduce((sum, s) => {
      const cfg = intervalByProductId.get(s.productId);
      if (!cfg?.interval) return sum;
      return sum + monthlyEquivalent(s.price, cfg.interval, cfg.count);
    }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-stone-900">Subscriptions</h1>
          <p className="text-sm text-stone-500 mt-1">{subscriptions.length} total · real recurring Stripe billing</p>
        </div>
        {subscriptions.length > 0 && (
          <ExportSubscriptionsButton
            subscriptions={subscriptions.map((s) => ({
              id: s.id,
              customerEmail: s.user.email,
              productName: s.productName,
              price: s.price,
              freq: s.freq,
              status: s.status,
              currentPeriodEnd: s.currentPeriodEnd?.toISOString() ?? null,
              createdAt: s.createdAt.toISOString(),
            }))}
          />
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active', value: activeCount },
          { label: 'Paused', value: pausedCount },
          { label: 'MRR (est.)', value: `$${mrr.toFixed(2)}` },
          { label: 'Total Ever', value: subscriptions.length },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-stone-100 p-5">
            <p className="text-xs text-stone-500 font-medium">{stat.label}</p>
            <p className="text-2xl font-serif text-stone-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <MissingFulfillmentBanner />

      <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
        {subscriptions.length === 0 ? (
          <div className="px-6 py-16 text-center text-stone-400 text-sm">No subscriptions yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  {['Customer', 'Plan', 'Price', 'Status', 'Next Billing', 'Since', '', ''].map((h, i) => (
                    <th key={`${h}-${i}`} className="text-left px-6 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/admin/users/${sub.userId}`} className="text-amber-700 hover:underline font-medium">
                        {sub.user.email}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-stone-600">
                      {sub.productName}
                      {sub.roastPreference && <span className="block text-xs text-stone-400">{sub.roastPreference} Roast</span>}
                    </td>
                    <td className="px-6 py-4 font-medium text-stone-900">${sub.price.toFixed(2)}<span className="text-xs text-stone-400 font-normal"> · {sub.freq}</span></td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${SUBSCRIPTION_STATUS_COLORS[sub.status] ?? 'bg-stone-100 text-stone-600'}`}>
                        {sub.status}
                      </span>
                      {sub.cancelAtPeriodEnd && sub.status !== 'canceled' && <span className="block text-[10px] text-amber-600 mt-1">ends at period end</span>}
                    </td>
                    <td className="px-6 py-4 text-xs text-stone-500">
                      {/* A terminated subscription's currentPeriodEnd is just the last snapshot
                          before it ended, not a real future billing date — showing it here would
                          misleadingly suggest billing continues. */}
                      {sub.currentPeriodEnd && sub.status !== 'canceled' && sub.status !== 'incomplete_expired'
                        ? new Date(sub.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-xs text-stone-500">
                      {new Date(sub.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      <AdminSubscriptionActions id={sub.id} status={sub.status} cancelAtPeriodEnd={sub.cancelAtPeriodEnd} />
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/admin/subscriptions/${sub.id}`} className="text-xs text-amber-700 hover:underline whitespace-nowrap">
                        Details →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
