// src/domains/catalog/services/woo.server.ts
import "server-only";

/* ---------- Raw Woo Store shapes ---------- */
type StoreProduct = {
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
};

export interface ListProductsParams {
  page?: number;
  perPage?: number;
  search?: string;
  category?: number | string;
  tag?: number | string;
  order?: "asc" | "desc";
  orderby?: "date" | "price" | "popularity" | "rating";
  min_price?: string;
  max_price?: string;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  perPage: number;
  total?: number;
  totalPages?: number;
}

const WP_BASE =
  process.env.WP_BASE_URL ||
  process.env.NEXT_PUBLIC_WP_BASE_URL ||
  "https://app.kadochi.com";

/* ========================================================================== */
/* Helpers                                                                    */
/* ========================================================================== */

const isFiniteNumber = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n);

/** Resolve category id from id or slug (parallel endpoints) */
async function resolveCategoryId(input?: number | string) {
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
}

/** Resolve tag ids from mixed ids/slugs to csv (parallel per part) */
async function resolveTagIdsCsv(input?: number | string) {
  if (!input) return undefined;

  const parts = String(input)
    .trim()
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return undefined;

  async function partToId(p: string): Promise<number | undefined> {
    if (/^\d+$/.test(p)) return Number(p);

    const urls = [
      `${WP_BASE}/wp-json/wp/v2/product_tag?slug=${encodeURIComponent(
        p
      )}&per_page=1`,
      `${WP_BASE}/wp-json/wc/store/v1/products/tags?slug=${encodeURIComponent(
        p
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
  }

  const ids = (await Promise.all(parts.map(partToId))).filter(isFiniteNumber);
  return ids.length ? ids.join(",") : undefined;
}

/** Normalize orderby to Store API keys */
function mapOrderby(
  v?: ListProductsParams["orderby"]
): "date" | "price" | "popularity" {
  if (v === "price") return "price";
  if (v === "popularity" || v === "rating") return "popularity";
  return "date";
}

/** Stock inference (PLP/PDP aligned) */
function inferInStock(p: Partial<StoreProduct>): boolean {
  const st = String(p?.stock_status || "").toLowerCase();
  if (st === "outofstock" || st === "out_of_stock") return false;
  if (p?.is_in_stock === false) return false;
  if (p?.is_purchasable === false) return false;
  return true;
}

/** Text cleaners for PDP description & comments */
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

/* ========================================================================== */
/* PLP: listProducts                                                          */
/* ========================================================================== */

export async function listProducts(params: ListProductsParams = {}): Promise<
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
  } = params;

  const qp = new URLSearchParams({
    page: String(Math.max(1, page)),
    per_page: String(Math.min(12, Math.max(1, perPage))),
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

  // UI uses toman, Store expects rial → multiply by 10
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

  const raw = (await res.json()) as StoreProduct[];
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

    const inStock = inferInStock(p);

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

  const available: typeof items = [];
  const outOfStock: typeof items = [];
  for (const it of items) (it.stock?.inStock ? available : outOfStock).push(it);
  const itemsOrdered = available.concat(outOfStock);

  return { items: itemsOrdered, page, perPage, total, totalPages };
}

/* ========================================================================== */
/* PDP: single product                                                        */
/* ========================================================================== */

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

async function _resolveProductIdBySlug(
  slugOrMaybeEncoded: string
): Promise<number | null> {
  const clean = decodeURIComponent(String(slugOrMaybeEncoded || "").trim());
  if (!clean) return null;
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
}

/** Attributes mapper */
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

/** Stock inference (PDP) */
function _inferInStockPdp(
  p: Partial<StoreProduct> & {
    stock_status?: any;
    is_in_stock?: any;
    is_purchasable?: any;
  }
) {
  const st = String(p?.stock_status || "").toLowerCase();
  if (st === "outofstock" || st === "out_of_stock") return false;
  if (p?.is_in_stock === false) return false;
  if (p?.is_purchasable === false) return false;
  return true;
}

/** Read product comments and normalize */
async function fetchProductComments(
  productId: number
): Promise<ProductComment[]> {
  try {
    const r = await fetch(
      `${WP_BASE}/wp-json/wc/store/v1/products/${productId}/reviews?per_page=20`,
      { next: { revalidate: 300 } }
    );
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
        rating: isFiniteNumber(it.rating) ? it.rating : null,
        date: it.date_created_gmt || null,
        content: _stripHtml(it.review || ""),
      }));
    }
  } catch {}

  try {
    const r2 = await fetch(
      `${WP_BASE}/wp-json/wp/v2/comments?post=${productId}&per_page=20&_fields=id,author_name,author_avatar_urls,date,content`,
      { next: { revalidate: 300 } }
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
  } catch {}

  return [];
}

/** PDP fetch */
export async function getProductDetail(
  idOrSlug: string
): Promise<ProductDetail | null> {
  let id: number | null = null;
  if (/^\d+$/.test(String(idOrSlug))) id = Number(idOrSlug);
  else id = await _resolveProductIdBySlug(idOrSlug);
  if (!id) return null;

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
    { cache: "no-store" }
  );
  if (!r.ok) return null;

  const p = (await r.json()) as any;

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
    ? p.tags.map((t: any): ProductDetail["tags"][number] => ({
        id: Number(t?.id),
        name: String(t?.name ?? ""),
        slug: t?.slug,
      }))
    : [];

  const categories: ProductDetail["categories"] = Array.isArray(p?.categories)
    ? p.categories.map((c: any): ProductDetail["categories"][number] => ({
        id: Number(c?.id),
        name: String(c?.name ?? ""),
        slug: c?.slug,
      }))
    : [];

  const stock = {
    inStock: _inferInStockPdp(p),
    status: p?.stock_status ?? null,
  };
  const ratingAvg = Number(p?.average_rating ?? 0) || 0;
  const reviewsCount = Number(p?.rating_count ?? 0) || 0;

  const comments = await fetchProductComments(id);

  return {
    id: Number(p.id),
    name: String(p.name || ""),
    images,
    descriptionHtml,
    descriptionPlain,
    price,
    regularPrice,
    salePrice,
    previousPrice,
    offPercent,
    stock,
    attributes,
    tags: tags.filter((t) => Number.isFinite(t.id) && t.name),
    categories: categories.filter((c) => Number.isFinite(c.id) && c.name),
    ratingAvg,
    reviewsCount,
    comments,
  };
}
