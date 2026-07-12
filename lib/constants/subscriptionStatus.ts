// Single source of truth for subscription status → label/color, shared by
// the customer account dashboard, the admin subscriptions list, the admin
// customer detail page, and the admin subscription detail page — kept
// framework-agnostic (no server-only imports) so it's safe in both server
// and client components.
export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  paused: 'Paused',
  past_due: 'Payment issue',
  unpaid: 'Payment issue',
  incomplete: 'Pending',
  incomplete_expired: 'Never activated',
  canceled: 'Cancelled',
};

export const SUBSCRIPTION_STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  paused: 'bg-amber-100 text-amber-700',
  past_due: 'bg-red-100 text-red-700',
  unpaid: 'bg-red-100 text-red-700',
  incomplete: 'bg-stone-100 text-stone-500',
  incomplete_expired: 'bg-stone-100 text-stone-500',
  canceled: 'bg-stone-100 text-stone-500',
};
