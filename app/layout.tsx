import type { Metadata } from 'next';
import { Nunito, Caveat } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { Toast } from '@/components/ui/Toast';
import { Providers } from '@/components/Providers';

const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const caveat = Caveat({
  variable: '--font-caveat',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: "Coastal Granny's Collective — Micro-Batch Specialty Coffee",
  description:
    'Hand-roasted specialty coffee by Ryan & Kelly McLaughlin in San Diego, CA. Experimental co-ferments, rare single-origins, and pop-up experiences.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${nunito.variable} ${caveat.variable}`}>
      <body className="font-sans">
        <Providers>
          <Header />
          <main className="pt-16">{children}</main>
          <Footer />
          <CartDrawer />
          <Toast />
        </Providers>
      </body>
    </html>
  );
}
