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

// Sent to the BUYER right after purchase, confirming what happened to each
// gift card they bought in this order — sent now, or scheduled for later.
// Handles a mix of both in one order (e.g. one immediate + one birthday
// card) in a single summary rather than separate emails per item.
export async function sendGiftPurchaseReceiptEmail({
  to,
  updates,
}: {
  to: string;
  updates: { recipientEmail: string; amount: number; status: 'sent' | 'scheduled'; deliverOn?: Date }[];
}) {
  const lines = updates.map((u) =>
    u.status === 'sent'
      ? `✓ Your $${u.amount.toFixed(2)} gift card for ${u.recipientEmail} has been sent!`
      : `⏳ Your $${u.amount.toFixed(2)} gift card for ${u.recipientEmail} is scheduled to send on ${u.deliverOn!.toLocaleDateString()} — we'll email you again once it actually goes out.`
  );

  await sendEmail({
    to,
    subject:
      updates.length === 1 && updates[0].status === 'sent'
        ? 'Your gift card has been sent'
        : 'Your gift card purchase update',
    text: lines.join('\n\n'),
  });
}

// Sent to the BUYER when the scheduled-delivery cron actually sends a
// gift card they bought earlier — the follow-up promised by the "we'll
// email you again" line in sendGiftPurchaseReceiptEmail above.
export async function sendGiftDeliveredNotificationEmail({
  to,
  recipientEmail,
  amount,
}: {
  to: string;
  recipientEmail: string;
  amount: number;
}) {
  await sendEmail({
    to,
    subject: 'Your scheduled gift card was just sent',
    text: `Good news — the $${amount.toFixed(2)} gift card you sent to ${recipientEmail} just went out!`,
  });
}

// Sent to the PAYER whenever their order is refunded, partially or fully —
// separate from any gift card side-effects, since a refund can happen on
// an order with no gift card involvement at all.
export async function sendOrderRefundedEmail({
  to,
  customerName,
  amountRefunded,
  orderAmount,
  isFullRefund,
}: {
  to: string;
  customerName: string | null;
  amountRefunded: number;
  orderAmount: number;
  isFullRefund: boolean;
}) {
  const lines = [
    `Hi ${customerName || 'there'},`,
    '',
    isFullRefund
      ? `Your order has been fully refunded — $${amountRefunded.toFixed(2)} back to your original payment method.`
      : `$${amountRefunded.toFixed(2)} of your $${orderAmount.toFixed(2)} order has been refunded to your original payment method.`,
    '',
    "It can take a few business days to show up, depending on your bank. Reply to this email if you have any questions.",
  ];
  await sendEmail({
    to,
    subject: isFullRefund ? "Your order has been refunded" : "Part of your order has been refunded",
    text: lines.join('\n'),
  });
}

// Sent to whoever HOLDS a gift card (its recipientEmail) when a redemption
// against it gets reversed because the order it was used on was refunded —
// they may not be the person who placed that order (e.g. they gave someone
// else the code), so this is the only way they'd know their balance changed.
export async function sendGiftCardBalanceRestoredEmail({
  to,
  code,
  amountRestored,
  newBalance,
}: {
  to: string;
  code: string;
  amountRestored: number;
  newBalance: number;
}) {
  await sendEmail({
    to,
    subject: 'Your gift card balance was restored',
    text: [
      `Good news — $${amountRestored.toFixed(2)} was added back to your gift card ${code}.`,
      `This happened because an order that used this gift card was refunded.`,
      '',
      `New balance: $${newBalance.toFixed(2)}.`,
    ].join('\n'),
  });
}

// Sent to a gift card's recipient when it's voided because the order that
// PURCHASED it was refunded — they need to know before they try to use a
// code that no longer has any balance.
export async function sendGiftCardVoidedEmail({
  to,
  code,
  amountVoided,
}: {
  to: string;
  code: string;
  amountVoided: number;
}) {
  await sendEmail({
    to,
    subject: 'Your gift card has been cancelled',
    text: [
      `The gift card ${code} (was worth $${amountVoided.toFixed(2)}) has been cancelled.`,
      'This happened because the order it was purchased in was refunded to the buyer.',
      '',
      "If you think this is a mistake, reply to this email and we'll sort it out.",
    ].join('\n'),
  });
}

// Sent whenever an order redeems a gift card — for a $0 order this is the
// only receipt at all (Stripe never sees it), and for a partially-covered
// order it's the only place the gift card portion shows up, since Stripe's
// own receipt only covers the card-charged remainder.
export async function sendOrderConfirmationEmail({
  to,
  customerName,
  amountCharged,
  items,
  redemptions,
}: {
  to: string;
  customerName: string | null;
  amountCharged: number;
  items: { name: string; variant: string; price: number; qty: number }[];
  redemptions: { code: string; amount: number }[];
}) {
  const itemLines = items.map(
    (i) => `  ${i.qty}x ${i.name} (${i.variant}) — $${(i.price * i.qty).toFixed(2)}`
  );
  const giftLines = redemptions.length
    ? ['', 'Gift cards applied:', ...redemptions.map((r) => `  ${r.code}: -$${r.amount.toFixed(2)}`)]
    : [];

  const paymentLine =
    amountCharged > 0
      ? `Gift card covered part of this order — $${amountCharged.toFixed(2)} was charged to your card (see Stripe for that receipt).`
      : 'This order was fully covered by gift card balance — nothing was charged to a card.';

  const lines = [
    `Hi ${customerName || 'there'}, your order is confirmed!`,
    '',
    'Order summary:',
    ...itemLines,
    ...giftLines,
    '',
    paymentLine,
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
