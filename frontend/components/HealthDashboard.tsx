'use client';

import { useQuery } from '@tanstack/react-query';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DATASETS_QUERY_KEY } from '@/components/DatasetList';
import { ErrorState } from '@/components/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { type DriftState, listDatasets } from '@/lib/api';
import { DRIFT_LABEL } from '@/lib/version';

/** Drift-state -> dot/glow/text treatment, matching DatasetList.tsx's badge
 * so the health tiles and dataset rows read as one coherent color language. */
const HEALTH_TILE: Record<
  DriftState,
  { dot: string; glow: string; text: string }
> = {
  stable: {
    dot: 'bg-drift-stable',
    glow: '',
    text: 'text-drift-stable',
  },
  aging: {
    dot: 'bg-drift-aging',
    glow: '',
    text: 'text-drift-aging',
  },
  drifting: {
    dot: 'bg-drift-drifting',
    glow: '',
    text: 'text-drift-drifting',
  },
};

/**
 * Memory health dashboard (STRETCH-02): pure client-side aggregation of the
 * live `GET /datasets` response (RESEARCH.md Architectural Responsibility
 * Map — no new backend endpoint). Shares DATASETS_QUERY_KEY with DatasetList
 * so counts always agree with the list and no redundant fetch fires.
 */
export function HealthDashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: DATASETS_QUERY_KEY,
    queryFn: listDatasets,
  });

  const counts: Record<DriftState, number> = {
    stable: 0,
    aging: 0,
    drifting: 0,
  };
  for (const dataset of data ?? []) {
    counts[dataset.drift_state] += 1;
  }

  return (
    <Card className="gap-4 border-border/60 p-6">
      <CardHeader className="p-0">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Memory Health
        </h2>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3 p-0">
        {isLoading ? (
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-card ring-1 ring-foreground/10 flex min-w-[9rem] flex-1 items-center gap-3 rounded-xl border border-border/60 px-4 py-3"
              >
                <Skeleton className="size-3 shrink-0 rounded-full" />
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-7 w-8" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <ErrorState message="Could not load memory health. Please try again." />
        ) : (
          (Object.keys(counts) as DriftState[]).map((state) => {
            const tile = HEALTH_TILE[state];
            const isDrifting = state === 'drifting' && counts[state] > 0;
            return (
              <div
                key={state}
                className={cn(
                  'bg-card ring-1 ring-foreground/10 flex min-w-[9rem] flex-1 items-center gap-3 rounded-xl border border-border/60 px-4 py-3',
                  isDrifting && 'border-drift-drifting/40',
                )}
              >
                <span
                  className={cn(
                    'size-3 shrink-0 rounded-full',
                    tile.dot,
                    tile.glow,
                    isDrifting && 'animate-pulse',
                  )}
                  aria-hidden="true"
                />
                <div className="flex flex-col">
                  <span
                    className={cn(
                      'font-display text-2xl font-semibold',
                      tile.text,
                    )}
                  >
                    {counts[state]}
                  </span>
                  <span className="font-sans text-sm font-semibold text-foreground">
                    {DRIFT_LABEL[state]}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
