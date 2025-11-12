import { NextRequest, NextResponse } from "next/server";

import {
  CorsRedirectLoop,
  UpstreamBadResponse,
  UpstreamNetworkError,
  UpstreamTimeout,
} from "@/services/http/errors";
import { retry } from "@/services/http/retry";

export const runtime = "nodejs"; // force Node runtime (not edge)
export const dynamic = "force-dynamic"; // don't cache the proxy itself

const WP_BASE_URL =
  process.env.WP_BASE_URL || process.env.NEXT_PUBLIC_WP_BASE_URL;
const WP_APP_USER = process.env.WP_APP_USER;
const WP_APP_PASS = process.env.WP_APP_PASS;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_RETRIES_IDEMPOTENT = 3;

// Build Basic auth header from env if present
function buildAuthHeader(): Record<string, string> | undefined {
  if (WP_APP_USER && WP_APP_PASS) {
    const token = Buffer.from(`${WP_APP_USER}:${WP_APP_PASS}`).toString(
      "base64"
    );
    return { Authorization: `Basic ${token}` };
  }
}

function corsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const allowed =
    !origin || ALLOWED_ORIGINS.length === 0
      ? undefined
      : ALLOWED_ORIGINS.find((o) => o === "*" || o === origin);

  const hdrs: Record<string, string> = {
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS",
    "Access-Control-Allow-Headers":
      req.headers.get("access-control-request-headers") ||
      "Content-Type, Authorization, Accept",
    "Access-Control-Max-Age": "600",
  };

  if (allowed) hdrs["Access-Control-Allow-Origin"] = allowed;
  return hdrs;
}

function isAuthRedirect(res: Response): boolean {
  const loc = res.headers.get("location") || "";
  return (
    res.status >= 300 &&
    res.status < 400 &&
    (/wp-login\.php/i.test(loc) || /\/?wp-admin\/?/i.test(loc))
  );
}

function targetURL(paramsPath: string[] | undefined, search: string): URL {
  if (!WP_BASE_URL) throw new Error("WP_BASE_URL not configured");
  const path = (paramsPath ?? []).join("/").replace(/^\//, "");
  const base = new URL(WP_BASE_URL);
  const url = new URL(path, base);
  if (search) {
    const qs = search.startsWith("?") ? search.substring(1) : search;
    qs && url.search ? (url.search += `&${qs}`) : (url.search = `?${qs}`);
  }
  return url;
}

function abortSignalAny(signals: AbortSignal[]): AbortSignal | undefined {
  const anyFn = (AbortSignal as unknown as {
    any?: (signals: AbortSignal[]) => AbortSignal;
  }).any;
  return typeof anyFn === "function" ? anyFn(signals) : undefined;
}

function mergeVary(existing: string | undefined, incoming: string | null) {
  const values = new Set<string>();
  (existing || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((v) => values.add(v));
  (incoming || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((v) => values.add(v));
  return Array.from(values).join(", ") || undefined;
}

function shouldRetry(err: unknown) {
  if (err instanceof UpstreamTimeout) return true;
  if (err instanceof UpstreamNetworkError) return true;
  if (err instanceof UpstreamBadResponse) {
    return err.status >= 500 || err.status === 429;
  }
  return false;
}

function mapProxyError(err: unknown) {
  if (err instanceof CorsRedirectLoop) {
    return { status: err.status, code: err.code, message: err.message } as const;
  }
  if (err instanceof UpstreamTimeout) {
    return {
      status: err.status,
      code: err.code,
      message: "Upstream request timed out",
    } as const;
  }
  if (err instanceof UpstreamBadResponse) {
    return {
      status: 502,
      code: err.code,
      message: "Upstream responded with an invalid status",
    } as const;
  }
  if (err instanceof UpstreamNetworkError) {
    return {
      status: err.status,
      code: err.code,
      message: "Network error contacting upstream",
    } as const;
  }
  return { status: 502, code: "UPSTREAM_UNKNOWN", message: "Upstream error" } as const;
}

async function fetchUpstream(
  url: URL,
  init: RequestInit,
  retries: number
): Promise<Response> {
  return retry(
    async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
      const signal = init.signal
        ? abortSignalAny([init.signal, controller.signal]) ?? controller.signal
        : controller.signal;
      try {
        const response = await fetch(url.toString(), {
          ...init,
          signal,
          redirect: "manual",
          cache: "no-store",
        });

        if (isAuthRedirect(response)) {
          throw new CorsRedirectLoop(
            `Redirected to ${response.headers.get("location") || "unknown"}`
          );
        }

        if (response.status >= 500 || response.status === 429) {
          throw new UpstreamBadResponse(response.status);
        }

        return response;
        } catch (err) {
          if (err instanceof CorsRedirectLoop || err instanceof UpstreamBadResponse) {
            throw err;
          }
          if (err instanceof Error && err.name === "AbortError") {
            throw new UpstreamTimeout();
          }
          if (err instanceof UpstreamTimeout) throw err;
          const message = err instanceof Error ? err.message : "proxy_fetch_failed";
          throw new UpstreamNetworkError(message);
        } finally {
          clearTimeout(timeout);
        }
      },
    {
      retries,
      shouldRetry,
      jitterRatio: 0.3,
      minDelayMs: 200,
      maxDelayMs: 5_000,
    }
  );
}

async function handle(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> },
  passthroughBody: boolean
) {
  try {
    const { path } = await ctx.params;
    const url = targetURL(path, req.nextUrl.search);
    const method = req.method.toUpperCase();

    // Build upstream headers (do not forward user cookies to WP)
    const headers: Record<string, string> = {
      Accept: req.headers.get("accept") || "application/json",
      "Content-Type": req.headers.get("content-type") || "application/json",
      "X-From": "next-proxy",
      ...(buildAuthHeader() || {}),
    };

    const ifNoneMatch = req.headers.get("if-none-match");
    if (ifNoneMatch) headers["If-None-Match"] = ifNoneMatch;
    const ifModifiedSince = req.headers.get("if-modified-since");
    if (ifModifiedSince) headers["If-Modified-Since"] = ifModifiedSince;

    const body = passthroughBody
      ? method === "GET" || method === "HEAD"
        ? undefined
        : await req.arrayBuffer()
      : undefined;

    const idempotent = ["GET", "HEAD", "OPTIONS"].includes(method);
    const upstream = await fetchUpstream(url, { method, headers, body }, idempotent ? MAX_RETRIES_IDEMPOTENT : 1);

    const respHeaders = corsHeaders(req);
    const contentType = upstream.headers.get("content-type");
    if (contentType) respHeaders["Content-Type"] = contentType;
    const location = upstream.headers.get("location");
    if (location) respHeaders["Location"] = location;
    const cacheControl = upstream.headers.get("cache-control");
    if (cacheControl) respHeaders["Cache-Control"] = cacheControl;
    const etag = upstream.headers.get("etag");
    if (etag) respHeaders["ETag"] = etag;
    const vary = mergeVary(respHeaders["Vary"], upstream.headers.get("vary"));
    if (vary) respHeaders["Vary"] = vary;

    const responseBody =
      upstream.status === 204 || upstream.status === 304 ? null : upstream.body;

    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: respHeaders,
    });
  } catch (err: unknown) {
    const respHeaders = corsHeaders(req);
    const mapped = mapProxyError(err);
    return NextResponse.json(
      { ok: false, code: mapped.code, message: mapped.message },
      { status: mapped.status, headers: respHeaders }
    );
  }
}

export async function OPTIONS(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function HEAD(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  return handle(req, ctx, false);
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  return handle(req, ctx, false);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  return handle(req, ctx, true);
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  return handle(req, ctx, true);
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  return handle(req, ctx, true);
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  return handle(req, ctx, true);
}
