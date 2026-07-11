'use client';

import { useCallback, useState } from 'react';

// Tracks which required fields failed validation on the last submit attempt,
// so inputs can show a red outline until the user fixes them.
export function useFormErrors() {
  const [errors, setErrors] = useState<Set<string>>(new Set());

  const clearError = useCallback((field: string) => {
    setErrors((prev) => {
      if (!prev.has(field)) return prev;
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
  }, []);

  const hasError = useCallback((field: string) => errors.has(field), [errors]);

  // className helper — swap in for the static "border-stone-200" token
  const borderClass = useCallback(
    (field: string) => (errors.has(field) ? 'border-red-400' : 'border-stone-200'),
    [errors]
  );

  return { errors, setErrors, clearError, hasError, borderClass };
}
