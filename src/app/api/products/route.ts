import { NextResponse } from "next/server";
// Use the B-version (catalog) listProducts to keep the existing param shape (perPage, etc.)
import { listProducts_b as listProducts } from "@/lib/api/woo";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);

  // Bulk include by IDs (kept 1:1 behavior; returns raw Store API items)
  const include = (url.searchParams.get("include") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (include.length) {
    const ids = include
      .map((id) => Number(id))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (!ids.length) {
      return NextResponse.json([], {
        headers: { "Cache-Control": "no-store" },
      });
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

    try {
      const r = await fetch(
        `${WP_BASE}/wp-json/wc/store/v1/products?${qs.toString()}`,
        { cache: "no-store" }
      );
      if (!r.ok) {
        return NextResponse.json([], {
          headers: { "Cache-Control": "no-store" },
        });
      }
      const data = await r.json();
      return NextResponse.json(data, {
        headers: { "Cache-Control": "no-store" },
      });
    } catch {
      return NextResponse.json([], {
        headers: { "Cache-Control": "no-store" },
      });
    }
  }

  // PLP passthrough (uses B-version which supports perPage, orderby mapping, etc.)
  const page = Number(url.searchParams.get("page") || "1");
  const perPage = Number(url.searchParams.get("per_page") || "12");
  const order = (url.searchParams.get("order") || "desc") as "asc" | "desc";
  const orderby = (url.searchParams.get("orderby") || "date") as
    | "date"
    | "price"
    | "popularity"
    | "rating";

  const q = url.searchParams.get("q") || undefined;
  const category = url.searchParams.get("category") || undefined;
  const tagRaw = url.searchParams.get("tag") || undefined;
  const min_price = url.searchParams.get("min_price") || undefined;
  const max_price = url.searchParams.get("max_price") || undefined;

  // Historical quirk preserved
  const tag =
    tagRaw === "fatherday" || tagRaw === "motherday"
      ? "fatherday,motherday"
      : tagRaw || undefined;

  try {
    const data = await listProducts({
      page,
      perPage,
      search: q,
      category,
      tag,
      order,
      orderby,
      min_price,
      max_price,
    } as any);

    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "failed" },
      { status: 500 }
    );
  }
}
