import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getStripeClient } from '@/lib/subscriptions';
import { AdminSubscriptionActions } from '@/components/admin/AdminSubscriptionActions';
import { AdminSubscriptionAddressForm } from '@/components/admin/AdminSubscriptionAddressForm';
import { AdminSubscriptionRoastForm } from '@/components/admin/AdminSubscriptionRoastForm';
import { SUBSCRIPTION_STATUS_LABELS, SUBSCRIPTION_STATUS_COLORS } from '@/lib/constants/subscriptionStatus';
import { ArrowLeftIcon, CardholderIcon } from '@phosphor-icons/react/dist/ssr';

export default async function AdminSubscriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sub = await prisma.subscription.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
      orders: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!sub) notFound();

  const product = await prisma.product.findUnique({ where: { id: sub.productId }, select: { options: true } });
  const roastOptions = product?.options ?? [];

  const addr = sub.shippingAddress as { address: string; apt?: string; city: string; state: string; zip: string; country: string } | null;
  const statusLabel = SUBSCRIPTION_STATUS_LABELS[sub.status] ?? sub.status;
  const statusColor = SUBSCRIPTION_STATUS_COLORS[sub.status] ?? 'bg-stone-100 text-stone-500';

  // Live card-on-file summary, pulled directly from Stripe so an admin never
  // needs the Stripe Dashboard to answer "what card is this customer being
  // billed with" — mirrors the same best-effort pattern as the order detail
  // page's card summary. A subscription that never confirmed payment
  // (incomplete/incomplete_expired) legitimately has no default payment
  // method yet, so any failure here is swallowed rather than breaking the page.
  let cardSummary: { brand: string; last4: string } | null = null;
  try {
    const stripe = getStripeClient();
    const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId, { expand: ['default_payment_method'] });
    const pm = stripeSub.default_payment_method;
    if (pm && typeof pm !== 'string' && pm.card) {
      cardSummary = { brand: pm.card.brand, last4: pm.card.last4 };
    }
  } catch (err) {
    console.error(`Could not fetch Stripe payment method for subscription ${sub.id}:`, err);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/subscriptions" className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800 transition-colors mb-3">
          <ArrowLeftIcon size={12} weight="bold" />
          Back to Subscriptions
        </Link>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl text-stone-900">
              {sub.productName}
              <span className={`ml-2 align-middle inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${statusColor}`}>
                {statusLabel}
              </span>
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              Since {new Date(sub.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {sub.cancelAtPeriodEnd && sub.status !== 'canceled' && <span className="text-amber-600"> · ends at period end</span>}
            </p>
          </div>
          <AdminSubscriptionActions id={sub.id} status={sub.status} cancelAtPeriodEnd={sub.cancelAtPeriodEnd} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-stone-100 p-6">
            <h2 className="font-medium text-stone-900 mb-4">Cycle / Order History</h2>
            {sub.orders.length === 0 ? (
              <p className="text-sm text-stone-400">No orders yet — nothing has been fulfilled for this subscription.</p>
            ) : (
              <div className="divide-y divide-stone-50">
                {sub.orders.map((order) => (
                  <div key={order.id} className="py-3 flex items-center justify-between text-sm">
                    <div>
                      <p className="text-stone-900">
                        Cycle #{order.subscriptionCycleNumber ?? '—'}
                        <span className="text-xs text-stone-400 ml-2">
                          {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </p>
                      <p className="text-xs text-stone-400 mt-0.5 capitalize">{order.status}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-medium text-stone-900">${order.amount.toFixed(2)}</p>
                      <Link href={`/admin/orders/${order.id}`} className="text-xs text-amber-700 hover:underline whitespace-nowrap">
                        Details →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-stone-100 p-6">
            <h2 className="font-medium text-stone-900 mb-3">Customer</h2>
            <Link href={`/admin/users/${sub.user.id}`} className="text-sm text-amber-700 hover:underline font-medium">
              {`${sub.user.firstName ?? ''} ${sub.user.lastName ?? ''}`.trim() || sub.user.email}
            </Link>
            <p className="text-xs text-stone-400">{sub.user.email}</p>
          </div>

          <div className="bg-white rounded-xl border border-stone-100 p-6">
            <h2 className="font-medium text-stone-900 mb-3">Plan &amp; Billing</h2>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-500">Price</span>
                <span className="text-stone-900 font-medium">${sub.price.toFixed(2)} · {sub.freq}</span>
              </div>
              <AdminSubscriptionRoastForm subscriptionId={sub.id} roastPreference={sub.roastPreference} roastOptions={roastOptions} />
              {/* Once a subscription is terminal, currentPeriodEnd is just the last
                  snapshot before it ended, not a real future date — "Next billing"
                  would be actively wrong, and "Canceled" below already answers when
                  it actually ended. */}
              {sub.currentPeriodEnd && sub.status !== 'canceled' && sub.status !== 'incomplete_expired' && (
                <div className="flex justify-between">
                  <span className="text-stone-500">{sub.cancelAtPeriodEnd ? 'Ends' : 'Next billing'}</span>
                  <span className="text-stone-900">
                    {new Date(sub.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              )}
              {sub.pausedAt && sub.status === 'paused' && (
                <div className="flex justify-between">
                  <span className="text-stone-500">Paused since</span>
                  <span className="text-stone-900">{new Date(sub.pausedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              )}
              {sub.canceledAt && (
                <div className="flex justify-between">
                  <span className="text-stone-500">Canceled</span>
                  <span className="text-stone-900">{new Date(sub.canceledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              )}
              <div className="flex justify-between pt-1.5 border-t border-stone-100">
                <span className="text-stone-400 text-xs">Subscription ID</span>
                <span className="text-stone-500 text-xs font-mono">{sub.stripeSubscriptionId}</span>
              </div>
              {cardSummary && (
                <div className="flex items-center gap-1.5 text-xs text-stone-500 pt-1">
                  <CardholderIcon size={14} />
                  <span className="capitalize">{cardSummary.brand}</span> •••• {cardSummary.last4}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-100 p-6">
            <h2 className="font-medium text-stone-900 mb-3">Shipping Address</h2>
            <AdminSubscriptionAddressForm subscriptionId={sub.id} initialAddress={addr} />
          </div>
        </div>
      </div>
    </div>
  );
}
