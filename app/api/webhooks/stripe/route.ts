import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

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
          await prisma.order.updateMany({
            where: { stripePaymentId: charge.payment_intent as string },
            data: { status: 'refunded' },
          });
          console.log(`Order refunded for PaymentIntent ${charge.payment_intent}`);
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
  // Avoid duplicate order creation if Stripe retries the webhook
  const existing = await prisma.order.findUnique({
    where: { stripePaymentId: pi.id },
  });
  if (existing) {
    console.log(`Order already exists for PaymentIntent ${pi.id} — skipping`);
    return;
  }

  // Parse metadata stored when the PaymentIntent was created
  const { customerEmail, customerName, shippingAddress, items } = pi.metadata;

  let parsedAddress: object | null = null;
  try {
    parsedAddress = shippingAddress ? JSON.parse(shippingAddress) : null;
  } catch {
    console.warn('Could not parse shippingAddress metadata');
  }

  interface CompactItem {
    id: string;
    n: string;
    v: string;
    p: number;
    q: number;
  }

  let parsedItems: CompactItem[] = [];
  try {
    parsedItems = items ? JSON.parse(items) : [];
  } catch {
    console.warn('Could not parse items metadata');
  }

  // Link to an existing account if the email matches a registered user
  let userId: string | null = null;
  if (customerEmail) {
    const user = await prisma.user.findUnique({ where: { email: customerEmail }, select: { id: true } });
    if (user) userId = user.id;
  }

  await prisma.order.create({
    data: {
      stripePaymentId: pi.id,
      amount: pi.amount / 100, // convert cents → dollars
      currency: pi.currency,
      status: 'paid',
      customerEmail: customerEmail || null,
      customerName: customerName || null,
      shippingAddress: (parsedAddress ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      userId,
      items: {
        create: parsedItems.map((item) => ({
          productId: item.id,
          name: item.n,
          variant: item.v,
          price: item.p,
          qty: item.q,
        })),
      },
    },
  });

  console.log(
    `✅ Order saved — PaymentIntent ${pi.id} | $${pi.amount / 100} | ${customerEmail}`
  );
}
