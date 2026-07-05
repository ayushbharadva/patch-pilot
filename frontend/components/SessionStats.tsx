'use client';

import { useQuery } from '@tanstack/react-query';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DATASETS_QUERY_KEY } from '@/components/DatasetList';
import { listDatasets } from '@/lib/api';
import { useSearchSession } from '@/lib/search-session';

/**
 * Session-stat tiles (depth kit) mounted below the Diagnose page's results.
 * Mirrors HealthDashboard's glass-tile pattern. "Drift events" is derived
 * live from the shared datasets query (not from lifecycle stats) so it
 * always agrees with the Memory page's own drift counts; the other three
 * tiles read directly from the session's lifecycle stats.
 */
export function SessionStats() {
  const { stats } = useSearchSession();
  const { data } = useQuery({
    queryKey: DATASETS_QUERY_KEY,
    queryFn: listDatasets,
  });

  const driftEvents = (data ?? []).filter(
    (dataset) => dataset.drift_state === 'drifting',
  ).length;

  const tiles = [
    { label: 'Recalls', value: stats.recall },
    { label: 'Reinforcements', value: stats.improve },
    { label: 'Drift events', value: driftEvents },
    { label: 'Forgotten', value: stats.forget },
  ];

  return (
    <Card className="gap-4 border-border/60 p-6">
      <CardHeader className="p-0">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Session
        </h2>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3 p-0">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="bg-card ring-1 ring-foreground/10 flex min-w-[9rem] flex-1 flex-col rounded-xl border border-border/60 px-4 py-3"
          >
            <span className="font-display text-2xl font-semibold text-foreground">
              {tile.value}
            </span>
            <span className="font-sans text-sm font-semibold text-muted-foreground">
              {tile.label}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
