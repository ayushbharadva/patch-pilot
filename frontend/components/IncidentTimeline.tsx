'use client';

import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DATASETS_QUERY_KEY } from '@/components/DatasetList';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { type DatasetInfo, type DriftState, listDatasets } from '@/lib/api';
import { DRIFT_LABEL, WORKAROUNDS_VERSION_RE } from '@/lib/version';

/** Drift-state -> spine dot/glow, matching DatasetList.tsx/HealthDashboard.tsx
 * so the timeline reads as the same color language as the rest of the app. */
const TIMELINE_DOT: Record<
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

/** Mirrors backend/search.py's `_WORKAROUNDS_VERSION_RE` — the only
 * chronological signal available client-side without a new backend endpoint
 * (RESEARCH.md Architectural Responsibility Map, "Incident timeline" row).
 * WR-04: shared with DiagnosisCard.tsx and HealthDashboard.tsx via
 * `@/lib/version` rather than re-implemented locally. */

/** Chronological sort key: `incidents` anchors the baseline (sorts first),
 * `workarounds_v{N}` (or `v{N}_{M}`) sort ascending by release version,
 * anything else (e.g. leftover spike/healthcheck datasets, STATE.md
 * Phase 01-04 note) sorts last, alphabetically. */
function timelineSortKey(
  dataset: DatasetInfo,
): [number, number, number, string] {
  if (dataset.name === 'incidents') return [0, -1, -1, dataset.name];
  const match = WORKAROUNDS_VERSION_RE.exec(dataset.name);
  if (match) {
    const major = Number(match[1]);
    const minor = match[2] ? Number(match[2]) : 0;
    return [1, major, minor, dataset.name];
  }
  return [2, 0, 0, dataset.name];
}

/** Human-readable timeline label for a dataset's chronological role. */
function timelineLabel(dataset: DatasetInfo): string {
  if (dataset.name === 'incidents') return 'Incident baseline';
  const match = WORKAROUNDS_VERSION_RE.exec(dataset.name);
  if (match) {
    const version = match[2] ? `${match[1]}.${match[2]}` : match[1];
    return `Release v${version}`;
  }
  return 'Other';
}

/**
 * Incident timeline (STRETCH-03): pure client-side chronological ordering of
 * the live `GET /datasets` response (RESEARCH.md Architectural Responsibility
 * Map — no new backend endpoint, no new lifecycle verb). Shares
 * DATASETS_QUERY_KEY with DatasetList/HealthDashboard so entries always agree
 * with the dataset list and no redundant fetch fires.
 */
export function IncidentTimeline() {
  const { data, isLoading, isError } = useQuery({
    queryKey: DATASETS_QUERY_KEY,
    queryFn: listDatasets,
  });

  const entries = [...(data ?? [])].sort((a, b) => {
    const keyA = timelineSortKey(a);
    const keyB = timelineSortKey(b);
    for (let i = 0; i < keyA.length; i++) {
      if (keyA[i] < keyB[i]) return -1;
      if (keyA[i] > keyB[i]) return 1;
    }
    return 0;
  });

  return (
    <Card className="gap-4 border-border/60 p-6">
      <CardHeader className="p-0">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Incident Timeline
        </h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-0 p-0">
        {isLoading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="relative flex gap-4">
                <div className="flex flex-col items-center">
                  <Skeleton className="mt-1 size-3 shrink-0 rounded-full" />
                  {i < 2 ? (
                    <span className="w-px flex-1 bg-gradient-to-b from-accent-indigo/30 to-transparent" />
                  ) : null}
                </div>
                <div className="bg-card ring-1 ring-foreground/10 mb-1 flex flex-1 items-center gap-2 rounded-xl border border-border/60 px-3.5 py-2.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 flex-1 max-w-40" />
                  <Skeleton className="ml-auto h-4 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <ErrorState message="Could not load incident timeline. Please try again." />
        ) : entries.length > 0 ? (
          entries.map((dataset, index) => {
            const dot = TIMELINE_DOT[dataset.drift_state];
            const isLast = index === entries.length - 1;
            const isDrifting = dataset.drift_state === 'drifting';
            return (
              <div
                key={dataset.name}
                className="relative flex gap-4 pb-4 last:pb-0"
              >
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      'z-10 mt-1 size-3 shrink-0 rounded-full',
                      dot.dot,
                      dot.glow,
                      isDrifting && 'animate-pulse',
                    )}
                    aria-hidden="true"
                  />
                  {!isLast ? (
                    <span
                      className="w-px flex-1 bg-gradient-to-b from-accent-indigo/50 via-accent-violet/30 to-transparent"
                      aria-hidden="true"
                    />
                  ) : null}
                </div>
                <div
                  className={cn(
                    'bg-card ring-1 ring-foreground/10 mb-1 flex flex-1 flex-wrap items-center gap-2 rounded-xl border border-border/60 px-3.5 py-2.5',
                    isDrifting && 'border-drift-drifting/40',
                  )}
                >
                  <span className="font-display text-sm font-semibold text-foreground">
                    {timelineLabel(dataset)}
                  </span>
                  <span className="font-mono text-sm text-muted-foreground">
                    {dataset.name} · {dataset.doc_count} docs
                  </span>
                  <span
                    className={cn(
                      'ml-auto font-sans text-sm font-semibold',
                      dot.text,
                    )}
                  >
                    {DRIFT_LABEL[dataset.drift_state]}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <EmptyState
            icon={History}
            title="No incidents or releases yet"
            hint="Upload files or load sample data to get started."
          />
        )}
      </CardContent>
    </Card>
  );
}
