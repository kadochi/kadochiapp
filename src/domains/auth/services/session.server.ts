// src/domains/auth/services/session.server.ts
import "server-only";
import { cookies, headers } from "next/headers";
import { getConfig } from "@/config";
import { signJwt, verifyJwt } from "@/lib/security/jwt";
import type { Session } from "../models/session";

const COOKIE_NAME = "kadochi_session";

async function resolveCookieDomain(): Promise<string | undefined> {
  const { COOKIE_DOMAIN } = getConfig();
  const hdrs = await headers();
  const h = (hdrs.get("host") || "").toLowerCase();

  if (COOKIE_DOMAIN && h.endsWith(COOKIE_DOMAIN.toLowerCase())) {
    return COOKIE_DOMAIN;
  }
  return undefined;
}

function baseCookieOpts() {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
  };
}

type TokenPayload = {
  uid: number;
  name?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export async function setSession(
  userId: number,
  extras?: Omit<Session, "userId">
) {
  const payload: TokenPayload = { uid: userId, ...(extras ?? {}) };
  const token = await signJwt(payload, 60 * 60 * 24 * 7);

  const jar = await cookies();
  const domain = await resolveCookieDomain();

  jar.set({
    ...baseCookieOpts(),
    ...(domain ? { domain } : {}),
    value: token,
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession() {
  const jar = await cookies();
  const domain = await resolveCookieDomain();

  jar.set({
    ...baseCookieOpts(),
    ...(domain ? { domain } : {}),
    value: "",
    maxAge: 0,
  });
}

export async function getSessionFromCookies(): Promise<Session> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return { userId: null };

  try {
    const p = await verifyJwt<TokenPayload>(token);
    return {
      userId: typeof p.uid === "number" ? p.uid : null,
      name: p.name ?? null,
      phone: p.phone ?? null,
      firstName: p.firstName ?? null,
      lastName: p.lastName ?? null,
    };
  } catch {
    return { userId: null };
  }
}

export async function currentUserId(): Promise<number | null> {
  const s = await getSessionFromCookies();
  return s.userId;
}
