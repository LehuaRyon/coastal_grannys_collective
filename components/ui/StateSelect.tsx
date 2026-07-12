'use client';

import { US_STATES } from '@/lib/data/usStates';

interface StateSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

// Dropdown of the 50 states + DC — shows the full name, stores the two-letter
// USPS code, so the saved value is always exactly 2 capital letters.
export function StateSelect({ value, onChange, className }: StateSelectProps) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      <option value="">Select</option>
      {US_STATES.map((s) => (
        <option key={s.code} value={s.code}>
          {s.name}
        </option>
      ))}
    </select>
  );
}
