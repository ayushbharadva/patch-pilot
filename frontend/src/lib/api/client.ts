import type {
  DemoResetResult,
  DriftRequest,
  DriftStatusResult,
  FeedbackRequest,
  FeedbackResult,
  ForgetRequest,
  ForgetResult,
  GraphData,
  GraphRequest,
  IngestRequest,
  IngestResult,
  RecallRequest,
  RecallResult,
  ReleaseRequest,
  ReleaseResult,
} from "@/types";
import { createMockClient } from "./mock-client";

export interface PatchPilotClient {
  ingest(request: IngestRequest): Promise<IngestResult>;
  recall(request: RecallRequest): Promise<RecallResult>;
  feedback(request: FeedbackRequest): Promise<FeedbackResult>;
  releaseUpload(request: ReleaseRequest): Promise<ReleaseResult>;
  driftStatus(request: DriftRequest): Promise<DriftStatusResult>;
  forget(request: ForgetRequest): Promise<ForgetResult>;
  demoReset(): Promise<DemoResetResult>;
  graph(request: GraphRequest): Promise<GraphData>;
}

let activeClient: PatchPilotClient | null = null;

export function getClient(): PatchPilotClient {
  if (activeClient === null) {
    activeClient = createMockClient();
  }
  return activeClient;
}
