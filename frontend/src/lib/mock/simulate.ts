import type { LifecycleAction, LifecycleError } from "@/types";

export type SimulationState = "success" | "error" | "delayed";

export type RandomSource = () => number;

export interface SimulateOptions {
  rng?: RandomSource;
  errorMessage?: string;
}

export const MIN_DELAY_MS = 500;

export const MAX_DELAY_MS = 5000;

export function computeDelayMs(rng: RandomSource = Math.random): number {
  const clamped = Math.min(Math.max(rng(), 0), 1);
  const span = MAX_DELAY_MS - MIN_DELAY_MS;
  return MIN_DELAY_MS + Math.round(clamped * span);
}

function createLifecycleError(
  action: LifecycleAction,
  message?: string,
): LifecycleError {
  return {
    action,
    code: "MOCK_ERROR",
    message: message ?? `Simulated failure for ${action}`,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function simulate<T>(
  action: LifecycleAction,
  state: SimulationState,
  resolver: () => T,
  options?: SimulateOptions,
): Promise<T> {
  if (state === "error") {
    throw createLifecycleError(action, options?.errorMessage);
  }

  if (state === "delayed") {
    await delay(computeDelayMs(options?.rng));
  }

  return resolver();
}
