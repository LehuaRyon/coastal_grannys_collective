'use client';

import { useState } from 'react';
import { showToast } from '@/components/ui/Toast';

export function FeaturedToggle({ productId, initialFeatured }: { productId: string; initialFeatured: boolean }) {
  const [featured, setFeatured] = useState(initialFeatured);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: !featured }),
      });
      if (!res.ok) throw new Error();
      setFeatured((f) => !f);
      showToast(!featured ? 'Marked as featured' : 'Removed from featured');
    } catch {
      showToast('Failed to update');
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={saving}
      title={featured ? 'Remove from homepage featured' : 'Feature on homepage'}
      className={`text-lg transition-all disabled:opacity-50 ${featured ? 'opacity-100' : 'opacity-25 hover:opacity-60'}`}
    >
      ⭐
    </button>
  );
}
