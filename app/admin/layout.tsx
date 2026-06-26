import Link from 'next/link';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export const metadata = { title: "Admin — Coastal Granny's Collective" };

const NAV = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Products', href: '/admin/products' },
  { label: 'Content', href: '/admin/content' },
  { label: 'Orders', href: '/admin/orders' },
  { label: 'Users', href: '/admin/users' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user?.role !== 'admin') redirect('/account/login');

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="bg-stone-900 text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-amber-400 text-lg">◉</span>
          <span className="text-sm font-medium">Grounds Admin</span>
          <nav className="flex items-center gap-1 ml-4">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="px-3 py-1.5 rounded-lg text-xs text-stone-300 hover:text-white hover:bg-stone-700 transition-colors"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-400">{session.user.email}</span>
          <Link
            href="/"
            className="text-xs px-3 py-1.5 rounded-lg border border-stone-600 text-stone-300 hover:text-white hover:border-stone-400 transition-colors"
          >
            View Site ↗
          </Link>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
    </div>
  );
}
