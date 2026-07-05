'use client';

import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { searchIncident, type SearchResponse } from '@/lib/api';

/** Canonical demo query locked in Phase 1 (D-19). */
export const EXAMPLE_QUERY = 'customers double-charged';

interface SearchBarProps {
  onPendingChange: (pending: boolean) => void;
  onResponse: (response: SearchResponse) => void;
  /**
   * Reports the trimmed query text at submit time (form submit or chip
   * click) so the page can re-run the SAME query after an Accept (D-12) —
   * DiagnosisCard has no visibility into SearchBar's internal query state
   * otherwise.
   */
  onQuery?: (query: string) => void;
}

/**
 * Persistent top search bar (D-18) + clickable example-query chip (D-19).
 * Owns only the input + chip and the search mutation — results are lifted
 * to the page via onPendingChange/onResponse, never rendered here.
 */
export function SearchBar({
  onPendingChange,
  onResponse,
  onQuery,
}: SearchBarProps) {
  const [query, setQuery] = useState('');

  const mutation = useMutation({
    mutationFn: searchIncident,
    onMutate: () => {
      onPendingChange(true);
    },
    onSuccess: (response) => {
      onPendingChange(false);
      onResponse(response);
    },
    onError: () => {
      // searchIncident() already normalizes network/parse failures into the
      // `error` variant, so this branch is a defensive fallback for a
      // truly unexpected throw — still D-24 compliant (short human message,
      // never raw exception text).
      onPendingChange(false);
      onResponse({
        status: 'error',
        message: 'Search failed. Please try again in a moment.',
      });
    },
  });

  function submit(value: string) {
    const trimmed = value.trim();
    if (!trimmed || mutation.isPending) return;
    onQuery?.(trimmed);
    mutation.mutate(trimmed);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit(query);
  }

  function handleChipClick() {
    setQuery(EXAMPLE_QUERY);
    submit(EXAMPLE_QUERY);
  }

  return (
    <div className="sticky top-16 z-20 -mx-6 flex flex-col gap-3 border-b border-border/60 bg-background/70 px-6 pt-6 pb-4 backdrop-blur-xl">
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <div className="group relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder='Search an incident, e.g. "customers double-charged"'
            aria-label="Search incident memory"
            className="h-14 w-full rounded-xl pr-4 pl-12 text-base"
          />
        </div>
        <Button
          type="submit"
          disabled={mutation.isPending || !query.trim()}
          className="h-14 rounded-xl px-7 font-sans text-sm font-semibold"
        >
          Search
        </Button>
      </form>

      <button
        type="button"
        onClick={handleChipClick}
        disabled={mutation.isPending}
        className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/45 bg-muted px-4 py-1.5 font-mono text-sm text-muted-foreground transition-all hover:border-primary hover:text-foreground focus-visible:border-ring focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
        aria-label={`Search example query: ${EXAMPLE_QUERY}`}
      >
        <Search aria-hidden="true" className="size-3.5 text-primary" />
        {EXAMPLE_QUERY}
      </button>
    </div>
  );
}
