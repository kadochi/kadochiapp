import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/env", () => ({
  env: { WORDPRESS_INTERNAL_URL: "http://wordpress" },
}));

import { parseUpstreamJson, wordpressErrorDetail, wordpressFetch } from "./upstream";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("wordpressFetch", () => {
  it("keeps public revalidated GETs cacheable while attaching a cancellation signal", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);

    await wordpressFetch("/wp-json/wc/store/v1/products?page=1", {
      requestId: "request-one",
      next: { revalidate: 60, tags: ["products"] },
    });
    await wordpressFetch("/wp-json/wc/store/v1/products?page=1", {
      requestId: "request-two",
      next: { revalidate: 60, tags: ["products"] },
    });

    const firstInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const secondInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(firstInit.headers).toEqual({ Accept: "application/json" });
    expect(secondInit.headers).toEqual({ Accept: "application/json" });
    expect(firstInit.signal).toBeInstanceOf(AbortSignal);
    expect(secondInit.signal).toBeInstanceOf(AbortSignal);
  });

  it("aborts a timed-out cacheable request", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((url: URL, init?: RequestInit) => {
      void url;
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const pending = wordpressFetch("/wp-json/wc/store/v1/products?page=1", {
      requestId: "request-cache-timeout",
      timeoutMs: 25,
      next: { revalidate: 60, tags: ["products"] },
    });
    const rejection = expect(pending).rejects.toMatchObject({
      detail: {
        code: "timeout",
        requestId: "request-cache-timeout",
        retryable: true,
        status: 504,
      },
    });

    await vi.advanceTimersByTimeAsync(25);
    await rejection;

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.headers).toEqual({ Accept: "application/json" });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.signal?.aborted).toBe(true);
  });

  it("forces requests carrying customer credentials out of the shared cache", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);

    await wordpressFetch("/wp-json/wc/store/v1/cart", {
      headers: { Authorization: "Bearer private-token" },
      next: { revalidate: 60, tags: ["cart"] },
      requestId: "request-private",
    });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.cache).toBe("no-store");
    expect(init.next).toBeUndefined();
    expect(init.headers).toEqual({ Accept: "application/json", Authorization: "Bearer private-token", "X-Request-ID": "request-private" });
  });

  it("keeps correlation and timeout aborts for no-store mutations", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }));
    vi.stubGlobal("fetch", fetchMock);

    const pending = wordpressFetch("/wp-json/kadochi/v1/otp/start", {
      method: "POST",
      body: "{}",
      cache: "no-store",
      requestId: "request-timeout",
      timeoutMs: 25,
    });
    const rejection = expect(pending).rejects.toMatchObject({
      detail: {
        code: "timeout",
        requestId: "request-timeout",
        retryable: true,
        status: 504,
      },
    });

    await vi.advanceTimersByTimeAsync(25);
    await rejection;

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.headers).toEqual({ Accept: "application/json", "X-Request-ID": "request-timeout" });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.signal?.aborted).toBe(true);
  });

  it("bounds a stalled response-body read with the response timeout", async () => {
    vi.useFakeTimers();
    const response = {
      json: vi.fn(() => new Promise<unknown>(() => undefined)),
    } as unknown as Response;

    const pending = parseUpstreamJson(response, (value) => value, "request-body-timeout");
    const rejection = expect(pending).rejects.toMatchObject({
      detail: {
        code: "timeout",
        requestId: "request-body-timeout",
        retryable: true,
        status: 504,
      },
    });

    await vi.advanceTimersByTimeAsync(8_000);
    await rejection;
  });
});

describe("wordpressErrorDetail", () => {
  it("keeps cooldown separate from the real hourly limit and carries its retry delay", () => {
    expect(wordpressErrorDetail(429, {
      code: "kadochi_otp_cooldown",
      data: { status: 429, retryAfter: 42 },
    }, "request-123")).toMatchObject({
      code: "otp_cooldown",
      status: 429,
      retryAfter: 42,
      retryable: true,
    });

    expect(wordpressErrorDetail(429, {
      code: "kadochi_otp_rate_limited",
      data: { status: 429, retryAfter: 3600 },
    }, "request-123")).toMatchObject({
      code: "otp_rate_limited",
      status: 429,
      retryAfter: 3600,
    });
  });

  it("keeps documented relay failures distinct and safely falls back for unknown errors", () => {
    expect(wordpressErrorDetail(504, { code: "kadochi_otp_provider_timeout" }, "request-123")).toMatchObject({
      code: "otp_provider_timeout",
      status: 504,
      retryable: true,
    });
    expect(wordpressErrorDetail(502, { code: "unexpected_provider_error" }, "request-123")).toMatchObject({
      code: "upstream_failure",
      status: 502,
    });
  });

  it("preserves the payment-in-progress contract and its safe retry delay", () => {
    expect(wordpressErrorDetail(409, {
      code: "kadochi_payment_in_progress",
      data: { status: 409, retryAfter: 12 },
    }, "request-123")).toMatchObject({
      code: "payment_in_progress",
      status: 409,
      retryAfter: 12,
      retryable: true,
    });
  });

  it("does not classify a definite WordPress gateway rejection as a transport retry", () => {
    expect(wordpressErrorDetail(502, { code: "kadochi_payment_unavailable" }, "request-123")).toMatchObject({
      code: "upstream_failure",
      status: 502,
      retryable: false,
    });
  });
});
