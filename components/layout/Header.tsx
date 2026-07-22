'use client';

import { useState, useEffect, useRef } from 'react';
import { ShoppingBagIcon, CaretDownIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useCartStore } from '@/lib/store/cart';
import { MobileNav } from './MobileNav';

const shopLinks = [
  { label: 'Coffee', href: '/shop/coffee' },
  { label: 'Coffee Subscriptions', href: '/shop/subscriptions' },
  { label: 'Merch', href: '/shop/merch' },
  { label: 'Gift Cards', href: '/shop/gift-cards' },
];

const navLinks = [
  { label: 'Wholesale', href: '/wholesale' },
  { label: 'About', href: '/about' },
  { label: 'Coffee Cart', href: '/coffee-cart' },
  { label: 'Contact', href: '/contact' },
];

export function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [shopOpen, setShopOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const shopRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const { toggleCart, count } = useCartStore();
  const cartCount = count();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Bounce the cart icon once whenever an item gets added
  const [cartPulse, setCartPulse] = useState(false);
  const prevCartCount = useRef(cartCount);
  useEffect(() => {
    if (mounted && cartCount > prevCartCount.current) {
      setCartPulse(true);
      const t = setTimeout(() => setCartPulse(false), 500);
      prevCartCount.current = cartCount;
      return () => clearTimeout(t);
    }
    prevCartCount.current = cartCount;
  }, [cartCount, mounted]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (shopRef.current && !shopRef.current.contains(e.target as Node)) setShopOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    setShopOpen(false);
    setUserOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  const isShopActive = pathname.startsWith('/shop');
  const firstName = session?.user?.firstName;

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          scrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm' : 'bg-white'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            className="lg:hidden p-2 -ml-2 flex flex-col gap-1.5 group"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <span className="block w-5 h-0.5 bg-stone-800 transition-all group-hover:w-6" />
            <span className="block w-6 h-0.5 bg-stone-800" />
            <span className="block w-4 h-0.5 bg-stone-800 transition-all group-hover:w-6" />
          </button>

          <Link href="/" className="flex items-center gap-2.5 group">
            <img src="/images/flower-logo.png" alt="" width={44} height={44} className="group-hover:rotate-12 transition-transform duration-300" />
            <span className="font-serif leading-tight text-lg font-bold">
              <span style={{ color: '#C47878' }}>Coastal</span>
              <br />
              <em className="not-italic" style={{ color: '#CC9818' }}>Granny&apos;s</em>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            <div
              ref={shopRef}
              className="relative"
              onMouseEnter={() => setShopOpen(true)}
              onMouseLeave={() => setShopOpen(false)}
            >
              <button
                onClick={() => setShopOpen((p) => !p)}
                className={`group relative flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isShopActive
                    ? 'text-amber-700'
                    : 'text-stone-700 hover:text-stone-900'
                }`}
              >
                Shop
                <CaretDownIcon size={12} weight="bold" className={`transition-transform ${shopOpen ? 'rotate-180' : ''}`} />
                <span
                  className={`absolute left-4 right-4 -bottom-0.5 h-0.5 bg-amber-700 rounded-full origin-left transition-transform duration-300 ${
                    isShopActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                  }`}
                />
              </button>

              {shopOpen && (
                <div className="absolute top-full left-0 pt-1 w-52 z-50">
                  <div className="bg-white rounded-xl shadow-xl border border-stone-100 py-1">
                    {shopLinks.map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        className={`block px-4 py-2.5 text-sm transition-colors ${
                          pathname === l.href
                            ? 'text-amber-700 bg-amber-50'
                            : 'text-stone-700 hover:bg-stone-50'
                        }`}
                      >
                        {l.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`group relative px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  pathname === l.href
                    ? 'text-amber-700'
                    : 'text-stone-700 hover:text-stone-900'
                }`}
              >
                {l.label}
                <span
                  className={`absolute left-4 right-4 -bottom-0.5 h-0.5 bg-amber-700 rounded-full origin-left transition-transform duration-300 ${
                    pathname === l.href ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                  }`}
                />
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleCart}
              className="relative p-2 text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors"
              aria-label="Cart"
            >
              <ShoppingBagIcon size={20} weight="duotone" className={cartPulse ? 'animate-cart-pulse' : ''} />
              {mounted && cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center bg-amber-700 text-white text-[10px] font-bold rounded-full">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>

            {session ? (
              <div
                ref={userRef}
                className="relative hidden sm:block"
                onMouseEnter={() => setUserOpen(true)}
                onMouseLeave={() => setUserOpen(false)}
              >
                <button
                  onClick={() => setUserOpen((p) => !p)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-stone-200 hover:bg-stone-50 transition-colors"
                >
                  <span className="w-6 h-6 rounded-full bg-amber-700 text-white text-xs flex items-center justify-center font-semibold">
                    {firstName?.[0]?.toUpperCase() ?? '?'}
                  </span>
                  <span className="text-sm text-stone-700 font-medium">{firstName}</span>
                  <CaretDownIcon size={12} weight="bold" className={`text-stone-400 transition-transform ${userOpen ? 'rotate-180' : ''}`} />
                </button>

                {userOpen && (
                  <div className="absolute top-full right-0 pt-1 w-48 z-50">
                    <div className="bg-white rounded-xl shadow-xl border border-stone-100 py-1">
                      <div className="px-4 py-2.5 border-b border-stone-100">
                        <p className="text-xs font-semibold text-stone-900">
                          {session.user.firstName} {session.user.lastName}
                        </p>
                        <p className="text-xs text-stone-400 truncate">{session.user.email}</p>
                      </div>
                      <Link
                        href="/account/dashboard"
                        className="block px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                      >
                        My Account
                      </Link>
                      {session.user.role === 'admin' && (
                        <Link
                          href="/admin"
                          className="block px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                        >
                          Admin Dashboard
                        </Link>
                      )}
                      <button
                        onClick={() => signOut({ callbackUrl: '/shop/coffee' })}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Not logged in */
              <Link
                href="/account/login"
                className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-medium text-stone-800 border border-stone-200 rounded-full hover:bg-stone-50 transition-colors"
              >
                Log In
              </Link>
            )}
          </div>
        </div>
      </header>

      <MobileNav isOpen={mobileOpen} onClose={() => setMobileOpen(false)} session={session} />
    </>
  );
}
