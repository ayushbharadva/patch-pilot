'use client';

import {
  Activity,
  Eraser,
  RotateCcw,
  ScanSearch,
  Upload,
  type LucideIcon,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

import { Reveal } from '@landing/components/shared/reveal';

interface LifecycleStep {
  icon: LucideIcon;
  title: string;
  description: string;
}

const STEPS: readonly LifecycleStep[] = [
  {
    icon: Upload,
    title: 'Ingest',
    description:
      'Feed tickets, chats, and release notes in. PatchPilot links the Stripe double-charge incident to its `dedup_sweeper` workaround and the Orders API.',
  },
  {
    icon: ScanSearch,
    title: 'Recall & diagnose',
    description:
      'A new double-charge report lands. PatchPilot recalls INC-1042 and proposes the root cause: webhook retries duplicating order creation.',
  },
  {
    icon: Activity,
    title: 'Release & drift',
    description:
      'Ship release v1.9 with `idempotency_guard`. PatchPilot flags `workarounds_v1_8` as 🔴 Drifting, with a reason.',
  },
  {
    icon: Eraser,
    title: 'Forget',
    description:
      'Retire `workarounds_v1_8` so the stale `dedup_sweeper` fix stops resurfacing in future diagnoses.',
  },
  {
    icon: RotateCcw,
    title: 'Re-search',
    description:
      'Recall the same bug and the answer has moved on — `idempotency_guard` replaces the forgotten nightly sweep.',
  },
];

export function HowItWorks() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      id="how-it-works"
      className="relative z-10 bg-background mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28"
    >
      <Reveal>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">
            The lifecycle
          </p>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Memory that lives with your codebase
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            The full loop — ingest, recall, drift, forget, re-search — runs as
            one continuous story from first incident to fresh fix.
          </p>
        </div>
      </Reveal>

      <div className="relative mt-16">
        {/* Animated progress line (desktop) */}
        <div className="absolute left-0 right-0 top-6 hidden h-px lg:block">
          <div className="h-full bg-border" />
          <motion.div
            initial={shouldReduceMotion ? undefined : { scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
            style={{ transformOrigin: 'left' }}
            className="absolute inset-0 h-px bg-linear-to-r from-gradient-start via-gradient-mid to-gradient-end"
          />
        </div>

        <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
          {STEPS.map((step, index) => (
            <Reveal key={step.title} delay={index * 0.1}>
              <li className="group relative flex flex-col items-center text-center lg:items-start lg:text-left">
                {/* Node */}
                <div className="relative z-10 mb-4 flex size-12 items-center justify-center rounded-full border-2 border-border bg-background transition-colors group-hover:border-primary">
                  <step.icon className="size-5 text-primary" />
                  {/* Pulse on hover */}
                  <span className="absolute inset-0 rounded-full bg-primary/20 opacity-0 transition-opacity duration-300 group-hover:animate-ping group-hover:opacity-100" />
                </div>

                <h3 className="flex items-center gap-2 font-heading text-base font-semibold">
                  <span className="font-mono text-xs text-muted-foreground">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground text-pretty">
                  {step.description}
                </p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
