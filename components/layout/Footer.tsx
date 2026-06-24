import Link from 'next/link';
import { InstagramLogoIcon } from '@phosphor-icons/react/dist/ssr';

export function Footer() {
  return (
    <footer className="text-stone-300 mt-24" style={{ backgroundColor: '#4A6035' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 group mb-4">
              <img src="/images/flower-logo.png" alt="" width={44} height={44} className="group-hover:rotate-12 transition-transform duration-300" />
              <span className="font-serif leading-tight text-xl font-bold whitespace-nowrap">
                <span style={{ color: '#F0D4D0' }}>Coastal</span> <em className="not-italic" style={{ color: '#C8921A' }}>Granny&apos;s</em> <em className="not-italic" style={{ color: '#C4A080' }}>Collective</em>
              </span>
            </Link>
            <p className="text-sm text-white/70 leading-relaxed max-w-xs">
              Micro-batch specialty coffee roasted on demand in San Diego, CA. Experimental co-ferments and rare single-origins by Ryan &amp; Kelly McLaughlin.
            </p>
            <div className="flex gap-3 mt-6">
              <a
                href="https://www.instagram.com/coastalgrannys/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full cursor-pointer transition-colors text-base"
                aria-label="Instagram"
              >
                <InstagramLogoIcon size={18} weight="duotone" />
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Shop</h4>
            <div className="space-y-2.5">
              {[
                { label: 'Coffee', href: '/shop/coffee' },
                { label: 'Subscriptions', href: '/shop/subscriptions' },
                { label: 'Merch', href: '/shop/merch' },
                { label: 'Gift Cards', href: '/shop/gift-cards' },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="block text-sm text-white/70 hover:text-white transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Company</h4>
            <div className="space-y-2.5">
              {[
                { label: 'About Us', href: '/about' },
                { label: 'Wholesale', href: '/wholesale' },
                { label: 'Contact', href: '/contact' },
                { label: 'My Account', href: '/account/login' },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="block text-sm text-white/70 hover:text-white transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Help */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Help</h4>
            <div className="space-y-2.5">
              {['Shipping Info', 'Returns & Refunds', 'Brewing Guides', 'FAQ'].map((label) => (
                <span
                  key={label}
                  className="block text-sm text-white/70 hover:text-white transition-colors cursor-pointer"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-white/50">
            {`© ${new Date().getFullYear()} Coastal Granny's Collective. All rights reserved.`}
          </p>
          <p className="text-xs text-white/50">
            <Link href="/policies/privacy-policy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            {' · '}
            <Link href="/policies/terms-of-service" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
