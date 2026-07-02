'use client';

import { useState, useCallback } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'motion/react';
import {
  Activity,
  ArrowRight,
  Check,
  Eraser,
  RotateCcw,
  ScanSearch,
  Upload,
  type LucideIcon,
} from 'lucide-react';

import { AmbientBackground } from '@/components/shared/ambient-background';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DemoStep {
  icon: LucideIcon;
  title: string;
  description: string;
  detail: string;
}

const STEPS: readonly DemoStep[] = [
  {
    icon: Upload,
    title: 'Ingest',
    description: 'Feed incidents into memory',
    detail:
      'PatchPilot ingests tickets, postmortems, and changelogs, linking each incident to its fix and component in a hybrid graph-vector store.',
  },
  {
    icon: ScanSearch,
    title: 'Recall',
    description: 'Diagnose a new bug',
    detail:
      'A new 401 storm hits. PatchPilot recalls matching past incidents and proposes the root cause with a 94% confidence score.',
  },
  {
    icon: Activity,
    title: 'Drift',
    description: 'Flag aging memories',
    detail:
      'After a release, PatchPilot re-grades every stored workaround as stable, aging, or drifting — always with a human-readable reason.',
  },
  {
    icon: Eraser,
    title: 'Forget',
    description: 'Retire stale workarounds',
    detail:
      'Surgically prune the outdated workaround so it stops resurfacing in future diagnoses. The memory gets cleaner, not fuller.',
  },
  {
    icon: RotateCcw,
    title: 'Re-search',
    description: 'See the diagnosis flip',
    detail:
      'Recall the same bug again. The answer has moved on — the new architectural fix replaces the forgotten client-side hack, and confidence jumps.',
  },
];

export default function DemoPage() {
  const [step, setStep] = useState(0);
  const shouldReduceMotion = useReducedMotion();
  const isComplete = step >= STEPS.length;

  const next = useCallback(() => setStep((s) => s + 1), []);
  const prev = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);
  const reset = useCallback(() => setStep(0), []);

  const progress = Math.min((step / STEPS.length) * 100, 100);

  return (
    <div className="relative flex min-h-[calc(100svh-4rem)] flex-col">
      <AmbientBackground variant="default" />

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-8 sm:px-6">
        {/* Header */}
        <header className="mb-8 text-center">
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">
            Guided walkthrough
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            The memory lifecycle, end to end
          </h1>
          <p className="mt-3 text-muted-foreground text-pretty">
            Watch how PatchPilot ingests, recalls, drifts, forgets, and
            re-searches — the full loop in one sitting.
          </p>
        </header>

        {/* Progress bar */}
        <div className="mb-10">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Step {Math.min(step + 1, STEPS.length)} of {STEPS.length}
            </span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(progress)}%
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-linear-to-r from-gradient-start via-gradient-mid to-gradient-end"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
          {/* Step dots */}
          <div className="mt-4 flex items-center justify-between">
            {STEPS.map((s, i) => (
              <button
                key={s.title}
                type="button"
                onClick={() => setStep(i)}
                aria-label={`Go to step ${i + 1}: ${s.title}`}
                aria-current={i === step ? 'step' : undefined}
                className={cn(
                  'flex size-8 items-center justify-center rounded-full border-2 text-xs font-medium transition-colors',
                  i < step
                    ? 'border-primary bg-primary text-primary-foreground'
                    : i === step
                      ? 'border-primary bg-background text-primary'
                      : 'border-border bg-background text-muted-foreground',
                )}
              >
                {i < step ? <Check className="size-4" /> : i + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="flex flex-1 items-center justify-center">
          <AnimatePresence mode="wait">
            {isComplete ? (
              <motion.div
                key="complete"
                initial={
                  shouldReduceMotion ? undefined : { opacity: 0, scale: 0.9 }
                }
                animate={{ opacity: 1, scale: 1 }}
                exit={
                  shouldReduceMotion ? undefined : { opacity: 0, scale: 0.9 }
                }
                transition={{ duration: 0.4 }}
                className="text-center"
              >
                <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-primary/10">
                  <Check className="size-10 text-primary" />
                </div>
                <h2 className="font-heading text-2xl font-bold text-balance sm:text-3xl">
                  You&apos;ve given your AI a memory.
                </h2>
                <p className="mx-auto mt-3 max-w-md text-muted-foreground text-pretty">
                  That&apos;s the full PatchPilot loop. Your incidents are now
                  living memory — recalled, drifted, forgotten, and re-searched.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button onClick={reset} variant="outline" size="lg">
                    <RotateCcw className="size-4" />
                    Replay
                  </Button>
                  <a
                    href="/ingest"
                    className={cn(
                      buttonVariants({ size: 'lg' }),
                      'h-12 gap-2 px-6 text-base font-semibold',
                    )}
                  >
                    Launch PatchPilot
                    <ArrowRight className="size-4" />
                  </a>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={step}
                initial={shouldReduceMotion ? undefined : { opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, x: -40 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="w-full"
              >
                <DemoStepCard step={STEPS[step]} index={step} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav buttons */}
        {!isComplete ? (
          <div className="mt-8 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={prev}
              disabled={step === 0}
              size="lg"
            >
              Back
            </Button>
            <Button onClick={next} size="lg">
              {step === STEPS.length - 1 ? 'Finish' : 'Next'}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DemoStepCard({ step, index }: { step: DemoStep; index: number }) {
  const Icon = step.icon;
  return (
    <div className="rounded-2xl border border-border/60 bg-surface-elevated/60 p-8 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="size-7 text-primary" />
        </div>
        <div>
          <p className="font-mono text-xs text-muted-foreground">
            Step {String(index + 1).padStart(2, '0')}
          </p>
          <h2 className="font-heading text-2xl font-bold">{step.title}</h2>
        </div>
      </div>
      <p className="mt-4 text-lg font-medium text-foreground">
        {step.description}
      </p>
      <p className="mt-2 text-muted-foreground text-pretty">{step.detail}</p>
    </div>
  );
}
