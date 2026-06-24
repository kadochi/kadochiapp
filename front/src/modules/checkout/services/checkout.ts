"use client";

import type { CheckoutStartPayload, CheckoutStartResponse } from "../types";

export async function submitCheckout(
  payload: CheckoutStartPayload,
  options?: { timeoutMs?: number; signal?: AbortSignal },
): Promise<CheckoutStartResponse> {
  const timeoutMs = options?.timeoutMs ?? 15_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let abortCleanup: (() => void) | undefined;

  const signal = options?.signal;
  if (signal) {
    if (signal.aborted) {
      clearTimeout(timer);
      throw signal.reason ?? new DOMException("Aborted", "AbortError");
    }
    const onAbort = () => controller.abort(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    abortCleanup = () => signal.removeEventListener("abort", onAbort);
  }

  try {
    const res = await fetch("/api/checkout/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      credentials: "same-origin",
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = (await res
      .json()
      .catch(() => ({}))) as CheckoutStartResponse;

    if (!res.ok || !data?.ok || !data?.redirectUrl) {
      throw new Error(data?.error || "checkout_start_failed");
    }

    return data;
  } finally {
    clearTimeout(timer);
    if (abortCleanup) abortCleanup();
  }
}
