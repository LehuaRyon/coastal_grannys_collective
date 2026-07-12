import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key);
}

interface ShippingAddressInput {
  address: string;
  apt?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

// Creates a real, recurring Stripe Subscription — unlike the one-time cart
// checkout (which never creates a Stripe Customer), this requires one,
// since Subscriptions are billed against a Customer indefinitely. Requires
// login for the same reason: self-service pause/cancel later needs a
// reliable owner to check against, which a guest email can't provide
// (anyone could type someone else's email and cancel their subscription).
//
// No pre-synced Stripe Price catalog — the recurring price itself is built
// inline via price_data from this Product's own price + structured
// billingInterval/billingIntervalCount. Unlike Checkout Sessions, the
// Subscriptions API does require a real Product id (not inline product
// data) for price_data.product, so one is created lazily on first signup
// and cached on Product.stripeProductId for every later subscriber to reuse.
//
// payment_behavior: 'default_incomplete' is Stripe's documented pattern for
// confirming the first payment with a custom Elements form instead of
// Stripe Checkout — the client_secret comes from the invoice's
// confirmation_secret (this API version's PaymentIntent client_secret
// accessor) and is confirmed the exact same way as the one-time checkout's
// PaymentIntent (see StripePaymentForm, reused here for that reason).
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'You must be logged in to subscribe' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const productId = typeof body?.productId === 'string' ? body.productId : '';
  const roastPreference = typeof body?.roastPreference === 'string' ? body.roastPreference : null;
  const shippingAddress: ShippingAddressInput | null = body?.shippingAddress ?? null;

  if (!productId) {
    return NextResponse.json({ error: 'Missing product' }, { status: 400 });
  }
  if (!shippingAddress?.address || !shippingAddress?.city || !shippingAddress?.state || !shippingAddress?.zip) {
    return NextResponse.json({ error: 'A complete shipping address is required' }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.type !== 'subscription') {
    return NextResponse.json({ error: 'Subscription plan not found' }, { status: 404 });
  }
  if (!product.inStock) {
    return NextResponse.json({ error: 'This plan is currently unavailable' }, { status: 400 });
  }
  if (!product.billingInterval) {
    return NextResponse.json({ error: 'This plan is not yet configured for billing — contact us' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  const stripe = getStripeClient();

  let stripeCustomerId = user.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || undefined,
      metadata: { appUserId: user.id },
    });
    stripeCustomerId = customer.id;
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId } });
  }

  let stripeProductId = product.stripeProductId;
  if (!stripeProductId) {
    const stripeProduct = await stripe.products.create({
      name: product.name,
      metadata: { appProductId: product.id },
    });
    stripeProductId = stripeProduct.id;
    await prisma.product.update({ where: { id: product.id }, data: { stripeProductId } });
  }

  let stripeSubscription: Stripe.Subscription;
  try {
    stripeSubscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [
        {
          price_data: {
            currency: 'usd',
            product: stripeProductId,
            unit_amount: Math.round(product.price * 100),
            recurring: {
              interval: product.billingInterval as Stripe.Price.Recurring.Interval,
              interval_count: product.billingIntervalCount ?? 1,
            },
          },
        },
      ],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription', payment_method_types: ['card'] },
      // confirmation_secret does NOT come along for free with a plain
      // 'latest_invoice' expand, even though it reads like a normal field —
      // it needs its own explicit nested expand path, confirmed by testing
      // directly against the account's API version (2026-05-27.dahlia).
      expand: ['latest_invoice.confirmation_secret'],
      metadata: {
        appUserId: user.id,
        productId: product.id,
        roastPreference: roastPreference ?? '',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not start subscription';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const dbSubscription = await prisma.subscription.create({
    data: {
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId,
      userId: user.id,
      productId: product.id,
      productName: product.name,
      price: product.price,
      freq: product.freq ?? '',
      roastPreference,
      shippingAddress: shippingAddress as unknown as object,
      status: stripeSubscription.status,
    },
  });

  const invoice = stripeSubscription.latest_invoice;
  const clientSecret = typeof invoice !== 'string' ? invoice?.confirmation_secret?.client_secret : null;

  if (!clientSecret) {
    return NextResponse.json({ error: 'Could not prepare payment for this subscription' }, { status: 500 });
  }

  return NextResponse.json({ clientSecret, subscriptionId: dbSubscription.id });
}
