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
  /** Maximum time the upstream request may remain in flight. */
  timeoutMs?: number;
};

type WordPressErrorBody = {
  code?: unknown;
  data?: { retryAfter?: unknown };
};

class UpstreamDeadlineError extends Error {
  constructor() {
    super("The upstream deadline elapsed.");
    this.name = "UpstreamDeadlineError";
  }
}

type ResponseDeadline = {
  controller: AbortController;
  expiresAt: number;
  timer: ReturnType<typeof setTimeout>;
};

const responseDeadlines = new WeakMap<Response, ResponseDeadline>();
let inFlightRequests = 0;

function retryAfter(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function usesNextDataCache(options: UpstreamOptions): boolean {
  const method = (options.method ?? "GET").toUpperCase();
  const revalidate = options.next?.revalidate;
  return method === "GET"
    && options.cache !== "no-store"
    && (revalidate === false || (typeof revalidate === "number" && revalidate > 0));
}

function hasUserSpecificHeaders(headers: HeadersInit | undefined): boolean {
  const values = new Headers(headers);
  return ["authorization", "cookie", "cart-token", "nonce", "x-wc-store-api-nonce"].some((name) => values.has(name));
}

function clearResponseDeadline(response: Response): void {
  const deadline = responseDeadlines.get(response);
  if (!deadline) return;
  clearTimeout(deadline.timer);
  responseDeadlines.delete(response);
}

async function withDeadline<T>(operation: Promise<T>, timeoutMs: number, controller?: AbortController): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          controller?.abort();
          reject(new UpstreamDeadlineError());
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
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
  const { acceptStatuses = [], requestId, timeoutMs = defaultTimeoutMs, ...requestOptions } = options;
  const userSpecific = hasUserSpecificHeaders(requestOptions.headers);
  const cacheableRead = usesNextDataCache(options) && !userSpecific;
  const controller = new AbortController();
  const expiresAt = Date.now() + timeoutMs;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = performance.now();
  const endpoint = new URL(path, env.WORDPRESS_INTERNAL_URL).pathname;
  let responseRegistered = false;
  inFlightRequests += 1;
  try {
    const request = fetch(new URL(path, env.WORDPRESS_INTERNAL_URL), {
      ...requestOptions,
      ...(userSpecific ? { cache: "no-store", next: undefined } : {}),
      headers: {
        Accept: "application/json",
        ...(!cacheableRead ? { "X-Request-ID": requestId } : {}),
        ...requestOptions.headers,
      },
      signal: controller.signal,
    });
    const response = await request;
    if (!response.ok && !acceptStatuses.includes(response.status)) {
      const body: unknown = await response.json().catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") throw error;
        return undefined;
      });
      throw new UpstreamError(wordpressErrorDetail(response.status, body, requestId, response.headers.get("retry-after")));
    }
    responseDeadlines.set(response, { controller, expiresAt, timer });
    responseRegistered = true;
    return response;
  } catch (error) {
    if (error instanceof UpstreamError) {
      console.error("[upstream] request_failed", {
        requestId,
        endpoint,
        method: (requestOptions.method ?? "GET").toUpperCase(),
        code: error.detail.code,
        status: error.detail.status,
        durationMs: Math.round(performance.now() - startedAt),
        cacheable: cacheableRead,
        inFlight: inFlightRequests,
      });
      throw error;
    }
    const timedOut = error instanceof UpstreamDeadlineError || (error instanceof DOMException && error.name === "AbortError");
    const upstreamError = new UpstreamError({
      code: timedOut ? "timeout" : "network",
      status: timedOut ? 504 : 502,
      message: timedOut ? "The upstream service timed out." : "The upstream service is unavailable.",
      requestId,
      retryable: true,
    });
    console.error("[upstream] request_failed", {
      requestId,
      endpoint,
      method: (requestOptions.method ?? "GET").toUpperCase(),
      code: upstreamError.detail.code,
      status: upstreamError.detail.status,
      durationMs: Math.round(performance.now() - startedAt),
      cacheable: cacheableRead,
      inFlight: inFlightRequests,
    });
    throw upstreamError;
  } finally {
    inFlightRequests -= 1;
    // Successful responses keep their timer until their body is consumed.
    // Every failure has completed its caller lifecycle and must release it now.
    if (!responseRegistered) clearTimeout(timer);
  }
}

export async function parseUpstreamJson<T>(response: Response, parse: (value: unknown) => T, requestId: string): Promise<T> {
  const deadline = responseDeadlines.get(response);
  let value: unknown;
  try {
    value = await withDeadline(
      response.json(),
      deadline ? Math.max(1, deadline.expiresAt - Date.now()) : defaultTimeoutMs,
      deadline?.controller,
    );
  } catch (error) {
    if (error instanceof UpstreamDeadlineError || (error instanceof DOMException && error.name === "AbortError")) {
      throw new UpstreamError({ code: "timeout", status: 504, message: "The upstream service timed out.", requestId, retryable: true });
    }
    throw new UpstreamError({ code: "malformed_upstream_response", status: 502, message: "The upstream service returned invalid JSON.", requestId, retryable: true });
  } finally {
    clearResponseDeadline(response);
  }
  try {
    return parse(value);
  } catch {
    throw new UpstreamError({ code: "malformed_upstream_response", status: 502, message: "The upstream service returned an unexpected response.", requestId, retryable: true });
  }
}
