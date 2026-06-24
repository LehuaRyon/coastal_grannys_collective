import ContactPageClient from './ContactPageClient';
import { prisma } from '@/lib/db';

export default async function ContactPage() {
  const rows = await prisma.siteContent.findMany({ where: { page: 'contact' } }).catch(() => []);
  const content: Record<string, string> = {};
  for (const row of rows) content[row.key] = row.value;

  const details = {
    address: content.address ?? 'San Diego, CA 92104',
    hours: content.hours ?? 'By appointment — roasted fresh to order',
    email: content.email ?? 'coastalgrannys@gmail.com',
    phone: content.phone ?? '',
    heading: content.heading ?? 'Find Your Local Roaster',
    subheading: content.subheading ?? "San Diego-based micro-roasting by appointment. Ryan roasts on demand — reach out to place an order or catch Kelly and the cart at upcoming pop-ups around SD.",
  };

  return <ContactPageClient details={details} />;
}
