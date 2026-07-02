import type {
  DemoResetResult,
  DriftStatusResult,
  FeedbackRequest,
  FeedbackResult,
  ForgetRequest,
  ForgetResult,
  GraphData,
  IngestRequest,
  IngestResult,
  RecallRequest,
  RecallResult,
  ReleaseRequest,
  ReleaseResult,
} from "@/types";
import {
  demoResetResult,
  driftStatusResult,
  feedbackResult,
  ingestResult,
  memoryGraph,
  releaseResult,
} from "@/lib/mock/fixtures";
import { simulate } from "@/lib/mock/simulate";
import {
  getForgetDataset,
  markForgotten,
  resetSession,
  resolveRecall,
} from "@/lib/mock/store";
import type { PatchPilotClient } from "./client";
import { getScenario } from "./scenarios";

export function createMockClient(): PatchPilotClient {
  return {
    ingest(request: IngestRequest): Promise<IngestResult> {
      void request;
      return simulate("ingest", getScenario("ingest"), () => ingestResult);
    },
    recall(request: RecallRequest): Promise<RecallResult> {
      return simulate("recall", getScenario("recall"), () => {
        const result = resolveRecall(request.bugId);
        return {
          ...result,
          diagnosis: { ...result.diagnosis, bugId: request.bugId },
        };
      });
    },
    feedback(request: FeedbackRequest): Promise<FeedbackResult> {
      void request;
      return simulate(
        "feedback",
        getScenario("feedback"),
        () => feedbackResult,
      );
    },
    releaseUpload(request: ReleaseRequest): Promise<ReleaseResult> {
      void request;
      return simulate(
        "releaseUpload",
        getScenario("releaseUpload"),
        () => releaseResult,
      );
    },
    driftStatus(): Promise<DriftStatusResult> {
      return simulate(
        "driftStatus",
        getScenario("driftStatus"),
        () => driftStatusResult,
      );
    },
    forget(request: ForgetRequest): Promise<ForgetResult> {
      return simulate("forget", getScenario("forget"), () => {
        markForgotten(request.bugId);
        const datasetName =
          request.datasetName.length > 0
            ? request.datasetName
            : getForgetDataset(request.bugId);
        return { status: "forgotten", datasetName };
      });
    },
    demoReset(): Promise<DemoResetResult> {
      return simulate("demoReset", getScenario("demoReset"), () => {
        resetSession();
        return demoResetResult;
      });
    },
    graph(): Promise<GraphData> {
      return simulate("graph", getScenario("graph"), () => memoryGraph);
    },
  };
}
