import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("resolves conflicting tailwind utilities in favor of the last", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("drops falsy conditional classes", () => {
    expect(cn("a", false && "b", undefined, "c")).toBe("a c");
  });
});
