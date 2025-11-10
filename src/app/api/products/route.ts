// src/app/api/products/route.ts
import { NextResponse } from "next/server";
import { listProducts_b as listProducts } from "@/lib/api/woo";

// Explicit Node runtime (we call external WooCommerce APIs)
export const runtime = "nodejs";

// --- Tunables (adjust to your infra/profile) ---
const LIST_TIMEOUT_MS = 7000;
const INCLUDE_TIMEOUT_MS = 5000;
const EDGE_S_MAXAGE = 30; // CDN TTL (seconds)
const EDGE_STALE_WHILE_REVALIDATE = 300; // Serve stale while revalidating (seconds)

// Request coalescing for identical in-flight queries (prevents bursts)
const pending = new Map<string, Promise<Response>>();

// Very small in-memory LRU to short-circuit repeated queries for a few seconds
const memoryLRU = new Map<string, { t: number; body: any }>();
const LRU_TTL_MS = 20_000; // 20s

function lruGet(key: string) {
  const hit = memoryLRU.get(key);
  if (!hit) return null;
  if (Date.now() - hit.t > LRU_TTL_MS) {
    memoryLRU.delete(key);
    return null;
  }
  return hit.body;
}
function lruSet(key: string, body: any) {
  memoryLRU.set(key, { t: Date.now(), body });
  // Keep a tiny footprint
  if (memoryLRU.size > 100) {
    const first = memoryLRU.keys().next().value;
    if (first) memoryLRU.delete(first);
  }
}

// Helper: JSON 200 with optional Cache-Control header
function okJson(data: any, cacheCtl?: string) {
  const headers: Record<string, string> = {};
  if (cacheCtl) headers["Cache-Control"] = cacheCtl;
  return NextResponse.json(data, { status: 200, headers });
}

// Helper: fetch with hard timeout via AbortController
function timeoutFetch(input: string, init: RequestInit, ms: number) {
  const ctl = new AbortController();
  const id = setTimeout(() => ctl.abort(), ms);
  return fetch(input, { ...init, signal: ctl.signal }).finally(() =>
    clearTimeout(id)
  );
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
    const cached = lruGet(key);
    if (cached) return okJson(cached, "no-store");
    if (pending.has(key)) return pending.get(key)!;

    const p = (async () => {
      try {
        const r = await timeoutFetch(
          `${WP_BASE}/wp-json/wc/store/v1/products?${qs.toString()}`,
          { cache: "no-store" },
          INCLUDE_TIMEOUT_MS
        );
        if (!r.ok) return okJson([], "no-store");
        const data = await r.json();
        lruSet(key, data);
        return okJson(data, "no-store");
      } catch {
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
  const hit = lruGet(key);
  if (hit) {
    return okJson(
      hit,
      `public, s-maxage=${EDGE_S_MAXAGE}, stale-while-revalidate=${EDGE_STALE_WHILE_REVALIDATE}`
    );
  }

  // Coalesce duplicates
  if (pending.has(key)) return pending.get(key)!;

  const p = (async () => {
    try {
      // Call the B-variant; enforce a hard timeout
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), LIST_TIMEOUT_MS);

      const data = await listProducts({
        page,
        perPage,
        search: q,
        category,
        tag,
        order: orderNorm,
        orderby,
        min_price,
        max_price,
        // If your impl supports a signal, pass: { signal: controller.signal }
      } as any).finally(() => clearTimeout(id));

      lruSet(key, data);
      return okJson(
        data,
        `public, s-maxage=${EDGE_S_MAXAGE}, stale-while-revalidate=${EDGE_STALE_WHILE_REVALIDATE}`
      );
    } catch (e: any) {
      // Network error / timeout: return a controlled error payload (no cache)
      return NextResponse.json(
        { error: String(e?.message || "failed") },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    } finally {
      pending.delete(key);
    }
  })();

  pending.set(key, p);
  return p;
}
