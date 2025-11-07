// src/lib/auth/jwt.ts
import "server-only";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

/** ------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------*/
type AnyRecord = Record<string, unknown>;
export type JWTPayloadIn = JWTPayload & AnyRecord;

/** ------------------------------------------------------------------
 * Secret resolver (backward-compatible)
 * - Tries getConfig() when available
 * - Falls back to process.env
 * - Finally uses a safe dev fallback
 * ------------------------------------------------------------------*/
function secretKey(): Uint8Array {
  // Try config module if present (no hard dependency)
  let fromConfig: string | undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getConfig } = require("@/config");
    const cfg = getConfig?.() as Record<string, string | undefined> | undefined;
    fromConfig = cfg?.KADOCHI_JWT_SECRET || cfg?.JWT_SECRET;
  } catch {
    // ignore: config not available in this build
  }

  const fromEnv =
    process.env.KADOCHI_JWT_SECRET || process.env.JWT_SECRET || undefined;

  const secret = fromConfig || fromEnv || "dev-fallback-secret";
  return new TextEncoder().encode(secret);
}

/** ------------------------------------------------------------------
 * Exp helper (compatible with prior usage)
 * - number => seconds ("{n}s")
 * - string => passed as-is (e.g. "7d")
 * - default: "7d"
 * ------------------------------------------------------------------*/
function toJoseExp(exp?: number | string): string | number {
  if (typeof exp === "number" && Number.isFinite(exp)) return `${exp}s`;
  if (typeof exp === "string" && exp.trim()) return exp;
  return "7d";
}

/** ------------------------------------------------------------------
 * Public API
 * ------------------------------------------------------------------*/
export async function sign(
  payload: JWTPayloadIn,
  opts?: { expSec?: number | string }
): Promise<string> {
  const exp = toJoseExp(opts?.expSec);
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(exp)
    .sign(secretKey());
}

export async function verify<T extends JWTPayloadIn = JWTPayloadIn>(
  token: string
): Promise<T> {
  const { payload } = await jwtVerify(token, secretKey());
  return payload as T;
}

/** Aliases preserved for backward compatibility */
export const signJwt = (
  payload: JWTPayloadIn,
  expSec?: number | string
): Promise<string> => sign(payload, { expSec });

export const verifyJwt = <T extends JWTPayloadIn = JWTPayloadIn>(
  token: string
): Promise<T> => verify<T>(token);
