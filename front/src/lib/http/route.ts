import { NextResponse } from "next/server";
import { z } from "zod";

import { ServiceError, type ApiError } from "./errors";
import { UpstreamError } from "./upstream";

export function requestId(request: Request): string {
  return request.headers.get("x-request-id")?.slice(0, 128) || crypto.randomUUID();
}

export function jsonError(error: unknown, id: string): NextResponse {
  const detail: ApiError = error instanceof ServiceError || error instanceof UpstreamError
    ? error.detail
    : error instanceof z.ZodError
      ? {
          code: "validation",
          status: 400,
          message: "The request contains invalid fields.",
          requestId: id,
          retryable: false,
          fieldErrors: error.issues.reduce<Record<string, string[]>>((fields, issue) => {
            const key = issue.path.join(".") || "form";
            (fields[key] ??= []).push(issue.message);
            return fields;
          }, {}),
        }
      : { code: "upstream_failure", status: 500, message: "The request could not be completed.", requestId: id, retryable: false };
  return NextResponse.json(detail, { status: detail.status, headers: { "x-request-id": id } });
}

export function jsonOk<T>(body: T, id: string, init?: ResponseInit): NextResponse<T> {
  return NextResponse.json(body, { ...init, headers: { ...init?.headers, "x-request-id": id } });
}

/** Reject cross-site cookie-authenticated mutations before forwarding them upstream. */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const requestUrl = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (!host || host !== requestUrl.host || (origin && origin !== requestUrl.origin) || (!origin && fetchSite === "cross-site")) {
    throw new ServiceError({ code: "forbidden", status: 403, message: "Cross-site requests are not allowed.", requestId: requestId(request), retryable: false });
  }
}
