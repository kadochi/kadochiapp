/**
 * Products page helpers — client-data normalization and JSON-LD builders.
 * Pure; extracted from products/page.tsx (no behavior change).
 */

export const SITE_BASE = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(
  /\/$/,
  "",
);

export type Crumb = { label: string; href?: string };

export function normalizeForClient(items: any[]) {
  const toNum = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const isPriceObj = (v: any): v is { amount: number; currency: string } =>
    v && typeof v === "object" && "amount" in v && "currency" in v;

  return (items || []).map((p) => {
    const images =
      Array.isArray(p?.images) && p.images.length
        ? p.images
            .map((im: any) => ({
              url: im?.url ?? im?.src ?? "",
              alt: im?.alt ?? p?.name ?? "",
            }))
            .filter((im: any) => im.url)
        : [];

    const currency =
      (isPriceObj(p?.price) && p.price.currency) || p?.currency || "IRR";

    const toAmount = (val: any): number =>
      isPriceObj(val) ? Number(val.amount || 0) : toNum(val);

    const baseRaw =
      (p?.salePrice !== undefined &&
      p?.salePrice !== null &&
      p?.salePrice !== ""
        ? p.salePrice
        : p?.price !== undefined && p?.price !== null && p?.price !== ""
          ? p.price
          : p?.regularPrice) ?? 0;

    const price = isPriceObj(p?.price)
      ? p.price
      : { amount: toAmount(baseRaw), currency };

    const regularPrice = isPriceObj(p?.regularPrice)
      ? p.regularPrice
      : p?.regularPrice != null && p?.regularPrice !== ""
        ? { amount: toAmount(p.regularPrice), currency }
        : undefined;

    const salePrice = isPriceObj(p?.salePrice)
      ? p.salePrice
      : p?.salePrice != null && p?.salePrice !== ""
        ? { amount: toAmount(p.salePrice), currency }
        : undefined;

    return { ...p, images, price, regularPrice, salePrice };
  });
}

export function buildBreadcrumbLd(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: c.label,
      ...(c.href ? { item: `${SITE_BASE}${c.href}` } : {}),
    })),
  };
}

export function buildItemListLd(opts: {
  normalizedItems: any[];
  title: string;
  order: "asc" | "desc";
  page: number;
  perPage: number;
}) {
  const { normalizedItems, title, order, page, perPage } = opts;
  if (normalizedItems.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: title,
    itemListOrder: order === "asc" ? "Ascending" : "Descending",
    numberOfItems: normalizedItems.length,
    itemListElement: normalizedItems
      .map((p: any, index: number) => {
        const url =
          p?.permalink ||
          (p?.slug ? `${SITE_BASE}/product/${p.slug}` : null) ||
          (p?.id ? `${SITE_BASE}/product/${p.id}` : null);
        if (!url) return null;

        const firstImage =
          Array.isArray(p.images) && p.images.length
            ? p.images[0]?.url
            : undefined;

        return {
          "@type": "ListItem",
          position: (page - 1) * perPage + index + 1,
          item: {
            "@type": "Product",
            name: p.name || "",
            image: firstImage,
            sku: p.sku || undefined,
            url,
            offers: {
              "@type": "Offer",
              priceCurrency: p.price?.currency || "IRR",
              price: String(p.price?.amount ?? 0),
              availability: "https://schema.org/InStock",
            },
          },
        };
      })
      .filter(Boolean),
  };
}
