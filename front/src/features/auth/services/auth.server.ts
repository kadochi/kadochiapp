import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

import { ServiceError } from "@/lib/http/errors";
import { parseUpstreamJson, UpstreamError, wordpressFetch } from "@/lib/http/upstream";
import { env, requireLocalIdentity, requireWordPressJwtIdentity } from "@/lib/server/env";
import { LOCAL_AUTH_OTP, LOCAL_AUTH_PHONE } from "../local-auth";
import { customerSchema, iranianPhoneSchema, otpStartResponseSchema, wordpressJwtSchema } from "../schema/auth";
import type { Customer, OtpStartResponse, StartOtpInput, VerifyOtpInput } from "../types";

const authTokenCookie = "kadochi_auth_token";

type CookieResponse = Pick<NextResponse, "cookies">;
type AuthSession = { token: string; expiresAt: Date };

const localPhone = iranianPhoneSchema.parse(LOCAL_AUTH_PHONE);
const localSessionLifetimeSeconds = 60 * 60 * 24 * 7;
const localCustomer: Customer = customerSchema.parse({
  id: 1,
  email: "demo@kadochi.local",
  displayName: "کاربر آزمایشی کادوچی",
  roles: ["customer"],
});

type LocalJwtPayload = {
  aud: "kadochi-front";
  exp: number;
  iat: number;
  iss: "kadochi-local";
  phone: string;
  sub: "1";
};

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

function unauthenticated(requestId: string, message = "Authentication is required."): ServiceError {
  return new ServiceError({
    code: "unauthenticated",
    status: 401,
    message,
    requestId,
    retryable: false,
  });
}

function localSignature(unsignedToken: string): string {
  return createHmac("sha256", env.KADOCHI_LOCAL_AUTH_SECRET).update(unsignedToken).digest("base64url");
}

function createLocalSession(): AuthSession {
  const issuedAt = Math.floor(Date.now() / 1_000);
  const expiresAt = new Date((issuedAt + localSessionLifetimeSeconds) * 1_000);
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    aud: "kadochi-front",
    exp: Math.floor(expiresAt.getTime() / 1_000),
    iat: issuedAt,
    iss: "kadochi-local",
    phone: localPhone,
    sub: "1",
  } satisfies LocalJwtPayload)).toString("base64url");
  const unsignedToken = `${header}.${payload}`;
  return { token: `${unsignedToken}.${localSignature(unsignedToken)}`, expiresAt };
}

function readLocalSession(token: string, requestId: string): LocalJwtPayload {
  const [encodedHeader, encodedPayload, signature, ...rest] = token.split(".");
  if (!encodedHeader || !encodedPayload || !signature || rest.length > 0) throw unauthenticated(requestId, "The local JWT is invalid.");

  const expected = Buffer.from(localSignature(`${encodedHeader}.${encodedPayload}`));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw unauthenticated(requestId, "The local JWT signature is invalid.");

  try {
    const header = JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8")) as { alg?: unknown; typ?: unknown };
    const value = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<LocalJwtPayload>;
    const now = Math.floor(Date.now() / 1_000);
    if (
      header.alg !== "HS256" || header.typ !== "JWT"
      || value.aud !== "kadochi-front" || value.iss !== "kadochi-local"
      || value.sub !== "1" || value.phone !== localPhone
      || typeof value.iat !== "number" || value.iat > now + 30
      || typeof value.exp !== "number" || value.exp <= now
    ) {
      throw new Error("Invalid local JWT claims");
    }
    return value as LocalJwtPayload;
  } catch {
    throw unauthenticated(requestId, "The local JWT has expired or is invalid.");
  }
}

/** Reads only the JWT cookie; browser code never receives this value. */
export async function getStoredAuthToken(): Promise<string | undefined> {
  return (await cookies()).get(authTokenCookie)?.value;
}

/** Writes a verified local or upstream JWT with its exact expiry. */
export function storeAuthToken(response: CookieResponse, token: string, expiresAt: Date): void {
  response.cookies.set(authTokenCookie, token, authCookieOptions(expiresAt));
}

export function clearAuthToken(response: CookieResponse): void {
  response.cookies.set(authTokenCookie, "", { ...authCookieOptions(new Date(0)), maxAge: 0 });
}

export async function startOtp(input: StartOtpInput, requestId: string): Promise<OtpStartResponse> {
  if (env.KADOCHI_AUTH_MODE === "local") {
    requireLocalIdentity(requestId);
    if (input.phone !== localPhone) {
      throw new ServiceError({
        code: "validation",
        status: 400,
        message: `Use the local development phone number ${LOCAL_AUTH_PHONE}.`,
        requestId,
        retryable: false,
        fieldErrors: { phone: [`Use ${LOCAL_AUTH_PHONE} for local development.`] },
      });
    }
    return { expiresIn: 120, retryAfter: 60 };
  }

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

export async function verifyOtp(input: VerifyOtpInput, requestId: string): Promise<AuthSession> {
  if (env.KADOCHI_AUTH_MODE === "local") {
    requireLocalIdentity(requestId);
    if (input.phone !== localPhone || input.code !== LOCAL_AUTH_OTP) {
      throw unauthenticated(requestId, "The verification code is incorrect or has expired.");
    }
    return createLocalSession();
  }

  requireWordPressJwtIdentity(requestId);
  const response = await wordpressFetch(env.WORDPRESS_OTP_VERIFY_PATH, {
    method: "POST",
    body: JSON.stringify(input),
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    requestId,
  });
  const { token } = await parseUpstreamJson(response, (value) => wordpressJwtSchema.parse(value), requestId);
  return { token, expiresAt: jwtExpiry(token, requestId) };
}

/** Resolves local JWTs in development and validates production bearer tokens with WordPress. */
export async function getCurrentCustomer(token: string | undefined, requestId: string) {
  if (!token) throw unauthenticated(requestId);

  if (env.KADOCHI_AUTH_MODE === "local") {
    requireLocalIdentity(requestId);
    readLocalSession(token, requestId);
    return localCustomer;
  }

  requireWordPressJwtIdentity(requestId);
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
  if (env.KADOCHI_AUTH_MODE === "local") return;
  if (!env.WORDPRESS_OTP_REVOKE_PATH) return;
  await wordpressFetch(env.WORDPRESS_OTP_REVOKE_PATH, {
    method: "POST",
    body: JSON.stringify({ token }),
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    cache: "no-store",
    requestId,
  });
}
