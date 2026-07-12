import Link from 'next/link';
import { notFound } from 'next/navigation';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { OrderStatusSelect } from '@/components/admin/OrderStatusSelect';
import { RefundPanel } from '@/components/admin/RefundPanel';
import { ArrowLeftIcon, WarningCircleIcon, CardholderIcon } from '@phosphor-icons/react/dist/ssr';

function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key) : null;
}

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      giftCardRedemptions: { include: { giftCard: { select: { code: true, recipientEmail: true } } } },
      giftCardsPurchased: { select: { code: true, recipientEmail: true, initialBalance: true, balance: true } },
    },
  });

  if (!order) notFound();

  const addr = order.shippingAddress as Record<string, string> | null;
  const isGiftCardOnly = order.stripePaymentId.startsWith('giftcard_');
  const isManual = order.stripePaymentId.startsWith('manual_');
  // Subscription-cycle orders use a synthetic sub_invoice_<id> as
  // Order.stripePaymentId (an idempotency key, not a real charge) — the
  // real PaymentIntent id, when resolved, lives in stripeChargeId instead.
  const isSubscriptionCycle = order.stripePaymentId.startsWith('sub_invoice_');
  const realPaymentId = order.stripeChargeId ?? (isSubscriptionCycle ? null : order.stripePaymentId);
  const alreadyRefunded = order.refundedAmount ?? 0;
  const maxRefundable = Math.max(0, order.amount - alreadyRefunded);

  // Card brand/last4, receipt link, and Radar's risk assessment — purely
  // supplementary context pulled live from Stripe so an admin never has to
  // open the Stripe Dashboard to answer "what card did this customer pay
  // with" or "did Stripe flag this as risky." Best-effort: a $0 gift-card-
  // only or manually-recorded order has no real PaymentIntent, and any
  // Stripe hiccup here shouldn't break the rest of the page.
  let cardSummary: { brand: string; last4: string } | null = null;
  let receiptUrl: string | null = null;
  let riskLevel: string | null = null;
  let riskScore: number | null = null;
  if (!isGiftCardOnly && !isManual && realPaymentId) {
    try {
      const stripe = getStripeClient();
      if (stripe) {
        const pi = await stripe.paymentIntents.retrieve(realPaymentId, {
          expand: ['latest_charge', 'latest_charge.payment_method_details'],
        });
        const charge = pi.latest_charge;
        if (charge && typeof charge !== 'string') {
          receiptUrl = charge.receipt_url ?? null;
          const card = charge.payment_method_details?.card;
          if (card?.brand && card?.last4) cardSummary = { brand: card.brand, last4: card.last4 };
          riskLevel = charge.outcome?.risk_level ?? null;
          riskScore = charge.outcome?.risk_score ?? null;
        }
      }
    } catch (err) {
      console.error(`Could not fetch Stripe details for order ${order.id}:`, err);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/orders" className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800 transition-colors mb-3">
          <ArrowLeftIcon size={12} weight="bold" />
          Back to Orders
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl text-stone-900">Order {order.id}</h1>
            <p className="text-sm text-stone-500 mt-1">
              {new Date(order.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </p>
          </div>
          <OrderStatusSelect orderId={order.id} initialStatus={order.status} />
        </div>
      </div>

      {isManual && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-purple-800">
          <p className="font-medium">Manually recorded order — no Stripe charge occurred.</p>
          <p className="text-xs text-purple-700 mt-1">
            Recorded by {order.manualEntryBy}. {order.manualEntryNote}
          </p>
        </div>
      )}

      {order.status === 'disputed' && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-800">
          <p className="flex items-start gap-1.5 font-medium">
            <WarningCircleIcon size={16} weight="duotone" className="flex-shrink-0 mt-0.5" />
            <span>
              Customer disputed this charge through their bank (chargeback) — reason: {order.disputeReason ?? 'unknown'}.
              {order.disputeDueBy && (
                <> Evidence due by {new Date(order.disputeDueBy).toDateString()}.</>
              )}
            </span>
          </p>
          <p className="mt-1.5 text-xs text-orange-700">
            Dispute ID: {order.disputeId} · Status: {order.disputeStatus ?? 'needs_response'}. If you don&apos;t submit evidence in the
            Stripe Dashboard before the due date, the dispute is automatically lost and this order will be reconciled like a refund.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-stone-100 p-6">
            <h2 className="font-medium text-stone-900 mb-4">Items</h2>
            <div className="divide-y divide-stone-50">
              {order.items.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between text-sm">
                  <div>
                    <p className="text-stone-900">{item.qty}× {item.name}</p>
                    {item.variant && <p className="text-xs text-stone-400">{item.variant}</p>}
                    {item.giftRecipientEmail && (
                      <p className="text-xs text-amber-700 mt-0.5">Gift for {item.giftRecipientEmail}</p>
                    )}
                  </div>
                  <p className="font-medium text-stone-900">${(item.price * item.qty).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {order.giftCardRedemptions.length > 0 && (
            <div className="bg-white rounded-xl border border-stone-100 p-6">
              <h2 className="font-medium text-stone-900 mb-4">Gift Cards Applied</h2>
              <ul className="space-y-2 text-sm">
                {order.giftCardRedemptions.map((r) => (
                  <li key={r.id} className="flex items-center justify-between">
                    <span className="font-mono text-stone-700">{r.giftCard.code}</span>
                    <span className="font-medium text-amber-700">−${r.amount.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {order.giftCardsPurchased.length > 0 && (
            <div className="bg-white rounded-xl border border-stone-100 p-6">
              <h2 className="font-medium text-stone-900 mb-4">Gift Cards Purchased</h2>
              <ul className="space-y-2 text-sm">
                {order.giftCardsPurchased.map((gc) => (
                  <li key={gc.code} className="flex items-center justify-between">
                    <span>
                      <span className="font-mono text-stone-700">{gc.code}</span>
                      <span className="text-xs text-stone-400 ml-2">to {gc.recipientEmail}</span>
                    </span>
                    <span className="font-medium text-stone-900">${gc.balance.toFixed(2)} / ${gc.initialBalance.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-stone-100 p-6">
            <h2 className="font-medium text-stone-900 mb-3">Customer</h2>
            <p className="text-sm text-stone-900">{order.customerName || 'Guest'}</p>
            <p className="text-xs text-stone-400">{order.customerEmail}</p>
            {addr && (addr.address || addr.city) && (
              <p className="text-xs text-stone-500 mt-3">
                {addr.address}{addr.apt ? `, ${addr.apt}` : ''}<br />
                {addr.city}, {addr.state} {addr.zip}<br />
                {addr.country}
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-stone-100 p-6">
            <h2 className="font-medium text-stone-900 mb-3">Payment</h2>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-500">Order total</span>
                <span className="text-stone-900 font-medium">${order.amount.toFixed(2)}</span>
              </div>
              {alreadyRefunded > 0 && (
                <div className="flex justify-between text-blue-600">
                  <span>Refunded</span>
                  <span className="font-medium">${alreadyRefunded.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1.5 border-t border-stone-100">
                <span className="text-stone-400 text-xs">Payment ID</span>
                <span className="text-stone-500 text-xs font-mono">{order.stripePaymentId}</span>
              </div>
              {cardSummary && (
                <div className="flex items-center gap-1.5 text-xs text-stone-500 pt-1">
                  <CardholderIcon size={14} />
                  <span className="capitalize">{cardSummary.brand}</span> •••• {cardSummary.last4}
                </div>
              )}
              {receiptUrl && (
                <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="block text-xs text-amber-700 hover:underline pt-1">
                  View Stripe receipt →
                </a>
              )}
              {riskLevel && (
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-stone-400">Fraud risk (Stripe Radar)</span>
                  <span
                    className={`font-medium capitalize ${
                      riskLevel === 'elevated' || riskLevel === 'highest'
                        ? 'text-red-600'
                        : riskLevel === 'normal'
                          ? 'text-green-600'
                          : 'text-stone-500'
                    }`}
                  >
                    {riskLevel}{riskScore != null ? ` (${riskScore})` : ''}
                  </span>
                </div>
              )}
            </div>

            {isManual ? (
              <p className="text-xs text-stone-400 mt-4 pt-4 border-t border-stone-100">
                No Stripe charge to refund — this order was recorded manually. To reverse it, change its status above
                or delete it directly if it was a mistake.
              </p>
            ) : isGiftCardOnly ? (
              <p className="text-xs text-stone-400 mt-4 pt-4 border-t border-stone-100">
                Fully covered by gift card — nothing was charged via Stripe, so there&apos;s nothing to refund here.
                Use Void/Credit on the gift card itself from /admin/gift-cards.
              </p>
            ) : isSubscriptionCycle && !realPaymentId ? (
              <p className="text-xs text-amber-700 mt-4 pt-4 border-t border-stone-100">
                Couldn&apos;t find the underlying charge for this subscription order yet — try Resync on the subscription
                (from its detail page), then reload this order.
              </p>
            ) : maxRefundable > 0 ? (
              <div className="mt-4 pt-4 border-t border-stone-100">
                <RefundPanel orderId={order.id} maxRefundable={maxRefundable} />
              </div>
            ) : (
              <p className="text-xs text-stone-400 mt-4 pt-4 border-t border-stone-100">Fully refunded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
