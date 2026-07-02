import type { RecallResult } from "@/types";
import { recallByBug, workaroundDatasetByBug, type BugId } from "./fixtures";

interface MockSessionState {
  forgottenBugIds: Set<string>;
}

const sessionState: MockSessionState = {
  forgottenBugIds: new Set<string>(),
};

function isKnownBugId(bugId: string): bugId is BugId {
  return Object.prototype.hasOwnProperty.call(recallByBug, bugId);
}

function synthesizeRecall(bugId: string, forgotten: boolean): RecallResult {
  const phase: RecallResult["phase"] = forgotten
    ? "post-forget"
    : "pre-forget";
  return {
    phase,
    diagnosis: {
      bugId,
      rootCause: forgotten
        ? "No curated post-forget memory exists for this bug identifier in the mock corpus."
        : "No curated pre-forget memory exists for this bug identifier in the mock corpus.",
      recommendedFix:
        "Ingest incidents for this bug identifier to build a diagnosable memory.",
      confidence: 0,
      evidence: [],
    },
  };
}

export function isForgotten(bugId: string): boolean {
  return sessionState.forgottenBugIds.has(bugId);
}

export function markForgotten(bugId: string): void {
  sessionState.forgottenBugIds.add(bugId);
}

export function resetSession(): void {
  sessionState.forgottenBugIds.clear();
}

export function resolveRecall(bugId: string): RecallResult {
  const forgotten = isForgotten(bugId);
  if (!isKnownBugId(bugId)) {
    return synthesizeRecall(bugId, forgotten);
  }
  return forgotten
    ? recallByBug[bugId].postForget
    : recallByBug[bugId].preForget;
}

export function getForgetDataset(bugId: string): string {
  if (isKnownBugId(bugId)) {
    return workaroundDatasetByBug[bugId];
  }
  return "workarounds_unknown";
}
