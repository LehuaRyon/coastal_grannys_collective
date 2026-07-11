import type { KeyboardEvent } from 'react';

// <input type="number"> still lets the browser accept "e"/"E" (scientific
// notation) and +/- despite looking like a plain numeric field. Block those
// keys so only digits (and, where allowed, a single decimal point) get through.
export function blockInvalidNumberKey(e: KeyboardEvent<HTMLInputElement>, allowDecimal = false) {
  const blocked = allowDecimal ? ['e', 'E', '+', '-'] : ['e', 'E', '+', '-', '.'];
  if (blocked.includes(e.key)) e.preventDefault();
}

// US ZIP codes use type="text" (not type="number") so leading zeros ("02138")
// survive — but that means letters/symbols are otherwise unrestricted. Strips
// anything but digits on every change (typing, paste, drag-drop, autofill),
// and caps length at 5 — standard US ZIP, no +4 extension.
export function sanitizeZip(value: string): string {
  return value.replace(/[^0-9]/g, '').slice(0, 5);
}
