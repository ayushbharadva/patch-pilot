import { cleanup, render } from "@testing-library/react";
import { afterEach, expect } from "vitest";
import { fc, test } from "@fast-check/vitest";

import { DiagnosisCard } from "@/components/dashboard/diagnosis-card";
import type { DiagnosisResult, EvidenceChunk } from "@/types";

afterEach(() => {
	cleanup();
});

const evidenceChunkArb: fc.Arbitrary<EvidenceChunk> = fc.record({
	incidentId: fc.string({ minLength: 1, maxLength: 12 }).map((s) => `INC-${s}`),
	excerpt: fc.string(),
	relevance: fc.double({ min: 0, max: 1, noNaN: true }),
});

const diagnosisResultArb: fc.Arbitrary<DiagnosisResult> = fc.record({
	bugId: fc.string({ minLength: 1, maxLength: 12 }).map((s) => `BUG-${s}`),
	rootCause: fc.string({ minLength: 1, maxLength: 40 }).map((s) => `RC⟪${s}⟫`),
	recommendedFix: fc
		.string({ minLength: 1, maxLength: 40 })
		.map((s) => `FIX⟪${s}⟫`),
	confidence: fc.integer({ min: 0, max: 100 }),
	evidence: fc.array(evidenceChunkArb, { minLength: 0, maxLength: 8 }),
});

// Feature: cognee-hackathon-frontend, Property 5: DiagnosisCard renders the full recommendation
// Validates: Requirements 9.3
test.prop([diagnosisResultArb], { numRuns: 200 })(
	"renders the root-cause recommendation and exactly one evidence element per prior incident",
	(result) => {
		const { container, unmount } = render(<DiagnosisCard result={result} />);

		try {
			const items = container.querySelectorAll('[data-testid="evidence-item"]');
			expect(items).toHaveLength(result.evidence.length);

			const listItems = container.querySelectorAll("li");
			expect(listItems).toHaveLength(result.evidence.length);

			const text = container.textContent ?? "";
			expect(text).toContain(result.rootCause);
			expect(text).toContain(result.recommendedFix);
		} finally {
			unmount();
		}
	},
);
