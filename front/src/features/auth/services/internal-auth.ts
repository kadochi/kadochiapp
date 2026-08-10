import "server-only";

import { createHmac } from "node:crypto";

import { ServiceError } from "@/lib/http/errors";

const localInternalSecret = "kadochi-local-internal-api-secret-v1";

function internalApiSecret(requestId: string): string {
  const configured = process.env.KADOCHI_INTERNAL_API_SECRET?.trim();
  if (configured && configured.length >= 32) return configured;
  if (process.env.NODE_ENV !== "production") return localInternalSecret;
  throw new ServiceError({
    code: "configuration",
    status: 503,
    message: "The authentication service is not configured.",
    requestId,
    retryable: false,
  });
}

/** Authenticates the private Next-to-WordPress OTP hop and binds its payload. */
export function otpInternalHeaders(purpose: "otp-start" | "otp-verify", payload: string, requestId: string): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1_000).toString();
  const message = `kadochi-internal-v1\n${purpose}\n${timestamp}\n${requestId}\n${payload}`;
  return {
    "X-Kadochi-Internal-Timestamp": timestamp,
    "X-Kadochi-Internal-Auth": createHmac("sha256", internalApiSecret(requestId)).update(message).digest("hex"),
  };
}
