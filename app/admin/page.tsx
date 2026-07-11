import Link from 'next/link';
import { prisma } from '@/lib/db';
import { PackageIcon, NotePencilIcon, ReceiptIcon, TrayIcon, UsersIcon } from '@phosphor-icons/react/dist/ssr';

export default async function AdminDashboard() {
  const [totalOrders, revenueResult, recentOrders, totalUsers, totalProducts, unreadSubmissions] = await Promise.all([
    prisma.order.count(),
    prisma.order.aggregate({ _sum: { amount: true }, where: { status: 'paid' } }),
    prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { items: true } }),
    prisma.user.count(),
    prisma.product.count({ where: { inStock: true } }),
    prisma.submission.count({ where: { read: false } }),
  ]);

  const totalRevenue = revenueResult._sum.amount ?? 0;

  const statusColors: Record<string, string> = {
    paid: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    refunded: 'bg-stone-100 text-stone-600',
    failed: 'bg-red-100 text-red-600',
  };

  const quickLinks = [
    { label: 'Manage Products', desc: 'Add, edit, or remove coffees, subscriptions & merch', href: '/admin/products', icon: PackageIcon },
    { label: 'Edit Content', desc: 'Update homepage, about page & contact details', href: '/admin/content', icon: NotePencilIcon },
    { label: 'View Orders', desc: 'Full order history with customer details', href: '/admin/orders', icon: ReceiptIcon },
    { label: 'Submissions', desc: 'Contact, wholesale & coffee cart inquiries', href: '/admin/submissions', icon: TrayIcon },
    { label: 'Manage Users', desc: 'Customer list and admin role management', href: '/admin/users', icon: UsersIcon },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl text-stone-900">Dashboard</h1>
        <p className="text-sm text-stone-500 mt-1">Overview of your store</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Orders', value: totalOrders.toLocaleString() },
          { label: 'Revenue', value: `$${totalRevenue.toFixed(2)}` },
          { label: 'Users', value: totalUsers.toLocaleString() },
          { label: 'Avg Order', value: totalOrders > 0 ? `$${(totalRevenue / totalOrders).toFixed(2)}` : '$0.00' },
          { label: 'Products', value: totalProducts.toLocaleString() },
          { label: 'Unread Msgs', value: unreadSubmissions.toLocaleString() },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-stone-100 p-5">
            <p className="text-xs text-stone-500 font-medium">{stat.label}</p>
            <p className="font-serif text-2xl text-stone-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="bg-white rounded-xl border border-stone-100 p-5 hover:border-amber-200 hover:shadow-sm transition-all group"
          >
            <l.icon size={28} weight="duotone" color="#C8921A" className="block mb-3" />
            <p className="font-medium text-stone-900 text-sm group-hover:text-amber-700 transition-colors">{l.label}</p>
            <p className="text-xs text-stone-400 mt-1 leading-relaxed">{l.desc}</p>
          </Link>
        ))}
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="font-medium text-stone-900">Recent Orders</h2>
          <Link href="/admin/orders" className="text-xs text-amber-700 hover:underline">View all →</Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="px-6 py-12 text-center text-stone-400 text-sm">No orders yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100">
                  {['Customer', 'Items', 'Amount', 'Status', 'Date'].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-stone-900">{order.customerName}</p>
                      <p className="text-xs text-stone-400">{order.customerEmail}</p>
                    </td>
                    <td className="px-6 py-4 text-stone-600">
                      {order.items.map((item) => (
                        <span key={item.id} className="block text-xs">{item.qty}× {item.name}</span>
                      ))}
                    </td>
                    <td className="px-6 py-4 font-medium text-stone-900">${order.amount.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status] ?? 'bg-stone-100 text-stone-600'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-stone-500 text-xs">
                      {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
