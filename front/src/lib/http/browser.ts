import { apiErrorSchema, ServiceError } from "./errors";

const browserRequestTimeoutMs = 20_000;

/** Calls only action-specific, same-origin BFF routes. Browser code never sees upstream credentials or cart tokens. */
export async function bffJson<T>(path: string, init: RequestInit, parse: (value: unknown) => T): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort();
  if (init.signal?.aborted) controller.abort();
  else init.signal?.addEventListener("abort", abortFromCaller, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, browserRequestTimeoutMs);

  try {
    const response = await fetch(path, {
      ...init,
      headers: { Accept: "application/json", "Content-Type": "application/json", ...init.headers },
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    });
    const value: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      const detail = apiErrorSchema.safeParse(value);
      throw new ServiceError(detail.success ? detail.data : {
        code: response.status === 504 ? "timeout" : "upstream_failure",
        status: response.status,
        message: "The request could not be completed.",
        requestId: response.headers.get("x-request-id") ?? "unknown",
        retryable: response.status === 429 || response.status >= 500,
      });
    }
    return parse(value);
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError({
      code: timedOut ? "timeout" : "network",
      status: timedOut ? 504 : 502,
      message: timedOut ? "The request timed out." : "The request could not reach the service.",
      requestId: "unknown",
      retryable: true,
    });
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener("abort", abortFromCaller);
  }
}
