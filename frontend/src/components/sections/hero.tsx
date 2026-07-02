'use client';

import dynamic from 'next/dynamic';
import { ArrowRight, Play, Sparkles, Waypoints } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

import { CtaButton } from '@/components/shared/cta-button';
import { AmbientBackground } from '@/components/shared/ambient-background';
import { NeuralCanvas } from '@/components/shared/neural-canvas';
import { SITE_CONFIG } from '@/config/site';
import { cn } from '@/lib/utils';

// Lazy-load 3D scene to avoid blocking initial render
const MemoryGraph3D = dynamic(
  () =>
    import('@/components/three/memory-graph-3d').then((m) => m.MemoryGraph3D),
  { ssr: false, loading: () => null },
);

const HEADLINE_WORDS = ['Your', 'incidents,', 'remembered'];

export function Hero() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden">
      <AmbientBackground variant="hero" />
      <NeuralCanvas className="absolute inset-0 z-0 size-full" />

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

        {/* Right: 3D Memory Graph */}
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
          className="relative aspect-square w-full max-w-lg"
        >
          {/* Glow behind 3D scene */}
          <div
            aria-hidden
            className="absolute inset-8 rounded-full bg-linear-to-br from-glow-cyan to-glow-violet blur-3xl"
          />
          <MemoryGraph3D className="relative size-full" />
          {/* Floating label */}
          <motion.div
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-border/60 bg-surface-elevated/80 px-4 py-1.5 backdrop-blur-md"
          >
            <span className="font-mono text-xs text-muted-foreground">
              memory graph · 14 nodes · 15 edges
            </span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function AnimatedConsoleMock() {
  // Replaced by ProductDemo — kept as no-op for backward compat
  return null;
}
