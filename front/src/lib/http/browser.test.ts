import { afterEach, describe, expect, it, vi } from "vitest";

import { bffJson } from "./browser";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("bffJson", () => {
  it("keeps structured retryable failures from the BFF", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: "timeout",
      status: 504,
      message: "The upstream service timed out.",
      requestId: "request-123",
      retryable: true,
    }), { status: 504, headers: { "content-type": "application/json" } })));

    await expect(bffJson("/api/products", { method: "GET" }, (value) => value)).rejects.toMatchObject({
      detail: { code: "timeout", requestId: "request-123", retryable: true, status: 504 },
    });
  });

  it("classifies non-JSON gateway failures as retryable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Bad Gateway", {
      status: 502,
      headers: { "x-request-id": "edge-request" },
    })));

    await expect(bffJson("/api/products", { method: "GET" }, (value) => value)).rejects.toMatchObject({
      detail: { code: "upstream_failure", requestId: "edge-request", retryable: true, status: 502 },
    });
  });

  it("bounds stalled browser requests", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_path: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })));

    const pending = bffJson("/api/products", { method: "GET" }, (value) => value);
    const rejection = expect(pending).rejects.toMatchObject({
      detail: { code: "timeout", retryable: true, status: 504 },
    });
    await vi.advanceTimersByTimeAsync(20_000);
    await rejection;
  });

  it("lets checkout override the default deadline for payment initiation", async () => {
    vi.useFakeTimers();
    let aborted = false;
    vi.stubGlobal("fetch", vi.fn((_path: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        aborted = true;
        reject(new DOMException("Aborted", "AbortError"));
      });
    })));

    const pending = bffJson("/api/checkout", { method: "POST" }, (value) => value, 90_000);
    const rejection = expect(pending).rejects.toMatchObject({ detail: { code: "timeout", status: 504 } });
    await vi.advanceTimersByTimeAsync(20_000);
    expect(aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(70_000);
    await rejection;
    expect(aborted).toBe(true);
  });
});
