'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { showToast } from '@/components/ui/Toast';
import type { Product } from '@prisma/client';

type ProductInput = Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>;

const DEFAULTS: ProductInput = {
  type: 'coffee',
  name: '',
  slug: '',
  subtitle: '',
  description: '',
  price: 0,
  origin: '',
  region: '',
  process: '',
  elevation: '',
  roast: '',
  notes: [],
  prices: null,
  freq: '',
  period: '',
  features: [],
  options: [],
  gradient: '',
  icon: '',
  badge: '',
  badgeClass: '',
  inStock: true,
  featured: false,
  position: 0,
};

function arrayField(val: string[], onChange: (v: string[]) => void, label: string) {
  return (
    <div>
      <label className="text-xs font-semibold text-stone-600 uppercase tracking-wide block mb-1">{label} <span className="font-normal normal-case text-stone-400">(comma-separated)</span></label>
      <input
        type="text"
        value={val.join(', ')}
        onChange={(e) => onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
        className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400 transition-colors"
      />
    </div>
  );
}

export default function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const isNew = !product;
  const [form, setForm] = useState<ProductInput>(product ? {
    type: product.type,
    name: product.name,
    slug: product.slug,
    subtitle: product.subtitle ?? '',
    description: product.description ?? '',
    price: product.price,
    origin: product.origin ?? '',
    region: product.region ?? '',
    process: product.process ?? '',
    elevation: product.elevation ?? '',
    roast: product.roast ?? '',
    notes: product.notes ?? [],
    prices: product.prices,
    freq: product.freq ?? '',
    period: product.period ?? '',
    features: product.features ?? [],
    options: product.options ?? [],
    gradient: product.gradient ?? '',
    icon: product.icon ?? '',
    badge: product.badge ?? '',
    badgeClass: product.badgeClass ?? '',
    inStock: product.inStock,
    featured: product.featured,
    position: product.position,
  } : DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function set(k: keyof ProductInput, v: unknown) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = isNew ? '/api/admin/products' : `/api/admin/products/${product!.id}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      showToast(isNew ? 'Product created' : 'Saved');
      router.push('/admin/products');
      router.refresh();
    } catch {
      showToast('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${product?.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/products/${product!.id}`, { method: 'DELETE' });
      showToast('Deleted');
      router.push('/admin/products');
      router.refresh();
    } catch {
      showToast('Failed to delete');
    } finally {
      setDeleting(false);
    }
  }

  const f = (k: keyof ProductInput) => ({
    value: (form[k] ?? '') as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(k, e.target.value),
  });

  const inputClass = "w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400 transition-colors";
  const labelClass = "text-xs font-semibold text-stone-600 uppercase tracking-wide block mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Core */}
      <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-4">
        <h2 className="font-medium text-stone-900 text-sm">Core</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Type</label>
            <select {...f('type')} onChange={(e) => { set('type', e.target.value); if (e.target.value !== 'coffee') set('featured', false); }} value={(form.type ?? '') as string} className={inputClass}>
              <option value="coffee">Coffee</option>
              <option value="subscription">Subscription</option>
              <option value="merch">Merch</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>In Stock</label>
            <select
              value={form.inStock ? 'true' : 'false'}
              onChange={(e) => set('inStock', e.target.value === 'true')}
              className={inputClass}
            >
              <option value="true">In Stock</option>
              <option value="false">Out of Stock</option>
            </select>
          </div>
        </div>
        {form.type === 'coffee' && (
          <div>
            <label className={labelClass}>Featured on Homepage</label>
            <select
              value={form.featured ? 'true' : 'false'}
              onChange={(e) => set('featured', e.target.value === 'true')}
              className={inputClass}
            >
              <option value="false">No</option>
              <option value="true">Yes — show in featured section</option>
            </select>
          </div>
        )}
        <div>
          <label className={labelClass}>Name</label>
          <input type="text" required {...f('name')} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Slug <span className="font-normal normal-case text-stone-400">(unique URL key)</span></label>
          <input type="text" required {...f('slug')} className={inputClass} placeholder="e.g. ethiopia-yirgacheffe" />
        </div>
        <div>
          <label className={labelClass}>Subtitle</label>
          <input type="text" {...f('subtitle')} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <textarea {...f('description')} rows={3} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Price ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.price ?? 0}
              onChange={(e) => set('price', parseFloat(e.target.value) || 0)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Position <span className="font-normal normal-case text-stone-400">(sort order)</span></label>
            <input
              type="number"
              min="0"
              value={form.position ?? 0}
              onChange={(e) => set('position', parseInt(e.target.value) || 0)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Coffee-specific */}
      {form.type === 'coffee' && (
        <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-4">
          <h2 className="font-medium text-stone-900 text-sm">Coffee Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Origin</label><input type="text" {...f('origin')} className={inputClass} /></div>
            <div>
              <label className={labelClass}>Region</label>
              <select {...f('region')} className={inputClass}>
                <option value="">— None —</option>
                <option>Africa</option>
                <option>Caribbean</option>
                <option>Latin America</option>
                <option>Central America</option>
                <option>Asia Pacific</option>
                <option>Pacific Islands</option>
                <option>Middle East</option>
                <option>Other</option>
              </select>
            </div>
            <div><label className={labelClass}>Process</label><input type="text" {...f('process')} className={inputClass} /></div>
            <div><label className={labelClass}>Elevation</label><input type="text" {...f('elevation')} className={inputClass} /></div>
            <div><label className={labelClass}>Roast</label><input type="text" {...f('roast')} className={inputClass} /></div>
          </div>
          {arrayField(form.notes ?? [], (v) => set('notes', v), 'Tasting Notes')}
          <div>
            <label className={labelClass}>Prices JSON <span className="font-normal normal-case text-stone-400">{`(e.g. {"12 oz": 22, "5 lb": 85})`}</span></label>
            <textarea
              value={form.prices ? JSON.stringify(form.prices, null, 2) : ''}
              onChange={(e) => {
                try { set('prices', JSON.parse(e.target.value)); } catch { /* ignore */ }
              }}
              rows={3}
              className={`${inputClass} font-mono text-xs`}
            />
          </div>
        </div>
      )}

      {/* Subscription-specific */}
      {form.type === 'subscription' && (
        <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-4">
          <h2 className="font-medium text-stone-900 text-sm">Subscription Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Frequency</label><input type="text" {...f('freq')} className={inputClass} placeholder="e.g. Every 2 weeks" /></div>
            <div><label className={labelClass}>Period</label><input type="text" {...f('period')} className={inputClass} placeholder="e.g. / month" /></div>
          </div>
          {arrayField(form.features ?? [], (v) => set('features', v), 'Features')}
          {arrayField(form.options ?? [], (v) => set('options', v), 'Roast Options shown to customer')}
          <p className="text-xs text-stone-400">Leave Roast Options empty to hide the roast picker. Add options like: Light, Medium, Medium-Dark, Dark</p>
        </div>
      )}

      {/* Merch-specific */}
      {form.type === 'merch' && (
        <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-4">
          <h2 className="font-medium text-stone-900 text-sm">Merch Details</h2>
          {arrayField(form.options ?? [], (v) => set('options', v), 'Options')}
        </div>
      )}

      {/* Display */}
      <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-4">
        <h2 className="font-medium text-stone-900 text-sm">Display</h2>
        <div className="grid grid-cols-2 gap-4">
          {form.type === 'merch' && (
            <div><label className={labelClass}>Icon <span className="font-normal normal-case text-stone-400">(emoji)</span></label><input type="text" {...f('icon')} className={inputClass} /></div>
          )}
          <div><label className={labelClass}>Badge</label><input type="text" {...f('badge')} className={inputClass} /></div>
          <div><label className={labelClass}>Badge Class</label><input type="text" {...f('badgeClass')} className={inputClass} /></div>
          <div><label className={labelClass}>Gradient</label><input type="text" {...f('gradient')} className={inputClass} /></div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-stone-900 text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-stone-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : isNew ? 'Create Product' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-stone-500 hover:text-stone-900 transition-colors px-4 py-2.5"
        >
          Cancel
        </button>
        {!isNew && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="ml-auto text-sm text-red-600 hover:text-red-700 transition-colors px-4 py-2.5 disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete Product'}
          </button>
        )}
      </div>
    </form>
  );
}
