'use client';

import { FileText, Lightbulb, ScrollText } from 'lucide-react';
import { motion, useReducedMotion, AnimatePresence } from 'motion/react';

import type { DiagnosisResult, EvidenceChunk, RecallResult } from '@/types';
import { cn } from '@/lib/utils';

interface DiagnosisCardProps {
  result: DiagnosisResult;
  phase?: RecallResult['phase'];
}

const PHASE_LABEL: Record<RecallResult['phase'], string> = {
  'pre-forget': 'Pre-forget memory',
  'post-forget': 'Post-forget memory',
};

const PHASE_COLOR: Record<RecallResult['phase'], string> = {
  'pre-forget': 'text-drift-aging',
  'post-forget': 'text-primary',
};

export function DiagnosisCard({ result, phase }: DiagnosisCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const confidence = Math.round(result.confidence);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-surface-elevated/60 shadow-lg backdrop-blur-sm">
      {/* Gradient header bar */}
      <div className="h-1 bg-linear-to-r from-gradient-start via-gradient-mid to-gradient-end" />

      <div className="grid gap-6 p-6 lg:grid-cols-5 lg:p-8">
        <div className="lg:col-span-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 text-primary">
              <Lightbulb className="size-5" />
              <span className="text-xs font-semibold tracking-wide uppercase">
                Recommended fix
              </span>
            </span>
            <span
              className="font-mono text-xs text-muted-foreground"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {result.bugId}
            </span>
            <AnimatePresence mode="wait">
              {phase ? (
                <motion.span
                  key={phase}
                  initial={
                    shouldReduceMotion ? undefined : { opacity: 0, scale: 0.9 }
                  }
                  animate={{ opacity: 1, scale: 1 }}
                  exit={
                    shouldReduceMotion ? undefined : { opacity: 0, scale: 0.9 }
                  }
                  transition={{ duration: 0.2 }}
                  className={cn(
                    'rounded-full border border-primary/30 px-2.5 py-0.5 text-[0.7rem] font-medium',
                    PHASE_COLOR[phase],
                  )}
                >
                  {PHASE_LABEL[phase]}
                </motion.span>
              ) : null}
            </AnimatePresence>
          </div>

          <h3 className="mt-4 font-heading text-xl font-semibold text-pretty">
            {result.rootCause}
          </h3>
          <div className="mt-3 rounded-lg border border-border/50 bg-background/40 p-3">
            <p className="text-muted-foreground text-pretty">
              {result.recommendedFix}
            </p>
          </div>

          {/* Linear confidence bar (mobile + desktop) */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">Confidence</span>
              <span
                className="font-mono text-primary"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {confidence}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={confidence}
              aria-valuemin={0}
              aria-valuemax={100}
              className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
            >
              <motion.div
                className="h-full rounded-full bg-linear-to-r from-gradient-start to-gradient-end"
                initial={shouldReduceMotion ? false : { width: 0 }}
                animate={{ width: `${confidence}%` }}
                transition={
                  shouldReduceMotion
                    ? undefined
                    : { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }
                }
              />
            </div>
          </div>
        </div>

        {/* Right: Confidence ring + evidence */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-4">
            <ConfidenceRing
              value={confidence}
              reduceMotion={Boolean(shouldReduceMotion)}
            />
            <div>
              <p className="flex items-center gap-2 text-sm font-medium">
                <FileText className="size-4 text-muted-foreground" />
                Reconstructed from
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {result.evidence.length} prior incidents
              </p>
            </div>
          </div>

          <motion.ul
            className="mt-4 space-y-3"
            initial={shouldReduceMotion ? false : 'hidden'}
            animate={shouldReduceMotion ? undefined : 'visible'}
            variants={
              shouldReduceMotion
                ? undefined
                : { visible: { transition: { staggerChildren: 0.08 } } }
            }
          >
            {result.evidence.map((chunk, index) => (
              <EvidenceItem
                key={`${chunk.incidentId}-${index}`}
                chunk={chunk}
                reduceMotion={Boolean(shouldReduceMotion)}
              />
            ))}
          </motion.ul>
        </div>
      </div>
    </div>
  );
}

function ConfidenceRing({
  value,
  reduceMotion,
}: {
  value: number;
  reduceMotion: boolean;
}) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative flex size-20 items-center justify-center">
      <svg className="size-20 -rotate-90" viewBox="0 0 64 64" aria-hidden>
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth="4"
        />
        <motion.circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={reduceMotion ? false : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={
            reduceMotion ? undefined : { duration: 1, ease: 'easeOut' }
          }
        />
      </svg>
      <span
        className="absolute font-mono text-sm font-bold text-primary"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {value}%
      </span>
    </div>
  );
}

interface EvidenceItemProps {
  chunk: EvidenceChunk;
  reduceMotion: boolean;
}

function EvidenceItem({ chunk, reduceMotion }: EvidenceItemProps) {
  const relevance = Math.round(chunk.relevance * 100);

  return (
    <motion.li
      data-testid="evidence-item"
      className="rounded-xl border border-border/50 bg-background/40 p-3"
      variants={
        reduceMotion
          ? undefined
          : { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="font-mono text-xs font-semibold text-primary"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {chunk.incidentId}
        </span>
        <span className="inline-flex items-center gap-1 font-mono text-[0.7rem] text-muted-foreground">
          <ScrollText className="size-3" />
          {relevance}%
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground text-pretty">
        {chunk.excerpt}
      </p>
      {/* Relevance bar */}
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary/60"
          style={{ width: `${relevance}%` }}
        />
      </div>
    </motion.li>
  );
}
