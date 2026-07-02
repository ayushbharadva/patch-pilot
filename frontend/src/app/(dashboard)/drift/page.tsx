'use client';

import { useCallback, useState } from 'react';
import { Activity } from 'lucide-react';

import { DriftPanel } from '@/components/dashboard/drift-panel';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { Reveal } from '@/components/shared/reveal';
import { Button } from '@/components/ui/button';
import { useLifecycleAction } from '@/hooks/use-lifecycle-action';
import { driftStatus } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { DriftStatusResult } from '@/types';

const loadDriftStatus = (): Promise<DriftStatusResult> => driftStatus({});

export default function DriftPage() {
  const { data, status, error, run } = useLifecycleAction(loadDriftStatus, {
    immediate: true,
    action: 'driftStatus',
  });
  const [showFlagged, setShowFlagged] = useState(true);

  const showAll = useCallback(() => setShowFlagged(true), []);
  const simulateClean = useCallback(() => setShowFlagged(false), []);

  const affected = data?.affected ?? [];
  const displayed = showFlagged ? affected : [];

  return (
    <div className="flex flex-col gap-8">
      <Reveal>
        <header className="flex flex-col gap-3">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-primary">
            <Activity className="size-4" aria-hidden />
            Release &amp; Drift
          </span>
          <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Which memories drifted after the release?
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground text-pretty">
            A new release can quietly turn yesterday&apos;s trusted workaround
            into tomorrow&apos;s wrong answer. PatchPilot re-grades every stored
            fix against the latest code and always explains why — never a bare
            score.
          </p>
        </header>
      </Reveal>

      <div
        role="group"
        aria-label="Drift view"
        className="flex flex-wrap gap-2"
      >
        <Button
          variant={showFlagged ? 'default' : 'outline'}
          className="min-h-11"
          aria-pressed={showFlagged}
          onClick={showAll}
        >
          Flagged memories
        </Button>
        <Button
          variant={showFlagged ? 'outline' : 'default'}
          className="min-h-11"
          aria-pressed={!showFlagged}
          onClick={simulateClean}
        >
          Simulate clean release
        </Button>
      </div>

      {status === 'loading' ? (
        <LoadingState label="Grading memories against the latest release" />
      ) : null}

      {status === 'error' && error ? (
        <ErrorState error={error} onRetry={run} />
      ) : null}

      {status === 'success' ? (
        <section
          aria-label="Drift status"
          className={cn('flex flex-col gap-6')}
        >
          {affected.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              <DriftStat
                label="Stable"
                count={affected.filter((a) => a.state === 'stable').length}
                className="text-drift-stable"
              />
              <DriftStat
                label="Aging"
                count={affected.filter((a) => a.state === 'aging').length}
                className="text-drift-aging"
              />
              <DriftStat
                label="Drifting"
                count={affected.filter((a) => a.state === 'drifting').length}
                className="text-drift-drifting"
              />
            </div>
          ) : null}
          {displayed.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              {displayed.length}{' '}
              {displayed.length === 1 ? 'memory' : 'memories'} flagged for
              review.
            </p>
          ) : null}
          <DriftPanel affected={displayed} />
        </section>
      ) : null}
    </div>
  );
}

function DriftStat({
  label,
  count,
  className,
}: {
  label: string;
  count: number;
  className?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-surface-elevated/60 p-4 text-center backdrop-blur-sm">
      <p
        className={cn('font-heading text-3xl font-bold', className)}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {count}
      </p>
      <p className="mt-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
    </div>
  );
}
