import type { LifecycleAction } from "@/types";

export type MockScenarioState = "success" | "error" | "delayed";

function createDefaultScenarios(): Record<LifecycleAction, MockScenarioState> {
  return {
    ingest: "success",
    recall: "success",
    feedback: "success",
    releaseUpload: "success",
    driftStatus: "success",
    forget: "success",
    demoReset: "success",
    graph: "success",
  };
}

const scenarios: Record<LifecycleAction, MockScenarioState> =
  createDefaultScenarios();

export function setScenario(
  action: LifecycleAction,
  state: MockScenarioState,
): void {
  scenarios[action] = state;
}

export function getScenario(action: LifecycleAction): MockScenarioState {
  return scenarios[action];
}

export function resetScenarios(): void {
  Object.assign(scenarios, createDefaultScenarios());
}
