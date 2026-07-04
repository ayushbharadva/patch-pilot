import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DiagnosisPreview } from "@landing/components/sections/diagnosis-preview";
import { DriftPreview } from "@landing/components/sections/drift-preview";
import { FinalCta } from "@landing/components/sections/final-cta";
import { Hero } from "@landing/components/sections/hero-3d";
import { HowItWorks } from "@landing/components/sections/how-it-works";

class IntersectionObserverStub implements IntersectionObserver {
	readonly root: Element | null = null;
	readonly rootMargin: string = "";
	readonly thresholds: ReadonlyArray<number> = [];
	observe(): void {}
	unobserve(): void {}
	disconnect(): void {}
	takeRecords(): IntersectionObserverEntry[] {
		return [];
	}
}

function stubMatchMedia(): void {
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		addListener: () => {},
		removeListener: () => {},
		dispatchEvent: () => false,
	}));
}

const PLACEHOLDER_MARKERS: readonly RegExp[] = [
	/lorem ipsum/i,
	/sample text/i,
	/your text here/i,
	/placeholder/i,
	/test123/i,
];

describe("Landing content quality", () => {
	beforeEach(() => {
		globalThis.IntersectionObserver =
			IntersectionObserverStub as unknown as typeof IntersectionObserver;
		stubMatchMedia();
	});

	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it("renders no generic placeholder text across landing sections", () => {
		const { container } = render(
			<main>
				<Hero />
				<HowItWorks />
				<DiagnosisPreview />
				<DriftPreview />
				<FinalCta />
			</main>,
		);

		const text = container.textContent ?? "";

		expect(text.length).toBeGreaterThan(0);
		for (const marker of PLACEHOLDER_MARKERS) {
			expect(text).not.toMatch(marker);
		}
	});
});
