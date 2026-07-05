import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * RouteHeader — a reusable hero header for every `/app/*` route. Mirrors the
 * landing/auth page headers: a mono uppercase eyebrow badge, a
 * `font-display text-gradient` headline, a muted description, and an optional
 * action slot (e.g. a "Load sample data" button). Composes the neural-dark
 * tokens (`.text-gradient`, `.glass`, `.glow-soft`, `.animate-rise-in`) so
 * every route opens with the same polished, on-brand moment — no more
 * routes that start cold on a form or card with no orientation.
 *
 * Reused across Diagnose, Memory, Graph, Activity, and Profile. The compact
 * `PageTitle` in the topbar handles small-screen orientation; this is the
 * rich, in-content hero.
 */
export function RouteHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  /** Optional right-aligned action slot (buttons, links). */
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'relative flex flex-col gap-4 rounded-2xl px-6 py-7 sm:flex-row sm:items-end sm:justify-between sm:px-8',
        className,
      )}
    >
      {/* Soft wash behind the header — pointer-events-none so it never
          blocks clicks on elements below. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -right-10 size-56 rounded-full bg-primary/5 blur-3xl"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-16 -left-10 size-48 rounded-full bg-primary/5 blur-3xl"
      />

      <div className="relative flex flex-col gap-2">
        <span className="inline-flex items-center gap-2 font-mono text-xs tracking-[0.22em] text-primary uppercase">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-primary"
          />
          {eyebrow}
        </span>
        <h1 className="font-heading text-3xl leading-[1.1] font-bold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl font-sans text-sm text-muted-foreground sm:text-base">
            {description}
          </p>
        ) : null}
      </div>

      {actions ? (
        <div className="relative flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
