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

export function errorForStatus(status: number, requestId: string, message = "The upstream service could not complete the request."): ApiError {
  const code = status === 401 ? "unauthenticated" : status === 403 ? "forbidden" : status === 404 ? "not_found" : status === 409 ? "conflict" : status === 429 ? "rate_limited" : "upstream_failure";
  return { code, status, message, requestId, retryable: status === 429 || status >= 500 };
}
