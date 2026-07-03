'use client';

import dynamic from 'next/dynamic';
import { ArrowRight, Play } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

import { CtaButton } from '@/components/shared/cta-button';
import { SITE_CONFIG } from '@/config/site';

// Lazy-load the scroll-driven 3D scene
const ScrollScene3D = dynamic(
  () =>
    import('@/components/three/scroll-scene-3d').then((m) => m.ScrollScene3D),
  { ssr: false, loading: () => null },
);

export function Hero() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Fixed 3D scroll scene — sits behind all content */}
      <ScrollScene3D />

      {/* Gradient overlay for text legibility — stronger at edges */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-1 bg-linear-to-b from-background/70 via-background/30 to-background/80"
      />
      {/* Radial vignette to darken edges around text */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-1"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at center, transparent 0%, var(--background) 100%)',
          opacity: 0.5,
        }}
      />

      {/* Hero content */}
      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-4 py-20 text-center">
        <motion.span
          initial={shouldReduceMotion ? undefined : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-surface-elevated/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-md"
        >
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
          Living incident memory on Cognee
        </motion.span>

        <motion.h1
          initial={shouldReduceMotion ? undefined : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 font-heading text-5xl font-bold tracking-tight text-balance sm:text-6xl lg:text-7xl xl:text-8xl"
        >
          Your incidents,
          <br />
          <span className="text-gradient">remembered.</span>
        </motion.h1>

        <motion.p
          initial={shouldReduceMotion ? undefined : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mt-6 max-w-2xl text-lg text-muted-foreground text-pretty sm:text-xl"
        >
          PatchPilot turns past incidents into living memory that recalls proven
          fixes, diagnoses new bugs, and forgets stale workarounds after each
          release.
        </motion.p>

        <motion.div
          initial={shouldReduceMotion ? undefined : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center"
        >
          <CtaButton href={SITE_CONFIG.launchHref}>
            Launch PatchPilot
            <ArrowRight className="size-4" />
          </CtaButton>
          <CtaButton href="/#lifecycle" variant="outline">
            <Play className="size-4" />
            See the demo
          </CtaButton>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={shouldReduceMotion ? undefined : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute top-160 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={shouldReduceMotion ? undefined : { y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="flex flex-col items-center gap-2 text-muted-foreground"
          >
            <span className="text-xs font-medium tracking-wide uppercase">
              Scroll to explore
            </span>
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden
            >
              <path
                d="M5 8l5 5 5-5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
