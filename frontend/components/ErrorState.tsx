import type { LucideIcon } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Shared error-state treatment for failed data fetches (DatasetList,
 * HealthDashboard, IncidentTimeline, MemoryGraphView). A glass card with a
 * destructive border, a warning icon, a short human message, and an
 * optional retry action — so a failed API call never reads as plain red
 * text with no visual weight or recovery path.
 *
 * Mirrors the `EmptyState` glass-surface pattern so empty and error states
 * read as one coherent visual language.
 */
export function ErrorState({
  message,
  action,
  icon: Icon = AlertTriangle,
  className,
}: {
  message: string;
  action?: ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'bg-card ring-1 ring-foreground/10 relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl border border-destructive/40 px-6 py-10 text-center',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-12 left-1/2 size-36 -translate-x-1/2 rounded-full bg-destructive/10 blur-3xl"
      />
      <span className="relative flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive ring-1 ring-destructive/30">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <p className="relative font-sans text-sm font-semibold text-destructive">
        {message}
      </p>
      {action ? <div className="relative pt-1">{action}</div> : null}
    </div>
  );
}
