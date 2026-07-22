// Shared email validation used by every form across the site (client + server).
//
// This is *syntactic* validation: it rejects malformed / obviously-fake input —
// missing "@", no domain, no dot-TLD, illegal characters, whitespace, leading/
// trailing/consecutive dots, over-length — so a submit can pass or fail cleanly.
// It does NOT verify deliverability (that a mailbox actually exists); confirming
// a real inbox requires an external verification service or an SMTP/MX probe,
// which we don't do here.
//
// The pattern is the widely-used HTML5 "email" input regex, tightened to require
// a dotted domain with a 2+ letter TLD (so "a@b" fails but "a@b.co" passes).
const EMAIL_RE =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;

/** Returns true only for a syntactically valid, plausibly-real email address. */
export function isValidEmail(value: string | null | undefined): boolean {
  if (!value) return false;
  const email = value.trim();
  // RFC 5321 caps the whole address at 254 chars; reject leading/trailing dots
  // in the local part and any consecutive dots anywhere.
  if (email.length === 0 || email.length > 254) return false;
  if (email.includes('..')) return false;
  const [local] = email.split('@');
  if (local.startsWith('.') || local.endsWith('.')) return false;
  return EMAIL_RE.test(email);
}
