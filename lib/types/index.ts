export interface Coffee {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  origin: string;
  region?: string;
  process: string;
  elevation: string;
  roast: 'Light' | 'Medium' | 'Medium-Dark' | 'Dark';
  notes: string[];
  prices: Record<string, number>;
  gradient: string;
  description: string;
  roastOptions: string[];
  inStock: boolean;
  featured: boolean;
  badge?: string;
  badgeClass?: 'badge-gold' | 'badge-red';
  hasImage?: boolean;
  salesRank: number;
}

export interface Subscription {
  id: string;
  name: string;
  freq: string;
  desc: string;
  features: string[];
  roastOptions: string[];
  price: number;
  period: string;
  gradient: string;
  badge: string | null;
  inStock: boolean;
}

export interface Merch {
  id: string;
  slug: string;
  name: string;
  icon: string;
  desc: string;
  price: number;
  options: string[] | null;
  gradient: string;
  hasImage?: boolean;
  hasFrontBack?: boolean;
}

export interface CartItem {
  key: string;
  id: string;
  type: 'coffee' | 'sub' | 'merch' | 'gift';
  name: string;
  variant: string;
  price: number;
  gradient: string;
  icon?: string;
  slug?: string;
  hasImage?: boolean;
  hasFrontBack?: boolean;
  giftRecipientEmail?: string;
  giftMessage?: string;
  qty: number;
}

export type RoastFilter = 'all' | 'light' | 'light-medium' | 'medium' | 'medium-dark' | 'dark';
