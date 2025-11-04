// src/lib/auth/session.ts
import "server-only";
import { cookies, headers } from "next/headers";
import { signJwt, verifyJwt } from "./jwt";

const COOKIE_NAME = "kadochi_session";

async function resolveCookieDomain(): Promise<string | undefined> {
  const domain = process.env.COOKIE_DOMAIN;
  const h = (await headers()).get("host")?.toLowerCase() || "";
  if (domain && h.endsWith(domain.toLowerCase())) return domain;
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
  roles?: string[];
};

export type Session = {
  userId: number | null;
  name?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  roles?: string[];
};

function payloadToSession(p: Partial<TokenPayload> | undefined): Session {
  return {
    userId: typeof p?.uid === "number" ? p!.uid : null,
    name: p?.name ?? null,
    phone: p?.phone ?? null,
    firstName: p?.firstName ?? null,
    lastName: p?.lastName ?? null,
    roles: Array.isArray(p?.roles) ? p!.roles : [],
  };
}

export async function setSession(
  userId: number,
  extras?: Omit<TokenPayload, "uid">
) {
  const token = await signJwt(
    { uid: userId, ...(extras ?? {}) },
    60 * 60 * 24 * 7
  );
  const jar = await cookies();
  const domain = await resolveCookieDomain();

  jar.set({
    ...baseCookieOpts(),
    ...(domain ? { domain } : {}),
    value: token,
    maxAge: 60 * 60 * 24 * 7,
  });
}

export const setSessionCookie = setSession;

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
    const payload = await verifyJwt<TokenPayload>(token);
    return payloadToSession(payload);
  } catch {
    return { userId: null };
  }
}

export async function currentUserId(): Promise<number | null> {
  const s = await getSessionFromCookies();
  return s.userId;
}
