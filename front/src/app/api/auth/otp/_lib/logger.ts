import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

type LogLevel = "info" | "warn" | "error";

export type OtpFailureCode =
  | "INVALID_PHONE"
  | "MELIPAYAMAK_OTP_URL_NOT_SET"
  | "RATE_LIMIT"
  | "OTP_SEND_FAILED"
  | "PROVIDER_NO_CODE_IN_RESPONSE"
  | "PROVIDER_NETWORK_ERROR"
  | "REDIS_ERROR"
  | "INVALID_OTP"
  | "NO_OTP_FOR_PHONE"
  | "WOO_LOOKUP_FAILED"
  | "WOO_CREATE_FAILED"
  | "WOO_UPDATE_FAILED"
  | "SESSION_SET_FAILED"
  | "SERVER_ERROR";

export type OtpLogger = ReturnType<typeof createOtpLogger>;

function serializeError(err: unknown): Record<string, unknown> | undefined {
  if (!err) return undefined;
  if (err instanceof Error) {
    const out: Record<string, unknown> = {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
    if ("cause" in err && err.cause !== undefined) {
      out.cause = serializeError(err.cause);
    }
    return out;
  }
  return { message: String(err) };
}

/** Mask phone: 0912***4567 */
export function maskPhone(phone: string): string {
  if (phone.length < 6) return "***";
  return `${phone.slice(0, 4)}***${phone.slice(-4)}`;
}

/** Never log full OTP codes. */
export function maskCode(code: string): string {
  if (!code) return "***";
  if (code.length <= 2) return "**";
  return `${"*".repeat(code.length - 2)}${code.slice(-2)}`;
}

export function createOtpLogger(route: "start" | "verify") {
  const requestId = randomUUID().slice(0, 8);
  const prefix = `[otp/${route}]`;

  const emit = (
    level: LogLevel,
    event: string,
    data?: Record<string, unknown>,
  ) => {
    const payload = {
      requestId,
      route,
      event,
      ts: new Date().toISOString(),
      ...data,
    };
    const fn =
      level === "error"
        ? console.error
        : level === "warn"
          ? console.warn
          : console.log;
    fn(`${prefix} ${event}`, payload);
  };

  return {
    requestId,
    info: (event: string, data?: Record<string, unknown>) =>
      emit("info", event, data),
    warn: (event: string, data?: Record<string, unknown>) =>
      emit("warn", event, data),
    fail: (
      code: OtpFailureCode,
      reason: string,
      ctx?: Record<string, unknown>,
      cause?: unknown,
    ) => {
      emit("error", "failure", {
        code,
        reason,
        ...ctx,
        cause: serializeError(cause),
      });
      return { code, reason, requestId };
    },
  };
}

export function failResponse(
  log: OtpLogger,
  code: OtpFailureCode,
  reason: string,
  status: number,
  ctx?: Record<string, unknown>,
  cause?: unknown,
  extra?: Record<string, unknown>,
) {
  const failure = log.fail(code, reason, ctx, cause);
  return NextResponse.json(
    { ok: false, error: code, requestId: failure.requestId, ...extra },
    { status },
  );
}
