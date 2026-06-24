import Link from 'next/link';
import { prisma } from '@/lib/db';
import { FeaturedToggle } from '@/components/admin/FeaturedToggle';

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({ orderBy: [{ type: 'asc' }, { position: 'asc' }] });

  const byType: Record<string, typeof products> = {};
  for (const p of products) {
    if (!byType[p.type]) byType[p.type] = [];
    byType[p.type].push(p);
  }

  const typeLabels: Record<string, string> = { coffee: 'Coffee', subscription: 'Subscriptions', merch: 'Merch' };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-stone-900">Products</h1>
          <p className="text-sm text-stone-500 mt-1">{products.length} total products</p>
        </div>
        <Link
          href="/admin/products/new"
          className="bg-stone-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-stone-700 transition-colors"
        >
          + New Product
        </Link>
      </div>

      {Object.entries(byType).map(([type, items]) => (
        <div key={type} className="bg-white rounded-xl border border-stone-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
            <h2 className="font-medium text-stone-900">{typeLabels[type] ?? type}</h2>
            {type === 'coffee' && (
              <p className="text-xs text-stone-400">⭐ = featured on homepage (up to 4)</p>
            )}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-50">
                {['Name', 'Price', 'Status', 'Pos', type === 'coffee' ? 'Featured' : '', ''].map((h, i) => (
                  <th key={i} className="text-left px-6 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {items.map((p) => (
                <tr key={p.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {p.icon && <span className="text-xl">{p.icon}</span>}
                      <div>
                        <p className="font-medium text-stone-900">{p.name}</p>
                        {p.subtitle && <p className="text-xs text-stone-400">{p.subtitle}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-stone-700">${p.price}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${p.inStock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {p.inStock ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-stone-500 text-xs">{p.position}</td>
                  <td className="px-6 py-4">
                    {type === 'coffee' && (
                      <FeaturedToggle productId={p.id} initialFeatured={p.featured} />
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/admin/products/${p.id}`} className="text-xs text-amber-700 hover:underline font-medium">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
