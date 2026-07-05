'use client';

import { useSearchSession, type LifecycleOp } from '@/lib/search-session';
import { cn } from '@/lib/utils';

const NODES: { op: LifecycleOp; label: string; description: string }[] = [
  {
    op: 'remember',
    label: 'remember',
    description:
      'Remember — ingest new memory: file uploads, GitHub issue imports, release notes (cognee.add + cognify).',
  },
  {
    op: 'recall',
    label: 'recall',
    description:
      'Recall — search prior incidents for an evidence-backed diagnosis (cognee.search).',
  },
  {
    op: 'improve',
    label: 'improve',
    description:
      'Improve — accepting a fix reinforces its source dataset (cognee.improve).',
  },
  {
    op: 'forget',
    label: 'forget',
    description:
      'Forget — surgically remove a drifting workaround dataset (cognee.forget).',
  },
];

/**
 * Topbar lifecycle strip (depth kit): remember → recall → improve → forget,
 * one node per Cognee memory-lifecycle verb, mono labels with a connecting
 * line. A node lights the first time its op fires at least once
 * (`stats[op] > 0`) and stays lit for the rest of the session — a running
 * visual proof that every memory verb has actually been exercised.
 */
export function LifecycleStrip({ className }: { className?: string }) {
  const { stats } = useSearchSession();

  return (
    <div className={cn('items-center gap-1.5 font-mono text-xs', className)}>
      {NODES.map(({ op, label, description }, index) => {
        const lit = stats[op] > 0;
        return (
          <div key={op} className="flex items-center gap-1.5">
            <span
              title={description}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 tracking-wide uppercase transition-colors',
                lit
                  ? 'bg-foreground/[0.08] text-primary'
                  : 'bg-foreground/10 text-muted-foreground',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'size-1.5 rounded-full',
                  lit ? 'bg-accent-cyan' : 'bg-foreground/30',
                )}
              />
              {label}
            </span>
            {index < NODES.length - 1 ? (
              <span aria-hidden="true" className="h-px w-4 bg-foreground/15" />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
