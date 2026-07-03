'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';

/**
 * A thin status bar showing the real tech stack PatchPilot is built on:
 * - UTC timestamp updating every second (real clock)
 * - Tech badges: Cognee (memory layer), Mistral (LLM), FastAPI (backend)
 * - Pulsing "live" indicator
 *
 * Respects prefers-reduced-motion (static values, no pulse).
 */
export function SystemStatusBar() {
  const [time, setTime] = useState('--:--:--');
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

    return () => {
      clearInterval(clockInterval);
    };
  }, []);

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
        <span className="text-primary">Cognee</span>
      </span>
      <span className="hidden text-border md:inline">|</span>
      <span className="hidden md:inline">
        <span className="text-accent-violet">Mistral</span>
      </span>
      <span className="hidden text-border lg:inline">|</span>
      <span className="hidden lg:inline">
        <span className="text-drift-stable">FastAPI</span>
      </span>
    </div>
  );
}
