import "server-only"
import { cache } from "react"
import { wooFetch } from "@/lib/api/woo"
import { wordpressFetch } from "@/services/wordpress"
import { getWooBaseUrl } from "@/config/wp"
import type { ProductCard, ProductDetail } from "../types"
import type { StoreProduct, PagedResult, WpTagMeta, SitemapProduct } from "./products.types"
import { mapStoreProducts, mapStoreProductToDetail } from "./products.mappers"

export async function fetchStoreProducts(params?: Record<string, string | number | boolean | undefined>): Promise<StoreProduct[]> {
  const qs = new URLSearchParams()
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.set(k, String(v))
  })
  if (!qs.has("per_page")) qs.set("per_page", "8")
  try {
    const r = await wooFetch(`/wp-json/wc/store/v1/products?${qs.toString()}`, { revalidate: 60 })
    if (!r.ok) return []
    const json = await r.json()
    return Array.isArray(json) ? json : []
  } catch {
    return []
  }
}

export async function fetchStoreProductById(id: number): Promise<StoreProduct | null> {
  try {
    const r = await wooFetch(`/wp-json/wc/store/v1/products/${id}`, { revalidate: 60 })
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}

export async function listProducts(params: {
  page?: number
  perPage?: number
  search?: string
  category?: number | string
  tag?: number | string
  order?: "asc" | "desc"
  orderby?: "date" | "price" | "popularity" | "rating"
  min_price?: string
  max_price?: string
}): Promise<PagedResult<ProductCard>> {
  const { page = 1, perPage = 12, search, category, tag, order = "desc", orderby = "date", min_price, max_price } = params || {}
  const pageNum = Math.max(1, page)
  const perPageNum = Math.max(1, Math.min(perPage, 48))
  const orderNorm: "asc" | "desc" = order === "asc" ? "asc" : "desc"
  const orderbyMapped = orderby === "rating" ? "popularity" : orderby === "popularity" ? "popularity" : orderby === "price" ? "price" : "date"

  const storeQs = new URLSearchParams({ page: String(pageNum), per_page: String(perPageNum), order: orderNorm, orderby: orderbyMapped })
  if (search) storeQs.set("search", search)

  const catId = typeof category === "number" || (typeof category === "string" && /^\d+$/.test(category)) ? Number(category) : undefined
  if (catId && Number.isFinite(catId)) storeQs.set("category", String(catId))

  const decRe = /^\d+(\.\d+)?$/
  const minRial = min_price && decRe.test(min_price) ? Math.trunc(Number(min_price) * 10) : undefined
  const maxRial = max_price && decRe.test(max_price) ? Math.trunc(Number(max_price) * 10) : undefined
  if (typeof minRial === "number") storeQs.set("min_price", String(minRial))
  if (typeof maxRial === "number") storeQs.set("max_price", String(maxRial))

  const r = await wooFetch(`/wp-json/wc/store/v1/products?${storeQs.toString()}`, { method: "GET" })
  if (!r.ok) return { items: [], page: pageNum, perPage: perPageNum }
  const data = await r.json()
  const items = mapStoreProducts(data)
  const total = Number(r.headers.get("X-WP-Total") || items.length || 0)
  const totalPages = Number(r.headers.get("X-WP-TotalPages") || 1)
  return { items, page: pageNum, perPage: perPageNum, total, totalPages }
}

export async function getProductDetail(idOrSlug: string): Promise<ProductDetail | null> {
  let id: number | null = null
  if (/^\d+$/.test(String(idOrSlug))) id = Number(idOrSlug)
  if (!id) return null

  try {
    const res = await wooFetch(`/wp-json/wc/v3/products/${id}`, { method: "GET", revalidateSeconds: 300 })
    if (res.ok) {
      const data = await res.json()
      return mapStoreProductToDetail(data)
    }
  } catch {}

  try {
    const r = await wooFetch(`/wp-json/wc/store/v1/products/${id}`, { revalidate: 300 })
    if (r.ok) {
      const data = await r.json()
      return mapStoreProductToDetail(data)
    }
  } catch {}

  return null
}

export async function fetchProductComments(productId: number): Promise<ProductDetail["comments"]> {
  try {
    const qs = new URLSearchParams({ product: String(productId), status: "approved", per_page: "20" })
    const r = await wooFetch(`/wp-json/wc/v3/products/reviews?${qs.toString()}`, { cache: "force-cache", revalidate: 120 })
    if (r.ok) {
      const arr = await r.json() as Array<{ id: number; review: string; reviewer: string; reviewer_avatar_urls?: Record<string, string>; rating?: number | null; date_created_gmt?: string }>
      return arr.map((it) => ({
        id: it.id,
        authorName: it.reviewer || "کاربر",
        avatarUrl: it.reviewer_avatar_urls?.["96"] || Object.values(it.reviewer_avatar_urls || {})[0] || null,
        rating: typeof it.rating === "number" ? it.rating : null,
        date: it.date_created_gmt || null,
        content: stripHtml(it.review || ""),
      }))
    }
  } catch {}
  return []
}

const stripHtml = (html: string) =>
  String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()

export const fetchWpTagMeta = cache(async (input: string): Promise<WpTagMeta | null> => {
  const isId = /^\d+$/.test(input)
  const path = isId
    ? `/wp-json/wp/v2/product_tag/${input}`
    : `/wp-json/wp/v2/product_tag?slug=${encodeURIComponent(input)}&per_page=1`
  try {
    const r = await wordpressFetch(path, { revalidate: 300 })
    if (!r.ok) return null
    const js = isId ? await r.json() : (await r.json())?.[0]
    return js
      ? {
          id: js.id,
          name: js.name,
          description: js.description ?? null,
        } as WpTagMeta
      : null
  } catch {
    return null
  }
})

export async function getPublishedProductsForSitemap(): Promise<SitemapProduct[]> {
  try {
    const base = getWooBaseUrl()
    const key = process.env.WOO_CONSUMER_KEY
    const secret = process.env.WOO_CONSUMER_SECRET
    if (!key || !secret) return []

    const url = new URL("/wp-json/wc/v3/products", base)
    url.searchParams.set("status", "publish")
    url.searchParams.set("per_page", "100")

    const auth = Buffer.from(`${key}:${secret}`).toString("base64")
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    const data = (await res.json()) as SitemapProduct[]
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export async function createProductReview(
  productId: number | string,
  payload: { review: string; reviewer?: string; reviewer_email?: string | null; rating: number; status?: "approved" | "hold" | "spam" | "trash" | "unspam" | "untrash" },
) {
  const body = {
    product_id: Number(productId),
    review: payload.review,
    reviewer: payload.reviewer || "Kadochi User",
    reviewer_email: payload.reviewer_email ?? undefined,
    rating: Math.max(1, Math.min(5, Number(payload.rating) || 0)),
    status: payload.status || "hold",
  }
  const r = await wooFetch(`/wp-json/wc/v3/products/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  })
  if (!r.ok) {
    const txt = await r.text().catch(() => "")
    throw new Error(`Woo review create failed (${r.status}): ${txt}`)
  }
  return r.json()
}
