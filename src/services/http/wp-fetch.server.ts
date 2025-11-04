import "server-only";
import { retry } from "./retry";
import {
  CorsRedirectLoop,
  UpstreamAuthError,
  UpstreamBadResponse,
  UpstreamNetworkError,
  UpstreamTimeout,
} from "./errors";

export interface WPFetchOptions extends RequestInit {
  /** Optional ISR window for GET requests */
  revalidateSeconds?: number;
  /** Abort after this many ms */
  timeoutMs?: number;
  /** Throw on non-2xx (default true) */
  throwOnHTTPError?: boolean;
}

const WP_BASE_URL =
  process.env.WP_BASE_URL || process.env.NEXT_PUBLIC_WP_BASE_URL;
const WP_APP_USER = process.env.WP_APP_USER;
const WP_APP_PASS = process.env.WP_APP_PASS;

if (!WP_BASE_URL) {
  // eslint-disable-next-line no-console
  console.warn("[wp-fetch] WP_BASE_URL is not set. Set it in your env.");
}

function buildAuthHeader(): HeadersInit | undefined {
  if (WP_APP_USER && WP_APP_PASS) {
    const token = Buffer.from(`${WP_APP_USER}:${WP_APP_PASS}`).toString(
      "base64"
    );
    return { Authorization: `Basic ${token}` };
  }
  return undefined;
}

/** keep timer refs without mutating AbortController */
const timerMap = new WeakMap<AbortSignal, ReturnType<typeof setTimeout>>();

function withTimeout(signal: AbortSignal | undefined, ms: number | undefined) {
  if (!ms) return signal;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("timeout")), ms);
  timerMap.set(controller.signal, timer);

  if (signal) {
    const onAbort = () => controller.abort((signal as any).reason);
    signal.addEventListener("abort", onAbort, { once: true });
  }
  return controller.signal;
}

function clearTimeoutOn(signal: AbortSignal | undefined) {
  if (!signal) return;
  const t = timerMap.get(signal);
  if (t) {
    clearTimeout(t);
    timerMap.delete(signal);
  }
}

function isAuthRedirect(res: Response): boolean {
  const loc = res.headers.get("location") || "";
  return (
    res.status >= 300 &&
    res.status < 400 &&
    (/wp-login\.php/i.test(loc) || /\/?wp-admin\/?/i.test(loc))
  );
}

export async function wpFetchJSON<T>(
  path: string,
  {
    revalidateSeconds,
    timeoutMs = 8000,
    throwOnHTTPError = true,
    headers,
    ...init
  }: WPFetchOptions = {}
): Promise<T> {
  if (!WP_BASE_URL)
    throw new UpstreamNetworkError("WP_BASE_URL not configured");

  const url = new URL(path.replace(/^\//, ""), WP_BASE_URL);
  const authHeader = buildAuthHeader();
  const mergedHeaders: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(authHeader || {}),
    ...(headers || {}),
  };

  const method = (init.method || "GET").toUpperCase();
  const isGET = method === "GET";

  return retry<T>(
    async () => {
      const controllerSignal = withTimeout(
        init.signal as AbortSignal | undefined,
        timeoutMs
      );

      try {
        const res = await fetch(url.toString(), {
          ...init,
          headers: mergedHeaders,
          ...(isGET && revalidateSeconds != null
            ? { next: { revalidate: revalidateSeconds } }
            : { cache: "no-store" }),
          redirect: "manual",
          signal: controllerSignal,
        });

        clearTimeoutOn(controllerSignal);

        if (isAuthRedirect(res)) {
          throw new CorsRedirectLoop(
            `WP responded with redirect to ${
              res.headers.get("location") || "unknown"
            }`
          );
        }

        if (throwOnHTTPError && (res.status < 200 || res.status >= 300)) {
          if (res.status === 401 || res.status === 403)
            throw new UpstreamAuthError();
          throw new UpstreamBadResponse(`HTTP ${res.status}`);
        }

        if (res.status === 204 || res.status === 304)
          return undefined as unknown as T;

        const text = await res.text();
        try {
          return JSON.parse(text) as T;
        } catch {
          throw new UpstreamBadResponse("Invalid JSON from WP");
        }
      } catch (err: any) {
        if (err?.name === "AbortError" || err?.message === "timeout") {
          throw new UpstreamTimeout();
        }
        throw err;
      }
    },
    {
      retries: 3,
      shouldRetry: (err) =>
        err instanceof UpstreamTimeout ||
        err instanceof UpstreamNetworkError ||
        err instanceof UpstreamBadResponse,
    }
  );
}
