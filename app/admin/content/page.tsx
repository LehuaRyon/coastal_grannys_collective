'use client';

import { useState, useEffect, useCallback } from 'react';
import { showToast } from '@/components/ui/Toast';

type PageKey = 'home' | 'about' | 'contact' | 'wholesale' | 'gift-cards';

const PAGE_FIELDS: Record<PageKey, { key: string; label: string; multiline?: boolean; json?: boolean; hint?: string }[]> = {
  home: [
    { key: 'hero_title', label: 'Hero Title' },
    { key: 'hero_subtitle', label: 'Hero Subtitle', multiline: true },
    { key: 'featured_eyebrow', label: 'Featured Section Eyebrow' },
    { key: 'featured_heading', label: 'Featured Section Heading' },
    { key: 'featured_body', label: 'Featured Section Body', multiline: true },
    { key: 'sub_heading', label: 'Subscription CTA Heading' },
    { key: 'sub_body', label: 'Subscription CTA Body', multiline: true },
    { key: 'story_eyebrow', label: 'Brand Story Eyebrow' },
    { key: 'story_heading', label: 'Brand Story Heading' },
    { key: 'story_body', label: 'Brand Story Body', multiline: true },
  ],
  about: [
    { key: 'hero_title', label: 'Hero Title' },
    { key: 'hero_subtitle', label: 'Hero Subtitle', multiline: true },
    { key: 'story_heading', label: 'Story Heading' },
    { key: 'story_body_1', label: 'Story Paragraph 1', multiline: true },
    { key: 'story_body_2', label: 'Story Paragraph 2', multiline: true },
    { key: 'values', label: 'Values', multiline: true, json: true, hint: '[{"icon":"...","title":"...","text":"..."}]' },
    { key: 'team', label: 'Team Members', multiline: true, json: true, hint: '[{"name":"...","role":"...","bio":"..."}]' },
  ],
  contact: [
    { key: 'heading', label: 'Page Heading' },
    { key: 'subheading', label: 'Subheading', multiline: true },
    { key: 'address', label: 'Address' },
    { key: 'hours', label: 'Hours' },
    { key: 'email', label: 'Email Address' },
    { key: 'phone', label: 'Phone Number' },
  ],
  wholesale: [
    { key: 'hero_title', label: 'Hero Title' },
    { key: 'hero_subtitle', label: 'Hero Subtitle', multiline: true },
    { key: 'why_heading', label: '"Why Partner" Heading' },
    { key: 'why_body_1', label: 'Why Body Paragraph 1', multiline: true },
    { key: 'why_body_2', label: 'Why Body Paragraph 2', multiline: true },
    { key: 'perks', label: 'Perks List', multiline: true, json: true, hint: '["Flexible MOQ starting at 5 lbs/week", "Custom roast profiles..."]' },
    { key: 'form_heading', label: 'Form Heading' },
  ],
  'gift-cards': [
    { key: 'heading', label: 'Page Heading' },
    { key: 'subheading', label: 'Page Subheading', multiline: true },
    { key: 'amounts', label: 'Preset Amounts', multiline: false, json: true, hint: '[25, 50, 75, 100, 150, 200]' },
    { key: 'custom_heading', label: 'Custom Amount Heading' },
    { key: 'custom_body', label: 'Custom Amount Body', multiline: true },
    { key: 'custom_min', label: 'Minimum Custom Amount ($)' },
    { key: 'custom_max', label: 'Maximum Custom Amount ($)' },
  ],
};

const PAGE_LABELS: Record<PageKey, string> = {
  home: 'Homepage',
  about: 'About',
  contact: 'Contact',
  wholesale: 'Wholesale',
  'gift-cards': 'Gift Cards',
};

export default function AdminContentPage() {
  const [page, setPage] = useState<PageKey>('home');
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  const loadContent = useCallback(async (p: PageKey) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/content?page=${p}`);
      const data = await res.json();
      const map: Record<string, string> = {};
      for (const row of data.content ?? []) map[row.key] = row.value;
      setValues(map);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadContent(page); }, [page, loadContent]);

  async function saveField(key: string) {
    setSaving(key);
    try {
      const res = await fetch('/api/admin/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page, key, value: values[key] ?? '' }),
      });
      if (!res.ok) throw new Error();
      showToast('Saved');
    } catch {
      showToast('Failed to save');
    } finally {
      setSaving(null);
    }
  }

  const fields = PAGE_FIELDS[page];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-stone-900">Site Content</h1>
        <p className="text-sm text-stone-500 mt-1">Edit the text shown on each page of your site. Changes go live immediately.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(PAGE_LABELS) as PageKey[]).map((p) => (
          <button
            key={p}
            onClick={() => setPage(p)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${page === p ? 'bg-stone-900 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}
          >
            {PAGE_LABELS[p]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-stone-400 text-sm py-8 text-center">Loading…</div>
      ) : (
        <div className="space-y-5">
          {fields.map((field) => (
            <div key={field.key} className="bg-white rounded-xl border border-stone-100 p-5">
              <div className="flex items-start justify-between mb-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-stone-700 uppercase tracking-wide block">
                    {field.label}
                    {field.json && <span className="ml-2 text-stone-400 normal-case font-normal">(JSON)</span>}
                  </label>
                  {field.hint && (
                    <p className="text-[11px] text-stone-400 mt-0.5 font-mono">{field.hint}</p>
                  )}
                </div>
                <button
                  onClick={() => saveField(field.key)}
                  disabled={saving === field.key}
                  className="flex-shrink-0 text-xs bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-500 transition-colors disabled:opacity-50"
                >
                  {saving === field.key ? 'Saving…' : 'Save'}
                </button>
              </div>
              {field.multiline ? (
                <textarea
                  value={values[field.key] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                  rows={field.json ? 6 : 3}
                  className={`w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 resize-y transition-colors ${field.json ? 'font-mono text-xs' : ''}`}
                />
              ) : (
                <input
                  type="text"
                  value={values[field.key] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                  className={`w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors ${field.json ? 'font-mono' : ''}`}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
