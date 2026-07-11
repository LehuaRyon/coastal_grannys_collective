'use client';

import { useEffect, useState } from 'react';

interface CountUpStatProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}

export function CountUpStat({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 900,
  className = 'font-serif text-2xl text-stone-900 mt-1',
}: CountUpStatProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value);
      return;
    }
    let raf: number;
    const start = performance.now();
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  const formatted =
    decimals > 0
      ? display.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      : Math.round(display).toLocaleString();

  return (
    <p className={className}>
      {prefix}
      {formatted}
      {suffix}
    </p>
  );
}
