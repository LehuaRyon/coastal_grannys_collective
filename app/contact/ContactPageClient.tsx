'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { showToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { PhoneInput } from '@/components/ui/PhoneInput';
import Link from 'next/link';
import { MapPinIcon, ClockIcon, EnvelopeSimpleIcon, PackageIcon, CheckCircleIcon } from '@phosphor-icons/react';

interface Details {
  heading: string;
  subheading: string;
  address: string;
  hours: string;
  email: string;
  phone: string;
}

export default function ContactPageClient({ details }: { details: Details }) {
  const { data: session } = useSession();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    subject: 'General inquiry',
    message: '',
  });

  // Prefill from the logged-in user's account, without clobbering anything they've already typed
  useEffect(() => {
    if (!session?.user) return;
    setForm((f) => ({
      ...f,
      firstName: f.firstName || session.user.firstName || '',
      lastName: f.lastName || session.user.lastName || '',
      email: f.email || session.user.email || '',
    }));
  }, [session]);

  async function handleSubmit() {
    if (!form.firstName || !form.email || !form.message) {
      showToast('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'CONTACT', data: form }),
      });
      if (!res.ok) throw new Error();
      setSubmitted(true);
    } catch {
      showToast('Something went wrong — please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const contactItems = [
    { icon: <MapPinIcon size={20} weight="duotone" color="#C8921A" />, label: 'Roastery', value: details.address },
    { icon: <ClockIcon size={20} weight="duotone" color="#C8921A" />, label: 'Hours', value: details.hours },
    { icon: <EnvelopeSimpleIcon size={20} weight="duotone" color="#C8921A" />, label: 'Email', value: details.email },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 lg:gap-20">
        {/* Info */}
        <div>
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-widest mb-2">
            Get in Touch
          </p>
          <h1 className="font-serif text-4xl text-stone-900 mb-4">{details.heading}</h1>
          <div className="text-stone-500 text-sm leading-relaxed mb-8 max-w-sm space-y-3">
            {details.subheading.split('\n\n').map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          <div className="space-y-5">
            {contactItems.map((d) => (
              <div key={d.label} className="flex items-start gap-4">
                <span className="w-8 flex-shrink-0 mt-0.5">{d.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-0.5">
                    {d.label}
                  </p>
                  {d.label === 'Email' ? (
                    <a href={`mailto:${d.value}`} className="text-sm text-amber-700 hover:underline">{d.value}</a>
                  ) : (
                    <p className="text-sm text-stone-700">{d.value}</p>
                  )}
                </div>
              </div>
            ))}
            <div className="flex items-start gap-4">
              <span className="w-8 flex-shrink-0 mt-0.5"><PackageIcon size={20} weight="duotone" color="#C8921A" /></span>
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-0.5">
                  Wholesale
                </p>
                <Link href="/wholesale" className="text-sm text-amber-700 hover:underline">
                  Visit our wholesale page
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="lg:col-span-3 relative rounded-2xl shadow-sm overflow-hidden p-8" style={{ backgroundColor: '#F5EFE6' }}>
          <div className="absolute inset-0 bg-cover bg-no-repeat" style={{ backgroundImage: 'url(/images/contact-bg.png)', backgroundPosition: 'center center' }} />
          <div className="relative bg-white/80 rounded-xl p-6 backdrop-blur-[2px] mx-14 my-16">
          <h2 className="font-serif text-2xl text-stone-900 mb-6">Send a Message</h2>

          {submitted ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
              <CheckCircleIcon size={36} weight="duotone" color="#16a34a" className="mb-3 mx-auto" />
              <p className="font-medium text-green-800 mb-1">Message sent!</p>
              <p className="text-sm text-green-600">
                Thanks, {form.firstName}! We&apos;ll get back to you at {form.email} within 1 business day.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">First Name *</label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    placeholder="Jane"
                    className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    placeholder="Doe"
                    className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="jane@example.com"
                    className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Phone</label>
                  <PhoneInput
                    value={form.phone}
                    onChange={(v) => setForm({ ...form, phone: v })}
                    placeholder="(555) 000-0000"
                    className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Subject</label>
                <select
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors bg-white"
                >
                  <option>General inquiry</option>
                  <option>Order question</option>
                  <option>Wholesale / trade</option>
                  <option>Feedback</option>
                  <option>Press / media</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Message *</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="How can we help?"
                  rows={5}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors resize-none"
                />
              </div>
              <Button variant="primary" full onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Sending…' : 'Send Message →'}
              </Button>
            </div>
          )}
          </div>
        </div>
      </div>
    </section>
  );
}
