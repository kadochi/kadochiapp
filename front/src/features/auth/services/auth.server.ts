import "server-only";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

import { ServiceError } from "@/lib/http/errors";
import { parseUpstreamJson, wordpressFetch } from "@/lib/http/upstream";
import { customerSchema, otpStartResponseSchema, wordpressOtpVerifyResponseSchema } from "../schema/auth";
import type { OtpStartResponse, StartOtpInput, VerifyOtpInput } from "../types";
import { otpInternalHeaders } from "./internal-auth";

const authTokenCookie = "kadochi_auth_token";
const otpStartPath = "/wp-json/kadochi/v1/auth/otp/start";
const otpVerifyPath = "/wp-json/kadochi/v1/auth/otp/verify";
const customerPath = "/wp-json/kadochi/v1/customer";
// WordPress can spend its full 8-second relay budget before recording the challenge.
// Leave room for that work and the two internal network hops.
const otpStartTimeoutMs = 15_000;

type CookieResponse = Pick<NextResponse, "cookies">;
type AuthSession = { token: string; expiresAt: Date; customer: ReturnType<typeof customerSchema.parse> };

function authCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  };
}

function unauthenticated(requestId: string): ServiceError {
  return new ServiceError({
    code: "unauthenticated",
    status: 401,
    message: "Authentication is required.",
    requestId,
    retryable: false,
  });
}

/** Reads only the opaque WordPress JWT; browser code never receives this value. */
export async function getStoredAuthToken(): Promise<string | undefined> {
  return (await cookies()).get(authTokenCookie)?.value;
}

/** Shared authorization bridge for server-side WordPress application requests. */
export async function wordpressBearerHeaders(): Promise<Record<string, string>> {
  const token = await getStoredAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function storeAuthToken(response: CookieResponse, token: string, expiresAt: Date): void {
  response.cookies.set(authTokenCookie, token, authCookieOptions(expiresAt));
}

export function clearAuthToken(response: CookieResponse): void {
  response.cookies.set(authTokenCookie, "", { ...authCookieOptions(new Date(0)), maxAge: 0 });
}

export async function startOtp(input: StartOtpInput, requestId: string, request?: Request): Promise<OtpStartResponse> {
  void request;
  const response = await wordpressFetch(otpStartPath, {
    method: "POST",
    body: JSON.stringify({ phone: input.phone }),
    headers: {
      "Content-Type": "application/json",
      ...otpInternalHeaders("otp-start", input.phone, requestId),
    },
    cache: "no-store",
    requestId,
    timeoutMs: otpStartTimeoutMs,
  });
  return parseUpstreamJson(response, (value) => otpStartResponseSchema.parse(value), requestId);
}

export async function verifyOtp(input: VerifyOtpInput, requestId: string): Promise<AuthSession> {
  const response = await wordpressFetch(otpVerifyPath, {
    method: "POST",
    body: JSON.stringify(input),
    headers: {
      "Content-Type": "application/json",
      ...otpInternalHeaders("otp-verify", `${input.phone}\n${input.code}`, requestId),
    },
    cache: "no-store",
    requestId,
  });
  const verified = await parseUpstreamJson(response, (value) => wordpressOtpVerifyResponseSchema.parse(value), requestId);
  return {
    token: verified.token,
    expiresAt: new Date(Date.now() + verified.expiresIn * 1_000),
    customer: verified.customer,
  };
}

export async function getCurrentCustomer(token: string | undefined, requestId: string) {
  if (!token) throw unauthenticated(requestId);
  const response = await wordpressFetch(customerPath, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    requestId,
  });
  return parseUpstreamJson(response, (value) => customerSchema.parse(value), requestId);
}
