import type {
  DemoResetResult,
  DiagnosisResult,
  DriftStatusResult,
  FeedbackResult,
  ForgetResult,
  GraphData,
  Incident,
  IngestResult,
  RecallResult,
  ReleaseResult,
} from "@/types";

export const INCIDENTS_DATASET = "incidents" as const;

export const incidents = [
  {
    id: "INC-4471",
    title: "Intermittent 401 logouts during long editing sessions",
    source: "ticket",
    summary:
      "Editors working for more than 15 minutes are silently signed out mid-save, losing unsaved draft state.",
    component: "auth-gateway",
    createdAt: "2025-11-14T09:22:00.000Z",
  },
  {
    id: "INC-4460",
    title: "Users forced to re-login after roughly fifteen minutes",
    source: "chat",
    summary:
      "Support thread reports a predictable ~15 minute window before the session cookie stops being accepted.",
    component: "auth-gateway",
    createdAt: "2025-11-13T16:05:00.000Z",
  },
  {
    id: "INC-4502",
    title: "Token refresh race between concurrent browser tabs",
    source: "ticket",
    summary:
      "Two tabs refreshing the access token at once invalidate each other, leaving the older tab with a dead token.",
    component: "session-service",
    createdAt: "2025-11-16T11:48:00.000Z",
  },
  {
    id: "INC-3310",
    title: "Duplicate charges when customers retry checkout",
    source: "ticket",
    summary:
      "A slow gateway response makes shoppers click Pay twice, producing two authorizations for one cart.",
    component: "payments-api",
    createdAt: "2025-10-02T13:10:00.000Z",
  },
  {
    id: "INC-3325",
    title: "Payment webhook delivered twice within 200ms",
    source: "changelog",
    summary:
      "The provider redelivers charge.succeeded events on transient timeouts and our handler treats each as new.",
    component: "payments-api",
    createdAt: "2025-10-03T08:41:00.000Z",
  },
  {
    id: "INC-3350",
    title: "Customer billed twice for a single order",
    source: "chat",
    summary:
      "Escalation from finance: one order id mapped to two settled payments in the ledger for the same amount.",
    component: "billing-worker",
    createdAt: "2025-10-05T18:27:00.000Z",
  },
  {
    id: "INC-5120",
    title: "Search results stale after a bulk CSV import",
    source: "ticket",
    summary:
      "After importing a supplier catalog, newly added SKUs do not appear in search for several minutes.",
    component: "search-indexer",
    createdAt: "2025-12-01T10:15:00.000Z",
  },
  {
    id: "INC-5133",
    title: "New products missing from search for about fifteen minutes",
    source: "chat",
    summary:
      "Merchandising reports a consistent lag between publishing a product and it becoming searchable.",
    component: "search-indexer",
    createdAt: "2025-12-02T14:33:00.000Z",
  },
] as const satisfies readonly Incident[];

export const memoryGraph = {
  nodes: [
    { id: "INC-4471", label: "401 logouts mid-session", kind: "incident" },
    { id: "INC-4502", label: "Token refresh race", kind: "incident" },
    { id: "INC-3310", label: "Duplicate checkout charges", kind: "incident" },
    { id: "INC-3325", label: "Webhook delivered twice", kind: "incident" },
    { id: "INC-5120", label: "Stale search after import", kind: "incident" },
    { id: "INC-5133", label: "New products not searchable", kind: "incident" },
    { id: "FIX-901", label: "Refresh-token rotation", kind: "fix" },
    { id: "FIX-902", label: "Payment idempotency keys", kind: "fix" },
    { id: "FIX-903", label: "Event-driven indexing", kind: "fix" },
    { id: "auth-gateway", label: "auth-gateway", kind: "component" },
    { id: "session-service", label: "session-service", kind: "component" },
    { id: "payments-api", label: "payments-api", kind: "component" },
    { id: "billing-worker", label: "billing-worker", kind: "component" },
    { id: "search-indexer", label: "search-indexer", kind: "component" },
  ],
  links: [
    { source: "INC-4471", target: "auth-gateway", relation: "affects" },
    { source: "INC-4502", target: "session-service", relation: "affects" },
    { source: "INC-3310", target: "payments-api", relation: "affects" },
    { source: "INC-3325", target: "payments-api", relation: "affects" },
    { source: "INC-5120", target: "search-indexer", relation: "affects" },
    { source: "INC-5133", target: "search-indexer", relation: "affects" },
    { source: "FIX-901", target: "INC-4471", relation: "resolves" },
    { source: "FIX-901", target: "INC-4502", relation: "resolves" },
    { source: "FIX-902", target: "INC-3310", relation: "resolves" },
    { source: "FIX-902", target: "INC-3325", relation: "resolves" },
    { source: "FIX-903", target: "INC-5120", relation: "resolves" },
    { source: "FIX-903", target: "INC-5133", relation: "resolves" },
    { source: "FIX-901", target: "auth-gateway", relation: "patches" },
    { source: "FIX-902", target: "payments-api", relation: "patches" },
    { source: "FIX-903", target: "search-indexer", relation: "patches" },
  ],
} as const satisfies GraphData;

export const BUG_IDS = ["BUG-2043", "BUG-1876", "BUG-3120"] as const;

export type BugId = (typeof BUG_IDS)[number];

export const workaroundDatasetByBug = {
  "BUG-2043": "workarounds_v1_7",
  "BUG-1876": "workarounds_v1_6",
  "BUG-3120": "workarounds_v1_8",
} as const satisfies Record<BugId, string>;

export interface RecallPair {
  preForget: RecallResult;
  postForget: RecallResult;
}

const authPreForget = {
  bugId: "BUG-2043",
  rootCause:
    "Access tokens expire after 15 minutes and the client never refreshes them, so long sessions die when the token lapses.",
  recommendedFix:
    "Client-side workaround: intercept the first 401, silently retry the request once, and bounce the user to the login screen if the retry also fails.",
  confidence: 61,
  evidence: [
    {
      incidentId: "INC-4460",
      excerpt:
        "Support thread confirms a predictable ~15 minute window before the session cookie stops being accepted.",
      relevance: 0.72,
    },
    {
      incidentId: "INC-4471",
      excerpt:
        "Editors are signed out mid-save after 15 minutes and lose unsaved draft state.",
      relevance: 0.68,
    },
  ],
} as const satisfies DiagnosisResult;

const authPostForget = {
  bugId: "BUG-2043",
  rootCause:
    "The gateway issued short-lived access tokens with no refresh path, and concurrent tabs raced each other into an invalid token state.",
  recommendedFix:
    "Adopt refresh-token rotation with a sliding 8-hour expiry in session-service: each refresh issues a new token pair and revokes the previous one, and a single-flight lock coalesces concurrent tab refreshes.",
  confidence: 94,
  evidence: [
    {
      incidentId: "INC-4502",
      excerpt:
        "Two tabs refreshing at once invalidate each other, leaving the older tab holding a dead token.",
      relevance: 0.91,
    },
    {
      incidentId: "INC-4471",
      excerpt:
        "Long editing sessions are the primary trigger for the silent logout.",
      relevance: 0.83,
    },
  ],
} as const satisfies DiagnosisResult;

const paymentsPreForget = {
  bugId: "BUG-1876",
  rootCause:
    "Slow gateway responses make shoppers click Pay twice, and the checkout endpoint authorizes each click independently.",
  recommendedFix:
    "Operational workaround: a billing-worker cron scans for two settled payments sharing one order id every 10 minutes and issues a refund for the later charge.",
  confidence: 58,
  evidence: [
    {
      incidentId: "INC-3310",
      excerpt:
        "A slow gateway response makes shoppers click Pay twice, producing two authorizations for one cart.",
      relevance: 0.7,
    },
    {
      incidentId: "INC-3350",
      excerpt:
        "One order id mapped to two settled payments in the ledger for the same amount.",
      relevance: 0.66,
    },
  ],
} as const satisfies DiagnosisResult;

const paymentsPostForget = {
  bugId: "BUG-1876",
  rootCause:
    "The payments-api had no idempotency guard, so both duplicate client clicks and provider webhook redeliveries created separate charges.",
  recommendedFix:
    "Require an Idempotency-Key derived from the cart id on every payment intent, persist the first result, and return the stored result for any repeat key so retries and webhook redeliveries are no-ops.",
  confidence: 96,
  evidence: [
    {
      incidentId: "INC-3325",
      excerpt:
        "The provider redelivers charge.succeeded events on transient timeouts and the handler treats each as new.",
      relevance: 0.93,
    },
    {
      incidentId: "INC-3310",
      excerpt:
        "Double-clicking Pay under a slow response is the most common duplicate-charge trigger.",
      relevance: 0.8,
    },
  ],
} as const satisfies DiagnosisResult;

const searchPreForget = {
  bugId: "BUG-3120",
  rootCause:
    "Bulk imports write straight to the primary database, and search only sees the changes on the next scheduled full reindex.",
  recommendedFix:
    "Workaround: run the full reindex job every 15 minutes instead of hourly so imported SKUs surface sooner, accepting the extra load on search-indexer.",
  confidence: 55,
  evidence: [
    {
      incidentId: "INC-5120",
      excerpt:
        "After importing a supplier catalog, newly added SKUs do not appear in search for several minutes.",
      relevance: 0.69,
    },
    {
      incidentId: "INC-5133",
      excerpt:
        "Consistent lag observed between publishing a product and it becoming searchable.",
      relevance: 0.64,
    },
  ],
} as const satisfies DiagnosisResult;

const searchPostForget = {
  bugId: "BUG-3120",
  rootCause:
    "Indexing relied on a periodic full rebuild, so any write was invisible to search until the next batch ran.",
  recommendedFix:
    "Stream database change events into search-indexer and apply incremental upserts per document, making newly imported SKUs searchable within seconds and retiring the periodic full reindex.",
  confidence: 92,
  evidence: [
    {
      incidentId: "INC-5133",
      excerpt:
        "Merchandising needs products searchable immediately after publish, not on a batch cadence.",
      relevance: 0.88,
    },
    {
      incidentId: "INC-5120",
      excerpt:
        "Bulk CSV imports are the largest single source of stale-search complaints.",
      relevance: 0.82,
    },
  ],
} as const satisfies DiagnosisResult;

export const recallByBug = {
  "BUG-2043": {
    preForget: { diagnosis: authPreForget, phase: "pre-forget" },
    postForget: { diagnosis: authPostForget, phase: "post-forget" },
  },
  "BUG-1876": {
    preForget: { diagnosis: paymentsPreForget, phase: "pre-forget" },
    postForget: { diagnosis: paymentsPostForget, phase: "post-forget" },
  },
  "BUG-3120": {
    preForget: { diagnosis: searchPreForget, phase: "pre-forget" },
    postForget: { diagnosis: searchPostForget, phase: "post-forget" },
  },
} as const satisfies Record<BugId, RecallPair>;

export const ingestResult = {
  status: "processing",
  datasetName: INCIDENTS_DATASET,
  acceptedItems: 42,
} as const satisfies IngestResult;

export const feedbackResult = {
  status: "reinforced",
} as const satisfies FeedbackResult;

export const releaseResult = {
  datasetName: "workarounds_v1_9",
  driftResults: [
    {
      datasetName: "workarounds_v1_7",
      memoryTitle: "Retry-once 401 workaround",
      state: "drifting",
      reason:
        "Release v1.9.0 shipped refresh-token rotation in session-service, so the client-side retry workaround now contradicts the supported fix.",
      recommendForget: true,
    },
    {
      datasetName: "workarounds_v1_6",
      memoryTitle: "Cron refund of duplicate charges",
      state: "drifting",
      reason:
        "Idempotency keys on payment intents prevent duplicate charges at the source, making the reactive refund cron obsolete.",
      recommendForget: true,
    },
    {
      datasetName: "workarounds_v1_8",
      memoryTitle: "15-minute full reindex",
      state: "aging",
      reason:
        "Event-driven indexing is rolling out; the frequent full reindex still works but is being superseded and adds avoidable load.",
      recommendForget: false,
    },
  ],
} as const satisfies ReleaseResult;

export const driftStatusResult = {
  affected: [
    {
      datasetName: "workarounds_v1_7",
      memoryTitle: "Retry-once 401 workaround",
      state: "drifting",
      reason:
        "Superseded by refresh-token rotation; recalling this workaround would send engineers down a path the platform no longer supports.",
      recommendForget: true,
    },
    {
      datasetName: "workarounds_v1_6",
      memoryTitle: "Cron refund of duplicate charges",
      state: "drifting",
      reason:
        "Duplicate charges are now prevented upstream by idempotency keys, so the compensating refund job is actively misleading.",
      recommendForget: true,
    },
    {
      datasetName: "workarounds_v1_8",
      memoryTitle: "15-minute full reindex",
      state: "aging",
      reason:
        "Still functional but scheduled for removal once event-driven indexing is fully enabled across all catalogs.",
      recommendForget: false,
    },
  ],
} as const satisfies DriftStatusResult;

export const forgetResult = {
  status: "forgotten",
  datasetName: "workarounds_v1_7",
} as const satisfies ForgetResult;

export const demoResetResult = {
  status: "reset",
} as const satisfies DemoResetResult;
