import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CtaButton } from "@/components/shared/cta-button";
import { SITE_CONFIG } from "@/config/site";

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

describe("CtaButton size and target", () => {
	beforeEach(() => {
		stubMatchMedia();
	});

	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it("renders a link to the launch destination", () => {
		render(
			<CtaButton href={SITE_CONFIG.launchHref}>Launch PatchPilot</CtaButton>,
		);

		const link = screen.getByRole("link", { name: "Launch PatchPilot" });

		expect(link).toHaveAttribute("href", SITE_CONFIG.launchHref);
	});

	it("encodes a click target of at least 44px through sizing utilities", () => {
		render(
			<CtaButton href={SITE_CONFIG.launchHref}>Launch PatchPilot</CtaButton>,
		);

		const link = screen.getByRole("link", { name: "Launch PatchPilot" });
		const classes = link.className.split(/\s+/);

		expect(classes).toContain("h-12");
		expect(classes).toContain("min-w-11");
	});
});
