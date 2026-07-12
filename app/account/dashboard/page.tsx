import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { AddressCard } from '@/components/account/AddressCard';
import { GiftCardList } from '@/components/account/GiftCardList';

export const metadata = { title: "My Account — Coastal Granny's Collective" };

const STATUS_COLORS: Record<string, string> = {
  paid: 'bg-green-100 text-green-800',
  refunded: 'bg-blue-100 text-blue-800',
  disputed: 'bg-red-100 text-red-800',
  pending: 'bg-amber-100 text-amber-800',
  failed: 'bg-stone-100 text-stone-600',
};

export default async function AccountDashboard() {
  const session = await auth();
  if (!session?.user?.email) redirect('/account/login');

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      createdAt: true,
      phone: true,
      address: true,
      apt: true,
      city: true,
      state: true,
      zip: true,
      country: true,
    },
  });

  if (!user) redirect('/account/login');

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });

  // Fallback: also check by email for older orders placed before userId was linked
  const emailOrders = await prisma.order.findMany({
    where: { customerEmail: user.email, userId: null },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });

  const allOrders = [...orders, ...emailOrders];

  // Live balance — reflects redemptions made either as a guest or logged in,
  // since gift cards are tracked by recipient email/code, not by session.
  const giftCards = await prisma.giftCard.findMany({
    where: { recipientEmail: user.email, delivered: true },
    orderBy: [{ balance: 'desc' }, { createdAt: 'desc' }],
    select: {
      code: true,
      balance: true,
      initialBalance: true,
      createdAt: true,
      redemptions: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, amount: true, createdAt: true, orderId: true },
      },
    },
  });

  // Cards addressed to this email but not yet sent — most commonly a
  // self-gift scheduled for a future date (e.g. "deliver on my birthday").
  // Shown separately since there's no code/balance to act on until it's
  // actually delivered — a surprise gift from someone else still shouldn't
  // spoil early, but the buyer's own scheduled purchase shouldn't just
  // vanish from their account until then either.
  const scheduledGiftCards = await prisma.giftCard.findMany({
    where: { recipientEmail: user.email, delivered: false, deliverOn: { gt: new Date() } },
    orderBy: { deliverOn: 'asc' },
    select: { id: true, initialBalance: true, deliverOn: true },
  });

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="font-serif text-3xl text-stone-900">My Account</h1>
            <p className="text-stone-500 text-sm mt-1">{user.email}</p>
          </div>
          <SignOutButton />
        </div>

        {/* Account info */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 mb-8">
          <h2 className="font-medium text-stone-900 mb-4">Account Details</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-stone-400 text-xs uppercase tracking-wider mb-1">Name</p>
              <p className="text-stone-700">
                {user.firstName || user.lastName ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : '—'}
              </p>
            </div>
            <div>
              <p className="text-stone-400 text-xs uppercase tracking-wider mb-1">Email</p>
              <p className="text-stone-700">{user.email}</p>
            </div>
            <div>
              <p className="text-stone-400 text-xs uppercase tracking-wider mb-1">Member Since</p>
              <p className="text-stone-700">
                {new Date(user.createdAt).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div>
              <p className="text-stone-400 text-xs uppercase tracking-wider mb-1">Total Orders</p>
              <p className="text-stone-700">{allOrders.length}</p>
            </div>
          </div>
        </div>

        {giftCards.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
              <h2 className="font-medium text-stone-900">Gift Cards</h2>
              <span className="text-sm font-semibold text-amber-700">
                ${giftCards.reduce((sum, gc) => sum + gc.balance, 0).toFixed(2)} available
              </span>
            </div>
            <GiftCardList
              giftCards={giftCards.map((gc) => ({
                ...gc,
                createdAt: gc.createdAt.toISOString(),
                redemptions: gc.redemptions.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
              }))}
            />
          </div>
        )}

        {scheduledGiftCards.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-stone-100">
              <h2 className="font-medium text-stone-900">Scheduled Gift Cards</h2>
              <p className="text-xs text-stone-400 mt-0.5">Arriving soon — the code will be emailed on the delivery date.</p>
            </div>
            <div className="divide-y divide-stone-100">
              {scheduledGiftCards.map((gc) => (
                <div key={gc.id} className="px-6 py-4 flex items-center justify-between">
                  <p className="text-sm text-stone-700">
                    ${gc.initialBalance.toFixed(2)} gift card
                  </p>
                  <p className="text-xs text-stone-400">
                    Arriving {gc.deliverOn?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <AddressCard
          profile={{
            phone: user.phone,
            address: user.address,
            apt: user.apt,
            city: user.city,
            state: user.state,
            zip: user.zip,
            country: user.country,
          }}
        />

        {/* Order history */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100">
            <h2 className="font-medium text-stone-900">Order History</h2>
          </div>

          {allOrders.length === 0 ? (
            <div className="text-center py-16 text-stone-400">
              <p className="mb-4">No orders yet.</p>
              <Link
                href="/shop/coffee"
                className="text-sm text-amber-700 hover:underline font-medium"
              >
                Shop our coffees →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {allOrders.map((order) => (
                <div key={order.id} className="px-6 py-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <p className="text-xs text-stone-400 font-mono">{order.stripePaymentId}</p>
                      <p className="text-sm text-stone-500 mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span
                        className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                          STATUS_COLORS[order.status] ?? 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {order.status}
                      </span>
                      <span className="font-semibold text-stone-900 text-sm">
                        ${order.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-1">
                    {order.items.map((item) => (
                      <li key={item.id} className="text-sm text-stone-600 flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-stone-300 flex-shrink-0" />
                        <span>{item.name}</span>
                        {item.variant && (
                          <span className="text-stone-400">— {item.variant}</span>
                        )}
                        <span className="text-stone-400 ml-auto">×{item.qty}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link href="/shop/coffee" className="text-sm text-amber-700 hover:underline">
            ← Back to Shop
          </Link>
        </div>
      </div>
    </div>
  );
}
