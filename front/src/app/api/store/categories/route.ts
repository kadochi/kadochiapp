// src/app/api/store/categories/route.ts
import { NextResponse } from "next/server";
import { wooFetch } from "@/lib/api/woo";

// Run on Node.js runtime (not edge)
export const runtime = "nodejs";

// Always fetch fresh data dynamically (no ISR)
export const dynamic = "force-dynamic";

// Cache control: 0 disables CDN revalidation (you can change to 300 for 5 min cache)
export const revalidate = 0;

export async function GET(req: Request) {
  const u = new URL(req.url);
  const per_page = u.searchParams.get("per_page") ?? "100";
  const hide_empty = u.searchParams.get("hide_empty") ?? "true";

  const qs = new URLSearchParams({ per_page, hide_empty }).toString();
  const upstream = `/wp-json/wc/store/v1/products/categories?${qs}`;

  // Fetch from WooCommerce API via server proxy (no CORS issues)
  const res = await wooFetch(upstream, { method: "GET" });

  // Return raw response body (pass-through)
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
      // You can enable CDN cache in production:
      // "cache-control": "s-maxage=300, stale-while-revalidate=600",
      "cache-control": "no-store",
    },
  });
}
