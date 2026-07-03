import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Space_Grotesk: () => ({ variable: "--font-display" }),
  Inter: () => ({ variable: "--font-sans" }),
  IBM_Plex_Mono: () => ({ variable: "--font-mono" }),
}));

vi.mock("next/og", () => ({
  ImageResponse: class { },
}));

const { metadata } = await import("@/app/layout");
const openGraphImage = await import("@/app/opengraph-image");

describe("root metadata", () => {
  it("defines a title with default and template", () => {
    const title = metadata.title;

    expect(title).toBeTypeOf("object");
    if (typeof title === "object" && title !== null && "default" in title) {
      expect(typeof title.default).toBe("string");
      expect((title.default as string).length).toBeGreaterThan(0);
      expect(typeof title.template).toBe("string");
      expect((title.template as string).length).toBeGreaterThan(0);
    }
  });

  it("defines a non-empty description", () => {
    expect(typeof metadata.description).toBe("string");
    expect((metadata.description as string).length).toBeGreaterThan(0);
  });

  it("defines an OpenGraph object", () => {
    expect(metadata.openGraph).toBeDefined();
    expect(metadata.openGraph).toBeTypeOf("object");
  });
});

describe("file-based OpenGraph image", () => {
  it("exports the 1200x630 image size", () => {
    expect(openGraphImage.size).toEqual({ width: 1200, height: 630 });
  });

  it("exports a content type and alt text", () => {
    expect(typeof openGraphImage.contentType).toBe("string");
    expect(openGraphImage.contentType.length).toBeGreaterThan(0);
    expect(typeof openGraphImage.alt).toBe("string");
    expect(openGraphImage.alt.length).toBeGreaterThan(0);
  });

  it("exports a default image factory", () => {
    expect(typeof openGraphImage.default).toBe("function");
  });
});
