import "server-only";
import { cookies, headers } from "next/headers";
import type { NextResponse } from "next/server";
import crypto from "crypto";
import type { Session } from "../types";

const DEFAULT_COOKIE_NAME = "kadochi_session";
const ALT_COOKIE_NAMES = ["kd_s", "session", DEFAULT_COOKIE_NAME];

const COOKIE_LIFETIME_SEC = 60 * 60 * 24 * 30;
const JWT_SECRET = (process.env.KADOCHI_JWT_SECRET || "").trim();

export type SessionCookie = {
  name: string;
  value: string;
  options: ReturnType<typeof baseCookieOpts>;
};

function b64u(input: Buffer | string): string {
  const b = typeof input === "string" ? Buffer.from(input) : input;
  return b
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}
function jwtSignHS256(payload: object, secret: string): string {
  const header = { alg: "HS256", typ: "JWT" };
  const h = b64u(JSON.stringify(header));
  const p = b64u(JSON.stringify(payload));
  const data = `${h}.${p}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest();
  return `${data}.${b64u(sig)}`;
}
function jwtVerifyHS256<T = any>(token: string, secret: string): T | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const data = `${h}.${p}`;
  const expected = b64u(
    crypto.createHmac("sha256", secret).update(data).digest()
  );
  if (expected !== s) return null;
  try {
    const json = Buffer.from(
      p.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString();
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

async function resolveCookieSecure(): Promise<boolean> {
  const raw = (process.env.COOKIE_SECURE || "").trim().toLowerCase();
  if (raw === "1" || raw === "true") return true;
  if (raw === "0" || raw === "false") return false;
  try {
    const hdrs = await headers();
    const proto = hdrs.get("x-forwarded-proto");
    const ssl = hdrs.get("x-forwarded-ssl");
    if (proto === "https" || ssl === "on") return true;
    if (proto === "http" || ssl === "off") return false;
    const host = (hdrs.get("host") || "").toLowerCase().split(":")[0];
    return host !== "localhost" && host !== "127.0.0.1" && host !== "::1";
  } catch {
    return false;
  }
}

async function resolveCookieDomain(): Promise<string | undefined> {
  const want = (process.env.COOKIE_DOMAIN || "").trim().toLowerCase();
  if (!want) return undefined;
  const host = ((await headers()).get("host") || "").toLowerCase();
  return host.endsWith(want) ? want : undefined;
}

function baseCookieOpts(secure: boolean, maxAgeSec?: number, domain?: string) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure,
    ...(domain ? { domain } : {}),
    ...(typeof maxAgeSec === "number" ? { maxAge: maxAgeSec } : {}),
  };
}

function toSessionShape(obj: any): Session {
  const id = obj?.uid ?? obj?.userId;
  return {
    userId: Number.isFinite(id) ? Number(id) : null,
    phone: obj?.phone ?? null,
    firstName: obj?.firstName ?? null,
    lastName: obj?.lastName ?? null,
    name: obj?.name ?? null,
    roles: Array.isArray(obj?.roles) ? obj.roles : [],
  };
}

function tryParseAnySession(raw?: string | null): Session | null {
  if (!raw) return null;
  if (JWT_SECRET) {
    const payload = jwtVerifyHS256<any>(String(raw), JWT_SECRET);
    if (payload && (payload.uid != null || payload.userId != null))
      return toSessionShape(payload);
  }
  try {
    const decoded = decodeURIComponent(String(raw));
    const js = JSON.parse(decoded);
    if (js && (js.uid != null || js.userId != null)) return toSessionShape(js);
  } catch {}
  try {
    const js = JSON.parse(String(raw));
    if (js && (js.uid != null || js.userId != null)) return toSessionShape(js);
  } catch {}
  try {
    const b = Buffer.from(String(raw), "base64").toString("utf8");
    const js = JSON.parse(b);
    if (js && (js.uid != null || js.userId != null)) return toSessionShape(js);
  } catch {}
  return null;
}

export async function getSessionFromCookies(): Promise<Session> {
  const jar = await cookies();
  for (const n of ALT_COOKIE_NAMES) {
    const v = jar.get(n)?.value;
    const s = tryParseAnySession(v);
    if (s) return s;
  }
  const getAll = (jar as any)?.getAll?.bind(jar);
  const all: Array<{ name: string; value: string }> = getAll ? getAll() : [];
  for (const c of all) {
    const s = tryParseAnySession(c.value);
    if (s) return s;
  }
  return { userId: null };
}

async function resolveSessionCookieName(): Promise<string> {
  const jar = await cookies();
  for (const n of ALT_COOKIE_NAMES) {
    if (jar.get(n)?.value) return n;
  }
  const getAll = (jar as any)?.getAll?.bind(jar);
  const all: Array<{ name: string; value: string }> = getAll ? getAll() : [];
  for (const c of all) {
    if (tryParseAnySession(c.value)) return c.name;
  }
  return DEFAULT_COOKIE_NAME;
}

export async function buildSessionCookie(
  userId: number,
  extras?: {
    name?: string | null;
    phone?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    roles?: string[];
    maxAgeSec?: number;
  },
): Promise<SessionCookie> {
  const [domain, secure] = await Promise.all([
    resolveCookieDomain(),
    resolveCookieSecure(),
  ]);
  const maxAge = extras?.maxAgeSec ?? COOKIE_LIFETIME_SEC;
  const targetName = await resolveSessionCookieName();
  const payload = {
    uid: userId,
    name: extras?.name ?? null,
    phone: extras?.phone ?? null,
    firstName: extras?.firstName ?? null,
    lastName: extras?.lastName ?? null,
    roles: Array.isArray(extras?.roles) ? extras!.roles : [],
  };
  const value = JWT_SECRET
    ? jwtSignHS256(payload, JWT_SECRET)
    : encodeURIComponent(JSON.stringify(payload));
  return {
    name: targetName,
    value,
    options: baseCookieOpts(secure, maxAge, domain),
  };
}

export function applySessionCookie(
  response: NextResponse,
  cookie: SessionCookie,
): void {
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  for (const n of ALT_COOKIE_NAMES) {
    if (n !== cookie.name) response.cookies.delete(n);
  }
}

export async function applyClearSessionCookies(
  response: NextResponse,
): Promise<void> {
  const [domain, secure] = await Promise.all([
    resolveCookieDomain(),
    resolveCookieSecure(),
  ]);
  const opts = baseCookieOpts(secure, undefined, domain);
  for (const n of ALT_COOKIE_NAMES) {
    response.cookies.delete({ name: n, ...opts });
  }
}

export async function setSession(
  userId: number,
  extras?: {
    name?: string | null;
    phone?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    roles?: string[];
    maxAgeSec?: number;
  },
): Promise<void> {
  const cookie = await buildSessionCookie(userId, extras);
  const jar = await cookies();
  const [domain, secure] = await Promise.all([
    resolveCookieDomain(),
    resolveCookieSecure(),
  ]);
  const setFn = (jar as any)?.set;
  if (typeof setFn === "function") {
    setFn.call(jar, cookie.name, cookie.value, cookie.options);
  }
  const delFn = (jar as any)?.delete;
  if (typeof delFn === "function") {
    for (const n of ALT_COOKIE_NAMES) {
      if (n !== cookie.name)
        delFn.call(jar, n, baseCookieOpts(secure, undefined, domain));
    }
  }
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  const [domain, secure] = await Promise.all([
    resolveCookieDomain(),
    resolveCookieSecure(),
  ]);
  const delFn = (jar as any)?.delete;
  if (typeof delFn === "function") {
    for (const n of ALT_COOKIE_NAMES)
      delFn.call(jar, n, baseCookieOpts(secure, undefined, domain));
  }
}

export async function currentUserId(): Promise<number | null> {
  const s = await getSessionFromCookies();
  return s.userId;
}

export function computeDisplayName(
  session:
    | Pick<Session, "firstName" | "lastName" | "phone" | "name">
    | null
    | undefined,
  wooCustomer?: { first_name?: string; last_name?: string }
): string | null {
  if (!session) return null;
  if (session.name && session.name.trim()) return session.name.trim();
  const n1 = [session.firstName?.trim(), session.lastName?.trim()]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (n1) return n1;
  if (wooCustomer) {
    const n2 = [wooCustomer.first_name?.trim(), wooCustomer.last_name?.trim()]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (n2) return n2;
  }
  return session.phone?.trim() || null;
}

export function isAuthenticated(session: Session | null): session is Session {
  return !!(session && Number.isFinite(session.userId));
}

export async function getInitialSession(): Promise<Session | null> {
  const s = await getSessionFromCookies();
  return s.userId ? s : null;
}
