import "server-only"
import { getWpBaseUrl, tryGetPublicWpBaseUrl } from "@/config/wp"
import {
  CorsRedirectLoop,
  UpstreamAuthError,
  UpstreamBadResponse,
  UpstreamNetworkError,
  UpstreamTimeout,
} from "@/services/http/errors"

export const DEFAULT_TIMEOUT_MS = 7_000
export const DEFAULT_RETRIES = 2

const BASIC_USER = process.env.WP_APP_USER || process.env.WP_BASIC_USER || process.env.WP_USER || ""
const BASIC_PASS = process.env.WP_APP_PASS || process.env.WP_BASIC_PASS || process.env.WP_PASS || ""

export function wpBase(): string {
  return getWpBaseUrl()
}

function buildBasicAuth(): string | undefined {
  if (!BASIC_USER || !BASIC_PASS) return undefined
  return `Basic ${Buffer.from(`${BASIC_USER}:${BASIC_PASS}`).toString("base64")}`
}

export function buildWordPressURL(input: string | URL): URL {
  if (input instanceof URL) return new URL(input.toString())
  if (input.startsWith("http://") || input.startsWith("https://")) {
    return new URL(input)
  }
  const normalized = input.startsWith("/") ? input : `/${input}`
  const sanitized = normalized.replace(/\/+/g, "/")
  return new URL(sanitized, wpBase())
}

export function createHeaders(init?: HeadersInit, skipWordPressAuth = false): Headers {
  const headers = new Headers(init)
  if (!headers.has("Accept")) headers.set("Accept", "application/json")
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json")
  const auth = buildBasicAuth()
  if (!skipWordPressAuth && auth && !headers.has("Authorization")) {
    headers.set("Authorization", auth)
  }
  headers.set("User-Agent", headers.get("User-Agent") || "kadochi-app-proxy/1.0")
  return headers
}

function abortSignalAny(signals: AbortSignal[]): AbortSignal | undefined {
  const anyFn = (AbortSignal as unknown as { any?: (signals: AbortSignal[]) => AbortSignal }).any
  return typeof anyFn === "function" ? anyFn(signals) : undefined
}

export function composeSignal(signal: AbortSignal | null | undefined, timeoutMs: number) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(new Error("timeout")), timeoutMs)
  const signals = [controller.signal, signal].filter(
    (value): value is AbortSignal => typeof value === "object" && value !== null && "aborted" in value,
  )
  const combined = signals.length > 1 ? (abortSignalAny(signals) ?? signals[0]) : signals[0]
  return { controller, timeout, signal: combined ?? controller.signal } as const
}

export function sanitizePathForProxy(url: URL): string {
  const path = url.pathname.replace(/\/+/g, "/")
  return `${path}${url.search}`
}

export function resolveUpstreamRedirect(location: string, requestUrl: URL): URL {
  const next = buildWordPressURL(
    location.startsWith("http://") || location.startsWith("https://")
      ? location
      : new URL(location, requestUrl).toString(),
  )

  const publicBase = tryGetPublicWpBaseUrl()
  if (!publicBase) return next

  let internalBase: string
  try { internalBase = wpBase() } catch { return next }

  if (publicBase === internalBase) return next

  try {
    const pub = new URL(publicBase)
    const internal = new URL(internalBase)
    if (next.host === pub.host) {
      next.protocol = internal.protocol
      next.host = internal.host
    }
  } catch { return next }

  return next
}

export function siteOriginForProxy(): string {
  const internal = process.env.INTERNAL_SITE_ORIGIN?.replace(/\/$/, "")
  if (internal) return internal
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")
  if (!fromEnv) return "http://127.0.0.1:3000"
  try {
    const u = new URL(fromEnv)
    if (u.hostname === "localhost") u.hostname = "127.0.0.1"
    return u.toString().replace(/\/$/, "")
  } catch { return fromEnv }
}

export function shouldRetryError(err: unknown, attempt: number) {
  if (err instanceof UpstreamTimeout) return true
  if (err instanceof UpstreamNetworkError) return true
  if (err instanceof UpstreamBadResponse) return err.status >= 500 || err.status === 429
  if (err instanceof CorsRedirectLoop) return attempt === 1
  return false
}

export function resolveCacheMode(init: { cache?: RequestCache; revalidate?: number }) {
  if (init.cache) return init.cache
  if (init.revalidate != null) return "force-cache"
  return "no-store"
}

export function resolveNextConfig(init: { next?: NextFetchRequestConfig; revalidate?: number }) {
  if (init.next) return init.next
  if (init.revalidate != null) return { revalidate: init.revalidate }
  return undefined
}

export function parseWithSchema<T>(raw: unknown, options: { schema?: { parse(data: unknown): T } | ((data: unknown) => T); transform?: (data: unknown) => T }): T {
  if (options.schema) {
    if (typeof options.schema === "function") return options.schema(raw)
    return options.schema.parse(raw)
  }
  if (options.transform) return options.transform(raw)
  return raw as T
}
