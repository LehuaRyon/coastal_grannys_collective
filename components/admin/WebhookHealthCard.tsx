import Link from 'next/link';
import { prisma } from '@/lib/db';
import { PlugsConnectedIcon, WarningCircleIcon } from '@phosphor-icons/react/dist/ssr';

// "Is Stripe actually talking to us" with zero need to check Stripe
// Dashboard's own webhook event log — this project hit a silently-dead
// webhook twice during development (stripe listen not running locally),
// each time only discovered by chance. The orphaned-payments banner on
// /admin/orders is the actionable alarm for that; this card is just the
// at-a-glance status that would have made both incidents obvious sooner.
export async function WebhookHealthCard() {
  const [lastEvent, recentCount] = await Promise.all([
    prisma.stripeWebhookEvent.findFirst({ orderBy: { receivedAt: 'desc' } }),
    prisma.stripeWebhookEvent.count({ where: { receivedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
  ]);

  if (!lastEvent) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <WarningCircleIcon size={16} weight="duotone" className="text-amber-700" />
          <p className="text-xs text-amber-800 font-medium uppercase tracking-wide">Webhook Health</p>
        </div>
        <p className="text-sm text-amber-800">
          No Stripe webhook event has ever been received — orders won&apos;t be created automatically. Verify the
          endpoint is registered in Stripe (production) or that <code className="bg-amber-100 px-1 rounded">stripe listen</code> is running (local).
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-stone-100 p-5">
      <div className="flex items-center gap-2 mb-3">
        <PlugsConnectedIcon size={16} weight="duotone" color="#C8921A" />
        <p className="text-xs text-stone-500 font-medium uppercase tracking-wide">Webhook Health</p>
      </div>
      <p className="text-sm text-stone-900">
        Last event <span className="font-mono text-xs text-stone-500">{lastEvent.type}</span>
      </p>
      <p className="text-xs text-stone-400 mt-1">{lastEvent.receivedAt.toLocaleString()}</p>
      <p className="text-xs text-stone-400 mt-3 pt-3 border-t border-stone-100 flex items-center justify-between">
        <span>{recentCount} event{recentCount === 1 ? '' : 's'} in the last 24 hours</span>
        <Link href="/admin/payments" className="text-amber-700 hover:underline">View log →</Link>
      </p>
    </div>
  );
}
