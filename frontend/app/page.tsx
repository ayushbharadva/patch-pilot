"use client";

import { useState } from "react";

import { DatasetList } from "@/components/DatasetList";
import { DiagnosisCard, DiagnosisCardSkeleton } from "@/components/DiagnosisCard";
import { HealthDashboard } from "@/components/HealthDashboard";
import { IncidentTimeline } from "@/components/IncidentTimeline";
import { MemoryGraphView } from "@/components/MemoryGraphView";
import { ResetButton } from "@/components/ResetButton";
import { EXAMPLE_QUERY, SearchBar } from "@/components/SearchBar";
import { SearchProgress } from "@/components/SearchProgress";
import { UploadPanel } from "@/components/UploadPanel";
import { Button } from "@/components/ui/button";
import { searchIncident, type SearchResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Single-page dashboard (D-17): persistent search bar on top, results
 * region below. Holds the current SearchResponse/loading state at the
 * page level and passes it down (SearchBar only owns the input + chip).
 */
export default function Home() {
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  // Tracked so an Accept on the diagnosis card can re-run the SAME query
  // (D-12) — DiagnosisCard has no visibility into SearchBar's own state.
  const [lastQuery, setLastQuery] = useState<string | null>(null);

  // Deliberately separate from `isPending` (the SearchBar-driven flag): if
  // an accept-triggered re-search shared `isPending`, it would swap the
  // just-accepted DiagnosisCard for <DiagnosisCardSkeleton /> in the SAME
  // render batch as the card's own setAccepted(true) — "Reinforced ✓"
  // (D-11) would never actually paint before being replaced. Keeping the
  // re-search pending state separate lets the accepted card stay mounted
  // (still showing "Reinforced ✓") for the duration of the re-search,
  // swapping directly to the new diagnosis once it resolves.
  const [isReSearching, setIsReSearching] = useState(false);

  // D-08: a search/graph tab toggle on the main page — NO navigation away.
  // "search" keeps the existing search/upload/datasets sections; "graph"
  // swaps in the live 3D Cognee memory graph (GRAPH-01).
  const [view, setView] = useState<"search" | "graph">("search");

  async function handleReSearch() {
    if (!lastQuery) return;
    setIsReSearching(true);
    const result = await searchIncident(lastQuery);
    setIsReSearching(false);
    setResponse(result);
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-12">
      <header className="animate-rise-in flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-5xl font-semibold tracking-tight text-gradient sm:text-6xl">
              PatchPilot
            </h1>
            <p className="font-mono text-sm text-muted-foreground sm:text-base">
              every bug remembers its history
            </p>
          </div>
          <ResetButton />
        </div>

        <section aria-label="Demo controls" className="flex items-center justify-between gap-4">
          <div
            role="tablist"
            aria-label="View"
            className="glass inline-flex items-center gap-1 rounded-full p-1"
          >
            <Button
              type="button"
              role="tab"
              aria-selected={view === "search"}
              variant={view === "search" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("search")}
              className={cn(
                "h-9 rounded-full px-5 font-sans",
                view !== "search" && "text-muted-foreground",
              )}
            >
              Search
            </Button>
            <Button
              type="button"
              role="tab"
              aria-selected={view === "graph"}
              variant={view === "graph" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("graph")}
              className={cn(
                "h-9 rounded-full px-5 font-sans",
                view !== "graph" && "text-muted-foreground",
              )}
            >
              Graph
            </Button>
          </div>
        </section>
      </header>

      {view === "search" ? (
        <>
          <SearchBar
            onPendingChange={(pending) => {
              setIsPending(pending);
              if (pending) setHasSearched(true);
            }}
            onResponse={setResponse}
            onQuery={setLastQuery}
          />

          <section aria-live="polite" className="flex flex-col gap-8">
            {isPending ? (
              <DiagnosisCardSkeleton />
            ) : hasSearched && response ? (
              <div className="animate-rise-in">
                <DiagnosisCard
                  // Re-mount on every new search (fresh session_id/qa_id) so a
                  // prior card's Accept/Dismiss state never bleeds into the next
                  // search's card.
                  key={
                    response.status === "ok"
                      ? (response.qa_id ?? response.session_id)
                      : `${response.status}-${lastQuery ?? ""}`
                  }
                  response={response}
                  onReSearch={() => void handleReSearch()}
                />
              </div>
            ) : (
              <EmptyState />
            )}
            {isReSearching ? (
              <SearchProgress
                showSpinner
                srLabel="Updating diagnosis with reinforced memory."
              />
            ) : null}
          </section>

          <section aria-label="Upload incident memory" className="animate-rise-in">
            <UploadPanel />
          </section>

          <section aria-label="Memory health" className="animate-rise-in">
            <HealthDashboard />
          </section>

          <section aria-label="Incident timeline" className="animate-rise-in">
            <IncidentTimeline />
          </section>

          <section aria-label="Datasets" className="animate-rise-in">
            <DatasetList onForgotten={() => void handleReSearch()} />
          </section>
        </>
      ) : (
        <section aria-label="Memory graph" className="animate-rise-in">
          <MemoryGraphView />
        </section>
      )}
    </main>
  );
}

/** Pre-search empty state (D-19). */
function EmptyState() {
  return (
    <div className="glass glow-soft animate-rise-in relative flex flex-col items-center gap-6 overflow-hidden rounded-3xl px-6 py-24 text-center">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-accent-violet/15 blur-3xl"
      />
      <p className="relative font-mono text-xs tracking-[0.28em] text-accent-cyan uppercase">
        Living incident brain
      </p>
      <h1 className="relative max-w-2xl font-display text-4xl leading-[1.08] font-semibold text-gradient sm:text-5xl">
        Every bug remembers its history
      </h1>
      <p className="relative max-w-md font-sans text-base text-muted-foreground sm:text-lg">
        Search your incident memory to recall the root cause, backed by evidence
        from past tickets, chats, and fixes.
      </p>
      <p className="relative flex flex-wrap items-center justify-center gap-2 font-sans text-sm text-muted-foreground">
        Try
        <span className="glow-soft inline-flex items-center rounded-full border border-accent-indigo/45 bg-foreground/[0.05] px-4 py-1.5 font-mono text-sm text-foreground">
          &ldquo;{EXAMPLE_QUERY}&rdquo;
        </span>
      </p>
    </div>
  );
}
