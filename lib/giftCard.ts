import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db';

// Excludes visually ambiguous characters (0/O, 1/I/L)
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomSegment(length: number): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

function generateCode(): string {
  return `CGC-${randomSegment(4)}-${randomSegment(4)}`;
}

/** Generates a unique gift card code, retrying on the astronomically unlikely collision. */
export async function generateUniqueGiftCardCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const existing = await prisma.giftCard.findUnique({ where: { code }, select: { id: true } });
    if (!existing) return code;
  }
  throw new Error('Could not generate a unique gift card code after 5 attempts');
}

export const GIFT_CARD_ELIGIBLE_TYPES = new Set(['coffee', 'merch']);

export interface GiftCardReservationIntent {
  code: string;
  amount: number;
}

export interface GiftCardReservation {
  code: string;
  giftCardId: string;
  amount: number;
}

/**
 * Atomically reserves (decrements) balance off each requested gift card,
 * returning only what was actually reserved. Guarded with a conditional
 * update (balance >= amount) so concurrent reservations against the same
 * card can never push its balance negative — if the balance has changed
 * since the caller last checked it, the reservation for that code is
 * skipped rather than silently overdrafting.
 *
 * This is the single source of truth for "taking" gift card money, used
 * both by a same-request checkout (fulfillOrder's zero-charge path) and by
 * the reserve-then-settle-later flow for Stripe-charged orders (see
 * GiftCardHold) — in both cases the amount is real the instant this
 * returns, never provisional.
 */
export async function reserveGiftCards(
  intents: GiftCardReservationIntent[],
  context: string
): Promise<GiftCardReservation[]> {
  const reserved: GiftCardReservation[] = [];
  for (const { code, amount } of intents) {
    if (amount <= 0) continue;
    const giftCard = await prisma.giftCard.findUnique({ where: { code } });
    if (!giftCard || giftCard.balance < amount) {
      console.error(`Gift card ${code} has insufficient balance for $${amount} reservation (${context})`);
      continue;
    }
    const result = await prisma.giftCard.updateMany({
      where: { id: giftCard.id, balance: { gte: amount } },
      data: { balance: { decrement: amount } },
    });
    if (result.count === 1) {
      reserved.push({ code, giftCardId: giftCard.id, amount });
    } else {
      console.error(`Gift card ${code} balance changed concurrently — could not reserve $${amount} (${context})`);
    }
  }
  return reserved;
}

/** Restores a reservation's amount back to its gift card — used when a hold is released. */
export async function releaseGiftCardReservation(giftCardId: string, amount: number): Promise<void> {
  await prisma.giftCard.update({
    where: { id: giftCardId },
    data: { balance: { increment: amount } },
  });
}
