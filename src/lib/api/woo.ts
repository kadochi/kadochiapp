import "server-only";
import { cache } from "react";

/* ============================================================================
 * Base types (kept)
 * ==========================================================================*/
export type WooCustomer = {
  id: number;
  email?: string | null;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  billing?: {
    phone?: string | null;
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
};

export interface PagedResult<T> {
  items: T[];
  page: number;
  perPage: number;
  total?: number;
  totalPages?: number;
}

/* ============================================================================
 * Config (kept)
 * ==========================================================================*/
const WP_BASE =
  process.env.WOO_BASE_URL ||
  process.env.WP_BASE_URL ||
  process.env.NEXT_PUBLIC_WP_BASE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://app.kadochi.com";

const CK = process.env.WOO_CONSUMER_KEY || "";
const CS = process.env.WOO_CONSUMER_SECRET || "";

const APP_USER =
  process.env.WP_APP_USER || process.env.WP_BASIC_USER || process.env.WP_USER || "";
const APP_PASS =
  process.env.WP_APP_PASS || process.env.WP_BASIC_PASS || process.env.WP_PASS || "";

const DEV_FAKE =
  process.env.NODE_ENV !== "production" && !!process.env.WOO_DEV_FAKE;

/* ============================================================================
 * Low-level fetch (kept)
 * ==========================================================================*/
type WooFetchOpts = RequestInit & {
  revalidateSeconds?: number;
  headers?: HeadersInit;
};

function makeWooUrl(path: string): URL {
  const base = WP_BASE.replace(/\/+$/, "");
  const url =
    path.startsWith("http://") || path.startsWith("https://")
      ? new URL(path)
      : new URL(path.startsWith("/") ? path : `/${path}`, base);
  return url;
}

export async function wooFetch(
  path: string,
  init?: WooFetchOpts
): Promise<Response> {
  const url = makeWooUrl(path);

  const touchesWoo = /\/wc\/v\d+\/|\/wp-json\/wc\/v\d+\//.test(url.pathname);
  if (touchesWoo && CK && CS) {
    if (!url.searchParams.has("consumer_key"))
      url.searchParams.set("consumer_key", CK);
    if (!url.searchParams.has("consumer_secret"))
      url.searchParams.set("consumer_secret", CS);
  }

  const { revalidateSeconds, headers: initHeaders, next, cache, ...rest } = init ?? {};

  const hdrs = new Headers(initHeaders);
  if (!hdrs.has("Content-Type")) hdrs.set("Content-Type", "application/json");

  if (APP_USER && APP_PASS && !hdrs.has("Authorization")) {
    const token =
      typeof Buffer !== "undefined"
        ? Buffer.from(`${APP_USER}:${APP_PASS}`).toString("base64")
        : btoa(`${APP_USER}:${APP_PASS}`);
    hdrs.set("Authorization", `Basic ${token}`);
  }

  const cacheMode = cache ?? (revalidateSeconds != null ? "force-cache" : "no-store");
  const nextConfig =
    revalidateSeconds != null ? { revalidate: revalidateSeconds } : next;

  const res = await fetch(url.toString(), {
    ...rest,
    headers: hdrs,
    cache: cacheMode,
    next: nextConfig,
  });

  return res;
}

export async function wooFetchJSON<T>(
  path: string,
  init?: WooFetchOpts
): Promise<T> {
  const res = await wooFetch(path, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `wooFetchJSON failed: ${res.status} ${res.statusText}\n` +
        `URL: ${makeWooUrl(path).toString()}\n` +
        (body ? `Body: ${body.slice(0, 600)}` : "")
    );
  }
  return (await res.json()) as T;
}

/* ============================================================================
 * Customers (kept 1:1)
 * ==========================================================================*/
const getCustomerByIdCached = cache(async (id: number): Promise<WooCustomer | null> => {
  if (DEV_FAKE) {
    return {
      id,
      email: null,
      username: String(id),
      first_name: "",
      last_name: "",
      billing: { phone: null, email: null, first_name: "", last_name: "" },
    };
  }
  const path = `/wp-json/wc/v3/customers/${id}`;
  const r = await wooFetch(path, { method: "GET", revalidateSeconds: 120 });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`getCustomerById failed: ${r.status}`);
  return (await r.json()) as WooCustomer;
});

export async function getCustomerById(id: number): Promise<WooCustomer | null> {
  return getCustomerByIdCached(id);
}

export async function findCustomers(params: { search?: string }) {
  if (DEV_FAKE) return [] as WooCustomer[];
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  const path = `/wp-json/wc/v3/customers?${q.toString()}`;
  return await wooFetchJSON<WooCustomer[]>(path, { method: "GET" });
}

export async function createCustomer(body: Partial<WooCustomer>) {
  if (DEV_FAKE)
    return { id: Math.floor(Math.random() * 10_000), ...body } as WooCustomer;
  const r = await wooFetch(`/wp-json/wc/v3/customers`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`createCustomer failed: ${r.status}`);
  return (await r.json()) as WooCustomer;
}

export async function updateCustomer(id: number, body: Partial<WooCustomer>) {
  if (DEV_FAKE) return { id, ...body } as WooCustomer;
  const r = await wooFetch(`/wp-json/wc/v3/customers/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`updateCustomer failed: ${r.status}`);
  return (await r.json()) as WooCustomer;
}

/* ============================================================================
 * Catalog – LEGACY (shape A) — kept & re-exported for compatibility
 * ==========================================================================*/
type StoreApiProduct_A = {
  id: number;
  name: string;
  slug?: string;
  permalink?: string;
  images?: Array<{ src?: string | null; alt?: string | null }>;
  prices?: {
    price?: string | null;
    regular_price?: string | null;
    sale_price?: string | null;
    currency_code?: string | null;
  };
  is_in_stock?: boolean | null;
  is_purchasable?: boolean | null;
  average_rating?: string | number | null;
  review_count?: number | null;
  short_description?: string | null;
  description?: string | null;
  categories?: Array<{ id?: number; name?: string; slug?: string }>;
  tags?: Array<{ id?: number; name?: string; slug?: string }>;
  attributes?: Array<{
    id?: number;
    name?: string;
    slug?: string;
    terms?: Array<{ name?: string; slug?: string }>;
  }>;
};

function mapStoreProductToMinimal_A(p: StoreApiProduct_A) {
  const price = p?.prices?.price ?? null;
  const regularPrice = p?.prices?.regular_price ?? null;
  const salePrice = p?.prices?.sale_price ?? null;
  return {
    id: p.id,
    name: p.name ?? "",
    slug: p.slug ?? "",
    permalink: p.permalink ?? "",
    images: (p.images || []).map((img) => ({
      src: String(img?.src || ""),
      alt: img?.alt || "",
    })),
    price,
    regularPrice,
    salePrice,
    currency: p?.prices?.currency_code ?? null,
    inStock: !!p?.is_in_stock,
    purchasable: !!p?.is_purchasable,
    ratingAvg:
      typeof p?.average_rating === "string"
        ? parseFloat(p.average_rating)
        : Number(p?.average_rating || 0),
    reviewsCount: Number(p?.review_count || 0),
  };
}

/** Legacy shape: price as string|null, images: {src,alt}[] */
export async function listProducts_legacy(
  params: Record<string, string | number | boolean | undefined>
) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined || v === null || v === "") continue;
    q.set(k, String(v));
  }
  const path = `/wp-json/wc/store/v1/products?${q.toString()}`;

  const res = await wooFetch(path, { method: "GET" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `listProducts (legacy) failed: ${res.status}\n${body.slice(0, 600)}`
    );
  }

  const items = (await res.json()) as StoreApiProduct_A[];
  const page = Number(params?.page || 1);
  const perPage = Number(params?.per_page || 12);
  const total = Number(res.headers.get("X-WP-Total") || NaN);
  const totalPages = Number(res.headers.get("X-WP-TotalPages") || NaN);

  return {
    items: items.map(mapStoreProductToMinimal_A),
    page,
    perPage,
    total: Number.isFinite(total) ? total : undefined,
    totalPages: Number.isFinite(totalPages) ? totalPages : undefined,
  };
}

export async function getProductDetail_legacy(id: number) {
  const prod = await wooFetchJSON<any>(`/wp-json/wc/v3/products/${id}`, {
    method: "GET",
  });

  const price = prod?.price ?? prod?.prices?.price ?? null;
  const regularPrice =
    prod?.regular_price ?? prod?.prices?.regular_price ?? null;
  const salePrice = prod?.sale_price ?? prod?.prices?.sale_price ?? null;

  return {
    id: Number(prod?.id),
    name: String(prod?.name || ""),
    slug: String(prod?.slug || ""),
    permalink: String(prod?.permalink || ""),
    images: Array.isArray(prod?.images)
      ? prod.images.map((img: any) => ({
          src: String(img?.src || ""),
          alt: String(img?.alt || ""),
        }))
      : [],
    price,
    regularPrice,
    salePrice,
    currency: prod?.currency || prod?.prices?.currency_code || null,
    inStock: !!(prod?.stock_status
      ? prod.stock_status === "instock"
      : prod?.is_in_stock),
    purchasable: prod?.purchasable ?? prod?.is_purchasable ?? true,
    shortDescriptionHtml: String(prod?.short_description || ""),
    descriptionHtml: String(prod?.description || ""),
    categories: Array.isArray(prod?.categories)
      ? prod.categories.map((c: any) => ({
          id: Number(c?.id),
          name: String(c?.name || ""),
          slug: c?.slug,
        }))
      : [],
    tags: Array.isArray(prod?.tags)
      ? prod.tags.map((t: any) => ({
          id: Number(t?.id),
          name: String(t?.name || ""),
          slug: t?.slug,
        }))
      : [],
    attributes: Array.isArray(prod?.attributes)
      ? prod.attributes.map((a: any) => ({
          id: Number(a?.id),
          name: String(a?.name || ""),
          slug: a?.slug,
          options: Array.isArray(a?.options)
            ? a.options.map((o: any) => String(o))
            : [],
        }))
      : [],
    ratingAvg:
      typeof prod?.average_rating === "string"
        ? parseFloat(prod.average_rating)
        : Number(prod?.average_rating || 0),
    reviewsCount: Number(prod?.rating_count || prod?.review_count || 0),
  };
}

/* ============================================================================
 * Catalog – CURRENT default exports (shape B expected by PLP/PDP)
 *  - images: { url, alt? }
 *  - price: { amount: number, currency: string }
 *  - no reordering, no perPage clamp → preserves API order & page size
 * ==========================================================================*/
type StoreProduct_B = {
  id: number;
  name: string;
  images?: Array<{ src?: string | null; alt?: string | null }>;
  prices?: {
    price?: string | null;
    regular_price?: string | null;
    sale_price?: string | null;
    currency_code?: string | null;
  };
  is_in_stock?: boolean | null;
  is_purchasable?: boolean | null;
  stock_status?:
    | "instock"
    | "outofstock"
    | "onbackorder"
    | "out_of_stock"
    | string
    | null;
  attributes?: any[];
  tags?: any[];
  categories?: any[];
  average_rating?: number | string | null;
  rating_count?: number | null;
  description?: string | null;
  short_description?: string | null;
  slug?: string;
};

const isFiniteNumber = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n);

const resolveCategoryId = cache(async function resolveCategoryId(
  input?: number | string
) {
  if (!input) return undefined;
  if (typeof input === "number" || /^\d+$/.test(String(input)))
    return Number(input);

  const slug = String(input).trim();
  const urls = [
    `${WP_BASE}/wp-json/wp/v2/product_cat?slug=${encodeURIComponent(
      slug
    )}&per_page=1`,
    `${WP_BASE}/wp-json/wc/store/v1/products/categories?slug=${encodeURIComponent(
      slug
    )}&per_page=1`,
  ];
  try {
    const results = await Promise.allSettled(
      urls.map((u) => fetch(u, { next: { revalidate: 60 } }))
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.ok) {
        const js = (await r.value.json()) as Array<{ id: number }>;
        if (js?.[0]?.id) return js[0].id;
      }
    }
  } catch {}
  return undefined;
});

const resolveTagIdsCsv = cache(async function resolveTagIdsCsv(
  input?: number | string
) {
  if (!input) return undefined;
  const parts = String(input)
    .trim()
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return undefined;

  const numericIds = parts
    .filter((p) => /^\d+$/.test(p))
    .map((p) => Number(p))
    .filter(isFiniteNumber);
  const slugParts = parts.filter((p) => !/^\d+$/.test(p));
  const slugPartsLower = slugParts.map((p) => p.toLowerCase());

  const resolved = [...numericIds];
  const resolvedSlugSet = new Set<string>();

  if (slugParts.length) {
    const perPage = Math.min(50, Math.max(slugParts.length, 10));
    const qs = new URLSearchParams({
      per_page: String(perPage),
      slug: slugParts.join(","),
      _fields: "id,slug",
    });
    try {
      const res = await wooFetch(`/wp-json/wc/v3/products/tags?${qs.toString()}`, {
        method: "GET",
        revalidateSeconds: 600,
      });
      if (res.ok) {
        const arr = (await res.json()) as Array<{ id?: number; slug?: string }>;
        for (const entry of arr || []) {
          if (!entry) continue;
          const slug = String(entry.slug || "").trim();
          if (!slug) continue;
          const id = Number(entry.id);
          if (Number.isFinite(id)) {
            resolved.push(id);
            resolvedSlugSet.add(slug.toLowerCase());
          }
        }
      }
    } catch {}

    const missing = slugParts.filter(
      (slug, idx) => !resolvedSlugSet.has(slugPartsLower[idx])
    );
    if (missing.length) {
      const fallbackIds = await Promise.all(
        missing.map(async (slug) => {
          const urls = [
            `${WP_BASE}/wp-json/wp/v2/product_tag?slug=${encodeURIComponent(
              slug
            )}&per_page=1`,
            `${WP_BASE}/wp-json/wc/store/v1/products/tags?slug=${encodeURIComponent(
              slug
            )}&per_page=1`,
          ];
          try {
            const results = await Promise.allSettled(
              urls.map((u) => fetch(u, { next: { revalidate: 60 } }))
            );
            for (const r of results) {
              if (r.status === "fulfilled" && r.value.ok) {
                const js = (await r.value.json()) as Array<{ id: number }>;
                if (js?.[0]?.id) return Number(js[0].id);
              }
            }
          } catch {}
          return undefined;
        })
      );
      for (const id of fallbackIds) {
        if (isFiniteNumber(id)) resolved.push(id);
      }
    }
  }

  const uniq = Array.from(new Set(resolved.filter(isFiniteNumber)));
  return uniq.length ? uniq.join(",") : undefined;
});

function mapOrderby(
  v?: "date" | "price" | "popularity" | "rating"
): "date" | "price" | "popularity" {
  if (v === "price") return "price";
  if (v === "popularity" || v === "rating") return "popularity";
  return "date";
}

/** PLP: shape B */
export async function listProducts(params: {
  page?: number;
  perPage?: number;
  search?: string;
  category?: number | string;
  tag?: number | string;
  order?: "asc" | "desc";
  orderby?: "date" | "price" | "popularity" | "rating";
  min_price?: string;
  max_price?: string;
}): Promise<
  PagedResult<{
    id: number;
    name: string;
    images?: Array<{ url: string; alt?: string }>;
    price: { amount: number; currency: string };
    regularPrice?: { amount: number; currency: string };
    salePrice?: { amount: number; currency: string };
    stock?: { inStock: boolean; status?: string | null };
  }>
> {
  const {
    page = 1,
    perPage = 12,
    search,
    category,
    tag,
    order = "desc",
    orderby = "date",
    min_price,
    max_price,
  } = params || {};

  const qp = new URLSearchParams({
    page: String(Math.max(1, page)),
    per_page: String(Math.max(1, perPage)),
    order,
    orderby: mapOrderby(orderby),
  });
  if (search) qp.set("search", search);

  const catId = await resolveCategoryId(category);
  if (catId) qp.set("category", String(catId));

  if (typeof tag !== "undefined" && tag !== null && String(tag).trim() !== "") {
    const tagIdsCsv = await resolveTagIdsCsv(tag);
    if (tagIdsCsv) {
      qp.set("tag", tagIdsCsv);
      if (tagIdsCsv.includes(",")) qp.set("tag_operator", "and");
    }
  }

  // UI uses toman; Store API in rial → multiply by 10 if numeric
  const decRe = /^\d+(\.\d+)?$/;
  if (min_price && decRe.test(min_price)) {
    const rialMin = Math.trunc(Number(min_price) * 10);
    qp.set("min_price", String(rialMin));
  }
  if (max_price && decRe.test(max_price)) {
    const rialMax = Math.trunc(Number(max_price) * 10);
    qp.set("max_price", String(rialMax));
  }

  const url = `${WP_BASE}/wp-json/wc/store/v1/products?${qp.toString()}`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) {
    if (res.status === 404)
      return { items: [], page, perPage, total: 0, totalPages: 1 };
    throw new Error(`Store API failed: ${res.status}`);
  }

  const raw = (await res.json()) as StoreProduct_B[];
  const total = Number(res.headers.get("x-wp-total") || raw.length || 0);
  const totalPages = Number(res.headers.get("x-wp-totalpages") || 1);

  const items = (raw || []).map((p) => {
    const img = p.images?.[0]?.src || "/images/placeholder.png";
    const currency = (p.prices?.currency_code as string) || "IRR";

    const sale = Number(p.prices?.sale_price ?? NaN);
    const regular = Number(p.prices?.regular_price ?? NaN);
    const baseRaw = Number(
      p.prices?.sale_price ?? p.prices?.price ?? p.prices?.regular_price ?? 0
    );
    const base = Number.isFinite(baseRaw) ? baseRaw : 0;

    const stockStatus = String(p?.stock_status || "").toLowerCase();
    const inStock =
      !(stockStatus === "outofstock" || stockStatus === "out_of_stock") &&
      p?.is_in_stock !== false &&
      p?.is_purchasable !== false;

    return {
      id: p.id,
      name: p.name,
      images: [{ url: img, alt: p.images?.[0]?.alt || p.name }],
      price: { amount: base, currency },
      regularPrice: Number.isFinite(regular)
        ? { amount: regular, currency }
        : undefined,
      salePrice: Number.isFinite(sale) ? { amount: sale, currency } : undefined,
      stock: { inStock, status: p.stock_status ?? null },
    };
  });

  return { items, page, perPage, total, totalPages };
}

/** PDP: shape B */
export type ProductComment = {
  id: number | string;
  authorName?: string | null;
  avatarUrl?: string | null;
  rating?: number | null;
  date?: string | Date | null;
  content: string;
};

export type ProductDetail = {
  id: number;
  name: string;
  images: Array<{ url: string; alt?: string }>;
  descriptionHtml: string;
  descriptionPlain: string;
  price: { amount: number; currency: string };
  regularPrice?: { amount: number; currency: string };
  salePrice?: { amount: number; currency: string };
  previousPrice?: number;
  offPercent?: number | null;
  stock: { inStock: boolean; status?: string | null };

  attributes: Array<{ name: string; value: string }>;
  tags: Array<{ id: number; name: string; slug?: string }>;
  categories: Array<{ id: number; name: string; slug?: string }>;

  ratingAvg: number;
  reviewsCount: number;
  comments?: ProductComment[];
};

function _stripHtml(html: string) {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function _stripFontFamily(html: string) {
  const step1 = String(html || "").replace(
    /style="([^"]*)"/gi,
    (_f, inner) => `style="${inner.replace(/font-family:[^;"]*;?/gi, "")}"`
  );
  const step2 = step1.replace(
    /style='([^']*)'/gi,
    (_f, inner) => `style='${inner.replace(/font-family:[^;']*;?/gi, "")}'`
  );
  return step2.replace(/<font\b[^>]*>/gi, "").replace(/<\/font>/gi, "");
}

function _mapAttributes(attrs?: any[]): Array<{ name: string; value: string }> {
  if (!Array.isArray(attrs) || !attrs.length) return [];
  return attrs
    .map((a) => {
      const name = (a?.name ?? "").toString().trim();
      const terms = (a?.terms ?? []) as Array<{ name?: string }>;
      const options = (a?.options ?? []) as string[];
      const value = terms?.length
        ? terms
            .map((t) => t?.name)
            .filter(Boolean)
            .join("، ")
        : options?.length
        ? options.join("، ")
        : "";
      return name && value ? { name, value } : null;
    })
    .filter(Boolean) as Array<{ name: string; value: string }>;
}

const _resolveProductIdBySlug = cache(async function _resolveProductIdBySlug(
  slugOrMaybeEncoded: string
) {
  const clean = decodeURIComponent(String(slugOrMaybeEncoded || "").trim());
  if (!clean) return null;

  const wc3Qs = new URLSearchParams({
    slug: clean,
    per_page: "1",
    _fields: "id,slug",
  });

  try {
    const wc3Res = await wooFetch(`/wp-json/wc/v3/products?${wc3Qs.toString()}`, {
      method: "GET",
      revalidateSeconds: 600,
    });
    if (wc3Res.ok) {
      const items = (await wc3Res.json()) as Array<{ id: number } | null>;
      if (Array.isArray(items) && items[0]?.id) {
        return Number(items[0].id);
      }
    }
  } catch {}

  try {
    const r = await fetch(
      `${WP_BASE}/wp-json/wp/v2/product?slug=${encodeURIComponent(
        clean
      )}&_fields=id,slug`,
      { cache: "no-store" }
    );
    if (r.ok) {
      const arr = (await r.json()) as Array<{ id: number }>;
      if (arr?.[0]?.id) return Number(arr[0].id);
    }
  } catch {}
  return null;
});

const fetchProductComments = cache(async function fetchProductComments(
  productId: number
): Promise<ProductComment[]> {
  const base = WP_BASE.replace(/\/$/, "");
  const ck = process.env.WOO_CONSUMER_KEY || "";
  const cs = process.env.WOO_CONSUMER_SECRET || "";

  try {
    const url =
      `${base}/wp-json/wc/v3/products/reviews` +
      `?product=${encodeURIComponent(String(productId))}` +
      `&status=approved&per_page=20` +
      (ck && cs
        ? `&consumer_key=${encodeURIComponent(
            ck
          )}&consumer_secret=${encodeURIComponent(cs)}`
        : "");

    const r = await fetch(url, {
      cache: "force-cache",
      next: { revalidate: 120 },
    });
    if (r.ok) {
      const arr = (await r.json()) as Array<{
        id: number;
        review: string;
        reviewer: string;
        reviewer_avatar_urls?: Record<string, string>;
        rating?: number | null;
        date_created_gmt?: string;
      }>;
      return arr.map((it) => ({
        id: it.id,
        authorName: it.reviewer || "کاربر",
        avatarUrl:
          it.reviewer_avatar_urls?.["96"] ||
          Object.values(it.reviewer_avatar_urls || {})[0] ||
          null,
        rating: typeof it.rating === "number" ? it.rating : null,
        date: it.date_created_gmt || null,
        content: _stripHtml(it.review || ""),
      }));
    }
  } catch (e) {
    console.error("fetchProductComments wc/v3 failed:", e);
  }

  try {
    const r2 = await fetch(
      `${base}/wp-json/wp/v2/comments?post=${productId}&per_page=20&_fields=id,author_name,author_avatar_urls,date,content`,
      {
        cache: "force-cache",
        next: { revalidate: 120 },
      }
    );
    if (r2.ok) {
      const arr = (await r2.json()) as Array<{
        id: number;
        author_name?: string;
        author_avatar_urls?: Record<string, string>;
        date?: string;
        content?: { rendered?: string };
      }>;
      return arr.map((c) => ({
        id: c.id,
        authorName: c.author_name || "کاربر",
        avatarUrl:
          c.author_avatar_urls?.["96"] ||
          Object.values(c.author_avatar_urls || {})[0] ||
          null,
        rating: null,
        date: c.date || null,
        content: _stripHtml(c.content?.rendered || ""),
      }));
    }
  } catch (e) {
    console.error("fetchProductComments wp/v2 fallback failed:", e);
  }

  return [];
});

function mapStoreProductDetail(id: number, p: StoreProduct_B): ProductDetail {
  const images: Array<{ url: string; alt?: string }> =
    Array.isArray(p.images) && p.images.length
      ? p.images
          .map((im: any) => ({ url: im?.src, alt: im?.alt || p.name }))
          .filter((x: any) => x.url)
      : [{ url: "/images/placeholder.png", alt: p.name }];

  const currency = (p?.prices?.currency_code as string) || "IRR";
  const sale = Number(p?.prices?.sale_price ?? NaN);
  const regular = Number(p?.prices?.regular_price ?? NaN);
  const baseRaw = Number(
    p?.prices?.sale_price ?? p?.prices?.price ?? p?.prices?.regular_price ?? 0
  );
  const base = Number.isFinite(baseRaw) ? baseRaw : 0;

  const price = { amount: base, currency };
  const regularPrice = Number.isFinite(regular)
    ? { amount: regular, currency }
    : undefined;
  const salePrice = Number.isFinite(sale)
    ? { amount: sale, currency }
    : undefined;

  const previousPrice = regularPrice?.amount;
  const offPercent =
    previousPrice && salePrice
      ? Math.max(0, Math.round((1 - salePrice.amount / previousPrice) * 100))
      : null;

  const rawHtml = String(p?.short_description || p?.description || "");
  const cleanedFonts = _stripFontFamily(rawHtml);
  const descriptionHtml = cleanedFonts.includes("<")
    ? cleanedFonts
    : cleanedFonts.replace(/\n/g, "<br/>");
  const descriptionPlain = _stripHtml(cleanedFonts);

  const attributes = _mapAttributes(p?.attributes);

  const tags: ProductDetail["tags"] = Array.isArray(p?.tags)
    ? (p.tags as any[]).map((t: any) => ({
        id: Number(t?.id),
        name: String(t?.name ?? ""),
        slug: t?.slug,
      }))
    : [];

  const categories: ProductDetail["categories"] = Array.isArray(p?.categories)
    ? (p.categories as any[]).map((c: any) => ({
        id: Number(c?.id),
        name: String(c?.name ?? ""),
        slug: c?.slug,
      }))
    : [];

  const stockStatus = String(p?.stock_status || "").toLowerCase();
  const inStock =
    !(stockStatus === "outofstock" || stockStatus === "out_of_stock") &&
    p?.is_in_stock !== false &&
    p?.is_purchasable !== false;

  const ratingAvg =
    typeof p?.average_rating === "string"
      ? parseFloat(p.average_rating)
      : Number(p?.average_rating || 0);
  const reviewsCount = Number(p?.rating_count || 0) || 0;

  return {
    id,
    name: String(p.name || ""),
    images,
    descriptionHtml,
    descriptionPlain,
    price,
    regularPrice,
    salePrice,
    previousPrice,
    offPercent,
    stock: { inStock, status: p?.stock_status ?? null },
    attributes,
    tags: tags.filter((t) => Number.isFinite(t.id) && t.name),
    categories: categories.filter((c) => Number.isFinite(c.id) && c.name),
    ratingAvg,
    reviewsCount,
  };
}

type WooProductV3 = {
  id: number;
  name?: string;
  description?: string | null;
  short_description?: string | null;
  images?: Array<{ src?: string | null; alt?: string | null }>;
  price?: string | number | null;
  regular_price?: string | number | null;
  sale_price?: string | number | null;
  stock_status?: string | null;
  manage_stock?: boolean | null;
  stock_quantity?: number | null;
  is_in_stock?: boolean | null;
  is_purchasable?: boolean | null;
  purchasable?: boolean | null;
  attributes?: any[];
  average_rating?: string | number | null;
  rating_count?: number | null;
  tags?: Array<{ id?: number; name?: string; slug?: string }>;
  categories?: Array<{ id?: number; name?: string; slug?: string }>;
  meta_data?: Array<{ key?: string; value?: unknown }>;
  currency?: string | null;
};

function parseAmount(raw: unknown): number | undefined {
  const num = Number(raw);
  return Number.isFinite(num) ? num : undefined;
}

function mapWcProductToDetail(id: number, p: WooProductV3): ProductDetail {
  const images: Array<{ url: string; alt?: string }> =
    Array.isArray(p.images) && p.images.length
      ? p.images
          .map((im) => ({ url: im?.src || "", alt: im?.alt || p.name || undefined }))
          .filter((img) => !!img.url)
      : [{ url: "/images/placeholder.png", alt: p.name || undefined }];

  const metaCurrency = Array.isArray(p.meta_data)
    ? p.meta_data.find((m) => {
        const key = String(m?.key || "").toLowerCase();
        return (
          key === "currency" ||
          key === "_currency" ||
          key === "currency_code" ||
          key === "_price_currency"
        );
      })?.value
    : undefined;

  const currency =
    (typeof p.currency === "string" && p.currency) ||
    (typeof metaCurrency === "string" && metaCurrency) ||
    "IRR";

  const sale = parseAmount(p.sale_price);
  const regular = parseAmount(p.regular_price);
  const base =
    parseAmount(p.price) ??
    (sale ?? regular ?? 0);

  const price = { amount: base, currency };
  const regularPrice =
    typeof regular === "number" ? { amount: regular, currency } : undefined;
  const salePrice = typeof sale === "number" ? { amount: sale, currency } : undefined;

  const previousPrice = regularPrice?.amount;
  const offPercent =
    previousPrice && salePrice
      ? Math.max(0, Math.round((1 - salePrice.amount / previousPrice) * 100))
      : null;

  const rawHtml = String(p?.short_description || p?.description || "");
  const cleanedFonts = _stripFontFamily(rawHtml);
  const descriptionHtml = cleanedFonts.includes("<")
    ? cleanedFonts
    : cleanedFonts.replace(/\n/g, "<br/>");
  const descriptionPlain = _stripHtml(cleanedFonts);

  const attributes = _mapAttributes(p?.attributes);

  const tags: ProductDetail["tags"] = Array.isArray(p?.tags)
    ? (p.tags as any[]).map((t: any) => ({
        id: Number(t?.id),
        name: String(t?.name ?? ""),
        slug: t?.slug,
      }))
    : [];

  const categories: ProductDetail["categories"] = Array.isArray(p?.categories)
    ? (p.categories as any[]).map((c: any) => ({
        id: Number(c?.id),
        name: String(c?.name ?? ""),
        slug: c?.slug,
      }))
    : [];

  const stockStatus = String(p?.stock_status || "").toLowerCase();
  const purchasable =
    p?.purchasable ?? p?.is_purchasable ?? true;
  const manageStock = p?.manage_stock ?? null;
  const qty = Number(p?.stock_quantity ?? 0);
  const outOfStock =
    stockStatus === "outofstock" ||
    stockStatus === "out_of_stock" ||
    stockStatus === "out-of-stock";

  const rawInStock =
    typeof p?.is_in_stock === "boolean" ? p.is_in_stock : undefined;

  const inStock =
    purchasable !== false &&
    !outOfStock &&
    (rawInStock !== undefined
      ? rawInStock
      : stockStatus === "instock" || (manageStock ? qty > 0 : true));

  const ratingAvg =
    typeof p?.average_rating === "string"
      ? parseFloat(p.average_rating)
      : Number(p?.average_rating || 0);
  const reviewsCount = Number(p?.rating_count || 0) || 0;

  return {
    id,
    name: String(p?.name || ""),
    images,
    descriptionHtml,
    descriptionPlain,
    price,
    regularPrice,
    salePrice,
    previousPrice,
    offPercent,
    stock: { inStock, status: p?.stock_status ?? null },
    attributes,
    tags: tags.filter((t) => Number.isFinite(t.id) && t.name),
    categories: categories.filter((c) => Number.isFinite(c.id) && c.name),
    ratingAvg,
    reviewsCount,
  };
}

const fetchProductDetailFromStore = cache(async (id: number) => {
  try {
    const r = await fetch(
      `${WP_BASE}/wp-json/wc/store/v1/products/${id}?_fields=${[
        "id",
        "name",
        "description",
        "short_description",
        "images",
        "prices",
        "is_in_stock",
        "is_purchasable",
        "stock_status",
        "attributes",
        "tags",
        "categories",
        "average_rating",
        "rating_count",
        "slug",
      ].join(",")}`,
      {
        cache: "force-cache",
        next: { revalidate: 300 },
      }
    );
    if (!r.ok) return null;

    const p = (await r.json()) as StoreProduct_B;
    return mapStoreProductDetail(id, p);
  } catch {
    return null;
  }
});

const fetchProductDetailFromWoo = cache(async (id: number) => {
  try {
    const res = await wooFetch(
      `/wp-json/wc/v3/products/${id}?dp=0&_fields=${[
        "id",
        "name",
        "description",
        "short_description",
        "images",
        "price",
        "regular_price",
        "sale_price",
        "stock_status",
        "manage_stock",
        "stock_quantity",
        "is_in_stock",
        "is_purchasable",
        "purchasable",
        "currency",
        "attributes",
        "average_rating",
        "rating_count",
        "tags",
        "categories",
        "meta_data",
      ].join(",")}`,
      {
        method: "GET",
        revalidateSeconds: 300,
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as WooProductV3;
    if (!data || typeof data !== "object") return null;
    return mapWcProductToDetail(id, data);
  } catch {
    return null;
  }
});

export async function getProductDetail(
  idOrSlug: string
): Promise<ProductDetail | null> {
  let id: number | null = null;
  if (/^\d+$/.test(String(idOrSlug))) id = Number(idOrSlug);
  else id = await _resolveProductIdBySlug(idOrSlug);
  if (!id) return null;

  const viaWoo = await fetchProductDetailFromWoo(id);
  if (viaWoo) return viaWoo;

  return await fetchProductDetailFromStore(id);
}

/* Dual exports so older call sites can import explicitly if needed */
export {
  listProducts as listProducts_b,
  getProductDetail as getProductDetail_b,
};

export const getProductComments = fetchProductComments;

/* ============================================================================
 * Review Helper
 * ==========================================================================*/

export async function createProductReview(
  productId: number | string,
  payload: {
    review: string; // comment body
    reviewer?: string; // display name (optional but recommended)
    reviewer_email?: string | null; // optional
    rating: number; // 1..5
    status?: "approved" | "hold" | "spam" | "trash" | "unspam" | "untrash";
  }
) {
  const base = process.env.WOO_BASE_URL || process.env.WP_BASE_URL;
  const key = process.env.WOO_CONSUMER_KEY;
  const sec = process.env.WOO_CONSUMER_SECRET;
  if (!base || !key || !sec) {
    throw new Error("Woo credentials are missing");
  }

  const url =
    `${base.replace(/\/$/, "")}/wp-json/wc/v3/products/reviews` +
    `?consumer_key=${encodeURIComponent(key)}` +
    `&consumer_secret=${encodeURIComponent(sec)}`;

  const body = {
    product_id: Number(productId),
    review: payload.review,
    reviewer: payload.reviewer || "Kadochi User",
    reviewer_email: payload.reviewer_email ?? undefined,
    rating: Math.max(1, Math.min(5, Number(payload.rating) || 0)),
    status: payload.status || "hold", // keep pending by default; adjust if you auto-approve
  };

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`Woo review create failed (${r.status}): ${txt}`);
  }
  return r.json();
}
