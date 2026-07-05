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

/** Three-state memory health (DRIFT-01) -- matches backend/drift.py's
 * compute_drift_states literals exactly. */
export type DriftState = "stable" | "aging" | "drifting";

interface SearchResponseOk {
  status: "ok";
  root_cause: string;
  evidence: EvidenceSnippet[];
  source_dataset: string | null;
  session_id: string;
  qa_id: string | null;
  /** The winning source_dataset's drift state (DRIFT-01, UI-SPEC Interaction
   * Contract point 6) -- null only when no primary result was picked. */
  drift_state: DriftState | null;
  /** STRETCH-01: real confidence in [0,1] derived from the CHUNKS
   * retriever's similarity score, best-effort -- null when no scored
   * evidence was available (never fails the search). */
  confidence: number | null;
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

/** One repo row from GET /github/repos (GIT-02 repo picker). */
export interface GithubRepo {
  full_name: string;
  description: string;
  open_issues: number;
  pushed_at: string | null;
}

export type GithubReposResponse =
  | { status: "ok"; repos: GithubRepo[] }
  | { status: "error"; message: string };

/**
 * GET `${API_BASE}/github/repos?username=...` (GIT-02) -- lists a user's
 * public repos for the in-app picker. Network/parse failures normalize to
 * the `error` variant (D-24), same convention as every other call here.
 */
export async function getGithubRepos(username: string): Promise<GithubReposResponse> {
  try {
    const res = await fetch(
      `${API_BASE}/github/repos?username=${encodeURIComponent(username)}`,
    );
    if (!res.ok) {
      return { status: "error", message: "Couldn't load repositories. Please try again." };
    }
    return (await res.json()) as GithubReposResponse;
  } catch {
    return { status: "error", message: "Couldn't load repositories. Please try again." };
  }
}

/**
 * POST {url} to `${API_BASE}/ingest/github` (GIT-01) -- fetches GitHub
 * issue(s) server-side and ingests them as tickets. The response reuses
 * IngestResponse exactly (same {status, dataset, files} accepted shape as
 * POST /ingest), so callers share the status-polling + row-rendering path.
 */
export async function ingestGithub(url: string): Promise<IngestResponse> {
  try {
    const res = await fetch(`${API_BASE}/ingest/github`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (!res.ok) {
      return {
        status: "error",
        message: "Couldn't fetch from GitHub. Please try again.",
      };
    }

    return (await res.json()) as IngestResponse;
  } catch {
    return {
      status: "error",
      message: "Couldn't fetch from GitHub. Please try again.",
    };
  }
}

/** Discriminated union matching backend/github_ingest.py's POST /github/sync
 * response exactly (GIT-03): accepted (new issues queued), up_to_date
 * (nothing new since the last sync watermark), or error. */
export type GithubSyncResponse =
  | { status: "accepted"; dataset: string; files: string[]; new_count: number }
  | { status: "up_to_date"; message: string; new_count: 0 }
  | { status: "error"; message: string };

/**
 * POST {url} to `${API_BASE}/github/sync` (GIT-03 "Sync Now") -- incremental
 * issue sync: only issues created since the last sync are fetched and
 * ingested. First sync of a repo behaves like the one-time import.
 */
export async function syncGithub(url: string): Promise<GithubSyncResponse> {
  try {
    const res = await fetch(`${API_BASE}/github/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (!res.ok) {
      return {
        status: "error",
        message: "Couldn't sync from GitHub. Please try again.",
      };
    }

    return (await res.json()) as GithubSyncResponse;
  } catch {
    return {
      status: "error",
      message: "Couldn't sync from GitHub. Please try again.",
    };
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

/**
 * Feedback + dataset-list wrappers mirroring backend/feedback.py's
 * `/feedback/accept` and backend/datasets_router.py's `/datasets` contracts
 * (FEEDBACK-01, FEEDBACK-02, RELEASE-01, D-10/D-11/D-12/D-15).
 */

interface AcceptFeedbackReinforcedResponse {
  status: "reinforced";
}

interface AcceptFeedbackErrorResponse {
  status: "error";
  message: string;
}

/** Discriminated union matching backend/feedback.py's POST /feedback/accept response. */
export type AcceptFeedbackResponse =
  | AcceptFeedbackReinforcedResponse
  | AcceptFeedbackErrorResponse;

/**
 * POST {session_id, qa_id, source_dataset} to `${API_BASE}/feedback/accept`
 * (FEEDBACK-01/02). There is deliberately no rejectFeedback() wrapper --
 * Dismiss (D-10) is a silent client-side removal with no backend call.
 */
export async function acceptFeedback({
  session_id,
  qa_id,
  source_dataset,
}: {
  session_id: string;
  qa_id: string;
  source_dataset: string;
}): Promise<AcceptFeedbackResponse> {
  try {
    const res = await fetch(`${API_BASE}/feedback/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id, qa_id, source_dataset }),
    });

    if (!res.ok) {
      return {
        status: "error",
        message: "Could not save feedback. Please try again.",
      };
    }

    return (await res.json()) as AcceptFeedbackResponse;
  } catch {
    return {
      status: "error",
      message: "Could not save feedback. Please try again.",
    };
  }
}

/**
 * Forget wrapper mirroring backend/forget.py's `POST /forget` contract
 * (FORGET-01, FORGET-02, D-24).
 */

interface ForgetForgottenResponse {
  status: "forgotten";
  dataset: string;
}

interface ForgetErrorResponse {
  status: "error";
  message: string;
}

/** Discriminated union matching backend/forget.py's POST /forget response exactly. */
export type ForgetResponse = ForgetForgottenResponse | ForgetErrorResponse;

/**
 * POST {dataset} to `${API_BASE}/forget` (FORGET-01). Network/parse
 * failures are normalized into the `error` variant (D-24) — the fallback
 * message must match backend/forget.py's `_MSG_ERROR` exactly.
 */
export async function forgetDataset({
  dataset,
}: {
  dataset: string;
}): Promise<ForgetResponse> {
  try {
    const res = await fetch(`${API_BASE}/forget`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataset }),
    });

    if (!res.ok) {
      return {
        status: "error",
        message: "Could not forget dataset. Please try again.",
      };
    }

    return (await res.json()) as ForgetResponse;
  } catch {
    return {
      status: "error",
      message: "Could not forget dataset. Please try again.",
    };
  }
}

/**
 * Reset wrapper mirroring backend/reset.py's `POST /reset` contract
 * (DEMO-01, D-03/D-04/D-05, D-24).
 */

interface ResetOkResponse {
  status: "reset";
}

interface ResetErrorResponse {
  status: "error";
  message: string;
}

/** Discriminated union matching backend/reset.py's POST /reset response exactly. */
export type ResetResponse = ResetOkResponse | ResetErrorResponse;

/**
 * POST to `${API_BASE}/reset` (DEMO-01) — restores the fresh demo snapshot,
 * releasing every open Cognee engine handle server-side first. Network/parse
 * failures are normalized into the `error` variant (D-24) — the fallback
 * message must match backend/reset.py's `_MSG_ERROR` exactly.
 */
export async function resetMemory(): Promise<ResetResponse> {
  try {
    const res = await fetch(`${API_BASE}/reset`, { method: "POST" });

    if (!res.ok) {
      return {
        status: "error",
        message: "Could not reset memory. Please try again.",
      };
    }

    return (await res.json()) as ResetResponse;
  } catch {
    return {
      status: "error",
      message: "Could not reset memory. Please try again.",
    };
  }
}

/**
 * Ops-feed wrappers mirroring backend/events.py's `GET /events` contract
 * (OPS-01) — the live Memory Operations feed + analytics tiles.
 */

/** Lifecycle event kinds — must match backend/events.py's EVENT_KINDS. */
export type OpsEventKind =
  | "remember"
  | "recall"
  | "improve"
  | "forget"
  | "drift"
  | "reset";

/** One recorded lifecycle event (OPS-01). */
export interface OpsEvent {
  seq: number;
  ts: string;
  kind: OpsEventKind;
  dataset: string | null;
  detail: string;
}

export interface OpsEventsResponse {
  status: "ok";
  events: OpsEvent[];
  latest_seq: number;
  stats: Record<OpsEventKind, number>;
}

/**
 * GET `${API_BASE}/events?after=N` (OPS-01). Throws on !ok (same shape as
 * listDatasets) so useQuery surfaces the error state; the feed component
 * renders its own quiet error branch.
 */
export async function getOpsEvents(after = 0): Promise<OpsEventsResponse> {
  const res = await fetch(`${API_BASE}/events?after=${after}`);
  if (!res.ok) {
    throw new Error("Could not load memory operations.");
  }
  return (await res.json()) as OpsEventsResponse;
}

/** One dataset-list row (D-15): `{name}` mono + doc count, plus its
 * DRIFT-01/02/03 health state and (drifting rows only) a generated reason. */
export interface DatasetInfo {
  name: string;
  doc_count: number;
  drift_state: DriftState;
  drift_reason: string | null;
}

/**
 * GET `${API_BASE}/datasets` (RELEASE-01/D-15). Network/parse failures
 * resolve to an empty list rather than throwing, so a transient hiccup
 * renders an empty dataset list instead of crashing the section.
 */
export async function listDatasets(): Promise<DatasetInfo[]> {
  const res = await fetch(`${API_BASE}/datasets`);
  if (!res.ok) {
    throw new Error("Could not load datasets.");
  }
  return (await res.json()) as DatasetInfo[];
}

/**
 * Memory graph wrapper mirroring backend/graph.py's `GET /graph` contract
 * (GRAPH-01, D-06/D-07/D-08). The backend already trims each node to
 * id/label/group and each link to source/target/label (T-04-06) — no raw
 * chunk text ever crosses the wire.
 */

/** One graph node — id/label/group + owning dataset and its drift state
 * (GRAPH-02; backend trims everything else). */
export interface GraphNode {
  id: string;
  label: string;
  group: string;
  dataset: string;
  drift_state: DriftState;
}

/** One graph link — source/target/label only. */
export interface GraphLink {
  source: string;
  target: string;
  label: string;
}

/** The full `{nodes, links}` payload react-force-graph consumes. */
export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface GraphOkResponse extends GraphData {
  status: "ok";
}

interface GraphErrorResponse {
  status: "error";
  message: string;
}

/** Discriminated union matching backend/graph.py's GET /graph response
 * exactly (CR-02) — the success shape now carries an explicit "ok"
 * discriminant since the endpoint always returns HTTP 200 even on error. */
type GraphResponse = GraphOkResponse | GraphErrorResponse;

/**
 * GET `${API_BASE}/graph` (GRAPH-01). Mirrors listDatasets's throw-on-!ok
 * shape so useQuery surfaces the error state — a transient hiccup renders
 * the graph section's error branch rather than crashing the page.
 *
 * CR-02: backend/graph.py returns `{status: "error", message}` with HTTP
 * 200 on aggregation failure, so `res.ok` alone can't detect it -- the
 * parsed body's `status` must be checked too, or MemoryGraphView.tsx
 * crashes rendering `data.nodes.length` on an `undefined` `nodes`.
 */
export async function getMemoryGraph(): Promise<GraphData> {
  const res = await fetch(`${API_BASE}/graph`);
  if (!res.ok) {
    throw new Error("Could not load memory graph.");
  }
  const data = (await res.json()) as GraphResponse;
  if (data.status === "error") {
    throw new Error(data.message);
  }
  return { nodes: data.nodes, links: data.links };
}
