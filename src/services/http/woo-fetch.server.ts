import "server-only";

type WooFetchOpts = {
  revalidateSeconds?: number;
  abortSignal?: AbortSignal;
  /** extra headers if you need */
  headers?: Record<string, string>;
};

/**
 * Low-level fetch wrapper for Woo REST (wc/v3) that:
 *  - Preserves existing query params in `path` (so `category`, `search`, ...)
 *  - Appends consumer_key/consumer_secret without clobbering existing params
 *  - Optionally adds Basic Auth (some stacks need it for proxies)
 *  - Gives useful errors in dev
 */
export async function wooFetchJSON<T = unknown>(
  path: string,
  opts: WooFetchOpts = {}
): Promise<T> {
  const base =
    process.env.WOO_BASE_URL ||
    process.env.WP_BASE_URL ||
    process.env.NEXT_PUBLIC_WP_BASE_URL ||
    "https://app.kadochi.com";

  // Build URL and **preserve** existing query string
  const url =
    path.startsWith("http://") || path.startsWith("https://")
      ? new URL(path)
      : new URL(path.startsWith("/") ? path : `/${path}`, base);

  // Auth via query (standard for Woo REST) – don’t override if already present
  const ck = process.env.WOO_CONSUMER_KEY;
  const cs = process.env.WOO_CONSUMER_SECRET;
  if (ck && cs) {
    if (!url.searchParams.has("consumer_key"))
      url.searchParams.set("consumer_key", ck);
    if (!url.searchParams.has("consumer_secret"))
      url.searchParams.set("consumer_secret", cs);
  }

  // Some hosts prefer Basic Auth for WordPress
  const appUser = process.env.WP_APP_USER;
  const appPass = process.env.WP_APP_PASS;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...opts.headers,
  };

  if (appUser && appPass) {
    const token =
      typeof Buffer !== "undefined"
        ? Buffer.from(`${appUser}:${appPass}`).toString("base64")
        : btoa(`${appUser}:${appPass}`);
    headers["Authorization"] = `Basic ${token}`;
  }

  const res = await fetch(url.toString(), {
    headers,
    signal: opts.abortSignal,
    // keep ISR hints server-side
    next: { revalidate: opts.revalidateSeconds ?? 120 },
  });

  if (!res.ok) {
    // try to surface something actionable in dev
    const body = await res.text().catch(() => "");
    throw new Error(
      `wooFetchJSON failed: ${res.status} ${res.statusText}\n` +
        `URL: ${url.toString()}\n` +
        (body ? `Body: ${body.slice(0, 500)}` : "")
    );
  }

  return (await res.json()) as T;
}
