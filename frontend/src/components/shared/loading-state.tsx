'use client';

import { motion, useReducedMotion } from 'motion/react';

import { cn } from '@/lib/utils';

interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function LoadingState({ label, className }: LoadingStateProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn('flex flex-col gap-4', className)}
    >
      {label ? (
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          {!shouldReduceMotion && (
            <motion.span
              className="size-2 rounded-full bg-primary"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          )}
          {label}
        </span>
      ) : (
        <span className="sr-only">Loading</span>
      )}
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((row) => (
          <motion.div
            key={row}
            className="h-4 overflow-hidden rounded-md bg-muted"
            style={{ width: `${100 - row * 15}%` }}
          >
            {!shouldReduceMotion && (
              <motion.div
                className="h-full w-1/3 rounded-md bg-linear-to-r from-transparent via-primary/20 to-transparent"
                animate={{ x: ['-100%', '300%'] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: row * 0.2,
                }}
              />
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
