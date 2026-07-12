// TODO: After sorting/filtering is in place, add a CSV export button:
//   • Button label: "Export CSV" — appears above the table, exports only the currently filtered rows
//   • Columns: Order ID, Customer Name, Email, Items (joined string), Amount, Status, Date
//   • Implement as a client-side download (build a Blob from the filtered data and trigger
//     a link click with a `data:text/csv` URL) so no extra API route is needed
//   • Alternatively, a /api/admin/orders/export?days=30&status=paid route that streams
//     a CSV response with Content-Disposition: attachment is cleaner for large datasets

// TODO: Add sorting and filtering to this page:
//   • Sort by customer name (A→Z / Z→A) in addition to the current date sort
//   • Date range filter buttons: Past 30 days / Past 60 days / Past 90 days / All time
//     — pass a `?days=30` (or 60/90) search param and filter with a Prisma `where: { createdAt: { gte: ... } }`
//   • Keep the existing status filter (paid / pending / refunded / failed) working alongside the new filters
//   Convert to a Client Component (or use server-side search params) so the filters
//   update without a full page reload.

import { prisma } from '@/lib/db';
import { OrderStatusSelect } from '@/components/admin/OrderStatusSelect';

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: { items: true, giftCardRedemptions: { include: { giftCard: { select: { code: true } } } } },
  });

  const total = orders.filter((o) => o.status === 'paid').reduce((s, o) => s + o.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-stone-900">Orders</h1>
          <p className="text-sm text-stone-500 mt-1">{orders.length} orders · ${total.toFixed(2)} revenue from paid orders</p>
        </div>
        <p className="text-xs text-stone-400">To process a refund, update status here then go to Stripe Dashboard.</p>
      </div>

      <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
        {orders.length === 0 ? (
          <div className="px-6 py-16 text-center text-stone-400 text-sm">No orders yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  {['Customer', 'Items', 'Shipping', 'Amount', 'Status', 'Date'].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {orders.map((order) => {
                  const addr = order.shippingAddress as Record<string, string> | null;
                  return (
                    <tr key={order.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-stone-900">{order.customerName}</p>
                        <p className="text-xs text-stone-400">{order.customerEmail}</p>
                      </td>
                      <td className="px-6 py-4 text-stone-600">
                        {order.items.map((item) => (
                          <span key={item.id} className="block text-xs">
                            {item.qty}× {item.name}{item.variant ? ` (${item.variant})` : ''}
                          </span>
                        ))}
                      </td>
                      <td className="px-6 py-4 text-xs text-stone-500">
                        {addr ? `${addr.address ?? ''}, ${addr.city ?? ''} ${addr.state ?? ''}`.trim().replace(/^,\s*/, '') : '—'}
                      </td>
                      <td className="px-6 py-4 font-medium text-stone-900">
                        ${order.amount.toFixed(2)}
                        {order.giftCardRedemptions.map((r) => (
                          <span key={r.id} className="block text-[10px] font-normal text-amber-700 mt-0.5">
                            −${r.amount.toFixed(2)} gift card ({r.giftCard.code})
                          </span>
                        ))}
                        {order.refundedAmount != null && (
                          <span className="block text-[10px] font-normal text-blue-600 mt-0.5">
                            ${order.refundedAmount.toFixed(2)} refunded
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <OrderStatusSelect orderId={order.id} initialStatus={order.status} />
                      </td>
                      <td className="px-6 py-4 text-xs text-stone-500">
                        {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
