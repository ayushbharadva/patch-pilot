'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Shared empty-state treatment for in-card empties (DatasetList, Timeline,
 * Graph, Diagnosis no-results) so every "nothing here yet" moment reads the
 * same: a soft aurora glow behind a dim icon, an optional mono uppercase
 * eyebrow, a `text-gradient` title, a muted hint, and an optional action.
 *
 * The existing API (icon/title/hint/action/className) is fully
 * backward-compatible — `eyebrow` is optional and the title is now
 * `text-gradient` by default (callers can override via className).
 */
export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
  eyebrow,
  className,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
  /** Optional mono uppercase eyebrow above the title (e.g. "No data yet"). */
  eyebrow?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'bg-card ring-1 ring-foreground/10 relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl border border-dashed border-border/70 px-6 py-12 text-center',
        className,
      )}
    >
      {/* Soft aurora glow behind the icon — echoes the global AuroraBackground
          so the empty state feels like it grows out of the atmosphere. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-12 left-1/2 size-40 -translate-x-1/2 rounded-full bg-accent-violet/10 blur-3xl"
      />

      <span className="relative flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground ring-1 ring-border/60">
        <Icon aria-hidden="true" className="size-5" />
      </span>

      {eyebrow ? (
        <p className="relative font-mono text-xs tracking-[0.22em] text-accent-cyan uppercase">
          {eyebrow}
        </p>
      ) : null}

      <p className="relative font-display text-base font-semibold text-foreground">
        {title}
      </p>
      {hint ? (
        <p className="relative max-w-sm font-sans text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {action ? <div className="relative pt-1">{action}</div> : null}
    </div>
  );
}
