'use client';

import { ArchiveX } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

import { cn } from '@/lib/utils';
import type { DriftResult, DriftState } from '@/types';

interface DriftStateConfig {
  label: string;
  badge: string;
  dot: string;
  glow: string;
}

const DRIFT_CONFIG: Record<DriftState, DriftStateConfig> = {
  stable: {
    label: 'Stable',
    badge: 'border-drift-stable/40 bg-drift-stable/10 text-drift-stable',
    dot: 'bg-drift-stable',
    glow: 'shadow-[0_0_20px_-4px_var(--drift-stable)]',
  },
  aging: {
    label: 'Aging',
    badge: 'border-drift-aging/40 bg-drift-aging/10 text-drift-aging',
    dot: 'bg-drift-aging',
    glow: 'shadow-[0_0_20px_-4px_var(--drift-aging)]',
  },
  drifting: {
    label: 'Drifting',
    badge: 'border-drift-drifting/40 bg-drift-drifting/10 text-drift-drifting',
    dot: 'bg-drift-drifting',
    glow: 'shadow-[0_0_24px_-2px_var(--drift-drifting)]',
  },
};

interface DriftIndicatorProps {
  result: DriftResult;
  className?: string;
}

export function DriftIndicator({ result, className }: DriftIndicatorProps) {
  const config = DRIFT_CONFIG[result.state];
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.article
      data-testid="drift-indicator"
      data-state={result.state}
      aria-label={`${config.label} drift state for ${result.memoryTitle}`}
      className={cn(
        'flex h-full flex-col gap-3 rounded-2xl border border-border/60 bg-surface-elevated/60 p-5 backdrop-blur-sm transition-shadow',
        config.glow,
        className,
      )}
      whileHover={shouldReduceMotion ? undefined : { y: -4 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          data-testid="drift-state"
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold',
            config.badge,
          )}
        >
          <DriftDot state={result.state} />
          {config.label}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <p
          className="font-mono text-sm font-medium text-foreground"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {result.memoryTitle}
        </p>
        <p className="font-mono text-xs text-muted-foreground">
          {result.datasetName}
        </p>
      </div>

      <p
        data-testid="drift-reason"
        className="text-sm text-muted-foreground text-pretty"
      >
        {result.reason}
      </p>

      {result.recommendForget ? (
        <span className="mt-auto inline-flex items-center gap-1.5 rounded-md bg-drift-drifting/10 px-2 py-1 text-xs font-medium text-drift-drifting">
          <ArchiveX className="size-3.5" aria-hidden />
          Recommended to forget
        </span>
      ) : null}
    </motion.article>
  );
}

function DriftDot({ state }: { state: DriftState }) {
  const shouldReduceMotion = useReducedMotion();
  const colorClass = DRIFT_CONFIG[state].dot;

  if (shouldReduceMotion) {
    return (
      <span aria-hidden className={cn('size-2 rounded-full', colorClass)} />
    );
  }

  return (
    <span aria-hidden className="relative flex size-2">
      {state !== 'stable' && (
        <motion.span
          className={cn(
            'absolute inline-flex size-full rounded-full',
            colorClass,
          )}
          animate={{
            opacity: [0.4, 0, 0.4],
            scale: state === 'drifting' ? [1, 2.5, 1] : [1, 1.8, 1],
          }}
          transition={{
            duration: state === 'drifting' ? 1 : 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
      <span
        className={cn('relative inline-flex size-2 rounded-full', colorClass)}
      />
    </span>
  );
}
