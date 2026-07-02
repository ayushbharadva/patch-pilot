"use client";

import { useState } from "react";

import { DiagnosisCard, DiagnosisCardSkeleton } from "@/components/DiagnosisCard";
import { EXAMPLE_QUERY, SearchBar } from "@/components/SearchBar";
import type { SearchResponse } from "@/lib/api";

/**
 * Single-page dashboard (D-17): persistent search bar on top, results
 * region below. Holds the current SearchResponse/loading state at the
 * page level and passes it down (SearchBar only owns the input + chip).
 */
export default function Home() {
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <SearchBar
        onPendingChange={(pending) => {
          setIsPending(pending);
          if (pending) setHasSearched(true);
        }}
        onResponse={setResponse}
      />

      <section aria-live="polite" className="flex flex-col gap-8">
        {isPending ? (
          <DiagnosisCardSkeleton />
        ) : hasSearched && response ? (
          <DiagnosisCard response={response} />
        ) : (
          <EmptyState />
        )}
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
