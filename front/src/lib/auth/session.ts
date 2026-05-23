// src/lib/auth/session.ts
import "server-only";
import { cookies, headers } from "next/headers";
import crypto from "crypto";

/* ---------------------------------------------------------------------
 * Types
 * -------------------------------------------------------------------*/
export type Session = {
  userId: number | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  roles?: string[];
};

/* ---------------------------------------------------------------------
 * Config (backward-compatible)
 * -------------------------------------------------------------------*/
const DEFAULT_COOKIE_NAME = "kadochi_session";
const ALT_COOKIE_NAMES = ["kd_s", "session", DEFAULT_COOKIE_NAME];

const SECURE = process.env.NODE_ENV === "production";
const COOKIE_LIFETIME_SEC = 60 * 60 * 24 * 30; // 30 days
const JWT_SECRET = (process.env.KADOCHI_JWT_SECRET || "").trim();

/* ---------------------------------------------------------------------
 * Tiny JWT (HS256) – no external deps
 * -------------------------------------------------------------------*/
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

/* ---------------------------------------------------------------------
 * Cookie helpers (Next.js 15-safe)
 * - Domain is applied only if it matches current host (prevents silent
 *   failures when browser refuses to set cookie on mismatched domain).
 * - In RSC, cookies() is read-only; do set/clear only in Route Handlers
 *   or Server Actions.
 * -------------------------------------------------------------------*/
async function resolveCookieDomain(): Promise<string | undefined> {
  const want = (process.env.COOKIE_DOMAIN || "").trim().toLowerCase();
  if (!want) return undefined;
  const host = ((await headers()).get("host") || "").toLowerCase();
  return host.endsWith(want) ? want : undefined;
}

function baseCookieOpts(maxAgeSec?: number, domain?: string) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: SECURE,
    ...(domain ? { domain } : {}),
    ...(typeof maxAgeSec === "number" ? { maxAge: maxAgeSec } : {}),
  };
}

/* ---------------------------------------------------------------------
 * Parsing helpers (tolerate legacy formats & shapes)
 * -------------------------------------------------------------------*/
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

  // 1) JWT
  if (JWT_SECRET) {
    const payload = jwtVerifyHS256<any>(String(raw), JWT_SECRET);
    if (payload && (payload.uid != null || payload.userId != null))
      return toSessionShape(payload);
  }

  // 2) JSON (URL-encoded)
  try {
    const decoded = decodeURIComponent(String(raw));
    const js = JSON.parse(decoded);
    if (js && (js.uid != null || js.userId != null)) return toSessionShape(js);
  } catch {}

  // 3) JSON (plain)
  try {
    const js = JSON.parse(String(raw));
    if (js && (js.uid != null || js.userId != null)) return toSessionShape(js);
  } catch {}

  // 4) base64(JSON)
  try {
    const b = Buffer.from(String(raw), "base64").toString("utf8");
    const js = JSON.parse(b);
    if (js && (js.uid != null || js.userId != null)) return toSessionShape(js);
  } catch {}

  return null;
}

/* ---------------------------------------------------------------------
 * Public API (backward-compatible)
 * -------------------------------------------------------------------*/

/** Read session from cookies; tolerant to legacy names and formats. */
export async function getSessionFromCookies(): Promise<Session> {
  const jar = await cookies();

  // Prefer known names first
  for (const n of ALT_COOKIE_NAMES) {
    const v = jar.get(n)?.value;
    const s = tryParseAnySession(v);
    if (s) return s;
  }

  // As a last resort, scan all cookies (covers unknown legacy names)
  const getAll = (jar as any)?.getAll?.bind(jar);
  const all: Array<{ name: string; value: string }> = getAll ? getAll() : [];
  for (const c of all) {
    const s = tryParseAnySession(c.value);
    if (s) return s;
  }

  return { userId: null };
}

/**
 * Set session cookie (legacy signature preserved):
 *   setSession(userId, { name?, phone?, firstName?, lastName?, roles?, maxAgeSec? })
 * Writes as JWT if KADOCHI_JWT_SECRET is set; otherwise JSON (URL-encoded).
 * Cookie lifetime defaults to 30 days.
 */
export async function setSession(
  userId: number,
  extras?: {
    name?: string | null;
    phone?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    roles?: string[];
    maxAgeSec?: number; // optional override; defaults to 30 days
  }
): Promise<void> {
  const jar = await cookies();
  const domain = await resolveCookieDomain();
  const maxAge = extras?.maxAgeSec ?? COOKIE_LIFETIME_SEC;

  const payload = {
    uid: userId,
    name: extras?.name ?? null,
    phone: extras?.phone ?? null,
    firstName: extras?.firstName ?? null,
    lastName: extras?.lastName ?? null,
    roles: Array.isArray(extras?.roles) ? extras!.roles : [],
  };

  // Keep existing cookie name if present; else fallback to default
  let targetName: string | null = null;
  for (const n of ALT_COOKIE_NAMES) {
    if (jar.get(n)?.value) {
      targetName = n;
      break;
    }
  }
  if (!targetName) {
    const getAll = (jar as any)?.getAll?.bind(jar);
    const all: Array<{ name: string; value: string }> = getAll ? getAll() : [];
    for (const c of all) {
      if (tryParseAnySession(c.value)) {
        targetName = c.name;
        break;
      }
    }
  }
  if (!targetName) targetName = DEFAULT_COOKIE_NAME;

  const setFn = (jar as any)?.set;
  if (typeof setFn === "function") {
    if (JWT_SECRET) {
      const token = jwtSignHS256(payload, JWT_SECRET);
      setFn.call(jar, targetName, token, baseCookieOpts(maxAge, domain));
    } else {
      const raw = encodeURIComponent(JSON.stringify(payload));
      setFn.call(jar, targetName, raw, baseCookieOpts(maxAge, domain));
    }
  }

  // Clean up other known names to avoid duplicates
  const delFn = (jar as any)?.delete;
  if (typeof delFn === "function") {
    for (const n of ALT_COOKIE_NAMES) {
      if (n !== targetName)
        delFn.call(jar, n, baseCookieOpts(undefined, domain));
    }
  }
}

/** Clear all known session cookie names. */
export async function clearSession(): Promise<void> {
  const jar = await cookies();
  const domain = await resolveCookieDomain();
  const delFn = (jar as any)?.delete;
  if (typeof delFn === "function") {
    for (const n of ALT_COOKIE_NAMES)
      delFn.call(jar, n, baseCookieOpts(undefined, domain));
  }
}

/** Convenience: returns userId or null. */
export async function currentUserId(): Promise<number | null> {
  const s = await getSessionFromCookies();
  return s.userId;
}

/** Build a display name for UI (Header/SideMenu). */
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

/** Type guard for authenticated session objects. */
export function isAuthenticated(session: Session | null): session is Session {
  return !!(session && Number.isFinite(session.userId));
}

/* ---------------------------------------------------------------------
 * Default export – compat for `import getInitialSession from "..."`
 * -------------------------------------------------------------------*/
export default async function getInitialSession(): Promise<Session | null> {
  const s = await getSessionFromCookies();
  return s.userId ? s : null;
}
