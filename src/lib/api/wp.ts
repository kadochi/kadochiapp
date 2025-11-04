// src/lib/api/wp.ts
const WP_BASE = process.env.WP_BASE_URL || "https://app.kadochi.com";

/** Typed options for fetch wrapper */
export type WPFetchOptions = {
  /** next.js caching hints */
  revalidate?: number | false;
  /** extra query params */
  params?: Record<string, string | number | boolean | undefined>;
  /** abort signal etc. */
  init?: RequestInit;
};

/** Helper: build URL with query params */
function withParams(base: string, params?: Record<string, any>) {
  if (!params) return base;
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  });
  const sep = base.includes("?") ? "&" : "?";
  const q = qs.toString();
  return q ? `${base}${sep}${q}` : base;
}

/** Fetch wrapper for WP/WC endpoints (Store API preferred) */
export async function wpFetchJSON<T = any>(
  path: string,
  { revalidate = 60, params, init }: WPFetchOptions = {}
): Promise<T> {
  const url = withParams(`${WP_BASE}${path}`, params);
  const res = await fetch(url, {
    // cache hint for Next App Router (RSC-friendly)
    next: revalidate === false ? { revalidate: 0 } : { revalidate },
    ...init,
  });
  if (!res.ok) {
    // You can enhance logging here
    throw new Error(`WP fetch failed ${res.status} for ${url}`);
  }
  const data = (await res.json()) as T;
  return data;
}

/* =====================
   Public Store API (no auth)
   ===================== */

// GET /wp-json/wc/store/v1/products
export async function wpListProducts(params?: Record<string, any>) {
  return wpFetchJSON<any[]>("/wp-json/wc/store/v1/products", {
    revalidate: 60,
    params,
  });
}

// GET /wp-json/wc/store/v1/products/{id}
export async function wpGetProduct(id: number | string) {
  return wpFetchJSON<any>(`/wp-json/wc/store/v1/products/${id}`, {
    revalidate: 60,
  });
}

/* =====================
   REST API (auth) - if ever needed
   ===================== */
// Example: not used by default. Uncomment if you need classic REST.
// function withBasicAuth(init?: RequestInit): RequestInit {
//   const key = process.env.WC_CONSUMER_KEY || "";
//   const secret = process.env.WC_CONSUMER_SECRET || "";
//   const auth = Buffer.from(`${key}:${secret}`).toString("base64");
//   return {
//     ...init,
//     headers: {
//       ...(init?.headers || {}),
//       Authorization: `Basic ${auth}`,
//     },
//   };
// }
