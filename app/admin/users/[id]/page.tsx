import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr';

const STATUS_COLORS: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  partially_refunded: 'bg-blue-100 text-blue-700',
  refunded: 'bg-stone-100 text-stone-600',
  disputed: 'bg-orange-100 text-orange-700',
  failed: 'bg-red-100 text-red-600',
};

// One place to see everything tied to a customer — orders (placed while
// logged in AND as a guest under the same email), gift cards they've
// bought or received, and their support history — so an admin mid-
// conversation with an upset customer never has to cross-reference three
// separate pages (or, worse, the database directly) to get the full
// picture.
export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) notFound();

  const [linkedOrders, guestOrders, giftCardsReceived, giftCardsPurchased, submissions] = await Promise.all([
    prisma.order.findMany({ where: { userId: user.id }, include: { items: true }, orderBy: { createdAt: 'desc' } }),
    prisma.order.findMany({ where: { customerEmail: user.email, userId: null }, include: { items: true }, orderBy: { createdAt: 'desc' } }),
    prisma.giftCard.findMany({ where: { recipientEmail: user.email }, orderBy: { createdAt: 'desc' } }),
    prisma.giftCard.findMany({
      where: { purchaseOrder: { OR: [{ userId: user.id }, { customerEmail: user.email }] } },
      include: { purchaseOrder: { select: { id: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.submission.findMany({ where: { senderEmail: user.email }, orderBy: { createdAt: 'desc' } }),
  ]);

  const orders = [...linkedOrders, ...guestOrders].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const totalSpent = orders.filter((o) => o.status === 'paid' || o.status === 'partially_refunded').reduce((s, o) => s + o.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/users" className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800 transition-colors mb-3">
          <ArrowLeftIcon size={12} weight="bold" />
          Back to Users
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl text-stone-900">
              {user.firstName || user.lastName ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : user.email}
            </h1>
            <p className="text-sm text-stone-500 mt-1">{user.email}</p>
          </div>
          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-600'}`}>
            {user.role}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: orders.length },
          { label: 'Total Spent', value: `$${totalSpent.toFixed(2)}` },
          { label: 'Gift Cards Received', value: giftCardsReceived.length },
          { label: 'Support Messages', value: submissions.length },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-stone-100 p-5">
            <p className="text-xs text-stone-500 font-medium">{stat.label}</p>
            <p className="text-2xl font-serif text-stone-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-stone-100 p-6">
        <h2 className="font-medium text-stone-900 mb-3">Profile</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-stone-400 text-xs uppercase tracking-wider mb-1">Member Since</p>
            <p className="text-stone-700">{user.createdAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
          <div>
            <p className="text-stone-400 text-xs uppercase tracking-wider mb-1">Phone</p>
            <p className="text-stone-700">{user.phone || '—'}</p>
          </div>
          {(user.address || user.city) && (
            <div className="col-span-2">
              <p className="text-stone-400 text-xs uppercase tracking-wider mb-1">Saved Address</p>
              <p className="text-stone-700">
                {user.address}{user.apt ? `, ${user.apt}` : ''}, {user.city}, {user.state} {user.zip}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100">
          <h2 className="font-medium text-stone-900">Orders</h2>
        </div>
        {orders.length === 0 ? (
          <div className="px-6 py-8 text-center text-stone-400 text-sm">No orders yet.</div>
        ) : (
          <div className="divide-y divide-stone-50">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="px-6 py-3 flex items-center justify-between text-sm hover:bg-stone-50 transition-colors"
              >
                <div>
                  <p className="text-stone-900">
                    {order.items.map((i) => i.name).join(', ') || 'Order'}
                  </p>
                  <p className="text-xs text-stone-400">{order.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-stone-900">${order.amount.toFixed(2)}</span>
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] ?? 'bg-stone-100 text-stone-600'}`}>
                    {order.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100">
            <h2 className="font-medium text-stone-900">Gift Cards Received</h2>
          </div>
          {giftCardsReceived.length === 0 ? (
            <div className="px-6 py-8 text-center text-stone-400 text-sm">None.</div>
          ) : (
            <div className="divide-y divide-stone-50">
              {giftCardsReceived.map((gc) => (
                <div key={gc.id} className="px-6 py-3 flex items-center justify-between text-sm">
                  <span className="font-mono text-stone-700">{gc.code}</span>
                  <span className={gc.balance > 0 ? 'text-amber-700 font-medium' : 'text-stone-300'}>
                    ${gc.balance.toFixed(2)} / ${gc.initialBalance.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100">
            <h2 className="font-medium text-stone-900">Gift Cards Purchased</h2>
          </div>
          {giftCardsPurchased.length === 0 ? (
            <div className="px-6 py-8 text-center text-stone-400 text-sm">None.</div>
          ) : (
            <div className="divide-y divide-stone-50">
              {giftCardsPurchased.map((gc) => (
                <Link
                  key={gc.id}
                  href={gc.purchaseOrder ? `/admin/orders/${gc.purchaseOrder.id}` : '#'}
                  className="px-6 py-3 flex items-center justify-between text-sm hover:bg-stone-50 transition-colors"
                >
                  <span>
                    <span className="font-mono text-stone-700">{gc.code}</span>
                    <span className="text-xs text-stone-400 ml-2">to {gc.recipientEmail}</span>
                  </span>
                  <span className="text-stone-900 font-medium">${gc.initialBalance.toFixed(2)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="font-medium text-stone-900">Support Messages</h2>
          <Link href="/admin/submissions" className="text-xs text-amber-700 hover:underline">View all →</Link>
        </div>
        {submissions.length === 0 ? (
          <div className="px-6 py-8 text-center text-stone-400 text-sm">None.</div>
        ) : (
          <div className="divide-y divide-stone-50">
            {submissions.map((s) => (
              <div key={s.id} className="px-6 py-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-stone-900">{s.type}</span>
                  <span className="text-xs text-stone-400">{s.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                {!s.read && <span className="text-xs text-amber-700">Unread</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
