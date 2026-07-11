import { prisma } from '@/lib/db';
import { GiftCardsPageClient } from './GiftCardsPageClient';
import { GIFT_AMOUNTS } from '@/lib/data/products';

export default async function GiftCardsPage() {
  const rows = await prisma.siteContent.findMany({ where: { page: 'gift-cards' } }).catch(() => []);
  const db: Record<string, string> = {};
  for (const r of rows) db[r.key] = r.value;

  let amounts: number[] = [...GIFT_AMOUNTS];
  if (db.amounts) {
    try { amounts = JSON.parse(db.amounts); } catch { /* use default */ }
  }

  const content = {
    heading: db.heading ?? 'E-Gift Cards',
    subheading: db.subheading ?? 'The perfect gift for any coffee lover. Delivered instantly by email. Valid for everything in the shop including subscriptions.',
    amounts,
    customHeading: db.custom_heading ?? 'Send a Custom Amount',
    customBody: db.custom_body ?? `Choose any amount between $${db.custom_min ?? '20'} and $${db.custom_max ?? '500'}. A personalized digital gift card will be emailed to the recipient instantly.`,
    customMin: parseInt(db.custom_min ?? '20'),
    customMax: parseInt(db.custom_max ?? '500'),
  };

  return <GiftCardsPageClient content={content} />;
}
