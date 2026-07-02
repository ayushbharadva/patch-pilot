import { beforeEach, describe, expect, it } from "vitest";
import * as api from "./index";

const lifecycleFunctionNames = [
  "ingest",
  "recall",
  "feedback",
  "releaseUpload",
  "driftStatus",
  "forget",
  "demoReset",
] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

describe("API_Client_Layer public surface", () => {
  beforeEach(() => {
    api.resetScenarios();
  });

  it("exposes all seven lifecycle actions as callable functions", () => {
    for (const name of lifecycleFunctionNames) {
      expect(typeof api[name]).toBe("function");
    }
  });

  it("exposes the graph action and scenario controls", () => {
    expect(typeof api.graph).toBe("function");
    expect(typeof api.setScenario).toBe("function");
    expect(typeof api.getScenario).toBe("function");
    expect(typeof api.resetScenarios).toBe("function");
  });

  it("resolves ingest to an object with the expected keys", async () => {
    const result = await api.ingest({});
    expect(isObject(result)).toBe(true);
    expect(result.status).toBe("processing");
    expect(typeof result.datasetName).toBe("string");
    expect(result.acceptedItems).toBeGreaterThan(0);
  });

  it("resolves recall to a diagnosis for a known bug", async () => {
    const result = await api.recall({ bugId: "BUG-2043", query: "logout" });
    expect(isObject(result)).toBe(true);
    expect(result.diagnosis.bugId).toBe("BUG-2043");
    expect(result.diagnosis.rootCause.length).toBeGreaterThan(0);
    expect(result.phase).toBe("pre-forget");
  });

  it("resolves the remaining lifecycle actions to objects", async () => {
    const feedback = await api.feedback({ bugId: "BUG-2043", accepted: true });
    const release = await api.releaseUpload({
      version: "v1.9.0",
      components: ["session-service"],
    });
    const drift = await api.driftStatus({});
    const forget = await api.forget({
      bugId: "BUG-2043",
      datasetName: "workarounds_v1_7",
    });
    const reset = await api.demoReset();
    const graph = await api.graph({});

    for (const result of [feedback, release, drift, forget, reset, graph]) {
      expect(isObject(result)).toBe(true);
    }
    expect(forget.status).toBe("forgotten");
    expect(reset.status).toBe("reset");
    expect(graph.nodes.length).toBeGreaterThan(0);
  });
});
