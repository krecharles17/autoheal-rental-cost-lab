import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useDebounce } from "./useDebounce";

describe("useDebounce", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns the initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello", 500));
    expect(result.current).toBe("hello");
  });

  it("only updates after the delay elapses", () => {
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 500), {
      initialProps: { v: "a" },
    });
    rerender({ v: "b" });
    expect(result.current).toBe("a");
    act(() => void vi.advanceTimersByTime(499));
    expect(result.current).toBe("a");
    act(() => void vi.advanceTimersByTime(1));
    expect(result.current).toBe("b");
  });

  it("collapses rapid changes into the final value", () => {
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 300), {
      initialProps: { v: "" },
    });
    ["l", "li", "lis", "lisb"].forEach((v) => {
      rerender({ v });
      act(() => void vi.advanceTimersByTime(100));
    });
    expect(result.current).toBe("");
    act(() => void vi.advanceTimersByTime(300));
    expect(result.current).toBe("lisb");
  });

  it("uses a 500ms default delay", () => {
    const { result, rerender } = renderHook(({ v }) => useDebounce(v), {
      initialProps: { v: 1 },
    });
    rerender({ v: 2 });
    act(() => void vi.advanceTimersByTime(499));
    expect(result.current).toBe(1);
    act(() => void vi.advanceTimersByTime(1));
    expect(result.current).toBe(2);
  });

  it("works with object values", () => {
    const next = { q: "x" };
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 100), {
      initialProps: { v: { q: "" } },
    });
    rerender({ v: next });
    act(() => void vi.advanceTimersByTime(100));
    expect(result.current).toBe(next);
  });
});
