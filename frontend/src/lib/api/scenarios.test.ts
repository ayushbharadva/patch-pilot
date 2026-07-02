import fc from "fast-check";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { LifecycleAction } from "@/types";
import {
  getScenario,
  resetScenarios,
  setScenario,
  type MockScenarioState,
} from "@/lib/api/scenarios";

const ACTIONS: readonly LifecycleAction[] = [
  "ingest",
  "recall",
  "feedback",
  "releaseUpload",
  "driftStatus",
  "forget",
  "demoReset",
  "graph",
] as const;

const STATES: readonly MockScenarioState[] = [
  "success",
  "error",
  "delayed",
] as const;

const assignmentArb = fc.array(
  fc.record({
    action: fc.constantFrom(...ACTIONS),
    state: fc.constantFrom(...STATES),
  }),
  { maxLength: 50 },
);

describe("scenario selection", () => {
  beforeEach(() => {
    resetScenarios();
  });

  afterAll(() => {
    resetScenarios();
  });

  // Feature: cognee-hackathon-frontend, Property 2: Scenario selection is independent per action
  it("returns the last state assigned per action, independent of other actions", () => {
    fc.assert(
      fc.property(assignmentArb, (assignments) => {
        resetScenarios();

        const expected: Record<LifecycleAction, MockScenarioState> = {
          ingest: "success",
          recall: "success",
          feedback: "success",
          releaseUpload: "success",
          driftStatus: "success",
          forget: "success",
          demoReset: "success",
          graph: "success",
        };

        for (const { action, state } of assignments) {
          setScenario(action, state);
          expected[action] = state;
        }

        for (const action of ACTIONS) {
          expect(getScenario(action)).toBe(expected[action]);
        }
      }),
      { numRuns: 500 },
    );
  });
});
