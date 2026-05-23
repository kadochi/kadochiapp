import "server-only";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { getConfig } from "@/config";

type AnyRecord = Record<string, unknown>;
export type JWTPayloadIn = JWTPayload & AnyRecord;

function secretKey(): Uint8Array {
  const cfg = getConfig() as unknown as Record<string, string | undefined>;
  const secret =
    cfg.KADOCHI_JWT_SECRET || cfg.JWT_SECRET || "dev-fallback-secret";
  return new TextEncoder().encode(secret);
}

function toJoseExp(exp?: number | string): string | number {
  if (typeof exp === "number" && Number.isFinite(exp)) return `${exp}s`;
  if (typeof exp === "string" && exp.trim()) return exp;
  return "7d";
}

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

export const signJwt = (
  payload: JWTPayloadIn,
  expSec?: number | string
): Promise<string> => sign(payload, { expSec });

export const verifyJwt = <T extends JWTPayloadIn = JWTPayloadIn>(
  token: string
): Promise<T> => verify<T>(token);
