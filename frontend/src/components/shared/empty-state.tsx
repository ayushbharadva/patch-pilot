'use client';

import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  message,
  icon: Icon = Inbox,
  action,
  className,
}: EmptyStateProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-dashed border-border bg-card/40 px-6 py-12 text-center',
        className,
      )}
    >
      {/* Neural node illustration */}
      <motion.div
        initial={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative flex size-16 items-center justify-center"
      >
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
        {!shouldReduceMotion && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-primary/40"
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <span className="relative flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="size-6" />
        </span>
      </motion.div>

      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="max-w-sm text-sm text-muted-foreground text-pretty">
          {message}
        </p>
      </div>
      {action}
    </div>
  );
}
