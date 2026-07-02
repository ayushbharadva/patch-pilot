"use client";

import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchIncident, type SearchResponse } from "@/lib/api";

/** Canonical demo query locked in Phase 1 (D-19). */
export const EXAMPLE_QUERY = "customers double-charged";

interface SearchBarProps {
  onPendingChange: (pending: boolean) => void;
  onResponse: (response: SearchResponse) => void;
}

/**
 * Persistent top search bar (D-18) + clickable example-query chip (D-19).
 * Owns only the input + chip and the search mutation — results are lifted
 * to the page via onPendingChange/onResponse, never rendered here.
 */
export function SearchBar({ onPendingChange, onResponse }: SearchBarProps) {
  const [query, setQuery] = useState("");

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
        status: "error",
        message: "Search failed. Please try again in a moment.",
      });
    },
  });

  function submit(value: string) {
    const trimmed = value.trim();
    if (!trimmed || mutation.isPending) return;
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
    <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-border bg-background/95 pt-6 pb-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder='Search an incident, e.g. "customers double-charged"'
          aria-label="Search incident memory"
          className="h-10 flex-1 text-base"
        />
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="h-10 px-4 font-sans text-sm font-semibold"
        >
          Search
        </Button>
      </form>

      <button
        type="button"
        onClick={handleChipClick}
        disabled={mutation.isPending}
        className="w-fit rounded-full border border-border px-3 py-1 font-mono text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:border-primary focus-visible:text-primary focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
        aria-label={`Search example query: ${EXAMPLE_QUERY}`}
      >
        {EXAMPLE_QUERY}
      </button>
    </div>
  );
}
