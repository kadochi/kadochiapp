// src/app/api/products/route.ts
import { NextResponse } from "next/server";
import { listProducts_b as listProducts } from "@/lib/api/woo";
import {
  UpstreamBadResponse,
  UpstreamNetworkError,
  UpstreamTimeout,
} from "@/services/http/errors";
import { wordpressJson } from "@/services/wordpress";
import type { WooStoreProduct } from "@/types/wordpress";

// Explicit Node runtime (we call external WooCommerce APIs)
export const runtime = "nodejs";

// --- Tunables (adjust to your infra/profile) ---
const LIST_TIMEOUT_MS = 7000;
const INCLUDE_TIMEOUT_MS = 5000;
const EDGE_S_MAXAGE = 30; // CDN TTL (seconds)
const EDGE_STALE_WHILE_REVALIDATE = 300; // Serve stale while revalidating (seconds)

// Request coalescing for identical in-flight queries (prevents bursts)
const pending = new Map<string, Promise<NextResponse>>();

// Very small in-memory LRU to short-circuit repeated queries for a few seconds
type LruEntry<T> = { t: number; data: T; etag?: string | null };
const memoryLRU = new Map<string, LruEntry<any>>();
const LRU_TTL_MS = 20_000; // 20s

function lruGet<T>(key: string): LruEntry<T> | null {
  const hit = memoryLRU.get(key) as LruEntry<T> | undefined;
  if (!hit) return null;
  if (Date.now() - hit.t > LRU_TTL_MS) {
    return null;
  }
  return hit;
}
function lruSet<T>(key: string, entry: LruEntry<T>) {
  memoryLRU.set(key, { ...entry, t: Date.now() });
  // Keep a tiny footprint
  if (memoryLRU.size > 100) {
    const first = memoryLRU.keys().next().value;
    if (first) memoryLRU.delete(first);
  }
}

function lruPeek<T>(key: string): LruEntry<T> | null {
  return (memoryLRU.get(key) as LruEntry<T> | undefined) ?? null;
}

// Helper: JSON 200 with optional Cache-Control header / ETag support
function okJson(data: any, cacheCtl?: string, etag?: string | null) {
  const headers: Record<string, string> = {};
  if (cacheCtl) headers["Cache-Control"] = cacheCtl;
  if (etag) headers["ETag"] = etag;
  return NextResponse.json(data, { status: 200, headers });
}

function resolveError(err: unknown) {
  if (err instanceof UpstreamTimeout) {
    return { status: err.status, code: "upstream_timeout" } as const;
  }
  if (err instanceof UpstreamNetworkError) {
    return { status: err.status, code: "upstream_network" } as const;
  }
  if (err instanceof UpstreamBadResponse) {
    return { status: err.status, code: "upstream_bad_response" } as const;
  }
  return { status: 500, code: "internal_error" } as const;
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  // ---------- include-mode (fetch specific IDs via Store API) ----------
  const include = (url.searchParams.get("include") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (include.length) {
    const ids = include
      .map((id) => Number(id))
      .filter((n) => Number.isFinite(n) && n > 0);

    // Backwards-compatible behavior: invalid/empty input returns an empty array
    if (!ids.length) {
      return okJson([], "no-store");
    }

    const per_page = Math.min(50, ids.length);
    const qs = new URLSearchParams({
      include: ids.join(","),
      per_page: String(per_page),
      orderby: "include",
    });

    const WP_BASE =
      process.env.WP_BASE_URL ||
      process.env.NEXT_PUBLIC_WP_BASE_URL ||
      "https://app.kadochi.com";

    // Coalesce duplicate in-flight requests
    const key = `include:${qs.toString()}`;
    const cachedEntry = lruPeek<WooStoreProduct[]>(key);
    const fresh = cachedEntry && lruGet<WooStoreProduct[]>(key);
    if (fresh) {
      return okJson(fresh.data, "no-store", fresh.etag ?? null);
    }
    if (pending.has(key)) return pending.get(key)!;

    const p = (async () => {
      try {
        const result = await wordpressJson<WooStoreProduct[]>(
          `${WP_BASE}/wp-json/wc/store/v1/products?${qs.toString()}`,
          {
            timeoutMs: INCLUDE_TIMEOUT_MS,
            allowProxyFallback: true,
            dedupeKey: key,
            ifNoneMatch: cachedEntry?.etag ?? undefined,
            retries: 3,
          }
        );

        const etag = result.etag ?? cachedEntry?.etag ?? null;
        const body = result.notModified
          ? cachedEntry?.data ?? []
          : Array.isArray(result.data)
          ? result.data
          : [];

        if (!result.notModified && Array.isArray(result.data)) {
          lruSet(key, { data: result.data, etag });
        } else if (result.notModified && cachedEntry) {
          lruSet(key, { data: cachedEntry.data, etag });
        }

        return okJson(body, "no-store", etag);
      } catch (err) {
        return okJson([], "no-store");
      } finally {
        pending.delete(key);
      }
    })();

    pending.set(key, p);
    return p;
  }

  // ---------- list-mode (PLP) ----------
  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
  const perPage = Math.min(
    48,
    Math.max(1, Number(url.searchParams.get("per_page") || "12"))
  );

  const order = (url.searchParams.get("order") || "desc").toLowerCase() as
    | "asc"
    | "desc";
  const orderNorm: "asc" | "desc" = order === "asc" ? "asc" : "desc";

  const orderbyRaw = (url.searchParams.get("orderby") || "date").toLowerCase();
  const orderby = (
    ["date", "price", "popularity", "rating"].includes(orderbyRaw)
      ? orderbyRaw
      : "date"
  ) as "date" | "price" | "popularity" | "rating";

  const q = url.searchParams.get("q") || undefined;
  const category = url.searchParams.get("category") || undefined;
  const tagRaw = url.searchParams.get("tag") || undefined;
  const min_price = url.searchParams.get("min_price") || undefined;
  const max_price = url.searchParams.get("max_price") || undefined;

  // Historical quirk preserved: merge these two into a combined tag filter
  const tag =
    tagRaw === "fatherday" || tagRaw === "motherday"
      ? "fatherday,motherday"
      : tagRaw || undefined;

  // Build a stable key for LRU and coalescing
  const keyObj = {
    page,
    perPage,
    order: orderNorm,
    orderby,
    q: q || "",
    category: category || "",
    tag: tag || "",
    min_price: min_price || "",
    max_price: max_price || "",
  };
  const key = `list:${JSON.stringify(keyObj)}`;

  // Serve from tiny in-memory cache if still fresh
  const hit = lruGet<any>(key);
  if (hit) {
    return okJson(
      hit.data,
      `public, s-maxage=${EDGE_S_MAXAGE}, stale-while-revalidate=${EDGE_STALE_WHILE_REVALIDATE}`
    );
  }

  // Coalesce duplicates
  if (pending.has(key)) return pending.get(key)!;

  const p = (async () => {
    try {
      const listPromise = listProducts({
        page,
        perPage,
        search: q,
        category,
        tag,
        order: orderNorm,
        orderby,
        min_price,
        max_price,
      } as any);

      const data = await Promise.race([
        listPromise,
        new Promise<never>((_, reject) => {
          const timeoutId = setTimeout(() => {
            clearTimeout(timeoutId);
            reject(new UpstreamTimeout("list_products_timeout"));
          }, LIST_TIMEOUT_MS);
          listPromise.finally(() => clearTimeout(timeoutId));
        }),
      ]);

      lruSet(key, { data, etag: null });
      return okJson(
        data,
        `public, s-maxage=${EDGE_S_MAXAGE}, stale-while-revalidate=${EDGE_STALE_WHILE_REVALIDATE}`
      );
    } catch (e: any) {
      // Network error / timeout: return a controlled error payload (no cache)
      const { status, code } = resolveError(e);
      return NextResponse.json(
        { error: code },
        { status, headers: { "Cache-Control": "no-store" } }
      );
    } finally {
      pending.delete(key);
    }
  })();

  pending.set(key, p);
  return p;
}
