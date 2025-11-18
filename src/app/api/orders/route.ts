// src/app/api/orders/route.ts

import { NextRequest, NextResponse } from "next/server";
import { listOrdersForSessionPaged } from "@/lib/api/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const perPage = Math.min(
      50,
      Math.max(1, Number(url.searchParams.get("per_page") || "5"))
    );

    const items = await listOrdersForSessionPaged(page, perPage);
    const hasMore = items.length === perPage;

    const res = NextResponse.json(
      { items, page, per_page: perPage, has_more: hasMore },
      { status: 200 }
    );

    res.headers.set("Cache-Control", "no-store");
    res.headers.set("Vary", "Cookie");

    return res;
  } catch (err: any) {
    const status = Number(err?.status) || 500;
    const res = NextResponse.json(
      { error: String(err?.message || "server_error") },
      { status }
    );
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("Vary", "Cookie");
    return res;
  }
}
