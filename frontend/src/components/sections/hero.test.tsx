import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Hero } from "@/components/sections/hero-3d";

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

function countWords(text: string): number {
	return text
		.trim()
		.split(/\s+/)
		.filter((token) => token !== "—")
		.filter((token) => token.length > 0).length;
}

describe("Hero landing constraints", () => {
	beforeEach(() => {
		globalThis.IntersectionObserver =
			IntersectionObserverStub as unknown as typeof IntersectionObserver;
		stubMatchMedia();
	});

	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it("renders a single h1 value proposition of at most eight words", () => {
		render(<Hero />);

		const heading = screen.getByRole("heading", { level: 1 });
		const text = heading.textContent ?? "";

		expect(countWords(text)).toBeLessThanOrEqual(8);
	});

	it("renders a supporting sentence of one sentence and at most 160 characters", () => {
		render(<Hero />);

		const heading = screen.getByRole("heading", { level: 1 });
		const supporting = heading.parentElement?.querySelector("p");
		const text = (supporting?.textContent ?? "").trim();

		expect(text.length).toBeGreaterThan(0);
		expect(text.length).toBeLessThanOrEqual(160);
		expect((text.match(/\./g) ?? []).length).toBe(1);
		expect(text.endsWith(".")).toBe(true);
		expect(text.slice(0, -1)).not.toMatch(/\.\s/);
	});
});
