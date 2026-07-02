"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { LifecycleAction, LifecycleError } from "@/types";

type LifecycleStatus = "idle" | "loading" | "success" | "error";

export interface LifecycleActionState<TData> {
  data: TData | null;
  status: LifecycleStatus;
  error: LifecycleError | null;
  run: () => void;
}

export interface UseLifecycleActionOptions {
  immediate?: boolean;
  action?: LifecycleAction;
}

function isLifecycleError(value: unknown): value is LifecycleError {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.action === "string" &&
    typeof candidate.code === "string" &&
    typeof candidate.message === "string"
  );
}

function normalizeError(
  value: unknown,
  action: LifecycleAction,
): LifecycleError {
  if (isLifecycleError(value)) {
    return value;
  }
  const message =
    value instanceof Error ? value.message : "An unexpected error occurred.";
  return { action, code: "MOCK_ERROR", message };
}

export function useLifecycleAction<TData>(
  fn: () => Promise<TData>,
  options?: UseLifecycleActionOptions,
): LifecycleActionState<TData> {
  const { immediate = false, action = "recall" } = options ?? {};
  const [data, setData] = useState<TData | null>(null);
  const [status, setStatus] = useState<LifecycleStatus>(
    immediate ? "loading" : "idle",
  );
  const [error, setError] = useState<LifecycleError | null>(null);

  const mountedRef = useRef(true);
  const fnRef = useRef(fn);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(() => {
    fnRef
      .current()
      .then((result) => {
        if (!mountedRef.current) {
          return;
        }
        setData(result);
        setStatus("success");
      })
      .catch((thrown: unknown) => {
        if (!mountedRef.current) {
          return;
        }
        setError(normalizeError(thrown, action));
        setStatus("error");
      });
  }, [action]);

  const run = useCallback(() => {
    setStatus("loading");
    setError(null);
    execute();
  }, [execute]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  return { data, status, error, run };
}
