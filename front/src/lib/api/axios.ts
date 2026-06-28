/**
 * Shared client-side Axios instance.
 * -----------------------------------------------------------------------------
 * Used for same-origin proxy/API calls that were previously scattered as raw
 * `fetch` (auth, basket, etc.). Server-side WooCommerce/WordPress fetchers keep
 * their own resilient wrappers — this instance is for the browser.
 *
 * Errors are normalized onto the existing services/http/errors.ts taxonomy so
 * callers everywhere can switch on the same `code` values.
 */

import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
} from "axios";
import {
  CorsRedirectLoop,
  UpstreamAuthError,
  UpstreamBadResponse,
  UpstreamNetworkError,
  UpstreamTimeout,
  type UpstreamError,
} from "@/services/http/errors";

export const api: AxiosInstance = axios.create({
  // Same-origin; relative URLs hit the Next.js /api proxy routes.
  baseURL: "/",
  withCredentials: true,
  timeout: 15_000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

/** Pull a human-readable upstream message out of an error response body. */
function messageFromBody(data: unknown, fallback: string): string {
  if (data && typeof data === "object") {
    const rec = data as Record<string, unknown>;
    const candidate = rec.error ?? rec.message;
    if (typeof candidate === "string" && candidate.trim()) return candidate;
  }
  return fallback;
}

/**
 * Map an unknown thrown value (typically an AxiosError) onto the typed
 * UpstreamError taxonomy. Always returns one of the known error classes.
 */
export function normalizeAxiosError(err: unknown): UpstreamError {
  if (axios.isAxiosError(err)) {
    const axErr = err as AxiosError;

    // Timeouts / aborts.
    if (axErr.code === "ECONNABORTED" || axErr.code === "ETIMEDOUT") {
      return new UpstreamTimeout(axErr.message);
    }

    const res = axErr.response;
    if (res) {
      const msg = messageFromBody(res.data, axErr.message);
      if (res.status === 401 || res.status === 403) {
        return new UpstreamAuthError(msg);
      }
      return new UpstreamBadResponse(res.status, msg);
    }

    // No response → network-level failure (DNS, connection refused, CORS).
    if (axErr.code === "ERR_FR_TOO_MANY_REDIRECTS") {
      return new CorsRedirectLoop(axErr.message);
    }
    return new UpstreamNetworkError(axErr.message, {
      syscallCode: axErr.code,
    });
  }

  if (err instanceof Error) {
    return new UpstreamNetworkError(err.message);
  }
  return new UpstreamNetworkError();
}

// Normalize every rejected response into an UpstreamError at the boundary.
api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(normalizeAxiosError(error)),
);

/** Convenience GET returning parsed JSON of type T. */
export async function getJSON<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await api.get<T>(url, config);
  return res.data;
}

/** Convenience POST returning parsed JSON of type T. */
export async function postJSON<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await api.post<T>(url, body, config);
  return res.data;
}
