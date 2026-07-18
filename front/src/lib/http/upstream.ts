import "server-only";

import { env } from "../server/env";
import { errorForStatus, type ApiError } from "./errors";

const timeoutMs = 8_000;

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
};

/** Internal server-only transport. Feature services own endpoint selection and mapping. */
export async function wordpressFetch(path: string, options: UpstreamOptions): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const { acceptStatuses = [], requestId, ...requestOptions } = options;
  try {
    const response = await fetch(new URL(path, env.WORDPRESS_INTERNAL_URL), {
      ...requestOptions,
      headers: { Accept: "application/json", ...requestOptions.headers },
      signal: controller.signal,
    });
    if (!response.ok && !acceptStatuses.includes(response.status)) {
      throw new UpstreamError(errorForStatus(response.status, requestId));
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
