"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

import { searchIncident, type SearchResponse } from "@/lib/api";

/**
 * Lifecycle ops tracked for the depth kit (LifecycleStrip + SessionStats).
 * Mirrors Cognee's memory lifecycle verbs — remember/recall/improve/forget.
 */
export type LifecycleOp = "remember" | "recall" | "improve" | "forget";

const INITIAL_STATS: Record<LifecycleOp, number> = {
  remember: 0,
  recall: 0,
  improve: 0,
  forget: 0,
};

/** F1 confidence-delta info — the query it applies to lets the Diagnose page
 * decide whether the current card is still the one that was just reinforced. */
interface ReinforcementInfo {
  fromConfidence: number | null;
  query: string;
}

interface SearchSessionValue {
  response: SearchResponse | null;
  lastQuery: string | null;
  /** SearchBar-driven initial search — drives the skeleton swap. */
  isPending: boolean;
  hasSearched: boolean;
  /**
   * Accept/Forget-driven re-search flag — MUST stay separate from
   * `isPending` so an accept-triggered re-search does not swap the
   * just-accepted DiagnosisCard for the skeleton in the same render batch
   * (preserves "Reinforced ✓", D-11/D-12).
   */
  isReSearching: boolean;
  reinforcement: ReinforcementInfo | null;
  stats: Record<LifecycleOp, number>;

  setSearchPending: (pending: boolean) => void;
  /** Records a NEW user search's query and clears any prior reinforcement. */
  setLastQuery: (query: string) => void;
  finishSearch: (response: SearchResponse) => void;
  /** Re-runs `lastQuery`; "forget" also clears `reinforcement` so a forget
   * re-search never shows a stale delta badge. */
  reSearch: (reason: "reinforce" | "forget") => Promise<void>;
  markReinforced: (fromConfidence: number | null) => void;
  recordLifecycleEvent: (op: LifecycleOp) => void;
  resetSession: () => void;
}

const SearchSessionContext = createContext<SearchSessionValue | null>(null);

/**
 * Navigation-surviving search-session provider. MUST be mounted in the
 * nested `app/(mvp)/app/layout.tsx` server layout, never inside a page — a
 * page remounts on every route change, which would wipe this state and kill
 * the cross-route forget→re-search demo beat.
 */
export function SearchSessionProvider({ children }: { children: ReactNode }) {
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [lastQuery, setLastQueryState] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isReSearching, setIsReSearching] = useState(false);
  const [reinforcement, setReinforcement] = useState<ReinforcementInfo | null>(null);
  const [stats, setStats] = useState<Record<LifecycleOp, number>>(INITIAL_STATS);

  const recordLifecycleEvent = useCallback((op: LifecycleOp) => {
    setStats((prev) => ({ ...prev, [op]: prev[op] + 1 }));
  }, []);

  const setSearchPending = useCallback((pending: boolean) => {
    setIsPending(pending);
    if (pending) setHasSearched(true);
  }, []);

  const setLastQuery = useCallback((query: string) => {
    setLastQueryState(query);
    setReinforcement(null);
  }, []);

  const finishSearch = useCallback(
    (result: SearchResponse) => {
      setResponse(result);
      recordLifecycleEvent("recall");
    },
    [recordLifecycleEvent],
  );

  const reSearch = useCallback(
    async (reason: "reinforce" | "forget") => {
      if (!lastQuery) return;
      setIsReSearching(true);
      const result = await searchIncident(lastQuery);
      setIsReSearching(false);
      setResponse(result);
      recordLifecycleEvent("recall");
      if (reason === "forget") setReinforcement(null);
    },
    [lastQuery, recordLifecycleEvent],
  );

  const markReinforced = useCallback(
    (fromConfidence: number | null) => {
      setReinforcement({ fromConfidence, query: lastQuery ?? "" });
      recordLifecycleEvent("improve");
    },
    [lastQuery, recordLifecycleEvent],
  );

  const resetSession = useCallback(() => {
    setResponse(null);
    setLastQueryState(null);
    setReinforcement(null);
    setIsPending(false);
    setHasSearched(false);
    setIsReSearching(false);
    setStats(INITIAL_STATS);
  }, []);

  const value: SearchSessionValue = {
    response,
    lastQuery,
    isPending,
    hasSearched,
    isReSearching,
    reinforcement,
    stats,
    setSearchPending,
    setLastQuery,
    finishSearch,
    reSearch,
    markReinforced,
    recordLifecycleEvent,
    resetSession,
  };

  return (
    <SearchSessionContext.Provider value={value}>{children}</SearchSessionContext.Provider>
  );
}

/** Throws when called outside `SearchSessionProvider` — every `/app/*` route
 * mounts inside the nested layout, so this should never fire in practice. */
export function useSearchSession(): SearchSessionValue {
  const ctx = useContext(SearchSessionContext);
  if (!ctx) {
    throw new Error("useSearchSession must be used within a SearchSessionProvider");
  }
  return ctx;
}
