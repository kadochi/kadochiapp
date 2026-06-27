import type { ProductCard, ProductDetail } from "../types"
import { inferInStock } from "../utils/stock"

const toNum = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

const stripHtml = (html: string) =>
  String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()

function firstImageUrlAlt(
  images?: Array<{ src?: string | null; url?: string | null; alt?: string | null }>,
  fallbackAlt?: string,
): { url: string; alt?: string } {
  if (!Array.isArray(images) || !images.length)
    return { url: "/images/placeholder.png", alt: fallbackAlt }
  const im = images[0]
  const url = String((im?.url ?? im?.src) || "") || "/images/placeholder.png"
  const alt = (im?.alt as string) || fallbackAlt || ""
  return { url, alt }
}

const stripFontFamily = (html: string) => {
  const s1 = String(html || "").replace(
    /style="([^"]*)"/gi,
    (_m, inner) => `style="${inner.replace(/font-family:[^;"]*;?/gi, "")}"`,
  )
  const s2 = s1.replace(
    /style='([^']*)'/gi,
    (_m, inner) => `style='${inner.replace(/font-family:[^;']*;?/gi, "")}'`,
  )
  return s2.replace(/<font\b[^>]*>/gi, "").replace(/<\/font>/gi, "")
}

export function mapStoreProductToCard(p: any): ProductCard {
  const currency: string = p?.prices?.currency_code || p?.currency || "IRR"
  const sale = toNum(p?.prices?.sale_price)
  const regular = toNum(p?.prices?.regular_price)
  const baseRaw = toNum(p?.prices?.sale_price ?? p?.prices?.price ?? p?.prices?.regular_price)
  const base = Number.isFinite(baseRaw) ? baseRaw : 0
  const hero = firstImageUrlAlt(p?.images, p?.name)
  const inStock = inferInStock({
    stock_status: p?.stock_status,
    is_in_stock: p?.is_in_stock,
    is_purchasable: p?.is_purchasable,
  })
  return {
    id: Number.isFinite(Number(p?.id)) ? Number(p.id) : p?.id,
    name: String(p?.name || ""),
    images: [{ url: hero.url, alt: hero.alt }],
    price: { amount: base, currency },
    regularPrice: Number.isFinite(regular) && regular > 0 ? { amount: regular, currency } : undefined,
    salePrice: Number.isFinite(sale) && sale > 0 ? { amount: sale, currency } : undefined,
    stock: { inStock, status: p?.stock_status ?? null },
  }
}

export function mapStoreProducts(arr: any[] | undefined | null): ProductCard[] {
  const items = Array.isArray(arr) ? arr.map(mapStoreProductToCard) : []
  const available: ProductCard[] = []
  const out: ProductCard[] = []
  for (const it of items) (it.stock?.inStock ? available : out).push(it)
  return available.concat(out)
}

export function mapStoreProductToDetail(p: any): ProductDetail {
  const currency: string = p?.prices?.currency_code || p?.currency || "IRR"
  const sale = toNum(p?.prices?.sale_price ?? p?.sale_price)
  const regular = toNum(p?.prices?.regular_price ?? p?.regular_price)
  const baseRaw = toNum(p?.prices?.sale_price ?? p?.prices?.price ?? p?.prices?.regular_price ?? p?.price)
  const base = Number.isFinite(baseRaw) ? baseRaw : 0
  const price = { amount: base, currency }
  const regularPrice = Number.isFinite(regular) && regular > 0 ? { amount: regular, currency } : undefined
  const salePrice = Number.isFinite(sale) && sale > 0 ? { amount: sale, currency } : undefined
  const previousPrice = regularPrice?.amount
  const offPercent = previousPrice && salePrice ? Math.max(0, Math.round((1 - salePrice.amount / previousPrice) * 100)) : null
  const hero = firstImageUrlAlt(p?.images, p?.name)
  const rawHtml = String(p?.short_description || p?.description || "")
  const cleanedFonts = stripFontFamily(rawHtml)
  const descriptionHtml = cleanedFonts.includes("<") ? cleanedFonts : cleanedFonts.replace(/\n/g, "<br/>")
  const descriptionPlain = stripHtml(cleanedFonts)
  const attributes: Array<{ name: string; value: string }> = Array.isArray(p?.attributes)
    ? p.attributes.map((a: any) => {
        const name = (a?.name ?? "").toString().trim()
        const terms = (a?.terms ?? []) as Array<{ name?: string }>
        const options = (a?.options ?? []) as string[]
        const value = terms?.length
          ? terms.map((t) => t?.name).filter(Boolean).join("، ")
          : options?.length
            ? options.join("، ")
            : ""
        return name && value ? { name, value } : null
      }).filter(Boolean)
    : []
  const tags: Array<{ id: number; name: string; slug?: string }> = Array.isArray(p?.tags)
    ? p.tags.map((t: any) => ({ id: Number(t?.id), name: String(t?.name ?? ""), slug: t?.slug })).filter((t: any) => Number.isFinite(t.id) && t.name)
    : []
  const categories: Array<{ id: number; name: string; slug?: string }> = Array.isArray(p?.categories)
    ? p.categories.map((c: any) => ({ id: Number(c?.id), name: String(c?.name ?? ""), slug: c?.slug })).filter((c: any) => Number.isFinite(c.id) && c.name)
    : []
  const ratingAvg = toNum(p?.average_rating)
  const reviewsCount = toNum(p?.rating_count ?? p?.review_count)
  const stock = {
    inStock: inferInStock({
      stock_status: p?.stock_status,
      is_in_stock: p?.is_in_stock,
      is_purchasable: p?.is_purchasable,
    }),
    status: p?.stock_status ?? null,
  }
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
  }
}
