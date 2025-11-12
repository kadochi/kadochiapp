// src/lib/api/wp.ts
import "server-only";

import {
  wordpressFetch,
  wordpressJson,
  type WordPressFetchOptions,
} from "@/services/wordpress";

export type WpFetchOpts = WordPressFetchOptions & {
  /** @deprecated use revalidate */
  revalidateSeconds?: number;
};

function normalizeOptions(opts?: WpFetchOpts): WordPressFetchOptions | undefined {
  if (!opts) return undefined;
  const { revalidateSeconds, revalidate, ...rest } = opts;
  return {
    ...rest,
    revalidate: revalidate ?? revalidateSeconds,
  } satisfies WordPressFetchOptions;
}

export async function wpFetch(path: string, init?: WpFetchOpts): Promise<Response> {
  const options = normalizeOptions(init);
  return wordpressFetch(path, {
    allowProxyFallback: true,
    timeoutMs: options?.timeoutMs ?? 8000,
    ...options,
  });
}

export async function wpFetchJSON<T>(
  path: string,
  init?: WpFetchOpts
): Promise<T> {
  const { data, notModified } = await wordpressJson<T>(path, {
    allowProxyFallback: true,
    timeoutMs: init?.timeoutMs ?? 8000,
    ...normalizeOptions(init),
  });
  if (notModified) {
    throw new Error(`wpFetchJSON received 304 for ${path}`);
  }
  if (data === null || typeof data === "undefined") {
    return null as unknown as T;
  }
  return data;
}

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
  const { data } = await wordpressJson<T>(path, {
    method: "GET",
    allowProxyFallback: true,
    timeoutMs: 8000,
  });
  return data as T;
}

export async function postWpJson<T>(endpoint: string, body: unknown) {
  const path = `/wp-json/${endpoint
    .replace(/^\/?wp-json\/?/, "")
    .replace(/^\/+/, "")}`;
  const { data } = await wordpressJson<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
    allowProxyFallback: true,
    timeoutMs: 10_000,
  });
  return data as T;
}
