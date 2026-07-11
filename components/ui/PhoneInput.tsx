'use client';

import type { InputHTMLAttributes } from 'react';

interface PhoneInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value: string;
  onChange: (value: string) => void;
}

// Progressively masks digits as (XXX) XXX-XXXX while typing — no need for the
// user to type parentheses, dashes, or a country code themselves.
function formatPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  // Drop a pasted US country code (e.g. "+1 619 555 0100") so it doesn't shift the mask
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length < 4) return `(${digits}`;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function PhoneInput({ value, onChange, ...props }: PhoneInputProps) {
  return (
    <input
      type="tel"
      inputMode="tel"
      value={value}
      onChange={(e) => onChange(formatPhone(e.target.value))}
      {...props}
    />
  );
}
