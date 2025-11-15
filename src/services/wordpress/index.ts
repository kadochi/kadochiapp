import "server-only";

import {
  CorsRedirectLoop,
  UpstreamAuthError,
  UpstreamBadResponse,
  UpstreamNetworkError,
  UpstreamTimeout,
} from "@/services/http/errors";
import { retry } from "@/services/http/retry";

export interface WordPressFetchOptions extends RequestInit {
  /** Hard timeout per attempt (ms). */
  timeoutMs?: number;
  /** Total retry attempts (including the first). */
  retries?: number;
  /** Provide a dedupe key to coalesce concurrent identical requests. */
  dedupeKey?: string;
  /** When true, fallback to the local proxy on network/redirect issues. */
  allowProxyFallback?: boolean;
  /** Configure ISR/Next cache semantics. */
  revalidate?: number;
  /** Pass through If-None-Match (ETag) header. */
  ifNoneMatch?: string;
}

export interface WordPressJsonOptions<T> extends WordPressFetchOptions {
  /** Optional schema/parser to validate the upstream payload. */
  schema?: { parse(data: unknown): T } | ((data: unknown) => T);
  /** Optional transform applied after parsing. */
  transform?: (data: unknown) => T;
}

export interface WordPressJsonResult<T> {
  data: T | null;
  response: Response;
  etag: string | null;
  notModified: boolean;
}

const DEFAULT_TIMEOUT_MS = 7_000;
const DEFAULT_RETRIES = 2;
const inflight = new Map<string, Promise<Response>>();
const inflightJson = new Map<string, Promise<WordPressJsonResult<unknown>>>();

const SITE_ORIGIN = (() => {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "http://localhost:3000";
})();

const WP_BASE = (() => {
  const base =
    process.env.WP_BASE_URL ||
    process.env.NEXT_PUBLIC_WP_BASE_URL ||
    process.env.WOO_BASE_URL ||
    "https://app.kadochi.com";
  return base.replace(/\/$/, "");
})();

const BASIC_USER =
  process.env.WP_APP_USER ||
  process.env.WP_BASIC_USER ||
  process.env.WP_USER ||
  "";
const BASIC_PASS =
  process.env.WP_APP_PASS ||
  process.env.WP_BASIC_PASS ||
  process.env.WP_PASS ||
  "";

function buildBasicAuth(): string | undefined {
  if (!BASIC_USER || !BASIC_PASS) return undefined;
  return `Basic ${Buffer.from(`${BASIC_USER}:${BASIC_PASS}`).toString("base64")}`;
}

export function buildWordPressURL(input: string | URL): URL {
  if (input instanceof URL) return new URL(input.toString());
  if (input.startsWith("http://") || input.startsWith("https://")) {
    return new URL(input);
  }
  const normalized = input.startsWith("/") ? input : `/${input}`;
  const sanitized = normalized.replace(/\/+/g, "/");
  return new URL(sanitized, WP_BASE);
}

function createHeaders(init?: HeadersInit): Headers {
  const headers = new Headers(init);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (!headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  const auth = buildBasicAuth();
  if (auth && !headers.has("Authorization")) headers.set("Authorization", auth);
  headers.set("User-Agent", headers.get("User-Agent") || "kadochi-app-proxy/1.0");
  return headers;
}

function abortSignalAny(signals: AbortSignal[]): AbortSignal | undefined {
  const anyFn = (AbortSignal as unknown as {
    any?: (signals: AbortSignal[]) => AbortSignal;
  }).any;
  return typeof anyFn === "function" ? anyFn(signals) : undefined;
}

function composeSignal(
  signal: AbortSignal | null | undefined,
  timeoutMs: number
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error("timeout")), timeoutMs);
  const signals = [controller.signal, signal].filter(
    (value): value is AbortSignal =>
      typeof value === "object" && value !== null && "aborted" in value
  );
  const combined =
    signals.length > 1 ? abortSignalAny(signals) ?? signals[0] : signals[0];
  return { controller, timeout, signal: combined ?? controller.signal } as const;
}

function sanitizePathForProxy(url: URL): string {
  const path = url.pathname.replace(/\/+/g, "/");
  return `${path}${url.search}`;
}

async function fetchDirect(
  url: URL,
  init: RequestInit,
  timeoutMs: number,
  redirectDepth = 0
): Promise<Response> {
  const { timeout, signal } = composeSignal(init.signal, timeoutMs);
  try {
    const response = await fetch(url.toString(), {
      ...init,
      signal,
      redirect: "manual",
      cache: init.cache ?? "no-store",
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location") || "";
      if (redirectDepth >= 1) {
        throw new CorsRedirectLoop(
          `Redirect limit exceeded for ${url.pathname} -> ${location}`
        );
      }
      if (/wp-login\.php/i.test(location) || /\/?wp-admin\/?/i.test(location)) {
        throw new CorsRedirectLoop(`Redirected to ${location}`);
      }
      if (!location) {
        throw new UpstreamBadResponse(
          response.status,
          `Redirect without location for ${url.pathname}`
        );
      }
      const nextUrl = buildWordPressURL(location);
      return fetchDirect(nextUrl, init, timeoutMs, redirectDepth + 1);
    }

    if ([401, 403].includes(response.status)) {
      throw new UpstreamAuthError();
    }

    if (response.status >= 500 || response.status === 429) {
      throw new UpstreamBadResponse(response.status);
    }

    return response;
  } catch (err) {
    if (err instanceof UpstreamTimeout) throw err;
    if (err instanceof CorsRedirectLoop) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new UpstreamTimeout();
    }
    const message = err instanceof Error ? err.message : "network error";
    throw new UpstreamNetworkError(message);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchViaProxy(url: URL, init: RequestInit, timeoutMs: number) {
  const proxyUrl = new URL(`/api/wp${sanitizePathForProxy(url)}`, SITE_ORIGIN);
  const { timeout, signal } = composeSignal(init.signal, timeoutMs);
  const proxyHeaders = new Headers(init.headers);
  proxyHeaders.set("X-Proxy-Hop", "wordpress-fetch");
  try {
    const response = await fetch(proxyUrl.toString(), {
      ...init,
      signal,
      cache: "no-store",
      headers: proxyHeaders,
    });
    if (response.status >= 500 || response.status === 429) {
      throw new UpstreamBadResponse(response.status);
    }
    if ([401, 403].includes(response.status)) {
      throw new UpstreamAuthError();
    }
    return response;
  } catch (err) {
    if (err instanceof UpstreamTimeout) throw err;
    if (err instanceof Error && err.name === "AbortError") throw new UpstreamTimeout();
    const message = err instanceof Error ? err.message : "proxy network error";
    throw new UpstreamNetworkError(message);
  } finally {
    clearTimeout(timeout);
  }
}

function shouldRetryError(err: unknown, attempt: number) {
  if (err instanceof UpstreamTimeout) return true;
  if (err instanceof UpstreamNetworkError) return true;
  if (err instanceof UpstreamBadResponse) return err.status >= 500 || err.status === 429;
  if (err instanceof CorsRedirectLoop) return attempt === 1; // retry once before proxy fallback
  return false;
}

function resolveCacheMode(init: WordPressFetchOptions) {
  if (init.cache) return init.cache;
  if (init.revalidate != null) return "force-cache";
  return "no-store";
}

function resolveNextConfig(init: WordPressFetchOptions) {
  if (init.next) return init.next;
  if (init.revalidate != null) return { revalidate: init.revalidate };
  return undefined;
}

function parseWithSchema<T>(
  raw: unknown,
  options: WordPressJsonOptions<T>
): T {
  if (options.schema) {
    if (typeof options.schema === "function") {
      return options.schema(raw);
    }
    return options.schema.parse(raw);
  }
  if (options.transform) {
    return options.transform(raw);
  }
  return raw as T;
}

export async function wordpressFetch(
  input: string | URL,
  options: WordPressFetchOptions = {}
): Promise<Response> {
  const url = buildWordPressURL(input);
  const headers = createHeaders(options.headers);
  if (options.ifNoneMatch) headers.set("If-None-Match", options.ifNoneMatch);

  const requestInit: RequestInit = {
    ...options,
    headers,
    cache: resolveCacheMode(options),
    next: resolveNextConfig(options),
  };

  const method = (requestInit.method || "GET").toUpperCase();
  const idempotent = ["GET", "HEAD", "OPTIONS"].includes(method);
  const retries = options.retries ?? (idempotent ? DEFAULT_RETRIES : 1);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const key = options.dedupeKey || (idempotent ? `${method}:${url.toString()}` : undefined);

  if (key && inflight.has(key)) {
    const cached = inflight.get(key)!;
    const clone = cached.then((res) => res.clone());
    return clone;
  }

  const runner = retry(
    async (attempt) => {
      try {
        return await fetchDirect(url, requestInit, timeoutMs);
      } catch (err) {
        if (options.allowProxyFallback && err instanceof CorsRedirectLoop) {
          return fetchViaProxy(url, requestInit, timeoutMs);
        }
        if (options.allowProxyFallback && err instanceof UpstreamNetworkError) {
          return fetchViaProxy(url, requestInit, timeoutMs);
        }
        throw err;
      }
    },
    {
      retries,
      shouldRetry: (err, attempt) => shouldRetryError(err, attempt),
      jitterRatio: 0.3,
      minDelayMs: 200,
      maxDelayMs: 5_000,
    }
  );

  const promise = runner.catch((err: unknown) => {
    if (key) inflight.delete(key);
    throw err;
  });

  if (key) inflight.set(key, promise);

  try {
    const res = await promise;
    return res;
  } finally {
    if (key) inflight.delete(key);
  }
}

export async function wordpressJson<T>(
  input: string | URL,
  options: WordPressJsonOptions<T> = {}
): Promise<WordPressJsonResult<T>> {
  const method = (options.method || "GET").toUpperCase();
  const idempotent = ["GET", "HEAD", "OPTIONS"].includes(method);
  const key =
    options.dedupeKey || (idempotent ? `${method}:${buildWordPressURL(input).toString()}` : undefined);

  if (key && inflightJson.has(key)) {
    return inflightJson.get(key)! as Promise<WordPressJsonResult<T>>;
  }

  const runner = (async () => {
    const response = await wordpressFetch(input, options);
    const etag = response.headers.get("etag");
    if (response.status === 304) {
      return { data: null, response, etag, notModified: true } satisfies WordPressJsonResult<T>;
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new UpstreamBadResponse(
        response.status,
        `Unexpected WordPress status ${response.status} (${text.slice(0, 200)})`
      );
    }

    const raw = await response.json();
    const data = parseWithSchema<T>(raw, options);

    return { data, response, etag, notModified: false } satisfies WordPressJsonResult<T>;
  })().catch((err: unknown) => {
    if (key) inflightJson.delete(key);
    throw err;
  });

  if (key) inflightJson.set(key, runner as Promise<WordPressJsonResult<unknown>>);

  try {
    return await runner;
  } finally {
    if (key) inflightJson.delete(key);
  }
}
