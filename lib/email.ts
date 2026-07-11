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

// Plus-addressed Reply-To so a customer's email reply can be routed back to
// this submission's thread by the inbound webhook. Only works once
// INBOUND_EMAIL_DOMAIN has a verified Resend receiving domain — see
// .env.local.example for setup steps.
export function inboundReplyAddress(submissionId: string): string | undefined {
  const domain = process.env.INBOUND_EMAIL_DOMAIN;
  if (!domain) return undefined;
  return `submission+${submissionId}@${domain}`;
}
