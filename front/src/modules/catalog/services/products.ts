
import "server-only";
import { cache } from "react";
import { wooFetch, wooFetchJSON } from "@/lib/api/woo";
import { wordpressFetch } from "@/services/wordpress";
import { getWooBaseUrl } from "@/config/wp";
import type { ProductCard, ProductDetail } from "../types";

export type WpTagMeta = {
  id: number;
  name: string;
  description: string | null;
};

export type StoreProduct = {
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
  stock_status?: string | null;
  attributes?: any[];
  tags?: any[];
  categories?: any[];
  average_rating?: number | string | null;
  rating_count?: number | null;
  description?: string | null;
  short_description?: string | null;
};

type WooProductV3 = {
  id: number;
  name?: string;
  description?: string | null;
  short_description?: string | null;
  images?: Array<{ src?: string | null; alt?: string | null }>;
  price?: string | number | null;
  regular_price?: string | number | null;
  sale_price?: string | number | null;
  currency?: string | null;
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
};

export type PagedResult<T> = {
  items: T[];
  page: number;
  perPage: number;
  total?: number;
  totalPages?: number;
};

const toNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function inferInStock(p: {
  stock_status?: string | null;
  is_in_stock?: boolean | null;
  is_purchasable?: boolean | null;
}): boolean {
  const st = String(p?.stock_status || "").toLowerCase();
  if (st === "outofstock" || st === "out_of_stock" || st === "out-of-stock") return false;
  if (p?.is_in_stock === false) return false;
  if (p?.is_purchasable === false) return false;
  return true;
}

function firstImageUrlAlt(
  images?: Array<{ src?: string | null; url?: string | null; alt?: string | null }>,
  fallbackAlt?: string
): { url: string; alt?: string } {
  if (!Array.isArray(images) || !images.length)
    return { url: "/images/placeholder.png", alt: fallbackAlt };
  const im = images[0];
  const url = String((im?.url ?? im?.src) || "") || "/images/placeholder.png";
  const alt = (im?.alt as string) || fallbackAlt || "";
  return { url, alt };
}

const stripHtml = (html: string) =>
  String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const stripFontFamily = (html: string) => {
  const s1 = String(html || "").replace(
    /style="([^"]*)"/gi,
    (_m, inner) => `style="${inner.replace(/font-family:[^;"]*;?/gi, "")}"`
  );
  const s2 = s1.replace(
    /style='([^']*)'/gi,
    (_m, inner) => `style='${inner.replace(/font-family:[^;']*;?/gi, "")}'`
  );
  return s2.replace(/<font\b[^>]*>/gi, "").replace(/<\/font>/gi, "");
};

export function mapStoreProductToCard(p: any): ProductCard {
  const currency: string = p?.prices?.currency_code || p?.currency || "IRR";
  const sale = toNum(p?.prices?.sale_price);
  const regular = toNum(p?.prices?.regular_price);
  const baseRaw = toNum(p?.prices?.sale_price ?? p?.prices?.price ?? p?.prices?.regular_price);
  const base = Number.isFinite(baseRaw) ? baseRaw : 0;
  const hero = firstImageUrlAlt(p?.images, p?.name);
  const inStock = inferInStock({
    stock_status: p?.stock_status,
    is_in_stock: p?.is_in_stock,
    is_purchasable: p?.is_purchasable,
  });
  return {
    id: Number.isFinite(Number(p?.id)) ? Number(p.id) : p?.id,
    name: String(p?.name || ""),
    images: [{ url: hero.url, alt: hero.alt }],
    price: { amount: base, currency },
    regularPrice: Number.isFinite(regular) && regular > 0 ? { amount: regular, currency } : undefined,
    salePrice: Number.isFinite(sale) && sale > 0 ? { amount: sale, currency } : undefined,
    stock: { inStock, status: p?.stock_status ?? null },
  };
}

export function mapStoreProducts(arr: any[] | undefined | null): ProductCard[] {
  const items = Array.isArray(arr) ? arr.map(mapStoreProductToCard) : [];
  const available: ProductCard[] = [];
  const out: ProductCard[] = [];
  for (const it of items) (it.stock?.inStock ? available : out).push(it);
  return available.concat(out);
}

export function mapStoreProductToDetail(p: any): ProductDetail {
  const currency: string = p?.prices?.currency_code || p?.currency || "IRR";
  const sale = toNum(p?.prices?.sale_price ?? p?.sale_price);
  const regular = toNum(p?.prices?.regular_price ?? p?.regular_price);
  const baseRaw = toNum(p?.prices?.sale_price ?? p?.prices?.price ?? p?.prices?.regular_price ?? p?.price);
  const base = Number.isFinite(baseRaw) ? baseRaw : 0;
  const price = { amount: base, currency };
  const regularPrice = Number.isFinite(regular) && regular > 0 ? { amount: regular, currency } : undefined;
  const salePrice = Number.isFinite(sale) && sale > 0 ? { amount: sale, currency } : undefined;
  const previousPrice = regularPrice?.amount;
  const offPercent = previousPrice && salePrice ? Math.max(0, Math.round((1 - salePrice.amount / previousPrice) * 100)) : null;
  const hero = firstImageUrlAlt(p?.images, p?.name);
  const rawHtml = String(p?.short_description || p?.description || "");
  const cleanedFonts = stripFontFamily(rawHtml);
  const descriptionHtml = cleanedFonts.includes("<") ? cleanedFonts : cleanedFonts.replace(/\n/g, "<br/>");
  const descriptionPlain = stripHtml(cleanedFonts);
  const attributes: Array<{ name: string; value: string }> = Array.isArray(p?.attributes)
    ? p.attributes.map((a: any) => {
        const name = (a?.name ?? "").toString().trim();
        const terms = (a?.terms ?? []) as Array<{ name?: string }>;
        const options = (a?.options ?? []) as string[];
        const value = terms?.length ? terms.map((t) => t?.name).filter(Boolean).join("، ") : options?.length ? options.join("، ") : "";
        return name && value ? { name, value } : null;
      }).filter(Boolean)
    : [];
  const tags: Array<{ id: number; name: string; slug?: string }> = Array.isArray(p?.tags)
    ? p.tags.map((t: any) => ({ id: Number(t?.id), name: String(t?.name ?? ""), slug: t?.slug })).filter((t: any) => Number.isFinite(t.id) && t.name)
    : [];
  const categories: Array<{ id: number; name: string; slug?: string }> = Array.isArray(p?.categories)
    ? p.categories.map((c: any) => ({ id: Number(c?.id), name: String(c?.name ?? ""), slug: c?.slug })).filter((c: any) => Number.isFinite(c.id) && c.name)
    : [];
  const ratingAvg = toNum(p?.average_rating);
  const reviewsCount = toNum(p?.rating_count ?? p?.review_count);
  const stock = {
    inStock: inferInStock({ stock_status: p?.stock_status, is_in_stock: p?.is_in_stock, is_purchasable: p?.is_purchasable }),
    status: p?.stock_status ?? null,
  };
  return {
    id: Number(p?.id),
    name: String(p?.name || ""),
    images: [{ url: hero.url, alt: hero.alt }],
    descriptionHtml,
    descriptionPlain,
    price,
    regularPrice,
    salePrice,
    previousPrice,
    offPercent,
    stock,
    attributes,
    tags,
    categories,
    ratingAvg,
    reviewsCount,
  };
}

export async function fetchStoreProducts(params?: Record<string, string | number | boolean | undefined>): Promise<StoreProduct[]> {
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  });
  if (!qs.has("per_page")) qs.set("per_page", "8");
  try {
    const r = await wooFetch(`/wp-json/wc/store/v1/products?${qs.toString()}`, { revalidate: 60 });
    if (!r.ok) return [];
    const json = await r.json();
    return Array.isArray(json) ? json : [];
  } catch {
    return [];
  }
}

export async function fetchStoreProductById(id: number): Promise<StoreProduct | null> {
  try {
    const r = await wooFetch(`/wp-json/wc/store/v1/products/${id}`, { revalidate: 60 });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

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
}): Promise<PagedResult<ProductCard>> {
  const { page = 1, perPage = 12, search, category, tag, order = "desc", orderby = "date", min_price, max_price } = params || {};
  const pageNum = Math.max(1, page);
  const perPageNum = Math.max(1, Math.min(perPage, 48));
  const orderNorm: "asc" | "desc" = order === "asc" ? "asc" : "desc";
  const orderbyMapped = orderby === "rating" ? "popularity" : orderby === "popularity" ? "popularity" : orderby === "price" ? "price" : "date";

  const storeQs = new URLSearchParams({ page: String(pageNum), per_page: String(perPageNum), order: orderNorm, orderby: orderbyMapped });
  if (search) storeQs.set("search", search);

  const catId = typeof category === "number" || (typeof category === "string" && /^\d+$/.test(category)) ? Number(category) : undefined;
  if (catId && Number.isFinite(catId)) storeQs.set("category", String(catId));

  const decRe = /^\d+(\.\d+)?$/;
  const minRial = min_price && decRe.test(min_price) ? Math.trunc(Number(min_price) * 10) : undefined;
  const maxRial = max_price && decRe.test(max_price) ? Math.trunc(Number(max_price) * 10) : undefined;
  if (typeof minRial === "number") storeQs.set("min_price", String(minRial));
  if (typeof maxRial === "number") storeQs.set("max_price", String(maxRial));

  const r = await wooFetch(`/wp-json/wc/store/v1/products?${storeQs.toString()}`, { method: "GET" });
  if (!r.ok) return { items: [], page: pageNum, perPage: perPageNum };
  const data = await r.json();
  const items = mapStoreProducts(data);
  const total = Number(r.headers.get("X-WP-Total") || items.length || 0);
  const totalPages = Number(r.headers.get("X-WP-TotalPages") || 1);
  return { items, page: pageNum, perPage: perPageNum, total, totalPages };
}

export async function getProductDetail(idOrSlug: string): Promise<ProductDetail | null> {
  let id: number | null = null;
  if (/^\d+$/.test(String(idOrSlug))) id = Number(idOrSlug);
  else id = null;
  if (!id) return null;

  try {
    const res = await wooFetch(`/wp-json/wc/v3/products/${id}`, { method: "GET", revalidateSeconds: 300 });
    if (res.ok) {
      const data = await res.json();
      return mapStoreProductToDetail(data);
    }
  } catch {}

  try {
    const r = await wooFetch(`/wp-json/wc/store/v1/products/${id}`, { revalidate: 300 });
    if (r.ok) {
      const data = await r.json();
      return mapStoreProductToDetail(data);
    }
  } catch {}

  return null;
}

export async function fetchProductComments(productId: number): Promise<ProductDetail["comments"]> {
  try {
    const qs = new URLSearchParams({ product: String(productId), status: "approved", per_page: "20" });
    const r = await wooFetch(`/wp-json/wc/v3/products/reviews?${qs.toString()}`, { cache: "force-cache", revalidate: 120 });
    if (r.ok) {
      const arr = await r.json() as Array<{ id: number; review: string; reviewer: string; reviewer_avatar_urls?: Record<string, string>; rating?: number | null; date_created_gmt?: string }>;
      return arr.map((it) => ({
        id: it.id,
        authorName: it.reviewer || "کاربر",
        avatarUrl: it.reviewer_avatar_urls?.["96"] || Object.values(it.reviewer_avatar_urls || {})[0] || null,
        rating: typeof it.rating === "number" ? it.rating : null,
        date: it.date_created_gmt || null,
        content: stripHtml(it.review || ""),
      }));
    }
  } catch {}

  return [];
}

export const fetchWpTagMeta = cache(async (input: string): Promise<WpTagMeta | null> => {
  const isId = /^\d+$/.test(input);
  const path = isId
    ? `/wp-json/wp/v2/product_tag/${input}`
    : `/wp-json/wp/v2/product_tag?slug=${encodeURIComponent(input)}&per_page=1`;
  try {
    const r = await wordpressFetch(path, { revalidate: 300 });
    if (!r.ok) return null;
    const js = isId ? await r.json() : (await r.json())?.[0];
    return js
      ? {
          id: js.id,
          name: js.name,
          description: js.description ?? null,
        } as WpTagMeta
      : null;
  } catch {
    return null;
  }
});

type SitemapProduct = {
  id: number;
  date_modified?: string;
  date_created?: string;
};

export async function getPublishedProductsForSitemap(): Promise<SitemapProduct[]> {
  try {
    const base = getWooBaseUrl();
    const key = process.env.WOO_CONSUMER_KEY;
    const secret = process.env.WOO_CONSUMER_SECRET;
    if (!key || !secret) return [];

    const url = new URL("/wp-json/wc/v3/products", base);
    url.searchParams.set("status", "publish");
    url.searchParams.set("per_page", "100");

    const auth = Buffer.from(`${key}:${secret}`).toString("base64");
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as SitemapProduct[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
export async function createProductReview(
  productId: number | string,
  payload: { review: string; reviewer?: string; reviewer_email?: string | null; rating: number; status?: "approved" | "hold" | "spam" | "trash" | "unspam" | "untrash" }
) {
  const body = {
    product_id: Number(productId),
    review: payload.review,
    reviewer: payload.reviewer || "Kadochi User",
    reviewer_email: payload.reviewer_email ?? undefined,
    rating: Math.max(1, Math.min(5, Number(payload.rating) || 0)),
    status: payload.status || "hold",
  };
  const r = await wooFetch(`/wp-json/wc/v3/products/reviews`, {
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
