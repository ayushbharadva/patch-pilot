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

/**
 * Ingest wrappers mirroring backend/ingest.py's `/ingest`, `/ingest/status`,
 * and `/sample/load` contracts (INGEST-01, RELEASE-01, D-01/D-02/D-14/D-16).
 */

/** Content-type selector values (D-01) -- must match backend/ingest.py's CONTENT_TYPES exactly. */
export type ContentType = "ticket" | "chat" | "changelog" | "release_note";

/** Per-file/per-dataset badge states (D-05/D-22) -- mirrors backend/ingest.py's STATUS_MAP values. */
export type IngestStatus = "processing" | "ready" | "failed";

interface IngestAcceptedResponse {
  status: "accepted";
  dataset: string;
  files: string[];
}

interface IngestErrorResponse {
  status: "error";
  message: string;
}

/** Discriminated union matching backend/ingest.py's POST /ingest response exactly. */
export type IngestResponse = IngestAcceptedResponse | IngestErrorResponse;

/**
 * POST a typed multi-file batch to `${API_BASE}/ingest` (D-01/D-02).
 * Network/parse failures are normalized into the `error` variant (D-24),
 * same convention as searchIncident().
 */
export async function uploadFiles({
  files,
  contentType,
  releaseVersion,
}: {
  files: File[];
  contentType: ContentType;
  releaseVersion?: string;
}): Promise<IngestResponse> {
  try {
    const form = new FormData();
    for (const file of files) {
      form.append("files", file);
    }
    form.append("content_type", contentType);
    if (releaseVersion) {
      form.append("release_version", releaseVersion);
    }

    const res = await fetch(`${API_BASE}/ingest`, {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      return { status: "error", message: "Upload failed. Please try again." };
    }

    return (await res.json()) as IngestResponse;
  } catch {
    return { status: "error", message: "Upload failed. Please try again." };
  }
}

/**
 * GET `${API_BASE}/ingest/status?dataset=...` (D-05/D-22 polling). Network
 * failures resolve to "processing" rather than throwing, so a transient
 * hiccup doesn't flip a row to Failed on its own.
 */
export async function pollIngestStatus(dataset: string): Promise<IngestStatus> {
  try {
    const res = await fetch(
      `${API_BASE}/ingest/status?dataset=${encodeURIComponent(dataset)}`,
    );
    if (!res.ok) return "processing";
    const data = (await res.json()) as { status?: IngestStatus };
    return data.status ?? "processing";
  } catch {
    return "processing";
  }
}

interface SampleLoadAcceptedResponse {
  status: "accepted";
  datasets: string[];
}

interface SampleLoadErrorResponse {
  status: "error";
  message: string;
}

/** Discriminated union matching backend/ingest.py's POST /sample/load response. */
export type SampleLoadResponse = SampleLoadAcceptedResponse | SampleLoadErrorResponse;

/** POST `${API_BASE}/sample/load` -- ingests the bundled Stripe arc (D-03/D-04). */
export async function loadSampleData(): Promise<SampleLoadResponse> {
  try {
    const res = await fetch(`${API_BASE}/sample/load`, { method: "POST" });
    if (!res.ok) {
      return {
        status: "error",
        message: "Couldn't load sample data. Please try again.",
      };
    }
    return (await res.json()) as SampleLoadResponse;
  } catch {
    return {
      status: "error",
      message: "Couldn't load sample data. Please try again.",
    };
  }
}
