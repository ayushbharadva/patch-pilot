'use client';

import { ArrowRight, Play } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

import { CtaButton } from '@/components/shared/cta-button';
import { Reveal } from '@/components/shared/reveal';
import { SITE_CONFIG } from '@/config/site';

export function FinalCta() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative z-10 bg-background mx-auto w-full max-w-7xl px-4 pt-8 pb-24 sm:px-6 lg:px-8">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border border-border/60 px-6 py-16 text-center sm:px-12">
          {/* Animated mesh gradient background */}
          <div className="absolute inset-0 -z-10 bg-surface-elevated/70" />
          <motion.div
            aria-hidden
            className="absolute inset-0 -z-10"
            initial={shouldReduceMotion ? undefined : { opacity: 0.4 }}
            whileInView={{ opacity: 0.7 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
          >
            <div className="absolute -top-24 left-1/4 size-72 rounded-full bg-glow-cyan blur-3xl" />
            <div className="absolute -bottom-24 right-1/4 size-72 rounded-full bg-glow-violet blur-3xl" />
          </motion.div>

          <motion.h2
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-2xl font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl"
          >
            Run the full search, drift, forget, re-search loop
          </motion.h2>
          <motion.p
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground text-pretty"
          >
            Start with a sample incident set and watch a recall answer change
            the moment you forget the outdated workaround.
          </motion.p>
          <motion.div
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <CtaButton href={SITE_CONFIG.launchHref}>
              Launch PatchPilot
              <ArrowRight className="size-4" />
            </CtaButton>
            <CtaButton href="/#lifecycle" variant="outline">
              <Play className="size-4" />
              Watch the demo
            </CtaButton>
          </motion.div>
        </div>
      </Reveal>
    </section>
  );
}
