import { beforeEach, describe, expect, it } from "vitest";
import type { DiagnosisResult } from "@/types";
import {
  demoReset,
  driftStatus,
  forget,
  recall,
  resetScenarios,
} from "@/lib/api";

const DEMO_BUG_ID = "BUG-2043";
const DEMO_DATASET = "workarounds_v1_7";
const INDEPENDENT_BUG_ID = "BUG-1876";

function diagnosisFingerprint(diagnosis: DiagnosisResult): string {
  return `${diagnosis.rootCause}::${diagnosis.recommendedFix}`;
}

describe("demo loop integration", () => {
  beforeEach(async () => {
    resetScenarios();
    await demoReset();
  });

  it("flips the recall result across search -> drift -> forget -> re-search within one session", async () => {
    const preForget = await recall({
      bugId: DEMO_BUG_ID,
      query: "users logged out after fifteen minutes",
    });
    expect(preForget.phase).toBe("pre-forget");
    expect(preForget.diagnosis.bugId).toBe(DEMO_BUG_ID);
    const preFingerprint = diagnosisFingerprint(preForget.diagnosis);

    const drift = await driftStatus({});
    expect(drift.affected.length).toBeGreaterThan(0);
    for (const affected of drift.affected) {
      expect(affected.reason.length).toBeGreaterThan(0);
    }

    const forgotten = await forget({
      bugId: DEMO_BUG_ID,
      datasetName: DEMO_DATASET,
    });
    expect(forgotten.status).toBe("forgotten");
    expect(forgotten.datasetName).toBe(DEMO_DATASET);

    const postForget = await recall({
      bugId: DEMO_BUG_ID,
      query: "users logged out after fifteen minutes",
    });
    expect(postForget.phase).toBe("post-forget");
    expect(diagnosisFingerprint(postForget.diagnosis)).not.toBe(preFingerprint);
    expect(
      postForget.diagnosis.rootCause !== preForget.diagnosis.rootCause ||
      postForget.diagnosis.recommendedFix !==
      preForget.diagnosis.recommendedFix,
    ).toBe(true);
  });

  it("forgets one bug without affecting another bug in the same session", async () => {
    await forget({ bugId: DEMO_BUG_ID, datasetName: DEMO_DATASET });

    const forgottenRecall = await recall({
      bugId: DEMO_BUG_ID,
      query: "session drops",
    });
    expect(forgottenRecall.phase).toBe("post-forget");

    const independentRecall = await recall({
      bugId: INDEPENDENT_BUG_ID,
      query: "customers billed twice",
    });
    expect(independentRecall.phase).toBe("pre-forget");
    expect(independentRecall.diagnosis.bugId).toBe(INDEPENDENT_BUG_ID);
  });

  it("restores the original pre-forget result after demo reset", async () => {
    const original = await recall({ bugId: DEMO_BUG_ID, query: "logout" });
    const originalFingerprint = diagnosisFingerprint(original.diagnosis);

    await forget({ bugId: DEMO_BUG_ID, datasetName: DEMO_DATASET });
    const afterForget = await recall({ bugId: DEMO_BUG_ID, query: "logout" });
    expect(afterForget.phase).toBe("post-forget");

    await demoReset();
    const restored = await recall({ bugId: DEMO_BUG_ID, query: "logout" });
    expect(restored.phase).toBe("pre-forget");
    expect(diagnosisFingerprint(restored.diagnosis)).toBe(originalFingerprint);
  });
});
