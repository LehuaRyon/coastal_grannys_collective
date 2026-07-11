import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { sendGiftCardEmail, sendOrderConfirmationEmail } from '@/lib/email';
import { generateUniqueGiftCardCode } from '@/lib/giftCard';

export interface CompactOrderItem {
  id: string;
  n: string;
  v: string;
  p: number;
  q: number;
}

export interface GiftPurchaseEntry {
  idx: number;
  email: string;
  msg?: string;
}

export interface GiftRedemptionEntry {
  code: string;
  amount: number;
}

export interface FulfillOrderInput {
  /** Real Stripe PaymentIntent id, or a synthetic `giftcard_<id>` id for zero-charge orders. */
  stripePaymentId: string;
  /** Dollars actually charged via card — 0 for orders fully covered by gift card balance. */
  amount: number;
  currency: string;
  customerEmail: string | null;
  customerName: string | null;
  shippingAddress: object | null;
  items: CompactOrderItem[];
  giftPurchases: GiftPurchaseEntry[];
  giftRedemptions: GiftRedemptionEntry[];
  /** Only needed for $0 orders, which skip Stripe's own receipt email entirely. */
  sendConfirmationEmail?: boolean;
}

/**
 * Shared by both the Stripe webhook (card-charged orders) and the
 * gift-card-only checkout path (fully covered orders, no Stripe charge) —
 * one place that creates the Order, redeems any applied gift cards, and
 * issues + emails any gift cards just purchased.
 */
export async function fulfillOrder(input: FulfillOrderInput) {
  const { stripePaymentId, customerEmail, customerName } = input;

  // Idempotency guard — Stripe may retry webhooks
  const existing = await prisma.order.findUnique({ where: { stripePaymentId } });
  if (existing) {
    console.log(`Order already exists for ${stripePaymentId} — skipping`);
    return existing;
  }

  let userId: string | null = null;
  if (customerEmail) {
    const user = await prisma.user.findUnique({ where: { email: customerEmail }, select: { id: true } });
    if (user) userId = user.id;
  }

  // Redeem each applied gift card. Guarded with a conditional update
  // (balance >= amount) so two orders redeeming the same code at once can't
  // push a balance negative. Payment has already succeeded by this point, so
  // a failure here is logged for manual reconciliation rather than failing
  // the whole order.
  const redemptions: { giftCardId: string; amount: number; code: string }[] = [];
  for (const { code, amount } of input.giftRedemptions) {
    if (amount <= 0) continue;
    const giftCard = await prisma.giftCard.findUnique({ where: { code } });
    if (!giftCard || giftCard.balance < amount) {
      console.error(`Gift card ${code} has insufficient balance for $${amount} redemption on order ${stripePaymentId}`);
      continue;
    }
    const result = await prisma.giftCard.updateMany({
      where: { id: giftCard.id, balance: { gte: amount } },
      data: { balance: { decrement: amount } },
    });
    if (result.count === 1) {
      redemptions.push({ giftCardId: giftCard.id, amount, code });
    } else {
      console.error(`Gift card ${code} balance changed concurrently — could not apply $${amount} redemption on order ${stripePaymentId}`);
    }
  }

  const giftByIdx = new Map(input.giftPurchases.map((g) => [g.idx, g]));

  const order = await prisma.order.create({
    data: {
      stripePaymentId,
      amount: input.amount,
      currency: input.currency,
      status: 'paid',
      customerEmail: customerEmail || null,
      customerName: customerName || null,
      shippingAddress: (input.shippingAddress ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      userId,
      items: {
        create: input.items.map((item, idx) => {
          const gift = giftByIdx.get(idx);
          return {
            productId: item.id,
            name: item.n,
            variant: item.v,
            price: item.p,
            qty: item.q,
            giftRecipientEmail: gift?.email ?? null,
            giftMessage: gift?.msg || null,
          };
        }),
      },
      giftCardRedemptions: {
        create: redemptions.map((r) => ({ giftCardId: r.giftCardId, amount: r.amount })),
      },
    },
    include: { items: true },
  });

  console.log(`✅ Order saved — ${stripePaymentId} | $${input.amount} | ${customerEmail}`);

  if (input.sendConfirmationEmail && customerEmail) {
    try {
      await sendOrderConfirmationEmail({
        to: customerEmail,
        customerName,
        items: order.items,
        redemptions,
      });
    } catch (err) {
      console.error(`Failed to send order confirmation email for order ${order.id}:`, err);
    }
  }

  // Issue a redeemable gift card (one per qty unit) for each gift item just
  // purchased, then email the recipient the actual code(s).
  const giftOrderItems = order.items.filter((item) => item.giftRecipientEmail);
  for (const item of giftOrderItems) {
    try {
      const codes: string[] = [];
      for (let i = 0; i < item.qty; i++) {
        const code = await generateUniqueGiftCardCode();
        await prisma.giftCard.create({
          data: {
            code,
            initialBalance: item.price,
            balance: item.price,
            senderName: customerName || customerEmail || null,
            recipientEmail: item.giftRecipientEmail!,
            message: item.giftMessage ?? null,
            purchaseOrderId: order.id,
          },
        });
        codes.push(code);
      }
      await sendGiftCardEmail({
        to: item.giftRecipientEmail!,
        amount: item.price,
        codes,
        fromName: customerName || customerEmail || 'A friend',
        message: item.giftMessage ?? undefined,
      });
    } catch (err) {
      // Don't fail order fulfillment over a delivery failure — the order is
      // already saved and paid; log so it can be manually resent if needed.
      console.error(`Failed to create/send gift card for order item ${item.id}:`, err);
    }
  }

  return order;
}
