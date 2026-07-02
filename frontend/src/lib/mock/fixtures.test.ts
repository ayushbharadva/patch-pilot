import { describe, expect, it } from "vitest";
import {
  demoResetResult,
  driftStatusResult,
  feedbackResult,
  forgetResult,
  incidents,
  ingestResult,
  memoryGraph,
  recallByBug,
  releaseResult,
} from "./fixtures";

const bannedMarkers: readonly RegExp[] = [
  /lorem ipsum/i,
  /sample text/i,
  /your text here/i,
  /test123/i,
  /\bplaceholder\b/i,
  /\bchangeme\b/i,
  /\bTBD\b/,
  /\bLorem\b/i,
];

const fixtureBundle: Record<string, unknown> = {
  ingestResult,
  feedbackResult,
  releaseResult,
  driftStatusResult,
  forgetResult,
  demoResetResult,
  recallByBug,
  memoryGraph,
  incidents,
};

describe("mock fixtures", () => {
  const serialized = JSON.stringify(fixtureBundle);

  it("contains no placeholder markers", () => {
    for (const marker of bannedMarkers) {
      expect(serialized).not.toMatch(marker);
    }
  });

  it("exposes a non-placeholder payload for every lifecycle action", () => {
    expect(ingestResult.datasetName.length).toBeGreaterThan(0);
    expect(ingestResult.acceptedItems).toBeGreaterThan(0);
    expect(feedbackResult.status.length).toBeGreaterThan(0);
    expect(releaseResult.datasetName.length).toBeGreaterThan(0);
    expect(releaseResult.driftResults.length).toBeGreaterThan(0);
    expect(driftStatusResult.affected.length).toBeGreaterThan(0);
    expect(forgetResult.status.length).toBeGreaterThan(0);
    expect(forgetResult.datasetName.length).toBeGreaterThan(0);
    expect(demoResetResult.status.length).toBeGreaterThan(0);
  });

  it("provides distinct pre-forget and post-forget recall per bug", () => {
    const pairs = Object.values(recallByBug);
    expect(pairs.length).toBeGreaterThan(0);
    for (const pair of pairs) {
      expect(pair.preForget.diagnosis.rootCause.length).toBeGreaterThan(0);
      expect(pair.postForget.diagnosis.rootCause.length).toBeGreaterThan(0);
      expect(pair.preForget.diagnosis.recommendedFix).not.toBe(
        pair.postForget.diagnosis.recommendedFix,
      );
      expect(pair.preForget.phase).toBe("pre-forget");
      expect(pair.postForget.phase).toBe("post-forget");
    }
  });

  it("provides a drift reason for every affected memory", () => {
    for (const affected of driftStatusResult.affected) {
      expect(affected.reason.length).toBeGreaterThan(0);
      expect(affected.memoryTitle.length).toBeGreaterThan(0);
    }
  });

  it("provides a non-empty memory graph", () => {
    expect(memoryGraph.nodes.length).toBeGreaterThan(0);
    expect(memoryGraph.links.length).toBeGreaterThan(0);
  });
});
