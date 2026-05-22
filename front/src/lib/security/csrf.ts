// src/lib/auth/csrf.ts
import "server-only";
import { cookies, headers } from "next/headers";
import { getConfig } from "@/config";
import { SignJWT, jwtVerify } from "jose";

const COOKIE = "kadochi_csrf";

function key() {
  return new TextEncoder().encode(getConfig().CSRF_SECRET || "fallback-dev");
}

async function resolveCookieDomain(): Promise<string | undefined> {
  const { COOKIE_DOMAIN } = getConfig();
  const h = (await headers()).get("host")?.toLowerCase() || "";
  if (COOKIE_DOMAIN && h.endsWith(COOKIE_DOMAIN.toLowerCase())) {
    return COOKIE_DOMAIN;
  }
  return undefined;
}

export async function issueCsrf() {
  const token = await new SignJWT({ t: "csrf" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30m")
    .sign(key());

  const domain = await resolveCookieDomain();

  (await cookies()).set(COOKIE, token, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(domain ? { domain } : {}),
    maxAge: 60 * 30,
  });

  return token;
}

export async function verifyCsrf() {
  const hdr = (await headers()).get("x-csrf") || "";
  const ck = (await cookies()).get(COOKIE)?.value || "";
  if (!hdr || !ck) return false;
  try {
    await jwtVerify(hdr, key());
    await jwtVerify(ck, key());
    return hdr === ck;
  } catch {
    return false;
  }
}
