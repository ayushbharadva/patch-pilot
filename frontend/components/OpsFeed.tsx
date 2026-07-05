"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Brain,
  RotateCcw,
  Search,
  Trash2,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";
import { getOpsEvents, type OpsEvent, type OpsEventKind } from "@/lib/api";

export const OPS_EVENTS_QUERY_KEY = ["ops-events"] as const;

/** Poll cadence — fast enough that an ingest/forget lands on the feed while
 * the demo camera is still on it, slow enough to be a trivial backend load. */
const POLL_INTERVAL_MS = 2000;

/** Kind -> icon, lifecycle verb label, and drift-palette color classes,
 * matching DatasetList/IncidentTimeline's color language. */
const KIND_META: Record<
  OpsEventKind,
  { icon: LucideIcon; label: string; text: string; ring: string }
> = {
  remember: { icon: Brain, label: "remember()", text: "text-drift-stable", ring: "border-drift-stable/40" },
  recall: { icon: Search, label: "recall()", text: "text-accent-indigo", ring: "border-accent-indigo/40" },
  improve: { icon: TrendingUp, label: "improve()", text: "text-accent-violet", ring: "border-accent-violet/40" },
  drift: { icon: AlertTriangle, label: "drift", text: "text-drift-drifting", ring: "border-drift-drifting/40" },
  forget: { icon: Trash2, label: "forget()", text: "text-drift-aging", ring: "border-drift-aging/40" },
  reset: { icon: RotateCcw, label: "reset", text: "text-muted-foreground", ring: "border-border/60" },
};

function relativeTime(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

function FeedRow({ event }: { event: OpsEvent }) {
  const meta = KIND_META[event.kind] ?? KIND_META.reset;
  const Icon = meta.icon;
  return (
    <li
      className={cn(
        "glass flex items-start gap-3 rounded-xl border px-3.5 py-2.5",
        meta.ring,
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", meta.text)} aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className={cn("font-mono text-xs font-semibold", meta.text)}>
            {meta.label}
          </span>
          {event.dataset ? (
            <span className="font-mono text-xs text-muted-foreground">{event.dataset}</span>
          ) : null}
          <span className="ml-auto font-sans text-xs text-muted-foreground">
            {relativeTime(event.ts)}
          </span>
        </div>
        <p className="font-sans text-sm text-foreground">{event.detail}</p>
      </div>
    </li>
  );
}

/**
 * Live Memory Operations feed + analytics tiles (OPS-01): polls GET /events
 * every 2s so every remember/recall/improve/forget/drift action appears on
 * screen moments after the backend performs it — the memory system visibly
 * alive, not a static search index.
 */
export function OpsFeed() {
  const { data, isLoading, isError } = useQuery({
    queryKey: OPS_EVENTS_QUERY_KEY,
    queryFn: () => getOpsEvents(),
    refetchInterval: POLL_INTERVAL_MS,
  });

  const events = [...(data?.events ?? [])].reverse();
  const stats = data?.stats;
  const tiles: { label: string; value: number; text?: string }[] = stats
    ? [
        { label: "Remembered", value: stats.remember },
        { label: "Recalls", value: stats.recall },
        { label: "Reinforced", value: stats.improve },
        { label: "Drift caught", value: stats.drift, text: "text-drift-drifting" },
        { label: "Forgotten", value: stats.forget },
      ]
    : [];

  return (
    <Card className="glow-soft animate-rise-in gap-4 border-border/60 p-6">
      <CardHeader className="flex flex-row items-center gap-2 p-0">
        <h2 className="font-display text-xl font-semibold text-gradient">
          Memory Operations
        </h2>
        <span className="relative ml-1 flex size-2" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-drift-stable/60" />
          <span className="relative inline-flex size-2 rounded-full bg-drift-stable" />
        </span>
        <span className="font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Live
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-0">
        {stats ? (
          <div className="flex flex-wrap gap-3">
            {tiles.map((tile) => (
              <div
                key={tile.label}
                className="glass flex min-w-[7.5rem] flex-1 flex-col rounded-xl border border-border/60 px-4 py-3"
              >
                <span
                  className={cn(
                    "font-display text-2xl font-semibold text-foreground",
                    tile.text,
                  )}
                >
                  {tile.value}
                </span>
                <span className="font-sans text-sm font-semibold text-muted-foreground">
                  {tile.label}
                </span>
              </div>
            ))}
          </div>
        ) : null}
        {isLoading ? (
          <p className="font-sans text-sm text-muted-foreground">Listening for memory operations…</p>
        ) : isError ? (
          <p className="font-sans text-sm font-semibold text-destructive">
            Could not load memory operations. Please try again.
          </p>
        ) : events.length > 0 ? (
          <ul className="flex max-h-[26rem] flex-col gap-2 overflow-y-auto pr-1">
            {events.map((event) => (
              <FeedRow key={event.seq} event={event} />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={Activity}
            title="No memory operations yet"
            hint="Search, upload, or forget — every lifecycle action shows up here live."
          />
        )}
      </CardContent>
    </Card>
  );
}
