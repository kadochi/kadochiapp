import "server-only";
import {
  CorsRedirectLoop,
  UpstreamAuthError,
  UpstreamBadResponse,
  UpstreamNetworkError,
  UpstreamTimeout,
} from "@/services/http/errors";
import { toUpstreamNetworkError } from "@/services/http/serialize-fetch-error";
import {
  composeSignal,
  resolveUpstreamRedirect,
  sanitizePathForProxy,
  siteOriginForProxy,
} from "./utils";

export async function fetchDirect(
  url: URL,
  init: RequestInit,
  timeoutMs: number,
  redirectDepth = 0,
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
          `Redirect limit exceeded for ${url.pathname} -> ${location}`,
        );
      }
      if (/wp-login\.php/i.test(location) || /\/?wp-admin\/?/i.test(location)) {
        throw new CorsRedirectLoop(`Redirected to ${location}`);
      }
      if (!location) {
        throw new UpstreamBadResponse(
          response.status,
          `Redirect without location for ${url.pathname}`,
        );
      }
      const nextUrl = resolveUpstreamRedirect(location, url);
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
    if (err instanceof UpstreamAuthError) throw err;
    if (err instanceof UpstreamBadResponse) throw err;
    if (err instanceof UpstreamNetworkError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new UpstreamTimeout();
    }
    throw toUpstreamNetworkError(
      err,
      {
        url: url.toString(),
        method: (init.method || "GET").toUpperCase(),
        redirectDepth,
        timeoutMs,
      },
      "[wordpress/fetchDirect]",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchViaProxy(
  url: URL,
  init: RequestInit,
  timeoutMs: number,
) {
  const proxyUrl = new URL(
    `/api/wp${sanitizePathForProxy(url)}`,
    siteOriginForProxy(),
  );
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
    if (err instanceof UpstreamAuthError) throw err;
    if (err instanceof UpstreamBadResponse) throw err;
    if (err instanceof CorsRedirectLoop) throw err;
    if (err instanceof UpstreamNetworkError) throw err;
    if (err instanceof Error && err.name === "AbortError")
      throw new UpstreamTimeout();
    throw toUpstreamNetworkError(
      err,
      {
        url: proxyUrl.toString(),
        method: (init.method || "GET").toUpperCase(),
        timeoutMs,
        via: "proxy",
      },
      "[wordpress/fetchViaProxy]",
    );
  } finally {
    clearTimeout(timeout);
  }
}
