// src/app/api/products/bulk/route.ts
import { NextResponse } from "next/server";

import { wooFetch } from "@/lib/api/woo";
import {
  UpstreamBadResponse,
  UpstreamNetworkError,
  UpstreamTimeout,
} from "@/services/http/errors";
import { wordpressJson } from "@/services/wordpress";

/** Store-like shape expected by ProductCarouselClient.mapProducts */
type StoreProduct = {
  id: number;
  name: string;
  images?: { id: number; src: string; alt?: string }[];
  prices?: {
    price?: string;
    sale_price?: string;
    regular_price?: string;
    currency_minor_unit?: number;
  };
  is_in_stock?: boolean;
  is_purchasable?: boolean;
  stock_status?: "instock" | "outofstock" | "onbackorder" | string;
};

/** Try wc/store/v1 first (supports include), else fallback wc/v3 per-id */
async function fetchProductsByIds(ids: number[]): Promise<StoreProduct[]> {
  if (!ids.length) return [];

  // 1) Try Store API (aggregate)
  try {
    const qs = new URLSearchParams({
      per_page: String(Math.max(ids.length, 1)),
      include: ids.join(","),
    });
    const result = (await wordpressJson(
      `/wp-json/wc/store/v1/products?${qs.toString()}`,
      {
        allowProxyFallback: true,
        timeoutMs: 7000,
        dedupeKey: `bulk-store:${ids.join(",")}`,
      }
    )) as { data: any[] };
    const arr = Array.isArray(result.data) ? result.data : [];
    return arr.map((p) => ({
      id: Number(p.id),
      name: String(p.name || ""),
      images: Array.isArray(p.images)
        ? p.images.map((im: any) => ({
            id: Number(im?.id || 0),
            src: String(im?.src || ""),
            alt: im?.alt || "",
          }))
        : [],
      prices: p.prices ?? {
        price: p?.price ? String(p.price) : undefined,
        sale_price: p?.sale_price ? String(p.sale_price) : undefined,
        regular_price: p?.regular_price ? String(p.regular_price) : undefined,
      },
      is_in_stock: p?.is_in_stock ?? undefined,
      is_purchasable: p?.is_purchasable ?? undefined,
      stock_status: p?.stock_status ?? undefined,
    }));
  } catch (err) {
    if (
      !(err instanceof UpstreamTimeout) &&
      !(err instanceof UpstreamNetworkError) &&
      !(err instanceof UpstreamBadResponse)
    ) {
      throw err;
    }
    // swallow and fallback to per-id fetch
  }

  // 2) Fallback: REST v3 per-id and map → Store-like
  const results: StoreProduct[] = [];
  for (const id of ids) {
    try {
      const r = await wooFetch(`/wp-json/wc/v3/products/${id}`, {
        allowProxyFallback: true,
        timeoutMs: 7000,
      });
      if (!r.ok) continue;
      const p = (await r.json()) as any;
      results.push({
        id: Number(p.id),
        name: String(p.name || ""),
        images: Array.isArray(p.images)
          ? p.images.map((im: any) => ({
              id: Number(im?.id || 0),
              src: String(im?.src || ""),
              alt: im?.alt || "",
            }))
          : [],
        prices: {
          price:
            p?.sale_price ??
            p?.price ??
            p?.regular_price ??
            (typeof p?.prices?.price !== "undefined"
              ? String(p.prices.price)
              : undefined),
          sale_price:
            typeof p?.sale_price !== "undefined"
              ? String(p.sale_price)
              : undefined,
          regular_price:
            typeof p?.regular_price !== "undefined"
              ? String(p.regular_price)
              : undefined,
          currency_minor_unit:
            typeof p?.prices?.currency_minor_unit === "number"
              ? p.prices.currency_minor_unit
              : undefined,
        },
        is_in_stock: p?.stock_status
          ? String(p.stock_status).toLowerCase() === "instock"
          : (p?.is_in_stock ?? undefined),
        is_purchasable: p?.is_purchasable ?? undefined,
        stock_status: p?.stock_status ?? undefined,
      });
    } catch (err) {
      if (
        err instanceof UpstreamTimeout ||
        err instanceof UpstreamNetworkError ||
        err instanceof UpstreamBadResponse
      ) {
        continue;
      }
      throw err;
    }
  }
  return results;
}

function resolveError(err: unknown) {
  if (err instanceof UpstreamTimeout) {
    return { status: err.status, code: "upstream_timeout" } as const;
  }
  if (err instanceof UpstreamNetworkError) {
    return { status: err.status, code: "upstream_network" } as const;
  }
  if (err instanceof UpstreamBadResponse) {
    return { status: 502, code: "upstream_bad_response" } as const;
  }
  return { status: 500, code: "internal_error" } as const;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idsParam = (searchParams.get("ids") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const ids = idsParam
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (!ids.length) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    const items = await fetchProductsByIds(ids);
    return NextResponse.json({ items }, { status: 200 });
  } catch (err: any) {
    const { status, code } = resolveError(err);
    return NextResponse.json({ error: code }, { status });
  }
}
