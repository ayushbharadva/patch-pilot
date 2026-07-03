import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let prefersReducedMotion = false;

vi.mock("motion/react", async (importOriginal) => {
	const actual = await importOriginal<typeof import("motion/react")>();
	return {
		...actual,
		useReducedMotion: () => prefersReducedMotion,
	};
});

const { Reveal } = await import("./reveal");

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

describe("Reveal", () => {
	beforeEach(() => {
		globalThis.IntersectionObserver =
			IntersectionObserverStub as unknown as typeof IntersectionObserver;
	});

	afterEach(() => {
		prefersReducedMotion = false;
	});

	it("renders children immediately in a plain div when reduced motion is preferred", () => {
		prefersReducedMotion = true;

		const { container } = render(
			<Reveal className="reveal-class">
				<span>Reduced content</span>
			</Reveal>,
		);

		expect(screen.getByText("Reduced content")).toBeInTheDocument();

		const wrapper = container.firstElementChild;
		expect(wrapper?.tagName).toBe("DIV");
		expect(wrapper).toHaveClass("reveal-class");
		expect(wrapper).not.toHaveStyle({ opacity: "0" });
		expect(wrapper?.getAttribute("style") ?? "").not.toContain("transform");
	});

	it("preserves children content when motion is enabled", () => {
		prefersReducedMotion = false;

		render(
			<Reveal>
				<span>Animated content</span>
			</Reveal>,
		);

		expect(screen.getByText("Animated content")).toBeInTheDocument();
	});
});
