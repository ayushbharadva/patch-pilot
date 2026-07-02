import { cleanup, render } from "@testing-library/react";
import fc from "fast-check";
import { afterEach, describe, expect, it } from "vitest";

import { DriftPanel } from "@/components/dashboard/drift-panel";
import type { DriftResult, DriftState } from "@/types";

afterEach(() => {
	cleanup();
});

const STATE_LABEL: Record<DriftState, string> = {
	stable: "Stable",
	aging: "Aging",
	drifting: "Drifting",
};

const driftResultsArb = fc.uniqueArray(
	fc.record({
		state: fc.constantFrom<DriftState>("stable", "aging", "drifting"),
		reason: fc.string({ minLength: 1 }),
		datasetName: fc.string({ minLength: 1 }),
		memoryTitle: fc.string({ minLength: 1 }),
		recommendForget: fc.boolean(),
	}),
	{ minLength: 1, maxLength: 8, selector: (r) => r.datasetName },
);

function withUniqueKeys(results: readonly DriftResult[]): DriftResult[] {
	return results.map((result, index) => ({
		...result,
		datasetName: `dataset-${index}-${result.datasetName}`,
		memoryTitle: `memory-${index}-${result.memoryTitle}`,
		reason: `reason-${index}-${result.reason.trim() || "detail"}`,
	}));
}

describe("DriftPanel", () => {
	// Feature: cognee-hackathon-frontend, Property 6: DriftIndicator always shows state and reason
	it("renders one indicator per result, each showing its state and a non-empty reason", () => {
		fc.assert(
			fc.property(driftResultsArb, (generated) => {
				const affected = withUniqueKeys(generated);
				const { unmount, getAllByTestId } = render(
					<DriftPanel affected={affected} />,
				);

				const indicators = getAllByTestId("drift-indicator");
				const states = getAllByTestId("drift-state");
				const reasons = getAllByTestId("drift-reason");

				expect(indicators).toHaveLength(affected.length);
				expect(states).toHaveLength(affected.length);
				expect(reasons).toHaveLength(affected.length);

				const renderedStates = indicators
					.map((node) => node.getAttribute("data-state"))
					.sort();
				const expectedStates = affected.map((r) => r.state).sort();
				expect(renderedStates).toEqual(expectedStates);

				states.forEach((badge, index) => {
					expect(badge.textContent).toContain(
						STATE_LABEL[affected[index].state],
					);
				});

				reasons.forEach((reasonNode, index) => {
					const text = reasonNode.textContent ?? "";
					expect(text.trim().length).toBeGreaterThan(0);
					expect(text).toContain(affected[index].reason);
				});

				unmount();
			}),
			{ numRuns: 200 },
		);
	});

	it("renders the empty state when there are no affected results", () => {
		const { queryAllByTestId, getByText } = render(
			<DriftPanel affected={[]} />,
		);

		expect(queryAllByTestId("drift-indicator")).toHaveLength(0);
		expect(getByText("No memories flagged")).toBeInTheDocument();
	});
});
