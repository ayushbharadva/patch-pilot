'use client';

import { ArrowRight, Play, Sparkles, Waypoints } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

import { CtaButton } from '@/components/shared/cta-button';
import { AmbientBackground } from '@/components/shared/ambient-background';
import { SITE_CONFIG } from '@/config/site';
import { cn } from '@/lib/utils';

const HEADLINE_WORDS = ['Your', 'incidents,', 'remembered'];

export function Hero() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden">
      <AmbientBackground variant="hero" />

      <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-8 lg:py-32">
        {/* Left: Headline + CTAs */}
        <div className="flex flex-col items-start gap-6">
          <motion.span
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-surface-elevated/60 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            Living incident memory on Cognee
          </motion.span>

          <h1 className="font-heading text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl xl:text-7xl">
            {HEADLINE_WORDS.map((word, i) => (
              <motion.span
                key={word}
                initial={shouldReduceMotion ? undefined : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: 0.1 + i * 0.12,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                className={cn(
                  'mr-[0.25em] inline-block',
                  i === HEADLINE_WORDS.length - 1 && 'text-gradient',
                )}
              >
                {word}
              </motion.span>
            ))}
            <motion.span
              initial={shouldReduceMotion ? undefined : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="block text-gradient"
            >
              — and diagnosed.
            </motion.span>
          </h1>

          <motion.p
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="max-w-xl text-lg text-muted-foreground text-pretty"
          >
            PatchPilot turns past incidents into living memory that recalls
            proven fixes, diagnoses new bugs, and forgets stale workarounds
            after each release.
          </motion.p>

          <motion.div
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <CtaButton href={SITE_CONFIG.launchHref}>
              Launch PatchPilot
              <ArrowRight className="size-4" />
            </CtaButton>
            <CtaButton href="/demo" variant="outline">
              <Play className="size-4" />
              See the demo
            </CtaButton>
          </motion.div>

          <motion.div
            initial={shouldReduceMotion ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="flex items-center gap-6 pt-2 text-xs text-muted-foreground"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-primary" />4 lifecycle
              operations
            </span>
            <span className="flex items-center gap-1.5">
              <Waypoints className="size-3.5 text-accent-violet" />
              Hybrid graph-vector memory
            </span>
          </motion.div>
        </div>

        {/* Right: Animated Console Mock */}
        <motion.div
          initial={
            shouldReduceMotion ? undefined : { opacity: 0, scale: 0.95, y: 20 }
          }
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{
            delay: 0.4,
            duration: 0.7,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        >
          <AnimatedConsoleMock />
        </motion.div>
      </div>
    </section>
  );
}

function AnimatedConsoleMock() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -inset-4 rounded-3xl bg-linear-to-br from-glow-cyan to-glow-violet blur-2xl"
      />
      <div className="relative rounded-2xl border border-border/60 bg-surface-elevated/80 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
          <span className="size-2.5 rounded-full bg-drift-drifting" />
          <span className="size-2.5 rounded-full bg-drift-aging" />
          <span className="size-2.5 rounded-full bg-drift-stable" />
          <span className="ml-2 font-mono text-xs text-muted-foreground">
            patchpilot recall — AUTH-401
          </span>
        </div>
        <div className="space-y-4 p-5 font-mono text-sm">
          <motion.p
            initial={shouldReduceMotion ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.4 }}
            className="text-muted-foreground"
          >
            <span className="text-primary">$</span> patchpilot recall --bug
            AUTH-401 &quot;users hit 401 after token refresh&quot;
          </motion.p>
          <motion.div
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="rounded-lg border border-primary/30 bg-primary/5 p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold tracking-wide text-primary uppercase">
                Root cause
              </p>
              <span
                className="text-xs font-bold text-primary"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                94% confidence
              </span>
            </div>
            <p className="mt-1.5 font-sans text-foreground">
              Refresh token rotation races the access-token clock skew, so a
              renewed token is rejected as expired.
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={shouldReduceMotion ? undefined : { width: 0 }}
                animate={{ width: '94%' }}
                transition={{ delay: 1.5, duration: 1, ease: 'easeOut' }}
                className="h-full rounded-full bg-linear-to-r from-gradient-start to-gradient-end"
              />
            </div>
          </motion.div>
          <motion.div
            initial={shouldReduceMotion ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8, duration: 0.5 }}
            className="space-y-1.5 text-xs text-muted-foreground"
          >
            <p className="font-sans font-medium text-foreground">
              Reconstructed from 3 prior incidents
            </p>
            {[
              'AUTH-207 — clock-skew logout storm, Mar 2026',
              'AUTH-318 — refresh loop after SSO migration',
              'CHG-92 — token TTL lowered in release 1.8',
            ].map((line, i) => (
              <motion.p
                key={line}
                initial={shouldReduceMotion ? undefined : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 2 + i * 0.15, duration: 0.4 }}
              >
                · {line}
              </motion.p>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
