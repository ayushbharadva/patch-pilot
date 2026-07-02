import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { computeDelayMs, MAX_DELAY_MS, MIN_DELAY_MS } from "./simulate";

describe("computeDelayMs", () => {
  it("returns the minimum bound when the RNG yields 0", () => {
    expect(computeDelayMs(() => 0)).toBe(MIN_DELAY_MS);
    expect(computeDelayMs(() => 0)).toBe(500);
  });

  it("returns the maximum bound when the RNG yields 1", () => {
    expect(computeDelayMs(() => 1)).toBe(MAX_DELAY_MS);
    expect(computeDelayMs(() => 1)).toBe(5000);
  });

  // Feature: cognee-hackathon-frontend, Property 3: Delayed responses are bounded
  it("bounds the simulated delay to [500ms, 5000ms] for any RNG output", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.double({ noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.constantFrom(0, 1, -0, -1, 2, -1000, 1000, Infinity, -Infinity),
        ),
        (value) => {
          const delay = computeDelayMs(() => value);
          expect(delay).toBeGreaterThanOrEqual(MIN_DELAY_MS);
          expect(delay).toBeLessThanOrEqual(MAX_DELAY_MS);
        },
      ),
      { numRuns: 1000 },
    );
  });
});
