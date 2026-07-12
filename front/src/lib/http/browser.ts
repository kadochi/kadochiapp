import { apiErrorSchema, ServiceError } from "./errors";

/** Calls only action-specific, same-origin BFF routes. Browser code never sees upstream credentials or cart tokens. */
export async function bffJson<T>(path: string, init: RequestInit, parse: (value: unknown) => T): Promise<T> {
  const response = await fetch(path, { ...init, headers: { Accept: "application/json", "Content-Type": "application/json", ...init.headers }, cache: "no-store", credentials: "same-origin" });
  const value: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const detail = apiErrorSchema.safeParse(value);
    throw new ServiceError(detail.success ? detail.data : { code: "upstream_failure", status: response.status, message: "The request could not be completed.", requestId: response.headers.get("x-request-id") ?? "unknown", retryable: false });
  }
  return parse(value);
}
