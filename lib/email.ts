import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM = process.env.EMAIL_FROM ?? "Coastal Granny's Collective <onboarding@resend.dev>";

export async function sendEmail({
  to,
  subject,
  text,
  replyTo,
}: {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}) {
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not set — skipping email to ${to}: "${subject}"`);
    return;
  }
  const { error } = await resend.emails.send({ from: FROM, to, subject, text, replyTo });
  if (error) throw new Error(error.message);
}

export async function sendGiftCardEmail({
  to,
  amount,
  fromName,
  message,
  codes,
}: {
  to: string;
  amount: number;
  fromName: string;
  message?: string;
  codes: string[];
}) {
  const codeLines =
    codes.length === 1
      ? [`Your gift card code: ${codes[0]}`]
      : [`Your gift card codes ($${amount.toFixed(2)} each):`, ...codes.map((c) => `  ${c}`)];

  const lines = [
    `${fromName} sent you a $${amount.toFixed(2)} Coastal Granny's Collective e-gift card!`,
    '',
    message ? `Their message: "${message}"` : null,
    message ? '' : null,
    ...codeLines,
    '',
    "Good for coffee or merch — enter your code at checkout and we'll apply the balance to your order.",
    '',
    `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/shop/coffee`,
  ].filter((line): line is string => line !== null);

  await sendEmail({
    to,
    subject: `${fromName} sent you a coffee gift card ☕`,
    text: lines.join('\n'),
  });
}

// Only needed for orders fully covered by gift card balance — those never
// hit Stripe, so there's no Stripe receipt email to rely on.
export async function sendOrderConfirmationEmail({
  to,
  customerName,
  items,
  redemptions,
}: {
  to: string;
  customerName: string | null;
  items: { name: string; variant: string; price: number; qty: number }[];
  redemptions: { code: string; amount: number }[];
}) {
  const itemLines = items.map(
    (i) => `  ${i.qty}x ${i.name} (${i.variant}) — $${(i.price * i.qty).toFixed(2)}`
  );
  const giftLines = redemptions.length
    ? ['', 'Gift cards applied:', ...redemptions.map((r) => `  ${r.code}: -$${r.amount.toFixed(2)}`)]
    : [];

  const lines = [
    `Hi ${customerName || 'there'}, your order is confirmed!`,
    '',
    'Order summary:',
    ...itemLines,
    ...giftLines,
    '',
    'This order was fully covered by gift card balance — nothing was charged to a card.',
    '',
    "Thank you! It's being prepared and will ship within 1-2 business days.",
  ];

  await sendEmail({
    to,
    subject: "Your Coastal Granny's Collective order is confirmed",
    text: lines.join('\n'),
  });
}

// Plus-addressed Reply-To so a customer's email reply can be routed back to
// this submission's thread by the inbound webhook. Only works once
// INBOUND_EMAIL_DOMAIN has a verified Resend receiving domain — see
// .env.local.example for setup steps.
export function inboundReplyAddress(submissionId: string): string | undefined {
  const domain = process.env.INBOUND_EMAIL_DOMAIN;
  if (!domain) return undefined;
  return `submission+${submissionId}@${domain}`;
}
