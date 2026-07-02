import { beforeEach, describe, expect, it } from "vitest";
import { fc } from "@fast-check/vitest";
import { BUG_IDS, recallByBug, type BugId } from "./fixtures";
import {
  isForgotten,
  markForgotten,
  resetSession,
  resolveRecall,
} from "./store";

type StoreOp =
  | { type: "forget"; bugId: BugId }
  | { type: "reset" }
  | { type: "recall"; bugId: BugId };

const bugIdArb: fc.Arbitrary<BugId> = fc.constantFrom(...BUG_IDS);

const opArb: fc.Arbitrary<StoreOp> = fc.oneof(
  bugIdArb.map((bugId) => ({ type: "forget", bugId }) as const),
  fc.constant({ type: "reset" } as const),
  bugIdArb.map((bugId) => ({ type: "recall", bugId }) as const),
);

const opSequenceArb: fc.Arbitrary<StoreOp[]> = fc.array(opArb, {
  minLength: 1,
  maxLength: 40,
});

function expectedRecall(bugId: BugId, forgotten: boolean) {
  return forgotten
    ? recallByBug[bugId].postForget
    : recallByBug[bugId].preForget;
}

describe("mock session store", () => {
  beforeEach(() => {
    resetSession();
  });

  it("has a distinct pre-forget and post-forget diagnosis per bug", () => {
    for (const bugId of BUG_IDS) {
      const { preForget, postForget } = recallByBug[bugId];
      expect(preForget.phase).toBe("pre-forget");
      expect(postForget.phase).toBe("post-forget");
      expect(postForget).not.toEqual(preForget);
      expect(postForget.diagnosis.rootCause).not.toBe(
        preForget.diagnosis.rootCause,
      );
    }
  });

  it("resolves the requested bug pre-forget until it is forgotten", () => {
    expect(resolveRecall("BUG-2043")).toEqual(recallByBug["BUG-2043"].preForget);
    markForgotten("BUG-2043");
    expect(isForgotten("BUG-2043")).toBe(true);
    expect(resolveRecall("BUG-2043")).toEqual(
      recallByBug["BUG-2043"].postForget,
    );
  });

  it("restores every bug to pre-forget after resetSession", () => {
    for (const bugId of BUG_IDS) markForgotten(bugId);
    resetSession();
    for (const bugId of BUG_IDS) {
      expect(isForgotten(bugId)).toBe(false);
      expect(resolveRecall(bugId)).toEqual(recallByBug[bugId].preForget);
    }
  });

  // Feature: cognee-hackathon-frontend, Property 1: Forget and reset state machine keyed by bug identifier
  // Validates: Requirements 7.6, 7.7, 7.8, 7.9, 9.8
  it("forget/reset state machine keyed by bug identifier holds over any op sequence", () => {
    fc.assert(
      fc.property(opSequenceArb, (ops) => {
        resetSession();
        const forgottenModel = new Set<BugId>();

        for (const op of ops) {
          switch (op.type) {
            case "forget": {
              markForgotten(op.bugId);
              forgottenModel.add(op.bugId);
              break;
            }
            case "reset": {
              resetSession();
              forgottenModel.clear();
              break;
            }
            case "recall": {
              const result = resolveRecall(op.bugId);
              const forgotten = forgottenModel.has(op.bugId);

              expect(result.diagnosis.bugId).toBe(op.bugId);

              expect(result.phase).toBe(
                forgotten ? "post-forget" : "pre-forget",
              );

              expect(result).toEqual(expectedRecall(op.bugId, forgotten));

              for (const otherBugId of BUG_IDS) {
                if (otherBugId === op.bugId) continue;
                expect(isForgotten(otherBugId)).toBe(
                  forgottenModel.has(otherBugId),
                );
              }
              break;
            }
          }
        }
      }),
      { numRuns: 300 },
    );
  });
});
