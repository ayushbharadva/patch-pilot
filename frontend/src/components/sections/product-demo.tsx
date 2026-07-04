'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Activity,
  Eraser,
  ScanSearch,
  Upload,
  type LucideIcon,
} from 'lucide-react';

interface DemoStep {
  icon: LucideIcon;
  label: string;
  command: string;
  result: string;
  confidence?: number;
  color: string;
}

const STEPS: DemoStep[] = [
  {
    icon: Upload,
    label: 'Ingest',
    command: 'patchpilot ingest --source auth-gateway',
    result: '42 incidents linked to 3 fixes · 5 components',
    color: 'text-primary',
  },
  {
    icon: ScanSearch,
    label: 'Recall',
    command: 'patchpilot recall --bug AUTH-401',
    result: 'Root cause: refresh token rotation races clock skew',
    confidence: 94,
    color: 'text-accent-violet',
  },
  {
    icon: Activity,
    label: 'Drift',
    command: 'patchpilot drift --release 1.9',
    result: '2 drifting · 1 aging · workarounds_v1_7 flagged',
    color: 'text-drift-aging',
  },
  {
    icon: Eraser,
    label: 'Forget',
    command: 'patchpilot forget --dataset workarounds_v1_7',
    result: 'Stale workaround pruned from memory graph',
    color: 'text-drift-drifting',
  },
  {
    icon: ScanSearch,
    label: 'Re-search',
    command: 'patchpilot recall --bug AUTH-401',
    result: 'New fix: rotate refresh tokens server-side',
    confidence: 96,
    color: 'text-drift-stable',
  },
];

const STEP_DURATION = 2800;

/**
 * Automated, looping, non-interactive product demo animation.
 * Plays the full PatchPilot lifecycle (Ingest→Recall→Drift→Forget→Re-search)
 * as a scripted sequence with terminal-style output.
 * Zero user input — pure passive showcase that loops continuously.
 * Respects prefers-reduced-motion (shows all steps statically).
 */
export function ProductDemo() {
  const [stepIndex, setStepIndex] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % STEPS.length);
    }, STEP_DURATION);
    return () => clearInterval(interval);
  }, [prefersReducedMotion]);

  const currentStep = STEPS[stepIndex];
  const Icon = currentStep.icon;

  return (
    <div className="relative">
      {/* Glow behind terminal */}
      <div
        aria-hidden
        className="absolute -inset-4 rounded-3xl bg-linear-to-br from-glow-cyan to-glow-violet blur-2xl"
      />

      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-surface-elevated/80 shadow-2xl backdrop-blur-md">
        {/* Terminal header */}
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
          <span className="size-2.5 rounded-full bg-drift-drifting" />
          <span className="size-2.5 rounded-full bg-drift-aging" />
          <span className="size-2.5 rounded-full bg-drift-stable" />
          <span className="ml-2 font-mono text-xs text-muted-foreground">
            patchpilot — automated demo
          </span>
          {/* Progress dots */}
          <div className="ml-auto flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`size-1.5 rounded-full transition-colors ${
                  i === stepIndex ? 'bg-primary' : 'bg-border'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Terminal body */}
        <div className="min-h-70 p-5 font-mono text-sm">
          <AnimatePresence mode="wait">
            <motion.div
              key={stepIndex}
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-4"
            >
              {/* Step label */}
              <div className="flex items-center gap-2">
                <Icon className={`size-4 ${currentStep.color}`} aria-hidden />
                <span
                  className={`text-xs font-semibold tracking-wide uppercase ${currentStep.color}`}
                >
                  Step {stepIndex + 1} · {currentStep.label}
                </span>
              </div>

              {/* Command */}
              <p className="text-muted-foreground">
                <span className="text-primary">$</span> {currentStep.command}
              </p>

              {/* Result */}
              <div className="rounded-lg border border-border/50 bg-background/40 p-3">
                <p className="font-sans text-foreground">
                  {currentStep.result}
                </p>

                {/* Confidence bar (if applicable) */}
                {currentStep.confidence !== undefined && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Confidence</span>
                      <span
                        className="font-bold text-primary"
                        style={{
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {currentStep.confidence}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        initial={
                          prefersReducedMotion ? undefined : { width: 0 }
                        }
                        animate={{
                          width: `${currentStep.confidence}%`,
                        }}
                        transition={{
                          duration: 1,
                          ease: 'easeOut',
                          delay: 0.2,
                        }}
                        className="h-full rounded-full bg-linear-to-r from-gradient-start to-gradient-end"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Typing cursor */}
              {!prefersReducedMotion && (
                <span className="inline-block h-4 w-2 animate-pulse bg-primary" />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
