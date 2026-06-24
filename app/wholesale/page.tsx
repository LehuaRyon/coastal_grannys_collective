import { prisma } from '@/lib/db';
import { WholesalePageClient } from './WholesalePageClient';

const DEFAULTS = {
  heroTitle: 'Wholesale & Trade',
  heroSubtitle: 'Partner with us to bring exceptional, ethically sourced coffee to your café, restaurant, or workplace. We support our wholesale partners every step of the way.',
  whyHeading: 'Why partner with Grounds?',
  whyBody1: 'We work directly with farmers in Ethiopia, Colombia, Guatemala, Kenya, Brazil, and Panama — ensuring quality at every step of the supply chain and fair prices for every producer.',
  whyBody2: 'Our wholesale program includes dedicated account management, barista training, custom blends for your brand, and flexible ordering volumes.',
  perks: [
    'Flexible MOQ starting at 5 lbs/week',
    'Custom roast profiles for your menu',
    'Branded bags with your logo available',
    'Barista training & equipment support',
    'Net-30 payment terms for qualified accounts',
    'Free sample kit before you commit',
  ],
  formHeading: 'Request a Sample Kit',
};

export default async function WholesalePage() {
  const rows = await prisma.siteContent.findMany({ where: { page: 'wholesale' } }).catch(() => []);
  const db: Record<string, string> = {};
  for (const r of rows) db[r.key] = r.value;

  let perks = DEFAULTS.perks;
  if (db.perks) {
    try { perks = JSON.parse(db.perks); } catch { /* use default */ }
  }

  const content = {
    heroTitle: db.hero_title ?? DEFAULTS.heroTitle,
    heroSubtitle: db.hero_subtitle ?? DEFAULTS.heroSubtitle,
    whyHeading: db.why_heading ?? DEFAULTS.whyHeading,
    whyBody1: db.why_body_1 ?? DEFAULTS.whyBody1,
    whyBody2: db.why_body_2 ?? DEFAULTS.whyBody2,
    perks,
    formHeading: db.form_heading ?? DEFAULTS.formHeading,
  };

  return <WholesalePageClient content={content} />;
}
