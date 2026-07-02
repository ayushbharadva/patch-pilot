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
import { getClient } from "./client";

export const ingest = (request: IngestRequest): Promise<IngestResult> =>
  getClient().ingest(request);

export const recall = (request: RecallRequest): Promise<RecallResult> =>
  getClient().recall(request);

export const feedback = (request: FeedbackRequest): Promise<FeedbackResult> =>
  getClient().feedback(request);

export const releaseUpload = (
  request: ReleaseRequest,
): Promise<ReleaseResult> => getClient().releaseUpload(request);

export const driftStatus = (
  request: DriftRequest,
): Promise<DriftStatusResult> => getClient().driftStatus(request);

export const forget = (request: ForgetRequest): Promise<ForgetResult> =>
  getClient().forget(request);

export const demoReset = (): Promise<DemoResetResult> =>
  getClient().demoReset();

export const graph = (request: GraphRequest): Promise<GraphData> =>
  getClient().graph(request);

export {
  setScenario,
  getScenario,
  resetScenarios,
  type MockScenarioState,
} from "./scenarios";

export {
  validateIngestFile,
  ACCEPTED_EXTENSIONS,
  MAX_FILE_BYTES,
  type FileValidationResult,
} from "@/lib/mock/validation";
