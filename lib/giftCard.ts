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
