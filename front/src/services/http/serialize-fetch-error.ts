import "server-only";

import { UpstreamNetworkError } from "@/services/http/errors";

type ErrnoLike = Error & {
  code?: string;
  errno?: number;
  syscall?: string;
  hostname?: string;
  cause?: unknown;
};

/** Structured snapshot of Node/undici fetch failures for logs and UpstreamNetworkError.details. */
export function serializeFetchError(err: unknown): Record<string, unknown> {
  if (!err) return { message: "unknown" };

  if (err instanceof Error) {
    const e = err as ErrnoLike;
    const out: Record<string, unknown> = {
      name: e.name,
      message: e.message,
    };

    if (e.code) out.code = e.code;
    if (e.errno != null) out.errno = e.errno;
    if (e.syscall) out.syscall = e.syscall;
    if (e.hostname) out.hostname = e.hostname;

    if ("cause" in e && e.cause !== undefined) {
      out.cause = serializeFetchError(e.cause);
    }

    if (process.env.LOG_UPSTREAM_DEBUG === "1" && e.stack) {
      out.stack = e.stack;
    }

    return out;
  }

  return { message: String(err) };
}

export function syscallCodeFromFetchError(err: unknown): string | undefined {
  const walk = (current: unknown): string | undefined => {
    if (!current || typeof current !== "object") return undefined;
    const e = current as ErrnoLike;
    if (typeof e.code === "string" && e.code.length > 0) return e.code;
    if ("cause" in e && e.cause !== undefined) return walk(e.cause);
    return undefined;
  };
  return walk(err);
}

export function toUpstreamNetworkError(
  err: unknown,
  logContext: Record<string, unknown>,
  logTag = "[upstream/fetch]",
): UpstreamNetworkError {
  const details = serializeFetchError(err);
  const message = err instanceof Error ? err.message : "network error";
  console.error(logTag, {
    ...logContext,
    ...details,
  });
  return new UpstreamNetworkError(message, {
    syscallCode: syscallCodeFromFetchError(err),
    details,
  });
}
