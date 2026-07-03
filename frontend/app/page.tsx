"use client";

import { useState } from "react";

import { DatasetList } from "@/components/DatasetList";
import { DiagnosisCard, DiagnosisCardSkeleton } from "@/components/DiagnosisCard";
import { ResetButton } from "@/components/ResetButton";
import { EXAMPLE_QUERY, SearchBar } from "@/components/SearchBar";
import { UploadPanel } from "@/components/UploadPanel";
import { searchIncident, type SearchResponse } from "@/lib/api";

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

  async function handleReSearch() {
    if (!lastQuery) return;
    setIsReSearching(true);
    const result = await searchIncident(lastQuery);
    setIsReSearching(false);
    setResponse(result);
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <section aria-label="Demo controls" className="flex justify-end">
        <ResetButton />
      </section>

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
        ) : (
          <EmptyState />
        )}
        {isReSearching ? (
          <p className="font-sans text-sm text-muted-foreground">
            Updating diagnosis with reinforced memory…
          </p>
        ) : null}
      </section>

      <section aria-label="Upload incident memory">
        <UploadPanel />
      </section>

      <section aria-label="Datasets">
        <DatasetList onForgotten={() => void handleReSearch()} />
      </section>
    </main>
  );
}

/** Pre-search empty state (D-19). */
function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-20 text-center">
      <h1 className="font-display text-[28px] leading-[1.2] font-semibold text-foreground">
        Search your incident memory
      </h1>
      <p className="font-sans text-base text-muted-foreground">
        Search an incident, e.g.{" "}
        <span className="font-mono text-sm text-foreground">
          &ldquo;{EXAMPLE_QUERY}&rdquo;
        </span>
      </p>
    </div>
  );
}
