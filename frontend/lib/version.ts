import type { DriftState } from "@/lib/api";

/**
 * WR-04: shared version-tag regex + drift-label helpers.
 *
 * Previously `^workarounds_v(\d+)(?:_(\d+))?$` was independently
 * re-implemented in `DiagnosisCard.tsx` and `IncidentTimeline.tsx`, and the
 * `DriftState -> emoji label` map was copy-pasted verbatim between
 * `HealthDashboard.tsx` and `IncidentTimeline.tsx`. Each copy stayed
 * correct so far, but that's a maintenance trap: if the version-tag format
 * or drift-state vocabulary ever changes, it's easy to update one copy and
 * miss another, producing a silent display inconsistency between the
 * search result badge, the health dashboard, and the incident timeline.
 *
 * `backend/search.py`'s `_WORKAROUNDS_VERSION_RE` stays a separate,
 * independently-maintained regex -- Python and TypeScript can't share
 * source -- but both patterns are the same literal
 * `^workarounds_v(\d+)(?:_(\d+))?$` and should be kept in sync by hand.
 */
export const WORKAROUNDS_VERSION_RE = /^workarounds_v(\d+)(?:_(\d+))?$/;

/**
 * Derive the D-09 dataset/version tag from `source_dataset` — e.g.
 * `workarounds_v1_8` -> "v1.8". `incidents` (and anything unrecognized)
 * gets a neutral label rather than a raw internal dataset name.
 */
export function versionTagFromDataset(datasetName: string | null): string {
  if (!datasetName) return "Unknown source";
  const match = WORKAROUNDS_VERSION_RE.exec(datasetName);
  if (match) {
    const [, major, minor] = match;
    return minor ? `v${major}.${minor}` : `v${major}`;
  }
  if (datasetName === "incidents") return "Incident record";
  return datasetName;
}

/** Drift-state -> text label (03-UI-SPEC.md Copywriting Contract). */
export const DRIFT_LABEL: Record<DriftState, string> = {
  stable: "🟢 Stable",
  aging: "🟡 Aging",
  drifting: "🔴 Drifting",
};
