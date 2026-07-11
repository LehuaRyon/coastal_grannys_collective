import type { KeyboardEvent } from 'react';

// <input type="number"> still lets the browser accept "e"/"E" (scientific
// notation) and +/- despite looking like a plain numeric field. Block those
// keys so only digits (and, where allowed, a single decimal point) get through.
export function blockInvalidNumberKey(e: KeyboardEvent<HTMLInputElement>, allowDecimal = false) {
  const blocked = allowDecimal ? ['e', 'E', '+', '-'] : ['e', 'E', '+', '-', '.'];
  if (blocked.includes(e.key)) e.preventDefault();
}
