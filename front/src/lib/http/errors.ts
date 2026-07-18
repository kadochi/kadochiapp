import { z } from "zod";

export const errorCodeSchema = z.enum([
  "validation",
  "unauthenticated",
  "forbidden",
  "not_found",
  "conflict",
  "rate_limited",
  "timeout",
  "network",
  "malformed_upstream_response",
  "upstream_failure",
  "configuration",
]);

export const apiErrorSchema = z.object({
  code: errorCodeSchema,
  status: z.number().int(),
  message: z.string(),
  requestId: z.string(),
  retryable: z.boolean(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export class ServiceError extends Error {
  constructor(public readonly detail: ApiError) {
    super(detail.message);
    this.name = "ServiceError";
  }
}

/** Recognizes typed service failures without coupling callers to the transport class. */
export function hasApiErrorCode(error: unknown, code: ApiError["code"]): boolean {
  if (error instanceof ServiceError) return error.detail.code === code;
  if (typeof error !== "object" || error === null || !("detail" in error)) return false;
  const detail = apiErrorSchema.safeParse((error as { detail: unknown }).detail);
  return detail.success && detail.data.code === code;
}

export function errorForStatus(status: number, requestId: string, message = "The upstream service could not complete the request."): ApiError {
  const code = status === 401 ? "unauthenticated" : status === 403 ? "forbidden" : status === 404 ? "not_found" : status === 409 ? "conflict" : status === 429 ? "rate_limited" : "upstream_failure";
  return { code, status, message, requestId, retryable: status === 429 || status >= 500 };
}
