import "server-only";
import { cookies } from "next/headers";
import crypto from "crypto";

export type Session = {
  userId: number;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
};

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "kd_s";
const ALT_COOKIE_NAMES = ["kadochi_session", "session", "kd_s", COOKIE_NAME];
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;
const SECURE = process.env.NODE_ENV === "production";
const JWT_SECRET = (process.env.KADOCHI_JWT_SECRET || "").trim();

function b64u(input: Buffer | string) {
  const b = typeof input === "string" ? Buffer.from(input) : input;
  return b
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}
function signHS256(header: object, payload: object, secret: string) {
  const h = b64u(JSON.stringify(header));
  const p = b64u(JSON.stringify(payload));
  const data = `${h}.${p}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest();
  return `${data}.${b64u(sig)}`;
}
function verifyHS256(token: string, secret: string): any | null {
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
    return JSON.parse(json);
  } catch {
    return null;
  }
}

async function setCookie(name: string, value: string, maxAgeSec?: number) {
  const jar = await cookies();
  const opts = {
    httpOnly: true,
    secure: SECURE,
    sameSite: "lax" as const,
    path: "/",
    domain: COOKIE_DOMAIN,
    ...(maxAgeSec ? { maxAge: maxAgeSec } : {}),
  };
  const setFn = (jar as any)?.set;
  if (typeof setFn === "function") setFn.call(jar, name, value, opts);
}
async function delCookie(name: string) {
  const jar = await cookies();
  const delFn = (jar as any)?.delete;
  if (typeof delFn === "function") delFn.call(jar, name);
}

export async function getSessionFromCookies(): Promise<Session | null> {
  const jar = await cookies();
  const holder = ALT_COOKIE_NAMES.map((n) => jar.get(n)).find(Boolean as any);
  if (!holder?.value) return null;
  const raw = holder.value;

  if (JWT_SECRET) {
    const payload = verifyHS256(raw, JWT_SECRET);
    if (payload && typeof payload === "object" && payload.userId)
      return payload as Session;
  }
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (parsed && typeof parsed === "object" && parsed.userId)
      return parsed as Session;
  } catch {}
  return null;
}

/** Overloads to keep old and new call sites working */
export async function setSession(
  session: Session,
  opts?: { maxAgeSec?: number }
): Promise<void>;
export async function setSession(
  userId: number,
  data: Omit<Session, "userId"> & { maxAgeSec?: number }
): Promise<void>;
export async function setSession(a: any, b?: any) {
  let s: Session;
  let maxAgeSec = 60 * 60 * 24 * 30;

  if (typeof a === "number") {
    const data = (b || {}) as Omit<Session, "userId"> & { maxAgeSec?: number };
    s = {
      userId: a,
      phone: data.phone ?? null,
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      name: data.name ?? null,
    };
    if (typeof data.maxAgeSec === "number") maxAgeSec = data.maxAgeSec;
  } else {
    const session = a as Session;
    s = {
      userId: session.userId,
      phone: session.phone ?? null,
      firstName: session.firstName ?? null,
      lastName: session.lastName ?? null,
      name: session.name ?? null,
    };
    if (typeof b?.maxAgeSec === "number") maxAgeSec = b.maxAgeSec;
  }

  if (JWT_SECRET) {
    const token = signHS256({ alg: "HS256", typ: "JWT" }, s, JWT_SECRET);
    await setCookie(COOKIE_NAME, token, maxAgeSec);
  } else {
    const value = encodeURIComponent(JSON.stringify(s));
    await setCookie(COOKIE_NAME, value, maxAgeSec);
  }
  for (const n of ALT_COOKIE_NAMES) if (n !== COOKIE_NAME) await delCookie(n);
}

export async function clearSession() {
  for (const n of ALT_COOKIE_NAMES) await delCookie(n);
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
