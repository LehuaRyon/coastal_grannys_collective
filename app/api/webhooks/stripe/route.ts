import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { fulfillOrder, updateOrderStatus, CompactOrderItem, GiftPurchaseEntry, GiftRedemptionEntry } from '@/lib/orderFulfillment';

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key);
}

export async function POST(request: NextRequest) {
  const body = await request.text(); // raw body required for signature verification
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set — add it to .env.local');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  // Verify the event came from Stripe (not a spoofed request)
  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    console.error('Webhook signature verification failed:', message);
    return NextResponse.json({ error: `Webhook error: ${message}` }, { status: 400 });
  }

  // Handle events
  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(pi);
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.warn(`Payment failed for PaymentIntent ${pi.id}:`, pi.last_payment_error?.message);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        if (charge.payment_intent) {
          const order = await prisma.order.findUnique({
            where: { stripePaymentId: charge.payment_intent as string },
            select: { id: true },
          });
          if (order) {
            // Gift card money never touches Stripe, so a refund only implies
            // anything about gift card balances once the ENTIRE card-charged
            // portion has been refunded — a partial refund (e.g. $5 back for
            // a shipping issue on a $48 order) shouldn't restore/void the
            // full amount. amount_refunded is cumulative, so this correctly
            // detects "eventually fully refunded" across multiple partials.
            const isFullRefund = charge.amount_refunded >= charge.amount;
            const refundedDollars = charge.amount_refunded / 100;
            await updateOrderStatus(order.id, isFullRefund ? 'refunded' : 'partially_refunded', refundedDollars);
            console.log(
              `Order ${isFullRefund ? 'refunded' : 'partially refunded'} ($${refundedDollars}) for PaymentIntent ${charge.payment_intent}`
            );
          }
        }
        break;
      }

      default:
        // Unhandled event types are fine — Stripe sends many we don't need
        break;
    }
  } catch (err) {
    console.error(`Error handling Stripe event ${event.type}:`, err);
    // Return 500 so Stripe retries the webhook
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentSucceeded(pi: Stripe.PaymentIntent) {
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

  await fulfillOrder({
    stripePaymentId: pi.id,
    amount: pi.amount / 100, // convert cents → dollars
    currency: pi.currency,
    customerEmail: customerEmail || null,
    customerName: customerName || null,
    shippingAddress: parsedAddress,
    items: parsedItems,
    giftPurchases,
    giftRedemptions,
  });
}
