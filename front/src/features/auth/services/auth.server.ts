import "server-only";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

import { ServiceError } from "@/lib/http/errors";
import { parseUpstreamJson, UpstreamError, wordpressFetch } from "@/lib/http/upstream";
import { env, requireWordPressJwtIdentity } from "@/lib/server/env";
import { customerSchema, otpStartResponseSchema, wordpressJwtSchema } from "../schema/auth";
import type { OtpStartResponse, StartOtpInput, VerifyOtpInput, WordPressJwt } from "../types";

const authTokenCookie = "kadochi_auth_token";

type CookieResponse = Pick<NextResponse, "cookies">;

function authCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  };
}

function upstreamResponseError(message: string, requestId: string): UpstreamError {
  return new UpstreamError({
    code: "malformed_upstream_response",
    status: 502,
    message,
    requestId,
    retryable: true,
  });
}

/** Reads only the opaque JWT cookie; browser code never receives this value. */
export async function getStoredAuthToken(): Promise<string | undefined> {
  return (await cookies()).get(authTokenCookie)?.value;
}

/** Writes the token with its exact JWT expiry after WordPress has accepted it. */
export function storeAuthToken(response: CookieResponse, token: string, expiresAt: Date): void {
  response.cookies.set(authTokenCookie, token, authCookieOptions(expiresAt));
}

export function clearAuthToken(response: CookieResponse): void {
  response.cookies.set(authTokenCookie, "", { ...authCookieOptions(new Date(0)), maxAge: 0 });
}

export async function startOtp(input: StartOtpInput, requestId: string): Promise<OtpStartResponse> {
  requireWordPressJwtIdentity(requestId);
  const response = await wordpressFetch(env.WORDPRESS_OTP_REQUEST_PATH, {
    method: "POST",
    body: JSON.stringify({ phone: input.phone }),
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    requestId,
  });
  return parseUpstreamJson(response, (value) => otpStartResponseSchema.parse(value), requestId);
}

export async function verifyOtp(input: VerifyOtpInput, requestId: string): Promise<WordPressJwt> {
  requireWordPressJwtIdentity(requestId);
  const response = await wordpressFetch(env.WORDPRESS_OTP_VERIFY_PATH, {
    method: "POST",
    body: JSON.stringify(input),
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    requestId,
  });
  return parseUpstreamJson(response, (value) => wordpressJwtSchema.parse(value), requestId);
}

/** WordPress remains the identity authority: every customer lookup validates the bearer token upstream. */
export async function getCurrentCustomer(token: string | undefined, requestId: string) {
  requireWordPressJwtIdentity(requestId);
  if (!token) {
    throw new ServiceError({
      code: "unauthenticated",
      status: 401,
      message: "Authentication is required.",
      requestId,
      retryable: false,
    });
  }

  const response = await wordpressFetch("/wp-json/kadochi/v1/customer", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    requestId,
  });
  return parseUpstreamJson(response, (value) => customerSchema.parse(value), requestId);
}

/** Uses only the expiry to set cookie lifetime; customer data always comes from WordPress. */
export function jwtExpiry(token: string, requestId: string): Date {
  const segments = token.split(".");
  const payload = segments[1];
  if (segments.length !== 3 || !segments[0] || !payload || !segments[2]) {
    throw upstreamResponseError("The upstream service returned an invalid token.", requestId);
  }

  try {
    const claims: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const exp = typeof claims === "object" && claims !== null ? (claims as { exp?: unknown }).exp : undefined;
    if (typeof exp !== "number" || !Number.isFinite(exp) || exp <= Date.now() / 1_000) {
      throw new Error("Invalid expiry");
    }
    return new Date(exp * 1_000);
  } catch {
    throw upstreamResponseError("The upstream service returned a token without a valid expiry.", requestId);
  }
}

/** Revocation is deployment-specific. Its failure must never prevent local sign-out. */
export async function revokeAuthToken(token: string, requestId: string): Promise<void> {
  if (!env.WORDPRESS_OTP_REVOKE_PATH) return;
  await wordpressFetch(env.WORDPRESS_OTP_REVOKE_PATH, {
    method: "POST",
    body: JSON.stringify({ token }),
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    cache: "no-store",
    requestId,
  });
}
