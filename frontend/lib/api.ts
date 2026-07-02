/**
 * Typed fetch wrapper mirroring backend/search.py's `/search` contract
 * exactly (02-PATTERNS.md "Frontend files" — client and server payload
 * shapes must stay in lockstep).
 */

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/** One evidence snippet (RECALL-02 / D-07 / D-08). */
export interface EvidenceSnippet {
  excerpt: string;
  full_text: string;
  source: string | null;
}

interface SearchResponseOk {
  status: "ok";
  root_cause: string;
  evidence: EvidenceSnippet[];
  source_dataset: string | null;
  session_id: string;
  qa_id: string | null;
}

interface SearchResponseNoResults {
  status: "no_results";
}

interface SearchResponseError {
  status: "error";
  message: string;
}

/** Discriminated union matching backend/search.py's exact three shapes. */
export type SearchResponse =
  | SearchResponseOk
  | SearchResponseNoResults
  | SearchResponseError;

/**
 * POST {query} to `${API_BASE}/search`, returning the typed union.
 * Network/parse failures are normalized into the `error` variant so
 * callers never need a separate try/catch for D-24 (short human message,
 * never raw exception text).
 */
export async function searchIncident(query: string): Promise<SearchResponse> {
  try {
    const res = await fetch(`${API_BASE}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      return {
        status: "error",
        message: "Search failed. Please try again in a moment.",
      };
    }

    return (await res.json()) as SearchResponse;
  } catch {
    return {
      status: "error",
      message: "Search failed. Please try again in a moment.",
    };
  }
}
