'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import type { Session } from 'next-auth';
import { XIcon } from '@phosphor-icons/react';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session | null;
}

const shopLinks = [
  { label: 'Coffee', href: '/shop/coffee' },
  { label: 'Coffee Subscriptions', href: '/shop/subscriptions' },
  { label: 'Merch', href: '/shop/merch' },
  { label: 'Gift Cards', href: '/shop/gift-cards' },
];

export function MobileNav({ isOpen, onClose, session }: MobileNavProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const firstName = session?.user?.firstName;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <nav
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl transition-transform duration-300 ease-in-out flex flex-col lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-stone-100">
          <Link href="/" className="flex items-center gap-2" onClick={onClose}>
            <span className="text-xl text-amber-700">◉</span>
            <span className="font-serif text-sm leading-tight">
              <span style={{ color: '#C47878' }}>Coastal</span>
              <br />
              <em className="not-italic" style={{ color: '#CC9818' }}>Granny&apos;s</em>
            </span>
          </Link>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-500 transition-colors"
          >
            <XIcon size={16} weight="bold" />
          </button>
        </div>

        {/* User info strip (logged in only) */}
        {session && (
          <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
            <p className="text-xs font-semibold text-stone-800">
              {session.user.firstName} {session.user.lastName}
            </p>
            <p className="text-xs text-stone-400 truncate">{session.user.email}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2 px-2">
              Shop
            </p>
            <div className="space-y-1">
              {shopLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={onClose}
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname === l.href
                      ? 'bg-amber-50 text-amber-700'
                      : 'text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            {[
              { label: 'Wholesale', href: '/wholesale' },
              { label: 'About', href: '/about' },
              { label: 'Coffee Cart', href: '/coffee-cart' },
              { label: 'Contact', href: '/contact' },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={onClose}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname === l.href
                    ? 'bg-amber-50 text-amber-700'
                    : 'text-stone-700 hover:bg-stone-50'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {session && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2 px-2">
                Account
              </p>
              <Link
                href="/account/dashboard"
                onClick={onClose}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith('/account/dashboard')
                    ? 'bg-amber-50 text-amber-700'
                    : 'text-stone-700 hover:bg-stone-50'
                }`}
              >
                My Account
              </Link>
              {session.user?.role === 'admin' && (
                <Link
                  href="/admin"
                  onClick={onClose}
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname.startsWith('/admin')
                      ? 'bg-amber-50 text-amber-700'
                      : 'text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  Admin Dashboard
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-stone-100">
          {session ? (
            <button
              onClick={() => {
                onClose();
                signOut({ callbackUrl: '/shop/coffee' });
              }}
              className="block w-full text-center px-4 py-3 text-sm font-medium text-red-600 border border-red-200 rounded-full hover:bg-red-50 transition-colors"
            >
              Sign Out
            </button>
          ) : (
            <Link
              href="/account/login"
              onClick={onClose}
              className="block w-full text-center px-4 py-3 text-sm font-medium text-stone-800 border border-stone-200 rounded-full hover:bg-stone-50 transition-colors"
            >
              Log In / Create Account
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}
