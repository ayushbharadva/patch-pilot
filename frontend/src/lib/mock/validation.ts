export const ACCEPTED_EXTENSIONS = [
  ".txt",
  ".md",
  ".json",
  ".csv",
  ".log",
] as const;

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export interface FileValidationResult {
  valid: boolean;
  reason?: "too-large" | "unsupported-format";
}

export function validateIngestFile(file: {
  name: string;
  size: number;
}): FileValidationResult {
  const normalizedName = file.name.toLowerCase();
  const hasAcceptedExtension = ACCEPTED_EXTENSIONS.some((extension) =>
    normalizedName.endsWith(extension),
  );

  if (!hasAcceptedExtension) {
    return { valid: false, reason: "unsupported-format" };
  }

  if (file.size > MAX_FILE_BYTES) {
    return { valid: false, reason: "too-large" };
  }

  return { valid: true };
}
