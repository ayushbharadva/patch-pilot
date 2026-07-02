import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  ACCEPTED_EXTENSIONS,
  MAX_FILE_BYTES,
  validateIngestFile,
} from "./validation";

function hasAcceptedExtension(name: string): boolean {
  const normalized = name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((extension) =>
    normalized.endsWith(extension),
  );
}

const basenameArbitrary = fc.string({ maxLength: 40 });

const acceptedExtensionArbitrary = fc.constantFrom(...ACCEPTED_EXTENSIONS);

const boundarySizeArbitrary = fc.oneof(
  fc.constant(0),
  fc.integer({ min: 0, max: 1024 }),
  fc.constant(MAX_FILE_BYTES - 1),
  fc.constant(MAX_FILE_BYTES),
  fc.constant(MAX_FILE_BYTES + 1),
  fc.integer({ min: MAX_FILE_BYTES + 1, max: MAX_FILE_BYTES * 100 }),
  fc.nat(),
);

const acceptedFileArbitrary = fc
  .record({
    basename: basenameArbitrary,
    extension: acceptedExtensionArbitrary,
    casing: fc.constantFrom<"lower" | "upper" | "mixed">(
      "lower",
      "upper",
      "mixed",
    ),
    size: boundarySizeArbitrary,
  })
  .map(({ basename, extension, casing, size }) => {
    const combined = `${basename}${extension}`;
    const name =
      casing === "upper"
        ? combined.toUpperCase()
        : casing === "mixed"
          ? combined
            .split("")
            .map((char, index) =>
              index % 2 === 0 ? char.toUpperCase() : char.toLowerCase(),
            )
            .join("")
          : combined;
    return { name, size };
  });

const disallowedFileArbitrary = fc
  .record({ name: fc.string({ maxLength: 60 }), size: boundarySizeArbitrary })
  .filter(({ name }) => !hasAcceptedExtension(name));

const anyFileArbitrary = fc.record({
  name: fc.string({ maxLength: 60 }),
  size: fc.oneof(boundarySizeArbitrary, fc.integer()),
});

describe("validateIngestFile", () => {
  // Feature: cognee-hackathon-frontend, Property 4: Ingest file validation is total with a fixed boundary
  it("is total and honors the accepted-extension AND size<=10MB boundary", () => {
    fc.assert(
      fc.property(anyFileArbitrary, (file) => {
        const result = validateIngestFile(file);

        const acceptedExt = hasAcceptedExtension(file.name);
        const withinSize = file.size <= MAX_FILE_BYTES;

        expect(result.valid).toBe(acceptedExt && withinSize);

        if (result.valid) {
          expect(result.reason).toBeUndefined();
        } else if (!acceptedExt) {
          expect(result.reason).toBe("unsupported-format");
        } else {
          expect(result.reason).toBe("too-large");
        }
      }),
      { numRuns: 1000 },
    );
  });

  it("accepts any accepted-extension file at or below the 10MB boundary and rejects oversized ones as too-large", () => {
    fc.assert(
      fc.property(acceptedFileArbitrary, (file) => {
        const result = validateIngestFile(file);
        if (file.size <= MAX_FILE_BYTES) {
          expect(result).toEqual({ valid: true });
        } else {
          expect(result).toEqual({ valid: false, reason: "too-large" });
        }
      }),
      { numRuns: 500 },
    );
  });

  it("rejects disallowed extensions as unsupported-format regardless of size (format checked first)", () => {
    fc.assert(
      fc.property(disallowedFileArbitrary, (file) => {
        const result = validateIngestFile(file);
        expect(result).toEqual({ valid: false, reason: "unsupported-format" });
      }),
      { numRuns: 500 },
    );
  });

  it("accepts a file of exactly 10MB with an accepted extension", () => {
    expect(validateIngestFile({ name: "report.txt", size: MAX_FILE_BYTES })).toEqual({
      valid: true,
    });
  });

  it("rejects a file one byte over 10MB with an accepted extension as too-large", () => {
    expect(
      validateIngestFile({ name: "report.txt", size: MAX_FILE_BYTES + 1 }),
    ).toEqual({ valid: false, reason: "too-large" });
  });

  it("prefers unsupported-format over too-large when a disallowed file is also oversized", () => {
    expect(
      validateIngestFile({ name: "archive.zip", size: MAX_FILE_BYTES + 1 }),
    ).toEqual({ valid: false, reason: "unsupported-format" });
  });
});
