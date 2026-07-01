import type { DiagnosisResult, DriftResult } from "./domain";

export type LifecycleAction =
  | "ingest"
  | "recall"
  | "feedback"
  | "releaseUpload"
  | "driftStatus"
  | "forget"
  | "demoReset";

export interface IngestRequest {
  fileName?: string;
  sampleDatasetId?: string;
  content?: string;
}

export interface IngestResult {
  status: "processing";
  datasetName: string;
  acceptedItems: number;
}

export interface RecallRequest {
  bugId: string;
  query: string;
}

export interface RecallResult {
  diagnosis: DiagnosisResult;
  phase: "pre-forget" | "post-forget";
}

export interface FeedbackRequest {
  bugId: string;
  accepted: boolean;
  note?: string;
}

export interface FeedbackResult {
  status: "reinforced";
}

export interface ReleaseRequest {
  version: string;
  content?: string;
  components: string[];
}

export interface ReleaseResult {
  datasetName: string;
  driftResults: DriftResult[];
}

export type DriftRequest = Record<string, never>;

export interface DriftStatusResult {
  affected: DriftResult[];
}

export interface ForgetRequest {
  bugId: string;
  datasetName: string;
}

export interface ForgetResult {
  status: "forgotten";
  datasetName: string;
}

export interface DemoResetResult {
  status: "reset";
}

export interface LifecycleError {
  action: LifecycleAction;
  code: "MOCK_ERROR" | "VALIDATION_ERROR";
  message: string;
}
