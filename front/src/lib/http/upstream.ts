import "server-only";

import { env } from "../server/env";
import { errorForStatus, type ApiError } from "./errors";

const defaultTimeoutMs = 8_000;

export class UpstreamError extends Error {
  constructor(public readonly detail: ApiError) {
    super(detail.message);
    this.name = "UpstreamError";
  }
}

type UpstreamOptions = Omit<RequestInit, "body" | "headers"> & {
  body?: string;
  headers?: HeadersInit;
  requestId: string;
  acceptStatuses?: readonly number[];
  /** Use for public, cacheable reads that can occasionally be slow upstream. */
  timeoutMs?: number;
};

type WordPressErrorBody = {
  code?: unknown;
  data?: { retryAfter?: unknown };
};

function retryAfter(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

/** Maps only documented safe REST errors; all other upstream failures stay generic. */
export function wordpressErrorDetail(status: number, body: unknown, requestId: string, headerRetryAfter?: string | null): ApiError {
  const upstream = typeof body === "object" && body !== null ? body as WordPressErrorBody : {};
  const retryAfterSeconds = retryAfter(upstream.data?.retryAfter)
    ?? retryAfter(headerRetryAfter === null || headerRetryAfter === undefined ? undefined : Number(headerRetryAfter));
  const otpErrors: Record<string, Omit<ApiError, "status" | "requestId" | "retryAfter">> = {
    kadochi_otp_cooldown: { code: "otp_cooldown", message: "Please wait before requesting another verification code.", retryable: true },
    kadochi_otp_rate_limited: { code: "otp_rate_limited", message: "Too many verification-code requests. Please try again later.", retryable: true },
    kadochi_otp_provider_timeout: { code: "otp_provider_timeout", message: "The SMS service timed out.", retryable: true },
    kadochi_otp_provider_network: { code: "otp_provider_network", message: "The SMS service is unavailable.", retryable: true },
    kadochi_otp_provider_failed: { code: "otp_provider_failed", message: "The SMS service is unavailable.", retryable: true },
    kadochi_otp_provider_invalid: { code: "otp_provider_invalid", message: "The SMS service returned an invalid response.", retryable: false },
    kadochi_otp_unavailable: { code: "otp_unavailable", message: "The verification service is unavailable.", retryable: false },
  };
  const paymentErrors: Record<string, Omit<ApiError, "status" | "requestId" | "retryAfter">> = {
    kadochi_payment_in_progress: { code: "payment_in_progress", message: "A payment attempt is already in progress.", retryable: true },
    // The WordPress handler releases this attempt's lock before returning this
    // error, so it is definite—not an ambiguous transport failure to recover.
    kadochi_payment_unavailable: { code: "upstream_failure", message: "The payment gateway could not start a payment.", retryable: false },
  };
  const mapped = typeof upstream.code === "string" ? otpErrors[upstream.code] ?? paymentErrors[upstream.code] : undefined;
  if (!mapped) return errorForStatus(status, requestId);
  return { ...mapped, status, requestId, ...(retryAfterSeconds === undefined ? {} : { retryAfter: retryAfterSeconds }) };
}

/** Internal server-only transport. Feature services own endpoint selection and mapping. */
export async function wordpressFetch(path: string, options: UpstreamOptions): Promise<Response> {
  const controller = new AbortController();
  const { acceptStatuses = [], requestId, timeoutMs = defaultTimeoutMs, ...requestOptions } = options;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(new URL(path, env.WORDPRESS_INTERNAL_URL), {
      ...requestOptions,
      headers: { Accept: "application/json", "X-Request-ID": requestId, ...requestOptions.headers },
      signal: controller.signal,
    });
    if (!response.ok && !acceptStatuses.includes(response.status)) {
      const body: unknown = await response.json().catch(() => undefined);
      throw new UpstreamError(wordpressErrorDetail(response.status, body, requestId, response.headers.get("retry-after")));
    }
    return response;
  } catch (error) {
    if (error instanceof UpstreamError) throw error;
    const timedOut = error instanceof DOMException && error.name === "AbortError";
    throw new UpstreamError({
      code: timedOut ? "timeout" : "network",
      status: timedOut ? 504 : 502,
      message: timedOut ? "The upstream service timed out." : "The upstream service is unavailable.",
      requestId,
      retryable: true,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function parseUpstreamJson<T>(response: Response, parse: (value: unknown) => T, requestId: string): Promise<T> {
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new UpstreamError({ code: "malformed_upstream_response", status: 502, message: "The upstream service returned invalid JSON.", requestId, retryable: true });
  }
  try {
    return parse(value);
  } catch {
    throw new UpstreamError({ code: "malformed_upstream_response", status: 502, message: "The upstream service returned an unexpected response.", requestId, retryable: true });
  }
}
