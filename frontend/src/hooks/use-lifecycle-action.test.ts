import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { LifecycleError } from "@/types";

import { useLifecycleAction } from "./use-lifecycle-action";

describe("useLifecycleAction", () => {
  it("retry re-invokes the identical function", async () => {
    const fn = vi.fn((): Promise<string> => Promise.resolve("ok"));

    const { result } = renderHook(() => useLifecycleAction(fn));

    act(() => {
      result.current.run();
    });
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(fn).toHaveBeenCalledTimes(1);
    expect(result.current.data).toBe("ok");

    act(() => {
      result.current.run();
    });
    await waitFor(() => expect(fn).toHaveBeenCalledTimes(2));
  });

  it("normalizes thrown errors and retries the same function", async () => {
    const fn = vi.fn((): Promise<string> => Promise.reject(new Error("boom")));

    const { result } = renderHook(() =>
      useLifecycleAction(fn, { action: "recall" }),
    );

    act(() => {
      result.current.run();
    });
    await waitFor(() => expect(result.current.status).toBe("error"));

    expect(result.current.error).toEqual({
      action: "recall",
      code: "MOCK_ERROR",
      message: "boom",
    });

    act(() => {
      result.current.run();
    });
    await waitFor(() => expect(fn).toHaveBeenCalledTimes(2));
  });

  it("passes through an already-normalized LifecycleError", async () => {
    const lifecycleError: LifecycleError = {
      action: "forget",
      code: "VALIDATION_ERROR",
      message: "invalid bug id",
    };
    const fn = vi.fn((): Promise<string> => Promise.reject(lifecycleError));

    const { result } = renderHook(() =>
      useLifecycleAction(fn, { action: "forget" }),
    );

    act(() => {
      result.current.run();
    });
    await waitFor(() => expect(result.current.status).toBe("error"));

    expect(result.current.error).toEqual(lifecycleError);
  });
});
