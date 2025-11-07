// src/lib/api/wp.ts
import "server-only";

/* --------------------------------------------------------------------
 * Base config (backward-compatible)
 * ------------------------------------------------------------------*/
const WP_BASE =
  process.env.WP_BASE_URL ||
  process.env.NEXT_PUBLIC_WP_BASE_URL ||
  "https://app.kadochi.com";

/** Optional Basic Auth if you're behind a proxy/staging */
const APP_USER = process.env.WP_BASIC_USER || "";
const APP_PASS = process.env.WP_BASIC_PASS || "";

/** Optional WP Nonce (when you expose it via NEXT_PUBLIC_… for CSR) */
const PUBLIC_NONCE = process.env.NEXT_PUBLIC_WP_NONCE || "";

/* --------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------*/
export type WpFetchOpts = RequestInit & {
  /** ISR hint (server only). */
  revalidateSeconds?: number;
  /** Extra headers (merged into HeadersInit). */
  headers?: HeadersInit;
};

function makeWpUrl(path: string): URL {
  const base = WP_BASE.replace(/\/+$/, "");
  return path.startsWith("http://") || path.startsWith("https://")
    ? new URL(path)
    : new URL(path.startsWith("/") ? path : `/${path}`, base);
}

/* --------------------------------------------------------------------
 * Low-level: wpFetch / wpFetchJSON
 * - Uses Headers() to safely merge any HeadersInit
 * - Adds Basic auth if configured
 * - Adds X-WP-Nonce if present (useful for authenticated WP endpoints)
 * - No cache by default; you can set revalidateSeconds per call
 * ------------------------------------------------------------------*/
export async function wpFetch(
  path: string,
  init?: WpFetchOpts
): Promise<Response> {
  const url = makeWpUrl(path);

  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");

  // Optional Basic Auth (staging/proxy)
  if (APP_USER && APP_PASS && !headers.has("Authorization")) {
    const token =
      typeof Buffer !== "undefined"
        ? Buffer.from(`${APP_USER}:${APP_PASS}`).toString("base64")
        : btoa(`${APP_USER}:${APP_PASS}`);
    headers.set("Authorization", `Basic ${token}`);
  }

  // Optional WordPress Nonce header
  if (PUBLIC_NONCE && !headers.has("X-WP-Nonce")) {
    headers.set("X-WP-Nonce", PUBLIC_NONCE);
  }

  return fetch(url.toString(), {
    ...init,
    headers,
    cache: "no-store",
    next: init?.revalidateSeconds
      ? { revalidate: init.revalidateSeconds }
      : undefined,
  });
}

export async function wpFetchJSON<T>(
  path: string,
  init?: WpFetchOpts
): Promise<T> {
  const res = await wpFetch(path, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `wpFetchJSON failed: ${res.status} ${res.statusText}\n` +
        `URL: ${makeWpUrl(path).toString()}\n` +
        (body ? `Body: ${body.slice(0, 800)}` : "")
    );
  }
  return res.json() as Promise<T>;
}

/* --------------------------------------------------------------------
 * (Optional) tiny helpers you likely already used – signatures kept simple
 * ------------------------------------------------------------------*/
export async function getWpJson<T>(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>
) {
  const q = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === "") continue;
      q.set(k, String(v));
    }
  }
  const qs = q.toString();
  const path = `/wp-json/${endpoint
    .replace(/^\/?wp-json\/?/, "")
    .replace(/^\/+/, "")}${qs ? `?${qs}` : ""}`;
  return wpFetchJSON<T>(path, { method: "GET" });
}

export async function postWpJson<T>(endpoint: string, body: unknown) {
  const path = `/wp-json/${endpoint
    .replace(/^\/?wp-json\/?/, "")
    .replace(/^\/+/, "")}`;
  return wpFetchJSON<T>(path, { method: "POST", body: JSON.stringify(body) });
}
