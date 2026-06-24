'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { showToast } from '@/components/ui/Toast';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/shop/coffee';

  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.password) {
      showToast('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const result = await signIn('credentials', {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        showToast('Invalid email or password');
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/shop/coffee" className="inline-block text-3xl text-amber-700 mb-3">
            ◉
          </Link>
          <h1 className="font-serif text-2xl text-stone-900">Welcome back</h1>
          <p className="text-sm text-stone-500 mt-1">Sign in to your Grounds account</p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="••••••••"
                className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                required
                autoComplete="current-password"
              />
            </div>

            <Button variant="primary" full type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-stone-100" />
            <span className="text-xs text-stone-400">or</span>
            <div className="flex-1 h-px bg-stone-100" />
          </div>

          <Button variant="outline" full onClick={() => router.push('/shop/coffee')}>
            Continue as Guest
          </Button>

          <p className="text-center text-xs text-stone-500 mt-5">
            Don&apos;t have an account?{' '}
            <Link href="/account/register" className="text-amber-700 hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
