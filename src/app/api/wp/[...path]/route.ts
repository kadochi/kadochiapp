import { NextRequest, NextResponse } from "next/server";

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
  return {
    "Access-Control-Allow-Origin": allowed ? allowed : "", // empty → same-origin only
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS",
    "Access-Control-Allow-Headers":
      req.headers.get("access-control-request-headers") ||
      "Content-Type, Authorization, Accept",
    "Access-Control-Max-Age": "600",
  };
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

async function handle(
  req: NextRequest,
  ctx: { params: { path?: string[] } },
  passthroughBody: boolean
) {
  try {
    const url = targetURL(ctx.params.path, req.nextUrl.search);
    const method = req.method.toUpperCase();

    // Build upstream headers (do not forward user cookies to WP)
    const headers: Record<string, string> = {
      Accept: req.headers.get("accept") || "application/json",
      "Content-Type": req.headers.get("content-type") || "application/json",
      "X-From": "next-proxy",
      ...(buildAuthHeader() || {}),
    };
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(new Error("timeout")),
      10_000
    );

    const upstream = await fetch(url.toString(), {
      method,
      headers,
      body: passthroughBody
        ? method === "GET" || method === "HEAD"
          ? undefined
          : await req.arrayBuffer()
        : undefined,
      redirect: "manual",
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timer);

    if (isAuthRedirect(upstream)) {
      return NextResponse.json(
        {
          ok: false,
          code: "CORS_REDIRECT_LOOP",
          message: `Redirected to ${
            upstream.headers.get("location") || "unknown"
          }`,
        },
        { status: 502, headers: corsHeaders(req) }
      );
    }

    // Pass-through status/body; copy only safe headers
    const respHeaders = corsHeaders(req);
    const contentType = upstream.headers.get("content-type");
    if (contentType) respHeaders["Content-Type"] = contentType;
    const location = upstream.headers.get("location");
    if (location) respHeaders["Location"] = location;

    // Some endpoints may be 204/304 with empty body
    const body =
      upstream.status === 204 || upstream.status === 304 ? null : upstream.body;
    return new NextResponse(body as any, {
      status: upstream.status,
      headers: respHeaders,
    });
  } catch (err: any) {
    const respHeaders = corsHeaders(req);
    const status = err?.message === "timeout" ? 504 : 502;
    const code =
      err?.message === "timeout" ? "UPSTREAM_TIMEOUT" : "UPSTREAM_NETWORK";
    return NextResponse.json(
      { ok: false, code, message: err?.message || "Upstream error" },
      { status, headers: respHeaders }
    );
  }
}

export async function OPTIONS(
  req: NextRequest,
  ctx: { params: { path?: string[] } }
) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

// HEAD uses no body passthrough
export async function HEAD(
  req: NextRequest,
  ctx: { params: { path?: string[] } }
) {
  return handle(req, ctx, false);
}

export async function GET(
  req: NextRequest,
  ctx: { params: { path?: string[] } }
) {
  return handle(req, ctx, false);
}
export async function POST(
  req: NextRequest,
  ctx: { params: { path?: string[] } }
) {
  return handle(req, ctx, true);
}
export async function PUT(
  req: NextRequest,
  ctx: { params: { path?: string[] } }
) {
  return handle(req, ctx, true);
}
export async function PATCH(
  req: NextRequest,
  ctx: { params: { path?: string[] } }
) {
  return handle(req, ctx, true);
}
export async function DELETE(
  req: NextRequest,
  ctx: { params: { path?: string[] } }
) {
  return handle(req, ctx, true);
}
