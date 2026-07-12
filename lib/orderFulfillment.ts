import { Prisma } from '@prisma/client';
import type Stripe from 'stripe';
import { prisma } from '@/lib/db';
import {
  sendGiftCardEmail,
  sendGiftPurchaseReceiptEmail,
  sendOrderConfirmationEmail,
  sendOrderRefundedEmail,
  sendGiftCardBalanceRestoredEmail,
  sendGiftCardVoidedEmail,
} from '@/lib/email';
import { generateUniqueGiftCardCode, reserveGiftCards } from '@/lib/giftCard';

/**
 * Finds an Order by a real Stripe PaymentIntent id — checking both
 * stripePaymentId (the real PI id for one-time orders) and stripeChargeId
 * (where it lives instead for subscription-cycle orders, whose
 * stripePaymentId is a synthetic sub_invoice_<id> idempotency key, not a
 * real charge). Refund and dispute webhook handlers need this: Stripe only
 * gives them the PaymentIntent id, and a subscription order can't be found
 * by that id in stripePaymentId alone.
 */
export async function findOrderByPaymentIntentId(paymentIntentId: string) {
  return prisma.order.findFirst({
    where: { OR: [{ stripePaymentId: paymentIntentId }, { stripeChargeId: paymentIntentId }] },
  });
}

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
  /** ISO date string — deliver the code later (e.g. someone's birthday) instead of right away. */
  deliverOn?: string;
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
  /**
   * True when giftRedemptions amounts were already atomically reserved
   * before this call (via reserveGiftCards + a GiftCardHold row per code,
   * tied to this stripePaymentId) — skip the balance check/decrement here
   * and just record the redemption rows, then mark those holds consumed.
   * Used by the Stripe-charged checkout path (reserved at PaymentIntent
   * creation, settled here by the webhook or the recovery cron) so the
   * charge amount the customer saw is never stale by the time this runs.
   * The zero-charge path leaves this false and self-reserves here, since
   * there's no time gap between computing the discount and creating the
   * order — see app/api/create-payment-intent/route.ts.
   */
  holdsAlreadyReserved?: boolean;
}

/**
 * Builds a fulfillOrder input from a succeeded PaymentIntent's metadata —
 * shared by the webhook's normal payment_intent.succeeded handler and the
 * release-stale-gift-card-holds cron's recovery path (a succeeded payment
 * whose webhook never fired, e.g. the endpoint was unreachable or, locally,
 * `stripe listen` wasn't running). Always sets holdsAlreadyReserved: true —
 * any gift card redemptions here were reserved at PaymentIntent-creation
 * time, so this only ever settles existing holds, never re-decrements.
 */
export function buildFulfillOrderInputFromPaymentIntent(pi: Stripe.PaymentIntent): FulfillOrderInput {
  const { customerEmail, customerName, shippingAddress, items, giftDetails, redeemGiftCards } = pi.metadata;

  let parsedAddress: object | null = null;
  try {
    parsedAddress = shippingAddress ? JSON.parse(shippingAddress) : null;
  } catch {
    console.warn('Could not parse shippingAddress metadata');
  }

  let parsedItems: CompactOrderItem[] = [];
  try {
    parsedItems = items ? JSON.parse(items) : [];
  } catch {
    console.warn('Could not parse items metadata');
  }

  let giftPurchases: GiftPurchaseEntry[] = [];
  try {
    giftPurchases = giftDetails ? JSON.parse(giftDetails) : [];
  } catch {
    console.warn('Could not parse giftDetails metadata');
  }

  let giftRedemptions: GiftRedemptionEntry[] = [];
  try {
    giftRedemptions = redeemGiftCards ? JSON.parse(redeemGiftCards) : [];
  } catch {
    console.warn('Could not parse redeemGiftCards metadata');
  }

  return {
    stripePaymentId: pi.id,
    amount: pi.amount / 100,
    currency: pi.currency,
    customerEmail: customerEmail || null,
    customerName: customerName || null,
    shippingAddress: parsedAddress,
    items: parsedItems,
    giftPurchases,
    giftRedemptions,
    holdsAlreadyReserved: true,
  };
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

  // Redeem each applied gift card.
  let redemptions: { giftCardId: string; amount: number; code: string }[] = [];
  if (input.holdsAlreadyReserved) {
    // Trust the DB's own pending holds for this paymentIntentId as the sole
    // source of truth for what to redeem — NOT input.giftRedemptions, which
    // is only PaymentIntent metadata and could in principle be stale or
    // manipulated. If a hold isn't there (already consumed by a retried
    // webhook, or genuinely never existed), nothing is redeemed for it —
    // this can never double-spend or fabricate a redemption with no
    // matching reservation.
    const holds = await prisma.giftCardHold.findMany({
      where: { paymentIntentId: stripePaymentId, status: 'pending' },
    });
    redemptions = holds.map((h) => ({ giftCardId: h.giftCardId, amount: h.amount, code: h.code }));
    if (holds.length > 0) {
      await prisma.giftCardHold.updateMany({
        where: { id: { in: holds.map((h) => h.id) } },
        data: { status: 'consumed', resolvedAt: new Date() },
      });
    }
  } else {
    // No prior reservation (zero-charge checkout path) — reserve now.
    // Guarded so two orders redeeming the same code at once can't push a
    // balance negative; a failure here is logged for manual reconciliation
    // rather than failing the whole order, since payment (if any) already
    // succeeded by this point.
    redemptions = await reserveGiftCards(input.giftRedemptions, `order ${stripePaymentId}`);
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
            giftDeliverOn: gift?.deliverOn ? new Date(gift.deliverOn) : null,
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

  // Any order that redeemed a gift card gets a summary email — not just $0
  // orders. Stripe's own receipt only covers the card-charged remainder, so
  // without this a partially-covered order (some gift card + some card
  // charge) never sees a breakdown of the gift card portion anywhere.
  if (redemptions.length > 0 && customerEmail) {
    try {
      await sendOrderConfirmationEmail({
        to: customerEmail,
        customerName,
        amountCharged: input.amount,
        items: order.items,
        redemptions,
      });
    } catch (err) {
      console.error(`Failed to send order confirmation email for order ${order.id}:`, err);
    }
  }

  // Issue a redeemable gift card (one per qty unit) for each gift item just
  // purchased. Every card starts undelivered; immediate ones default
  // deliverOn to "now" (not null) so if the send fails right here, the same
  // daily cron that handles genuinely scheduled (e.g. birthday) deliveries
  // picks it up and retries automatically — one retry path for both cases,
  // and a stuck one surfaces via the cron's overdue alert instead of just
  // sitting silently undelivered.
  const giftOrderItems = order.items.filter((item) => item.giftRecipientEmail);
  const now = new Date();
  const purchaseUpdates: { recipientEmail: string; amount: number; status: 'sent' | 'scheduled'; deliverOn?: Date }[] = [];

  for (const item of giftOrderItems) {
    const scheduled = item.giftDeliverOn && item.giftDeliverOn > now ? item.giftDeliverOn : null;
    const codes: string[] = [];
    const createdIds: string[] = [];
    try {
      for (let i = 0; i < item.qty; i++) {
        const code = await generateUniqueGiftCardCode();
        const giftCard = await prisma.giftCard.create({
          data: {
            code,
            initialBalance: item.price,
            balance: item.price,
            senderName: customerName || customerEmail || null,
            recipientEmail: item.giftRecipientEmail!,
            message: item.giftMessage ?? null,
            purchaseOrderId: order.id,
            deliverOn: scheduled ?? now,
            delivered: false,
          },
        });
        codes.push(code);
        createdIds.push(giftCard.id);
      }
    } catch (err) {
      console.error(`Failed to create gift card(s) for order item ${item.id}:`, err);
      continue;
    }

    if (scheduled) {
      // Buyer gets told it's scheduled now; the cron sends a follow-up
      // (sendGiftDeliveredNotificationEmail) when it actually goes out.
      purchaseUpdates.push({ recipientEmail: item.giftRecipientEmail!, amount: item.price, status: 'scheduled', deliverOn: scheduled });
      continue;
    }

    try {
      await sendGiftCardEmail({
        to: item.giftRecipientEmail!,
        amount: item.price,
        codes,
        fromName: customerName || customerEmail || 'A friend',
        message: item.giftMessage ?? undefined,
      });
      await prisma.giftCard.updateMany({ where: { id: { in: createdIds } }, data: { delivered: true } });
      purchaseUpdates.push({ recipientEmail: item.giftRecipientEmail!, amount: item.price, status: 'sent' });
    } catch (err) {
      // Leave delivered:false — deliverOn is already "now" so the next cron
      // run retries this, and a persistent failure trips the overdue alert.
      // Not included in purchaseUpdates below — no premature "sent" claim,
      // and no need to alarm the buyer before the automatic retry has a
      // chance to succeed.
      console.error(`Failed to send gift card email for order item ${item.id}:`, err);
    }
  }

  if (purchaseUpdates.length > 0 && customerEmail) {
    try {
      await sendGiftPurchaseReceiptEmail({ to: customerEmail, updates: purchaseUpdates });
    } catch (err) {
      console.error(`Failed to send gift purchase receipt to ${customerEmail}:`, err);
    }
  }

  return order;
}

/**
 * Sets an order's status. "refunded" reconciles gift card balances — but
 * only on a genuine transition into a FULLY refunded state (guarded so
 * retried webhooks or re-saving the same status in admin can't
 * double-credit):
 *  - Gift cards this order REDEEMED get their spent amount credited back,
 *    and whoever holds that card (its recipientEmail — not necessarily the
 *    person who placed this order) is emailed about the restored balance.
 *  - Gift cards this order PURCHASED are voided (balance zeroed) — the
 *    buyer got their money back, so the card shouldn't still be spendable —
 *    and the card's recipient is emailed that it's been cancelled.
 *    Known limitation: if the recipient already spent part of it before the
 *    refund, that spent portion isn't clawed back from wherever it was
 *    used — only the remaining balance is voided.
 * "partially_refunded" just records the amount — gift card money never
 * touched Stripe, so a partial refund of the card-charged portion doesn't
 * imply anything about the gift card side of the order.
 * Either way, the order's own customer is emailed whenever the refunded
 * amount genuinely changes (not on a retried webhook delivering the same
 * amount again) — a refund can happen with no gift card involved at all.
 * Toggling status away from "refunded" and back again re-runs the
 * reconciliation, which would double-credit; that's an accepted edge case
 * for a rare manual admin correction, not something webhooks ever do.
 */
export async function updateOrderStatus(orderId: string, newStatus: string, refundedAmount?: number) {
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { giftCardRedemptions: { include: { giftCard: true } }, giftCardsPurchased: true },
    });
    if (!order) return null;

    const restored: { recipientEmail: string; code: string; amount: number; newBalance: number }[] = [];
    const voided: { recipientEmail: string; code: string; amount: number }[] = [];

    if (newStatus === 'refunded' && order.status !== 'refunded') {
      for (const r of order.giftCardRedemptions) {
        const updated = await tx.giftCard.update({
          where: { id: r.giftCardId },
          data: { balance: { increment: r.amount } },
        });
        restored.push({ recipientEmail: updated.recipientEmail, code: updated.code, amount: r.amount, newBalance: updated.balance });
      }
      for (const gc of order.giftCardsPurchased) {
        if (gc.balance > 0) {
          voided.push({ recipientEmail: gc.recipientEmail, code: gc.code, amount: gc.balance });
        }
        await tx.giftCard.update({ where: { id: gc.id }, data: { balance: 0 } });
      }
    }

    const isRefundStatus = newStatus === 'refunded' || newStatus === 'partially_refunded';
    const newRefundedAmount = isRefundStatus ? (refundedAmount ?? order.amount) : order.refundedAmount;
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: { status: newStatus, refundedAmount: newRefundedAmount },
    });

    return {
      order: updatedOrder,
      restored,
      voided,
      // Only notify the payer if this is a genuinely new refund amount —
      // not a retried webhook re-delivering the same amount_refunded.
      notifyPayer: isRefundStatus && newRefundedAmount !== order.refundedAmount,
    };
  });

  if (!result) return null;
  const { order, restored, voided, notifyPayer } = result;

  if (notifyPayer && order.customerEmail) {
    try {
      await sendOrderRefundedEmail({
        to: order.customerEmail,
        customerName: order.customerName,
        amountRefunded: order.refundedAmount ?? 0,
        orderAmount: order.amount,
        isFullRefund: order.status === 'refunded',
      });
    } catch (err) {
      console.error(`Failed to send refund notification for order ${order.id}:`, err);
    }
  }

  for (const r of restored) {
    try {
      await sendGiftCardBalanceRestoredEmail({ to: r.recipientEmail, code: r.code, amountRestored: r.amount, newBalance: r.newBalance });
    } catch (err) {
      console.error(`Failed to send balance-restored email for gift card ${r.code}:`, err);
    }
  }

  for (const v of voided) {
    try {
      await sendGiftCardVoidedEmail({ to: v.recipientEmail, code: v.code, amountVoided: v.amount });
    } catch (err) {
      console.error(`Failed to send voided-card email for gift card ${v.code}:`, err);
    }
  }

  return order;
}
