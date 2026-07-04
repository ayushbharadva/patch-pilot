"use client";

import { DiagnosisCard, DiagnosisCardSkeleton } from "@/components/DiagnosisCard";
import { EXAMPLE_QUERY, SearchBar } from "@/components/SearchBar";
import { SearchProgress } from "@/components/SearchProgress";
import { SessionStats } from "@/components/SessionStats";
import { useSearchSession } from "@/lib/search-session";

/**
 * Diagnose route (D-17/D-18/D-19): persistent search bar on top, results
 * region below. All search state now lives in `useSearchSession()` — it
 * survives navigation to the other 3 `/app/*` routes (SearchBar only owns
 * the input + chip).
 */
export default function DiagnosePage() {
  const session = useSearchSession();

  // Only shows the F1 delta badge on the card it actually applies to — a
  // fresh search (setLastQuery) or a forget re-search both clear
  // `reinforcement`, so this naturally becomes `undefined` (no badge) then.
  const reinforcedFrom =
    session.reinforcement && session.reinforcement.query === session.lastQuery
      ? session.reinforcement.fromConfidence
      : undefined;

  function handleReSearchAfterAccept() {
    const priorConfidence =
      session.response?.status === "ok" ? session.response.confidence : null;
    session.markReinforced(priorConfidence);
    void session.reSearch("reinforce");
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-10">
      <SearchBar
        onPendingChange={(pending) => session.setSearchPending(pending)}
        onResponse={(response) => session.finishSearch(response)}
        onQuery={(query) => session.setLastQuery(query)}
      />

      <section aria-live="polite" className="flex flex-col gap-8">
        {session.isPending ? (
          <DiagnosisCardSkeleton />
        ) : session.hasSearched && session.response ? (
          <div className="animate-rise-in">
            <DiagnosisCard
              // Re-mount on every new search (fresh session_id/qa_id) so a
              // prior card's Accept/Dismiss state never bleeds into the next
              // search's card.
              key={
                session.response.status === "ok"
                  ? (session.response.qa_id ?? session.response.session_id)
                  : `${session.response.status}-${session.lastQuery ?? ""}`
              }
              response={session.response}
              onReSearch={handleReSearchAfterAccept}
              reinforcedFrom={reinforcedFrom}
            />
          </div>
        ) : (
          <EmptyState />
        )}
        {session.isReSearching ? (
          <SearchProgress
            showSpinner
            srLabel="Updating diagnosis with reinforced memory."
          />
        ) : null}
      </section>

      <SessionStats />
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
