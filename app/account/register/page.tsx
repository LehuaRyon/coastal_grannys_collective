'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { showToast } from '@/components/ui/Toast';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.password) {
      showToast('Please fill in all required fields');
      return;
    }
    if (form.password.length < 8) {
      showToast('Password must be at least 8 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      showToast('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error ?? 'Registration failed');
        return;
      }

      // Auto sign-in after successful registration
      const result = await signIn('credentials', {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        showToast('Account created — please sign in');
        router.push('/account/login');
      } else {
        showToast('Account created! Welcome aboard.');
        router.push('/shop/coffee');
        router.refresh();
      }
    } catch {
      showToast('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/shop/coffee" className="inline-block text-3xl text-amber-700 mb-3">
            ◉
          </Link>
          <h1 className="font-serif text-2xl text-stone-900">Create account</h1>
          <p className="text-sm text-stone-500 mt-1">
            Join us for faster checkout &amp; order tracking
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Full Name</label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="Jane Doe"
                className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                required
                autoComplete="name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jane@example.com"
                className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min. 8 characters"
                className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                required
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="••••••••"
                className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                required
                autoComplete="new-password"
              />
            </div>

            <Button variant="primary" full type="submit" disabled={loading}>
              {loading ? 'Creating account…' : 'Create Account'}
            </Button>
          </form>

          <p className="text-center text-xs text-stone-500 mt-5">
            Already have an account?{' '}
            <Link href="/account/login" className="text-amber-700 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
