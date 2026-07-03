"use client";

import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DATASETS_QUERY_KEY } from "@/components/DatasetList";
import { type DatasetInfo, type DriftState, listDatasets } from "@/lib/api";

/** Mirrors backend/search.py's `_WORKAROUNDS_VERSION_RE` — the only
 * chronological signal available client-side without a new backend endpoint
 * (RESEARCH.md Architectural Responsibility Map, "Incident timeline" row). */
const WORKAROUNDS_VERSION_RE = /^workarounds_v(\d+)(?:_(\d+))?$/;

/** Drift-state -> text label (03-UI-SPEC.md Copywriting Contract). Duplicated
 * from DatasetList.tsx's DRIFT_BADGE map rather than imported, since only the
 * label (not the dot color) is needed here. */
const DRIFT_LABEL: Record<DriftState, string> = {
  stable: "🟢 Stable",
  aging: "🟡 Aging",
  drifting: "🔴 Drifting",
};

/** Chronological sort key: `incidents` anchors the baseline (sorts first),
 * `workarounds_v{N}` (or `v{N}_{M}`) sort ascending by release version,
 * anything else (e.g. leftover spike/healthcheck datasets, STATE.md
 * Phase 01-04 note) sorts last, alphabetically. */
function timelineSortKey(dataset: DatasetInfo): [number, number, number, string] {
  if (dataset.name === "incidents") return [0, -1, -1, dataset.name];
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
  if (dataset.name === "incidents") return "Incident baseline";
  const match = WORKAROUNDS_VERSION_RE.exec(dataset.name);
  if (match) {
    const version = match[2] ? `${match[1]}.${match[2]}` : match[1];
    return `Release v${version}`;
  }
  return "Other";
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
    <Card className="gap-4 p-6">
      <CardHeader className="p-0">
        <h2 className="font-display text-xl font-semibold text-foreground">Incident Timeline</h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 p-0">
        {isLoading ? (
          <p className="font-sans text-sm text-muted-foreground">Loading timeline…</p>
        ) : isError ? (
          <p className="font-sans text-sm font-semibold text-destructive">
            Could not load incident timeline. Please try again.
          </p>
        ) : entries.length > 0 ? (
          entries.map((dataset) => (
            <div
              key={dataset.name}
              className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2"
            >
              <span className="font-mono text-sm text-foreground">{timelineLabel(dataset)}</span>
              <span className="font-mono text-sm text-muted-foreground">
                {dataset.name} · {dataset.doc_count} docs
              </span>
              <span className="font-sans text-sm font-semibold text-foreground">
                {DRIFT_LABEL[dataset.drift_state]}
              </span>
            </div>
          ))
        ) : (
          <p className="font-sans text-sm text-muted-foreground">
            No incidents or releases yet. Upload files or load sample data to get started.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
