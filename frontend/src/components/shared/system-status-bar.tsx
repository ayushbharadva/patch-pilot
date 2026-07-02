'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';

/**
 * A thin status bar showing live ticking system data artifacts:
 * - UTC timestamp updating every second
 * - Memory operations counter (slowly incrementing)
 * - Active datasets count
 * - Pulsing "live" indicator
 *
 * Creates the perception of a continuously running platform.
 * Respects prefers-reduced-motion (static values, no pulse).
 */
export function SystemStatusBar() {
  const [time, setTime] = useState('--:--:--');
  const [ops, setOps] = useState(1247);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    // Update clock every second
    const clockInterval = setInterval(() => {
      setTime(
        new Date().toLocaleTimeString('en-US', {
          hour12: false,
          timeZone: 'UTC',
        }),
      );
    }, 1000);

    // Increment ops counter every 3-7s (simulated activity)
    const opsInterval = setInterval(
      () => {
        setOps((prev) => prev + Math.floor(Math.random() * 3) + 1);
      },
      prefersReducedMotion ? 999999 : 4000,
    );

    return () => {
      clearInterval(clockInterval);
      clearInterval(opsInterval);
    };
  }, [prefersReducedMotion]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-4 font-mono text-[0.7rem] text-muted-foreground"
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      <span className="flex items-center gap-1.5">
        <span className="relative flex size-1.5">
          {!prefersReducedMotion && (
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-drift-stable opacity-75" />
          )}
          <span className="relative inline-flex size-1.5 rounded-full bg-drift-stable" />
        </span>
        <span className="font-semibold text-drift-stable">LIVE</span>
      </span>
      <span className="text-border">|</span>
      <span>{time} UTC</span>
      <span className="hidden text-border sm:inline">|</span>
      <span className="hidden sm:inline">
        <span className="text-primary">{ops.toLocaleString()}</span> ops
      </span>
      <span className="hidden text-border md:inline">|</span>
      <span className="hidden md:inline">
        <span className="text-accent-violet">3</span> datasets
      </span>
    </div>
  );
}
